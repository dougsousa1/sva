// Regras de cálculo — docs/PLANO_SISTEMA.md seção 6.
// Nível 1: margem por oferta = receita − tráfego c/ imposto − chips
// Nível 2: lucro do período = Σ margens − fixos mensais − despesas pontuais (exceto chips)
import { campanhas, chips, criativos, despesas, insights, ofertas, vendas } from '../data/mock'
import type { Anuncio, Campanha, Chip, Conjunto } from '../data/types'
import { addDays, diffDays, isoDate, parseDate, TODAY_ISO } from './date'

export interface Periodo {
  inicio: string
  fim: string
}

export const inPeriodo = (d: string, p: Periodo) => d.slice(0, 10) >= p.inicio && d.slice(0, 10) <= p.fim

export function diasDo(p: Periodo): string[] {
  const out: string[] = []
  for (let d = parseDate(p.inicio); isoDate(d) <= p.fim; d = addDays(d, 1)) out.push(isoDate(d))
  return out
}

// ---------------------------------------------------------------- índices
export interface AdInfo {
  anuncio: Anuncio
  conjunto: Conjunto
  campanha: Campanha
  ofertaId: string | null
}
export const adIndex = new Map<string, AdInfo>()
for (const campanha of campanhas)
  for (const conjunto of campanha.conjuntos)
    adIndex.set(conjunto.anuncio.id, { anuncio: conjunto.anuncio, conjunto, campanha, ofertaId: campanha.ofertaId })

export const ofertaById = new Map(ofertas.map((o) => [o.id, o]))
export const criativoById = new Map(criativos.map((c) => [c.id, c]))
export const chipById = new Map(chips.map((c) => [c.id, c]))

// ---------------------------------------------------------------- chips
const caidos = chips.filter((c) => c.queda && c.ativacao)
export const VIDA_MEDIA_CHIP = caidos.length
  ? caidos.reduce((s, c) => s + diffDays(c.ativacao!, c.queda!), 0) / caidos.length
  : 8

export function vidaChip(c: Chip): number {
  if (!c.ativacao) return 0
  if (c.queda) return diffDays(c.ativacao, c.queda)
  if (c.fimUso) return diffDays(c.ativacao, c.fimUso) + 1
  return diffDays(c.ativacao, TODAY_ISO) + 1
}

/** Último dia em que o chip esteve em operação. */
export function fimOperacao(c: Chip): string | null {
  if (!c.ativacao) return null
  if (c.queda) return isoDate(addDays(parseDate(c.queda), -1))
  return c.fimUso ?? TODAY_ISO
}

/** Custo diário do chip: custo ÷ vida (chips vivos usam a vida média como estimativa). */
export function custoDiaChip(c: Chip): number {
  if (!c.ativacao) return 0
  const vida = c.queda || c.fimUso ? vidaChip(c) : Math.max(vidaChip(c), VIDA_MEDIA_CHIP)
  return c.custo / Math.max(1, vida)
}

function custoChipsNoDia(d: string, ofertaId?: string): number {
  let s = 0
  for (const c of chips) {
    if (!c.ativacao || !c.ofertaId) continue
    if (ofertaId && c.ofertaId !== ofertaId) continue
    const fim = fimOperacao(c)!
    if (d >= c.ativacao && d <= fim) s += custoDiaChip(c)
  }
  return s
}

// ---------------------------------------------------------------- agregações
export interface Metricas {
  gasto: number
  gastoImp: number
  impressoes: number
  cliques: number
  conversas: number
  vendas: number
  receita: number
  chips: number
  margem: number
  roas: number
  cpa: number
  custoConversa: number
  conversao: number
  ticketMedio: number
  ctr: number
}

function fechar(m: Omit<Metricas, 'margem' | 'roas' | 'cpa' | 'custoConversa' | 'conversao' | 'ticketMedio' | 'ctr'>): Metricas {
  return {
    ...m,
    margem: m.receita - m.gastoImp - m.chips,
    roas: m.gastoImp ? m.receita / m.gastoImp : 0,
    cpa: m.vendas ? (m.gastoImp + m.chips) / m.vendas : 0,
    custoConversa: m.conversas ? m.gastoImp / m.conversas : 0,
    conversao: m.conversas ? m.vendas / m.conversas : 0,
    ticketMedio: m.vendas ? m.receita / m.vendas : 0,
    ctr: m.impressoes ? m.cliques / m.impressoes : 0,
  }
}

