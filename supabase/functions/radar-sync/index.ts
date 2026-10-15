// radar-sync — garimpa a Biblioteca de Anúncios (Brasil, só ativos) pelo Apify e dá nota de validação.
//
// Funciona em duas etapas, porque a coleta no Apify leva alguns minutos:
//   {"acao": "buscar", "palavra_id"?: "..."} → inicia as coletas (todas as palavras ativas, ou uma)
//   {"acao": "coletar"}                        → baixa as coletas que já terminaram e grava os anúncios
//   {"acao": "auto"} (padrão, para o Cron)      → coleta o que terminou e, 1x por dia, inicia novas buscas
//
// Secrets: APIFY_TOKEN, SYNC_SECRET  (opcional: APIFY_ACTOR, padrão apify~facebook-ads-scraper)
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
}
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const APIFY = 'https://api.apify.com/v2'
const TOKEN = Deno.env.get('APIFY_TOKEN') ?? ''
const ACTOR = Deno.env.get('APIFY_ACTOR') ?? 'apify~facebook-ads-scraper'

// deno-lint-ignore no-explicit-any
type Json = any

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

async function apify(path: string, init?: RequestInit): Promise<Json> {
  const sep = path.includes('?') ? '&' : '?'
  const r = await fetch(`${APIFY}${path}${sep}token=${TOKEN}`, init)
  const txt = await r.text()
  if (!r.ok) throw new Error(`Apify ${r.status}: ${txt.slice(0, 300)}`)
  return txt ? JSON.parse(txt) : null
}

export const urlBiblioteca = (termo: string) =>
  'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&media_type=all' +
  `&q=${encodeURIComponent(termo)}&search_type=keyword_unordered`

