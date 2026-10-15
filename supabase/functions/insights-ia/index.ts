// insights-ia — analisa os seus criativos campeões e piores com o Gemini (plano grátis do Google)
// e devolve padrões, ganchos, ângulos e palavras-chave para o Radar.
//
// Secrets: GEMINI_API_KEY  (opcional: GEMINI_MODEL, padrão gemini-flash-latest)
// Chamada: POST com o login do dono. Body: { oferta_id, oferta_nome, ticket, vencedores: [...], perdedores: [...] }
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const MODELO = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'

// deno-lint-ignore no-explicit-any
type Json = any

async function admin(req: Request): Promise<boolean> {
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt) return false
  const { data } = await supabase.auth.getUser(jwt)
  if (!data.user) return false
  const { data: adm } = await supabase.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle()
  return !!adm
}

function prompt(e: Json) {
  const linha = (c: Json) =>
    `- [${c.tipo}] gancho: "${c.gancho}"\n  texto: "${String(c.texto ?? '').slice(0, 700)}"\n` +
    `  gasto R$ ${c.gasto} · vendas ${c.vendas} · ROAS ${c.roas} · custo/conversa R$ ${c.custo_conversa} · conversão WhatsApp ${c.conversao}% · CTR ${c.ctr}%`
  return `Você é estrategista de tráfego pago para infoprodutos de ticket baixo (R$ 7 a R$ 50) vendidos pelo WhatsApp.
O funil: anúncio de mensagem no Meta (Facebook/Instagram) → conversa no WhatsApp → venda. O dono modela ofertas que já
estão validadas no mercado e remodela com IA.

Oferta analisada: ${e.oferta_nome ?? 'todas as ofertas'}${e.ticket ? ` (ticket ~R$ ${e.ticket})` : ''}.

CRIATIVOS CAMPEÕES (maior margem):
${(e.vencedores ?? []).map(linha).join('\n') || '(nenhum)'}

CRIATIVOS QUE NÃO FUNCIONARAM:
${(e.perdedores ?? []).map(linha).join('\n') || '(nenhum)'}

Analise o que os campeões têm em comum (dor, promessa, formato, tom, prova, preço, chamada para o WhatsApp) e o que diferencia
dos perdedores. Responda SOMENTE com JSON válido, em português do Brasil, neste formato:
{
  "resumo": "2 a 3 frases diretas com a conclusão principal",
  "padroes_vencedores": ["5 padrões concretos que os campeões repetem"],
  "o_que_evitar": ["3 a 4 coisas que aparecem nos perdedores"],
  "ganchos": ["6 ganchos novos (primeira frase do anúncio) no estilo dos campeões, prontos para testar"],
  "angulos": [{"angulo": "nome curto", "porque": "1 frase"}],
  "palavras_chave": ["10 a 14 termos curtos (1 a 3 palavras), do jeito que o público fala, para buscar concorrentes e ofertas parecidas na Biblioteca de Anúncios do Meta — dores, desejos, sintomas, nomes de produto do nicho"],
  "nichos_adjacentes": ["3 nichos vizinhos onde a mesma lógica de oferta deve funcionar"]
}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!(await admin(req))) return new Response('não autorizado', { status: 401, headers: cors })
  if (!KEY) return Response.json({ ok: false, erro: 'falta o secret GEMINI_API_KEY' }, { status: 500, headers: cors })
  const entrada = await req.json().catch(() => null)
  if (!entrada?.vencedores?.length) return Response.json({ ok: false, erro: 'nenhum criativo com resultado para analisar' }, { status: 400, headers: cors })

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt(entrada) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${j?.error?.message ?? 'erro'}`)
    const texto = (j?.candidates?.[0]?.content?.parts ?? []).map((p: Json) => p.text ?? '').join('')
    const resultado = JSON.parse(texto.replace(/^```json\s*|```$/g, '').trim())
    const { data, error } = await supabase
      .from('insights_ia')
      .insert({ oferta_id: entrada.oferta_id ?? null, entrada, resultado })
      .select('id, criado_em')
      .single()
    if (error) throw new Error(error.message)
    return Response.json({ ok: true, id: data.id, criado_em: data.criado_em, resultado }, { headers: cors })
  } catch (e) {
    return Response.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 502, headers: cors })
  }
})
