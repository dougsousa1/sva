// leona-webhook — recebe as vendas da Leona em tempo real e grava em `vendas`.
//
// URL para cadastrar na Leona:
//   https://<projeto>.supabase.co/functions/v1/leona-webhook?token=<LEONA_WEBHOOK_SECRET>
// Secret: LEONA_WEBHOOK_SECRET
//
// O formato exato do payload da Leona ainda não foi confirmado, então os campos são
// procurados pelo nome (os mesmos do histórico de vendas da Leona) em qualquer nível
// do JSON. O payload original fica salvo em `raw` para ajustarmos depois.
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// deno-lint-ignore no-explicit-any
type Json = any

function achar(obj: Json, nomes: string[]): Json {
  if (!obj || typeof obj !== 'object') return undefined
  for (const n of nomes) if (obj[n] !== undefined && obj[n] !== null && typeof obj[n] !== 'object') return obj[n]
  for (const v of Object.values(obj)) {
    const r = achar(v, nomes)
    if (r !== undefined) return r
  }
  return undefined
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  if (req.method !== 'POST') return new Response('use POST', { status: 405 })
  if (url.searchParams.get('token') !== Deno.env.get('LEONA_WEBHOOK_SECRET')) return new Response('não autorizado', { status: 401 })

  const p = await req.json().catch(() => null)
  if (!p) return new Response('JSON inválido', { status: 400 })

  const valor = Number(achar(p, ['amount', 'valor', 'value', 'price']))
  const lead = String(achar(p, ['lead_number', 'phone', 'telefone']) ?? '')
  const id = achar(p, ['sale_id', 'id']) ?? crypto.randomUUID()
  const venda = {
    id: String(id),
    data: achar(p, ['sold_at', 'created_at', 'date', 'data']) ?? new Date().toISOString(),
    valor: Number.isFinite(valor) ? valor : 0,
    leona_product_id: achar(p, ['product_id']) ?? null,
    produto_nome: achar(p, ['product_name']) ?? null,
    anuncio_id: achar(p, ['source_id', 'ad_id']) ?? null,
    leona_connection_id: achar(p, ['connection_id']) ?? null,
    instancia: achar(p, ['instance_name']) ?? null,
    ddd: achar(p, ['lead_ddd']) ?? (lead.startsWith('55') ? lead.slice(2, 4) : null),
    cliente: achar(p, ['customer_name', 'name', 'nome']) ?? null,
    origem: achar(p, ['source']) ?? 'webhook',
    raw: p,
  }
  const { error } = await supabase.from('vendas').upsert(venda)
  if (error) return Response.json({ ok: false, erro: error.message }, { status: 500 })
  return Response.json({ ok: true, id: venda.id })
})
