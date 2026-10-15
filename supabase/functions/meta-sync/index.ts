// meta-sync — puxa da API do Meta: conta, campanhas, conjuntos, anúncios (com criativo)
// e os insights diários por anúncio. Grava tudo no banco (upsert).
//
// Secrets (Edge Functions → Secrets): META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, SYNC_SECRET
// Chamada: POST com header `x-sync-secret: <SYNC_SECRET>` (agendamento) ou com o
// login do dono (botão "Sincronizar" no sistema). Body opcional: {"dias": 30}
import { createClient } from 'npm:@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v23.0'
const CONVERSA = 'onsite_conversion.messaging_conversation_started_7d'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const token = Deno.env.get('META_ACCESS_TOKEN') ?? ''
const conta = 'act_' + (Deno.env.get('META_AD_ACCOUNT_ID') ?? '').replace(/^act_/, '')

async function autorizado(req: Request): Promise<boolean> {
  const segredo = Deno.env.get('SYNC_SECRET')
  if (segredo && req.headers.get('x-sync-secret') === segredo) return true
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt) return false
  const { data } = await supabase.auth.getUser(jwt)
  if (!data.user) return false
  const { data: adm } = await supabase.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle()
  return !!adm
}

// deno-lint-ignore no-explicit-any
type Json = any

