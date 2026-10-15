// leona-sync — busca as vendas na Leona (pelo MCP da Leona, com token estático) e grava em `vendas`.
// Pega todas as vendas: de fluxo, manuais e por comprovante. Não mexe em nada na Leona (só leitura).
//
// Secrets: LEONA_MCP_URL, LEONA_MCP_TOKEN, SYNC_SECRET
// Chamada: POST com header `x-sync-secret` (agendamento) ou com o login do dono (botão no sistema).
// Body opcional: {"dias": 2}  → quantos dias para trás buscar (use 365 na primeira vez).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
}
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const MCP_URL = Deno.env.get('LEONA_MCP_URL') ?? ''
const MCP_TOKEN = Deno.env.get('LEONA_MCP_TOKEN') ?? ''

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

// ---------------------------------------------------------------- cliente MCP mínimo (HTTP)
let sessao: string | null = null
let seq = 1

async function rpc(method: string, params?: Json, notificacao = false): Promise<Json> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    authorization: `Bearer ${MCP_TOKEN}`,
  }
  if (sessao) headers['mcp-session-id'] = sessao
  const body = notificacao ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id: seq++, method, params }
  const r = await fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) })
  sessao = r.headers.get('mcp-session-id') ?? sessao
  if (notificacao) return null
  if (!r.ok) throw new Error(`Leona MCP ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const texto = await r.text()
  // Resposta pode vir como JSON puro ou como stream SSE ("data: {...}")
  const msgs = (r.headers.get('content-type') ?? '').includes('text/event-stream')
    ? texto.split('\n').filter((l) => l.startsWith('data:')).map((l) => JSON.parse(l.slice(5)))
    : [JSON.parse(texto)]
  const resp = msgs.find((m) => m.id !== undefined) ?? msgs[0]
  if (resp?.error) throw new Error(`Leona MCP: ${resp.error.message}`)
  return resp?.result
}

async function conectar() {
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'sva-command', version: '1.0' } })
  await rpc('notifications/initialized', undefined, true)
}

async function ferramenta(nome: string, args: Json): Promise<Json> {
  const r = await rpc('tools/call', { name: nome, arguments: args })
  if (r?.isError) throw new Error(`Leona ${nome}: ${r.content?.[0]?.text ?? 'erro'}`)
  const txt = r?.content?.find((c: Json) => c.type === 'text')?.text
  return r?.structuredContent ?? (txt ? JSON.parse(txt) : r)
}

// ---------------------------------------------------------------- sincronização
async function sincronizar(dias: number) {
  await conectar()
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10)
  let pagina = 1
  let total = 0
  for (;;) {
    const r = await ferramenta('list_sales_history', { start_date: desde, page: pagina, limit: 100 })
    const vendas: Json[] = r.sales ?? []
    if (vendas.length) {
      const linhas = vendas.map((v) => ({
        id: String(v.id),
        data: v.sold_at,
        valor: Number(v.amount ?? 0),
        leona_product_id: v.product_id ?? null,
        produto_nome: v.product_name ?? null,
        anuncio_id: v.source_id ? String(v.source_id).trim() : null,
        leona_connection_id: v.connection_id ?? null,
        instancia: v.instance_name ?? null,
        ddd: v.lead_ddd ?? null,
        cliente: v.customer_name ?? null,
        origem: v.source ?? null,
        raw: v,
      }))
      const { error } = await supabase.from('vendas').upsert(linhas)
      if (error) throw new Error(`vendas: ${error.message}`)
      total += linhas.length
    }
    if (!r.pagination?.has_more || !vendas.length || pagina >= 200) break
    pagina++
  }
  return { vendas: total, desde }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!(await autorizado(req))) return new Response('não autorizado', { status: 401, headers: cors })
  if (!MCP_URL || !MCP_TOKEN) return new Response('faltam os secrets LEONA_MCP_URL / LEONA_MCP_TOKEN', { status: 500, headers: cors })

  const body = await req.json().catch(() => ({}))
  const dias = Math.min(730, Math.max(1, Number(body.dias) || 2))
  const { data: log } = await supabase.from('sync_log').insert({ fonte: 'leona', detalhe: { dias } }).select('id').single()
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