const zero = () => ({ gasto: 0, gastoImp: 0, impressoes: 0, cliques: 0, conversas: 0, vendas: 0, receita: 0, chips: 0 })

export function metricasOferta(ofertaId: string | null, p: Periodo, imposto: number): Metricas {
  const m = zero()
  for (const i of insights) {
    if (!inPeriodo(i.data, p)) continue
    const info = adIndex.get(i.anuncioId)
    if (ofertaId !== null && info?.ofertaId !== ofertaId) continue
    m.gasto += i.gasto
    m.impressoes += i.impressoes
    m.cliques += i.cliques
    m.conversas += i.conversas
  }
  for (const v of vendas) {
    if (!inPeriodo(v.data, p)) continue
    if (ofertaId !== null && v.ofertaId !== ofertaId) continue
    m.vendas++
    m.receita += v.valor
  }
  for (const d of diasDo(p)) m.chips += custoChipsNoDia(d, ofertaId ?? undefined)
  m.gastoImp = m.gasto * (1 + imposto)
  return fechar(m)
}

export const metricasGerais = (p: Periodo, imposto: number) => metricasOferta(null, p, imposto)

export interface PontoDia {
  data: string
  receita: number
  gasto: number
  chips: number
  margem: number
  vendas: number
  conversas: number
}

export function serieDiaria(p: Periodo, imposto: number, ofertaId?: string): PontoDia[] {
  const map = new Map<string, PontoDia>()
  for (const d of diasDo(p)) map.set(d, { data: d, receita: 0, gasto: 0, chips: custoChipsNoDia(d, ofertaId), margem: 0, vendas: 0, conversas: 0 })
  for (const i of insights) {
    const pt = map.get(i.data)
    if (!pt) continue
    if (ofertaId && adIndex.get(i.anuncioId)?.ofertaId !== ofertaId) continue
    pt.gasto += i.gasto * (1 + imposto)
    pt.conversas += i.conversas
  }
  for (const v of vendas) {
    const pt = map.get(v.data.slice(0, 10))
    if (!pt) continue
    if (ofertaId && v.ofertaId !== ofertaId) continue
    pt.receita += v.valor
    pt.vendas++
  }
  return [...map.values()].map((pt) => ({ ...pt, margem: pt.receita - pt.gasto - pt.chips }))
}

export interface MetricasAnuncio extends Metricas {
  info: AdInfo
  cpaRecente: number
  cpaAnterior: number
  fadiga: boolean
  serie: number[]
}

export function metricasAnuncios(p: Periodo, imposto: number): MetricasAnuncio[] {
  const fim = p.fim
  const r3 = isoDate(addDays(parseDate(fim), -2))
  const a3 = isoDate(addDays(parseDate(fim), -5))
  const out: MetricasAnuncio[] = []
  for (const [adId, info] of adIndex) {
    const m = zero()
    let gR = 0, vR = 0, gA = 0, vA = 0
    const porDia = new Map<string, number>()
    for (const i of insights) {
      if (i.anuncioId !== adId) continue
      if (i.data >= r3 && i.data <= fim) gR += i.gasto
      else if (i.data >= a3 && i.data < r3) gA += i.gasto
      if (!inPeriodo(i.data, p)) continue
      m.gasto += i.gasto
      m.impressoes += i.impressoes
      m.cliques += i.cliques
      m.conversas += i.conversas
    }
    for (const v of vendas) {
      if (v.anuncioId !== adId) continue
      const d = v.data.slice(0, 10)
      if (d >= r3 && d <= fim) vR++
      else if (d >= a3 && d < r3) vA++
      if (!inPeriodo(v.data, p)) continue
      m.vendas++
      m.receita += v.valor
      porDia.set(d, (porDia.get(d) ?? 0) + v.valor)
    }
    m.gastoImp = m.gasto * (1 + imposto)
    const cpaRecente = vR ? (gR * (1 + imposto)) / vR : gR > 0 ? Infinity : 0
    const cpaAnterior = vA ? (gA * (1 + imposto)) / vA : 0
    if (m.gasto === 0 && info.anuncio.status !== 'ativo') continue
    out.push({
      ...fechar(m),
      info,
      cpaRecente,
      cpaAnterior,
      fadiga: info.anuncio.status === 'ativo' && cpaAnterior > 0 && cpaRecente > cpaAnterior * 1.3,
      serie: diasDo(p).slice(-14).map((d) => porDia.get(d) ?? 0),
    })
  }
  return out
}