async function graph(path: string, params: Record<string, string>): Promise<Json> {
  const url = new URL(`${GRAPH}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('access_token', token)
  const r = await fetch(url)
  const j = await r.json()
  if (j.error) throw new Error(`Meta: ${j.error.message}`)
  return j
}

async function todas(path: string, params: Record<string, string>): Promise<Json[]> {
  const out: Json[] = []
  let j = await graph(path, { limit: '500', ...params })
  out.push(...(j.data ?? []))
  while (j.paging?.next) {
    const r = await fetch(j.paging.next)
    j = await r.json()
    if (j.error) throw new Error(`Meta: ${j.error.message}`)
    out.push(...(j.data ?? []))
  }
  return out
}

const codigoOferta = (nome: string) => nome.match(/\[(OF\d{2,})\]/i)?.[1].toUpperCase() ?? null
const codigoCriativo = (nome: string) => nome.match(/\b(CR\d{2,})\b/i)?.[1].toUpperCase() ?? null
const statusMeta = (s: string) => (s === 'ACTIVE' ? 'ativo' : s === 'DISAPPROVED' || s === 'WITH_ISSUES' ? 'reprovado' : 'pausado')
const isoDia = (d: Date) => d.toISOString().slice(0, 10)
const CAMPOS_AD = 'id,name,adset_id,campaign_id,effective_status,created_time,preview_shareable_link'
const CAMPOS_CRIATIVO = 'id,title,body,thumbnail_url,image_url,object_type,video_id'

async function upsert(tabela: string, linhas: Json[], onConflict?: string) {
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabase.from(tabela).upsert(linhas.slice(i, i + 500), onConflict ? { onConflict } : undefined)
    if (error) throw new Error(`${tabela}: ${error.message}`)
  }
}

async function sincronizar(dias: number) {
  const acc = await graph(conta, { fields: 'name,account_status,currency,spend_cap' })
  await upsert('contas_anuncio', [{
    id: conta,
    nome: acc.name,
    status: acc.account_status === 1 ? 'ativa' : acc.account_status === 2 ? 'desativada' : 'restrita',
    moeda: acc.currency,
    atualizado_em: new Date().toISOString(),
  }])

  const [camps, sets, ads] = await Promise.all([
    todas(`${conta}/campaigns`, { fields: 'id,name,effective_status,created_time' }),
    todas(`${conta}/adsets`, { fields: 'id,name,campaign_id,effective_status,daily_budget' }),
    // miniatura grande; se o Meta não aceitar o parâmetro, cai para o formato simples
    todas(`${conta}/ads`, { fields: `${CAMPOS_AD},creative.thumbnail_width(720).thumbnail_height(720){${CAMPOS_CRIATIVO}}` })
      .catch(() => todas(`${conta}/ads`, { fields: `${CAMPOS_AD},creative{${CAMPOS_CRIATIVO}}` })),
  ])

  const { data: ofertas } = await supabase.from('ofertas').select('id')
  const ofertaExiste = new Set((ofertas ?? []).map((o: Json) => o.id))
  const { data: crsExistentes } = await supabase.from('criativos').select('id')
  const crExiste = new Set((crsExistentes ?? []).map((c: Json) => c.id))

  const agora = new Date().toISOString()
  await upsert('meta_campanhas', camps.map((c) => ({
    id: c.id, conta_id: conta, nome: c.name, status: statusMeta(c.effective_status), criada_em: c.created_time, atualizado_em: agora,
  })))
  await upsert('meta_conjuntos', sets.map((s) => ({
    id: s.id, campanha_id: s.campaign_id, nome: s.name, status: statusMeta(s.effective_status),
    orcamento_dia: s.daily_budget ? Number(s.daily_budget) / 100 : null, atualizado_em: agora,
  })))

  // Criativos: usa o código CRxxx do nome do anúncio; sem código, cria um "AD-<id>" automático.
  const campOferta = new Map(camps.map((c) => [c.id, codigoOferta(c.name)]))
  const novosCriativos: Json[] = []
  const anuncios = ads.map((a) => {
    const cr = codigoCriativo(a.name) ?? `AD-${a.id}`
    if (!crExiste.has(cr)) {
      crExiste.add(cr)
      const of = codigoOferta(a.name) ?? campOferta.get(a.campaign_id)
      const c = a.creative ?? {}
      novosCriativos.push({
        id: cr,
        oferta_id: of && ofertaExiste.has(of) ? of : null,
        tipo: c.video_id || c.object_type === 'VIDEO' ? 'video' : 'imagem',
        gancho: c.title || c.body?.slice(0, 120) || a.name,
        thumbnail_url: c.image_url ?? c.thumbnail_url ?? null,
        meta_creative_id: c.id ?? null,
        criado_em: (a.created_time ?? agora).slice(0, 10),
      })
    }
    return {
      id: a.id, conjunto_id: a.adset_id, campanha_id: a.campaign_id, nome: a.name,
      status: statusMeta(a.effective_status), criativo_id: cr, criado_em: a.created_time, atualizado_em: agora,
    }
  })
  await upsert('criativos', novosCriativos)
  await upsert('meta_anuncios', anuncios)

  // Mídia em alta: imagem grande, vídeo (mp4) e link de prévia — atualizada a cada sync,
  // porque os links de vídeo do Meta expiram depois de algumas horas.
  const videoIds = [...new Set(ads.map((a) => a.creative?.video_id).filter(Boolean))] as string[]
  const videos = new Map<string, Json>()
  for (let i = 0; i < videoIds.length; i += 10) {
    const lote = await Promise.all(videoIds.slice(i, i + 10).map((id) =>
      graph(id, { fields: 'source,picture,thumbnails{uri,is_preferred,height}' }).catch(() => null)))
    lote.forEach((v, j) => v && videos.set(videoIds[i + j], v))
  }
  const midia = new Map<string, Json>()
  for (const a of ads) {
    const cr = codigoCriativo(a.name) ?? `AD-${a.id}`
    if (midia.has(cr)) continue
    const c = a.creative ?? {}
    const v = c.video_id ? videos.get(c.video_id) : null
    const thumbs: Json[] = v?.thumbnails?.data ?? []
    const capa = (thumbs.find((t) => t.is_preferred) ?? thumbs.sort((x, y) => (y.height ?? 0) - (x.height ?? 0))[0])?.uri
    midia.set(cr, {
      id: cr,
      thumbnail_url: capa ?? c.image_url ?? c.thumbnail_url ?? null,
      imagem_url: c.image_url ?? capa ?? v?.picture ?? c.thumbnail_url ?? null,
      video_url: v?.source ?? null,
      preview_link: a.preview_shareable_link ?? null,
    })
  }
  let aviso: string | null = null
  try {
    await upsert('criativos', [...midia.values()])
  } catch (e) {
    // ex.: colunas novas ainda não criadas (migration 0002) — o resto do sync continua valendo
    aviso = e instanceof Error ? e.message : String(e)
  }
  // Texto completo do anúncio (usado pelos insights de IA) — migration 0004
  try {
    const textos = new Map<string, Json>()
    for (const a of ads) {
      const cr = codigoCriativo(a.name) ?? `AD-${a.id}`
      const corpo = a.creative?.body ?? a.creative?.title
      if (corpo && !textos.has(cr)) textos.set(cr, { id: cr, texto: String(corpo).slice(0, 4000) })
    }
    await upsert('criativos', [...textos.values()])
  } catch (e) {
    aviso = [aviso, e instanceof Error ? e.message : String(e)].filter(Boolean).join(' | ')
  }

  const hoje = new Date()
  const desde = new Date(hoje.getTime() - (dias - 1) * 86_400_000)
  const insights = await todas(`${conta}/insights`, {
    level: 'ad',
    time_increment: '1',
    time_range: JSON.stringify({ since: isoDia(desde), until: isoDia(hoje) }),
    fields: 'ad_id,spend,impressions,clicks,actions',
  })
  const idsAnuncio = new Set(ads.map((a) => a.id))
  await upsert('meta_insights_dia', insights.filter((i) => idsAnuncio.has(i.ad_id)).map((i) => ({
    anuncio_id: i.ad_id,
    data: i.date_start,
    gasto: Number(i.spend ?? 0),
    impressoes: Number(i.impressions ?? 0),
    cliques: Number(i.clicks ?? 0),
    conversas: Number((i.actions ?? []).find((x: Json) => x.action_type === CONVERSA)?.value ?? 0),
  })), 'anuncio_id,data')

  return { campanhas: camps.length, conjuntos: sets.length, anuncios: ads.length, insights: insights.length, criativos_novos: novosCriativos.length, videos: videos.size, aviso }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!(await autorizado(req))) return new Response('não autorizado', { status: 401, headers: cors })
  if (!token || conta === 'act_') return new Response('faltam os secrets META_ACCESS_TOKEN / META_AD_ACCOUNT_ID', { status: 500, headers: cors })

  const body = await req.json().catch(() => ({}))
  const dias = Math.min(90, Math.max(1, Number(body.dias) || 3))
  const { data: log } = await supabase.from('sync_log').insert({ fonte: 'meta', detalhe: { dias } }).select('id').single()
  try {
    const r = await sincronizar(dias)
    await supabase.from('sync_log').update({ finalizado_em: new Date().toISOString(), ok: true, detalhe: { dias, ...r } }).eq('id', log?.id)
    return Response.json({ ok: true, ...r }, { headers: cors })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await supabase.from('sync_log').update({ finalizado_em: new Date().toISOString(), ok: false, detalhe: { dias, erro: msg } }).eq('id', log?.id)
    return Response.json({ ok: false, erro: msg }, { status: 502, headers: cors })
  }
})
