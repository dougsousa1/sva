// Modo ao vivo: lê tudo do Supabase e substitui os dados de demonstração.
import type { SupabaseClient } from '@supabase/supabase-js'
import { isoDate } from '../lib/date'
import { rebuildIndexes } from '../lib/metrics'
import { aparelhos, aprendizados, campanhas, chips, contas, criativos, despesas, insights, ofertas, vendas } from './mock'
import type { Campanha, Chip, MetaStatus, OfertaStatus } from './types'

// deno-style "any" para as linhas cruas do banco
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

async function tudo(sb: SupabaseClient, tabela: string, ordem?: string): Promise<Row[]> {
  const out: Row[] = []
  for (let de = 0; ; de += 1000) {
    let q = sb.from(tabela).select('*').range(de, de + 999)
    if (ordem) q = q.order(ordem, { ascending: false })
    const { data, error } = await q
    if (error) throw new Error(`${tabela}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

const trocar = <T,>(alvo: T[], novos: T[]) => {
  alvo.splice(0, alvo.length, ...novos)
}
const codigoOferta = (nome: string) => nome.match(/\[(OF\d{2,})\]/i)?.[1].toUpperCase() ?? null
const num = (v: unknown) => Number(v ?? 0)
/** timestamptz (UTC) → 'YYYY-MM-DDTHH:MM:SS' no fuso do navegador (Brasil). */
function dataLocal(v: string): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 19)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${isoDate(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export async function carregarAoVivo(sb: SupabaseClient): Promise<{ imposto: number }> {
  const [of, cr, ct, cp, cj, an, ins, ap, ch, vd, dp, apr, cfg] = await Promise.all([
    tudo(sb, 'ofertas'), tudo(sb, 'criativos'), tudo(sb, 'contas_anuncio'), tudo(sb, 'meta_campanhas'),
    tudo(sb, 'meta_conjuntos'), tudo(sb, 'meta_anuncios'), tudo(sb, 'meta_insights_dia'), tudo(sb, 'aparelhos'),
    tudo(sb, 'chips'), tudo(sb, 'vendas', 'data'), tudo(sb, 'despesas', 'data'), tudo(sb, 'aprendizados', 'data'),
    tudo(sb, 'configuracoes'),
  ])
  const ofertaIds = new Set(of.map((o) => o.id))

  trocar(ofertas, of.map((o) => ({
    id: o.id, nome: o.nome, produtoOrigem: o.produto_origem ?? '', fonteValidacao: o.fonte_validacao ?? '', nicho: o.nicho ?? '',
    promessa: o.promessa ?? '', angulo: o.angulo ?? '', ticket: num(o.ticket), status: o.status as OfertaStatus, cor: o.cor,
    leonaProductId: o.leona_product_id ?? undefined, criadaEm: o.criada_em,
  })))
  trocar(criativos, cr.map((c) => ({
    id: c.id, ofertaId: c.oferta_id, tipo: c.tipo, gancho: c.gancho, versao: c.versao, ferramenta: c.ferramenta ?? '',
    duracao: c.duracao ?? undefined, thumbnailUrl: c.thumbnail_url, criadoEm: c.criado_em,
  })))
  trocar(contas, ct.map((c) => ({ id: c.id, nome: c.nome, status: c.status, limiteDiario: num(c.limite_diario) })))

  const conjuntosPorCamp = new Map<string, Row[]>()
  for (const s of cj) conjuntosPorCamp.set(s.campanha_id, [...(conjuntosPorCamp.get(s.campanha_id) ?? []), s])
  const anunciosPorConj = new Map<string, Row[]>()
  for (const a of an) anunciosPorConj.set(a.conjunto_id, [...(anunciosPorConj.get(a.conjunto_id) ?? []), a])
  const camps: Campanha[] = cp.map((c) => {
    const parsed = codigoOferta(c.nome)
    return {
      id: c.id, nome: c.nome, contaId: c.conta_id, status: c.status as MetaStatus, criadaEm: (c.criada_em ?? '').slice(0, 10),
      ofertaId: c.oferta_id ?? (parsed && ofertaIds.has(parsed) ? parsed : null),
      // Uma linha por anúncio (ABO 1-3-1 = 1 anúncio por conjunto; se houver mais, cada um vira uma linha)
      conjuntos: (conjuntosPorCamp.get(c.id) ?? []).flatMap((s) =>
        (anunciosPorConj.get(s.id) ?? []).map((a) => ({
          id: `${s.id}:${a.id}`, nome: s.nome, publico: '', orcamentoDia: num(s.orcamento_dia), status: s.status as MetaStatus,
          anuncio: { id: a.id, nome: a.nome, criativoId: a.criativo_id ?? '', status: a.status as MetaStatus },
        })),
      ),
    }
  })
  camps.sort((a, b) => (a.status === b.status ? (a.criadaEm < b.criadaEm ? 1 : -1) : a.status === 'ativo' ? -1 : 1))
  trocar(campanhas, camps)
  trocar(insights, ins.map((i) => ({
    anuncioId: i.anuncio_id, data: i.data, gasto: num(i.gasto), impressoes: num(i.impressoes), cliques: num(i.cliques), conversas: num(i.conversas),
  })))
  trocar(aparelhos, ap.map((a) => ({ id: a.id, modelo: a.modelo, apelido: a.apelido, status: a.status })))
  const chipsNovos: Chip[] = ch.map((c) => ({
    id: c.id, nome: c.nome, numero: c.numero, operadora: c.operadora ?? '', custo: num(c.custo), compra: c.compra, ativacao: c.ativacao,
    queda: c.queda, motivoQueda: c.motivo_queda ?? undefined, fimUso: c.fim_uso ?? undefined, aparelhoId: c.aparelho_id ?? '',
    ofertaId: c.oferta_id, leonaConnectionId: num(c.leona_connection_id), status: c.status,
  }))
  trocar(chips, chipsNovos)
  const ofertaPorProduto = new Map(of.filter((o) => o.leona_product_id).map((o) => [String(o.leona_product_id), o.id as string]))
  const chipPorConexao = new Map(chipsNovos.filter((c) => c.leonaConnectionId).map((c) => [String(c.leonaConnectionId), c.id]))
  trocar(vendas, vd.map((v) => ({
    id: v.id, data: dataLocal(v.data), valor: num(v.valor),
    ofertaId: ofertaPorProduto.get(String(v.leona_product_id)) ?? (ofertaIds.has(v.produto_nome) ? v.produto_nome : ''), anuncioId: v.anuncio_id,
    chipId: chipPorConexao.get(String(v.leona_connection_id)) ?? '', instancia: v.instancia,
    ddd: v.ddd ?? '', cliente: v.cliente ?? '', origem: v.origem ?? '',
  })))
  trocar(despesas, dp.map((d) => ({ id: d.id, data: d.data, categoria: d.categoria, descricao: d.descricao, valor: num(d.valor), tipo: d.tipo, chipId: d.chip_id ?? undefined })))
  trocar(aprendizados, apr.map((a) => ({
    id: a.id, data: a.data, ofertaId: a.oferta_id, criativoId: a.criativo_id ?? undefined, hipotese: a.hipotese, acao: a.acao,
    resultado: a.resultado, decisao: a.decisao, veredito: a.veredito,
  })))
  rebuildIndexes()
  const imp = cfg.find((c) => c.chave === 'imposto_meta')?.valor
  return { imposto: typeof imp === 'number' ? imp : 0.13 }
}