// ---------------------------------------------------------------- resultado do período (nível 2)
export function resultadoPeriodo(p: Periodo, imposto: number) {
  const geral = metricasGerais(p, imposto)
  const desp = despesas.filter((d) => inPeriodo(d.data, p))
  const fixos = desp.filter((d) => d.tipo === 'recorrente_mensal').reduce((s, d) => s + d.valor, 0)
  const pontuais = desp.filter((d) => d.tipo === 'pontual' && d.categoria !== 'chips').reduce((s, d) => s + d.valor, 0)
  const fixosMes = [...new Map(despesas.filter((d) => d.tipo === 'recorrente_mensal').map((d) => [d.descricao, d.valor])).values()].reduce((s, v) => s + v, 0)
  return {
    geral,
    fixos,
    pontuais,
    lucro: geral.margem - fixos - pontuais,
    fixosMes,
    equilibrioDia: fixosMes / 30,
  }
}

// ---------------------------------------------------------------- alertas
export interface Alerta {
  id: string
  nivel: 'critico' | 'atencao' | 'oportunidade'
  titulo: string
  detalhe: string
  quando: string
}

export function gerarAlertas(imposto: number): Alerta[] {
  const out: Alerta[] = []
  const ontem = isoDate(addDays(parseDate(TODAY_ISO), -1))
  for (const c of chips) {
    if (c.queda && c.queda >= isoDate(addDays(parseDate(TODAY_ISO), -2))) {
      const o = c.ofertaId ? ofertaById.get(c.ofertaId)?.nome : ''
      out.push({ id: `chip-${c.id}`, nivel: 'critico', titulo: `Chip caiu — ${c.nome}`, detalhe: `${c.motivoQueda}. Atendia ${o}. Viveu ${vidaChip(c)} dias.`, quando: c.queda })
    }
  }
  const reserva = chips.filter((c) => c.status === 'reserva' && !c.ativacao).length
  if (reserva < 4) out.push({ id: 'estoque', nivel: 'atencao', titulo: `Estoque de chips baixo (${reserva})`, detalhe: 'Recomendado: 1 reserva por oferta ativa + 1.', quando: TODAY_ISO })

  const p7: Periodo = { inicio: isoDate(addDays(parseDate(TODAY_ISO), -6)), fim: TODAY_ISO }
  for (const a of metricasAnuncios(p7, imposto)) {
    if (a.info.anuncio.status === 'reprovado')
      out.push({ id: `rep-${a.info.anuncio.id}`, nivel: 'critico', titulo: 'Anúncio reprovado', detalhe: a.info.anuncio.nome, quando: ontem })
    else if (a.fadiga)
      out.push({ id: `fad-${a.info.anuncio.id}`, nivel: 'atencao', titulo: 'Fadiga de criativo', detalhe: `${a.info.anuncio.nome} — CPA subiu ${(((a.cpaRecente === Infinity ? a.cpaAnterior * 2 : a.cpaRecente) / a.cpaAnterior - 1) * 100).toFixed(0)}% vs 3 dias anteriores.`, quando: TODAY_ISO })
  }
  for (const o of ofertas) {
    if (o.status !== 'escalando' && o.status !== 'testando') continue
    const m = metricasOferta(o.id, { inicio: isoDate(addDays(parseDate(TODAY_ISO), -2)), fim: TODAY_ISO }, imposto)
    if (m.vendas && m.cpa > m.ticketMedio)
      out.push({ id: `cpa-${o.id}`, nivel: 'atencao', titulo: `CPA acima do ticket — ${o.nome}`, detalhe: `CPA R$ ${m.cpa.toFixed(2)} vs ticket R$ ${m.ticketMedio.toFixed(2)} nos últimos 3 dias.`, quando: TODAY_ISO })
    else if (m.roas >= 2)
      out.push({ id: `esc-${o.id}`, nivel: 'oportunidade', titulo: `Escalar ${o.nome}`, detalhe: `ROAS ${m.roas.toFixed(2)} nos últimos 3 dias. Sugestão: duplicar o melhor conjunto.`, quando: TODAY_ISO })
  }
  const semVinculo = campanhas.filter((c) => !c.ofertaId && c.status === 'ativo')
  for (const c of semVinculo)
    out.push({ id: `nome-${c.id}`, nivel: 'atencao', titulo: 'Campanha fora do padrão de nomes', detalhe: `"${c.nome}" não tem código [OFxx] — vincule a uma oferta.`, quando: c.criadaEm })
  const ordem = { critico: 0, atencao: 1, oportunidade: 2 }
  return out.sort((a, b) => ordem[a.nivel] - ordem[b.nivel])
}