// ---------------------------------------------------------------- 1. iniciar buscas
async function buscar(palavraId?: string) {
  let q = supabase.from('radar_palavras').select('*').eq('ativo', true)
  if (palavraId) q = supabase.from('radar_palavras').select('*').eq('id', palavraId)
  const { data: palavras, error } = await q
  if (error) throw new Error(error.message)
  const iniciadas: string[] = []
  for (const p of palavras ?? []) {
    const run = await apify(`/acts/${ACTOR}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ startUrls: [{ url: urlBiblioteca(p.termo) }], resultsLimit: p.limite, activeStatus: 'active' }),
    })
    const id = run?.data?.id
    if (!id) continue
    await supabase.from('radar_execucoes').insert({ id, palavra_id: p.id, termo: p.termo, dataset_id: run.data.defaultDatasetId })
    await supabase.from('radar_palavras').update({ ultima_busca: new Date().toISOString() }).eq('id', p.id)
    iniciadas.push(p.termo)
  }
  return iniciadas
}

// ---------------------------------------------------------------- 2. coletar resultados
const pegar = (o: Json, ...chaves: string[]): Json => {
  for (const k of chaves) {
    const v = k.split('.').reduce((a: Json, p) => (a == null ? a : a[p]), o)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

function dataDe(v: Json): string | null {
  if (v == null) return null
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function preco(texto: string): number | null {
  const m = texto.match(/R\$\s?(\d{1,4}(?:[.,]\d{2})?)/)
  return m ? Number(m[1].replace(',', '.')) : null
}

/** Nota 0–100: quanto mais tempo no ar, mais variações e funil por WhatsApp, mais validado. */
function nota(a: { dias: number; variacoes: number; whatsapp: boolean; ativo: boolean; preco: number | null }) {
  let n = Math.min(40, (a.dias / 60) * 40)
  n += Math.min(25, Math.max(0, a.variacoes - 1) * 5)
  if (a.whatsapp) n += 20
  if (a.ativo) n += 5
  if (a.preco !== null && a.preco >= 7 && a.preco <= 97) n += 10
  return Math.round(n)
}

function converter(item: Json, exec: Json) {
  const snap = pegar(item, 'snapshot') ?? {}
  const card = (pegar(snap, 'cards') ?? [])[0] ?? {}
  const id = String(pegar(item, 'adArchiveID', 'adArchiveId', 'ad_archive_id', 'adId', 'id') ?? '')
  if (!id) return null
  const texto = String(pegar(snap, 'body.text', 'body.markup.__html', 'body') ?? pegar(card, 'body') ?? pegar(item, 'adText', 'text') ?? '')
  const titulo = pegar(snap, 'title', 'link_description') ?? pegar(card, 'title') ?? null
  const cta = pegar(snap, 'cta_text', 'ctaText', 'cta_type', 'ctaType') ?? null
  const link = pegar(snap, 'link_url', 'linkUrl') ?? pegar(card, 'link_url', 'linkUrl') ?? null
  const img = pegar(snap, 'images.0.original_image_url', 'images.0.originalImageUrl', 'images.0.resized_image_url', 'videos.0.video_preview_image_url', 'videos.0.videoPreviewImageUrl')
    ?? pegar(card, 'original_image_url', 'originalImageUrl', 'resized_image_url', 'resizedImageUrl', 'video_preview_image_url', 'videoPreviewImageUrl') ?? null
  const video = pegar(snap, 'videos.0.video_hd_url', 'videos.0.videoHdUrl', 'videos.0.video_sd_url', 'videos.0.videoSdUrl')
    ?? pegar(card, 'video_hd_url', 'videoHdUrl', 'video_sd_url') ?? null
  const inicio = dataDe(pegar(item, 'startDate', 'start_date', 'startDateFormatted', 'ad_delivery_start_time'))
  const ativo = pegar(item, 'isActive', 'is_active') ?? true
  const variacoes = Number(pegar(item, 'collationCount', 'collation_count') ?? 1) || 1
  const whatsapp = /whatsapp|mensag|message|send_message/i.test(`${cta ?? ''} ${pegar(snap, 'cta_type', 'ctaType') ?? ''}`) ||
    /wa\.me|api\.whatsapp|whatsapp\.com|m\.me\//i.test(String(link ?? ''))
  const p = preco(`${titulo ?? ''} ${texto}`)
  const dias = inicio ? Math.max(0, Math.round((Date.now() - new Date(inicio).getTime()) / 86_400_000)) : 0
  return {
    id,
    palavra_id: exec.palavra_id,
    termo: exec.termo,
    pagina_nome: pegar(item, 'pageName', 'page_name') ?? pegar(snap, 'page_name', 'pageName'),
    pagina_id: String(pegar(item, 'pageId', 'page_id') ?? pegar(snap, 'page_id') ?? '') || null,
    pagina_foto: pegar(snap, 'page_profile_picture_url', 'pageProfilePictureUrl'),
    titulo,
    texto: texto.slice(0, 4000),
    cta,
    link,
    imagem_url: img,
    video_url: video,
    inicio,
    ativo: !!ativo,
    variacoes,
    plataformas: pegar(item, 'publisherPlatform', 'publisher_platform', 'publisherPlatforms'),
    preco: p,
    whatsapp,
    nota: nota({ dias, variacoes, whatsapp, ativo: !!ativo, preco: p }),
    raw: item,
    atualizado_em: new Date().toISOString(),
  }
}

async function coletar() {
  const { data: pendentes } = await supabase.from('radar_execucoes').select('*').eq('status', 'rodando')
  let novos = 0
  for (const e of pendentes ?? []) {
    const run = await apify(`/actor-runs/${e.id}`)
    const st = run?.data?.status
    if (st === 'RUNNING' || st === 'READY') continue
    if (st !== 'SUCCEEDED') {
      await supabase.from('radar_execucoes').update({ status: 'falhou', erro: st, finalizado_em: new Date().toISOString() }).eq('id', e.id)
      continue
    }
    const itens: Json[] = (await apify(`/datasets/${run.data.defaultDatasetId}/items?clean=true&format=json`)) ?? []
    const linhas = itens.map((i) => converter(i, e)).filter(Boolean) as Json[]
    // não sobrescreve o que você já decidiu (salvo/descartado/modelado) nem a oferta ligada
    const { data: existentes } = await supabase.from('radar_anuncios').select('id').in('id', linhas.map((l) => l.id))
    const ja = new Set((existentes ?? []).map((x: Json) => x.id))
    novos += linhas.filter((l) => !ja.has(l.id)).length
    for (let i = 0; i < linhas.length; i += 200) {
      const { error } = await supabase.from('radar_anuncios').upsert(linhas.slice(i, i + 200), { ignoreDuplicates: false })
      if (error) throw new Error(`radar_anuncios: ${error.message}`)
    }
    await supabase.from('radar_execucoes').update({ status: 'concluida', itens: linhas.length, finalizado_em: new Date().toISOString() }).eq('id', e.id)
  }
  return { pendentes: (pendentes ?? []).length, novos }
}

async function auto() {
  const coleta = await coletar()
  const ontem = new Date(Date.now() - 20 * 3_600_000).toISOString()
  const { data: vencidas } = await supabase.from('radar_palavras').select('id').eq('ativo', true).or(`ultima_busca.is.null,ultima_busca.lt.${ontem}`)
  const iniciadas: string[] = []
  for (const p of vencidas ?? []) iniciadas.push(...(await buscar(p.id)))
  return { ...coleta, iniciadas }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!(await autorizado(req))) return new Response('não autorizado', { status: 401, headers: cors })
  if (!TOKEN) return new Response('falta o secret APIFY_TOKEN', { status: 500, headers: cors })
  const body = await req.json().catch(() => ({}))
  try {
    const r = body.acao === 'buscar' ? { iniciadas: await buscar(body.palavra_id) }
      : body.acao === 'coletar' ? await coletar()
      : await auto()
    return Response.json({ ok: true, ...r }, { headers: cors })
  } catch (e) {
    return Response.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 502, headers: cors })
  }
})
