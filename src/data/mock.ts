// Dados de DEMONSTRAÇÃO. Os produtos são os mesmos da conta Leona; números,
// clientes e IDs são gerados (determinísticos) para visualizar o sistema.
// Quando as integrações forem ligadas, este arquivo é substituído pelo Supabase.
import { addDays, isoDate, TODAY } from '../lib/date'
import type {
  Aparelho,
  Aprendizado,
  Campanha,
  Chip,
  ContaAnuncio,
  Criativo,
  Despesa,
  InsightDia,
  Oferta,
  Venda,
} from './types'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(17804)
const between = (a: number, b: number) => a + rnd() * (b - a)
const int = (a: number, b: number) => Math.floor(between(a, b + 1))
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const digits = (n: number) => Array.from({ length: n }, () => int(0, 9)).join('')

export const DIAS_HISTORICO = 45
const day = (i: number) => isoDate(addDays(TODAY, i - (DIAS_HISTORICO - 1)))
const LAST = DIAS_HISTORICO - 1

// ---------------------------------------------------------------- Ofertas
interface Perfil {
  inicio: number
  fim: number // último dia com tráfego
  custoConversa: number
  conversao: number
  orcamento: number
  campanhas: number
}

const ofertasBase: (Oferta & { perfil?: Perfil })[] = [
  {
    id: 'OF01', nome: 'Receitas AirFryer', produtoOrigem: 'E-book "100 Receitas na AirFryer"',
    fonteValidacao: 'Biblioteca de anúncios — 40+ anúncios ativos há 60 dias', nicho: 'Culinária',
    promessa: '150 receitas práticas em menos de 20 minutos', angulo: 'Economia de tempo e de óleo',
    ticket: 12.9, status: 'escalando', cor: '#22d3ee', leonaProductId: 16629, criadaEm: day(0),
    perfil: { inicio: 0, fim: LAST, custoConversa: 0.62, conversao: 0.13, orcamento: 70, campanhas: 2 },
  },
  {
    id: 'OF02', nome: 'Intestino Leve', produtoOrigem: 'Protocolo SIBO/SIFO',
    fonteValidacao: 'Concorrente escalando no Reels + grupos de saúde', nicho: 'Saúde',
    promessa: 'Barriga desinchada em 7 dias com cardápio guiado', angulo: 'Dor: inchaço e vergonha após comer',
    ticket: 29.9, status: 'escalando', cor: '#a78bfa', leonaProductId: 15494, criadaEm: day(2),
    perfil: { inicio: 2, fim: LAST, custoConversa: 1.45, conversao: 0.11, orcamento: 85, campanhas: 2 },
  },
  {
    id: 'OF03', nome: 'Foto com Santo', produtoOrigem: 'Montagem com imagem religiosa por IA',
    fonteValidacao: 'Viral no TikTok — 2M views em perfis de fé', nicho: 'Religioso',
    promessa: 'Sua foto ao lado do seu santo de devoção, pronta em 5 minutos', angulo: 'Emoção e fé',
    ticket: 9.9, status: 'testando', cor: '#34d399', leonaProductId: 15729, criadaEm: day(20),
    perfil: { inicio: 20, fim: LAST, custoConversa: 0.7, conversao: 0.13, orcamento: 35, campanhas: 1 },
  },
  {
    id: 'OF04', nome: 'Maternidade Leve', produtoOrigem: 'Guia do puerpério',
    fonteValidacao: 'Infoproduto validado em lançamento (Hotmart)', nicho: 'Maternidade',
    promessa: 'Os primeiros 40 dias sem desespero', angulo: 'Acolhimento e rotina do bebê',
    ticket: 19.9, status: 'testando', cor: '#fbbf24', leonaProductId: 16429, criadaEm: day(33),
    perfil: { inicio: 33, fim: LAST, custoConversa: 1.9, conversao: 0.055, orcamento: 30, campanhas: 1 },
  },
  {
    id: 'OF05', nome: 'Lipedema', produtoOrigem: 'Protocolo anti-inflamatório',
    fonteValidacao: 'Comunidade no Facebook com 80k membros', nicho: 'Saúde',
    promessa: 'Pernas mais leves com alimentação anti-inflamatória', angulo: 'Diagnóstico tardio / identificação',
    ticket: 27, status: 'pausada', cor: '#fb7185', leonaProductId: 14619, criadaEm: day(0),
    perfil: { inicio: 0, fim: 31, custoConversa: 2.6, conversao: 0.045, orcamento: 40, campanhas: 1 },
  },
  {
    id: 'OF06', nome: 'Planner Concurseiro', produtoOrigem: 'Planner de estudos em PDF',
    fonteValidacao: 'Top vendas na Kiwify (educação)', nicho: 'Educação',
    promessa: 'Cronograma pronto até a prova', angulo: 'Organização e ansiedade',
    ticket: 14.9, status: 'morta', cor: '#64748b', criadaEm: day(0),
    perfil: { inicio: 0, fim: 11, custoConversa: 3.1, conversao: 0.03, orcamento: 30, campanhas: 1 },
  },
  {
    id: 'OF07', nome: 'Detox 7 Dias', produtoOrigem: 'Cardápio detox (chás e sucos)', nicho: 'Saúde',
    fonteValidacao: 'Anúncio antigo com 1.2k comentários', promessa: 'Menos 3kg em 7 dias de cardápio guiado',
    angulo: 'Resultado rápido antes de evento', ticket: 17.9, status: 'producao', cor: '#38bdf8', criadaEm: day(40),
  },
  {
    id: 'OF08', nome: 'Novena Digital', produtoOrigem: 'Áudios de oração guiada', nicho: 'Religioso',
    fonteValidacao: 'Canal de YouTube com lives diárias de novena', promessa: 'Sua novena completa no WhatsApp, 9 dias',
    angulo: 'Upsell natural da "Foto com Santo"', ticket: 12, status: 'ideia', cor: '#c084fc', criadaEm: day(43),
  },
]

export const ofertas: Oferta[] = ofertasBase.map(({ perfil: _p, ...o }) => o)

// ---------------------------------------------------------------- Criativos
const ganchos: Record<string, string[]> = {
  OF01: ['"Parei de usar óleo e economizei R$ 80/mês"', 'Frango crocante em 12 min', '3 receitas que ninguém te contou', 'POV: sua AirFryer finalmente rende', 'Marmita da semana em 1 hora', 'Bolo de caneca na AirFryer'],
  OF02: ['"Minha barriga desinchou em 4 dias"', 'O erro do café da manhã que incha', 'Médico não te contou isso sobre SIBO', 'Antes x depois: 7 dias', 'Teste: você tem intestino preso?', 'Cardápio que salvou minha digestão'],
  OF03: ['Reação da vó ao ver a foto com N. Sra.', 'Sua foto com São Jorge em 5 min', 'Presente de fé que emociona', 'Mãe chorou com essa foto'],
  OF04: ['"Ninguém me avisou do puerpério"', 'Rotina do bebê de 0 a 40 dias', 'Checklist da mala maternidade'],
  OF05: ['Não é gordura: pode ser lipedema', '5 sinais de lipedema', 'Pernas pesadas no fim do dia?'],
  OF06: ['Cronograma pronto para o INSS', 'Como estudar 4h/dia trabalhando', 'Planner que aprova'],
}
const ferramentas = ['CapCut + ElevenLabs', 'Midjourney + CapCut', 'Higgsfield', 'ChatGPT + Canva', 'Kling + CapCut', 'HeyGen']

export const criativos: Criativo[] = []
let crSeq = 1
for (const o of ofertasBase) {
  const gs = ganchos[o.id]
  if (!gs || !o.perfil) continue
  gs.forEach((g, i) => {
    const tipo = i % 4 === 3 ? 'imagem' : i % 5 === 4 ? 'carrossel' : 'video'
    criativos.push({
      id: `CR${String(crSeq++).padStart(3, '0')}`,
      ofertaId: o.id,
      tipo,
      gancho: g,
      versao: i > 2 ? 2 : 1,
      ferramenta: pick(ferramentas),
      duracao: tipo === 'video' ? int(12, 45) : undefined,
      criadoEm: day(Math.min(LAST, o.perfil!.inicio + (i >= 3 ? 12 : 0))),
    })
  })
}

// ---------------------------------------------------------------- Meta
export const contas: ContaAnuncio[] = [
  { id: 'act_1092847562', nome: 'CA Principal — SVA', status: 'ativa', limiteDiario: 2500 },
]

const publicos = ['Aberto BR 25-55', 'Mulheres 30-60', 'Interesses: nicho', 'Advantage+ público', 'LAL 1% compradores']
const metaId = () => `120250${digits(12)}`
const qualidade: Record<string, number> = {}
const inicioAnuncio: Record<string, number> = {}
const ofertaDoAnuncio: Record<string, string> = {}

export const campanhas: Campanha[] = []
for (const o of ofertasBase) {
  if (!o.perfil) continue
  const crs = criativos.filter((c) => c.ofertaId === o.id)
  for (let c = 0; c < o.perfil.campanhas; c++) {
    const inicio = o.perfil.inicio + c * 14
    if (inicio > LAST - 3) continue
    const ativa = o.perfil.fim === LAST
    const slug = o.nome.toUpperCase().replace(/\s+/g, '-')
    const camp: Campanha = {
      id: metaId(),
      nome: `[${o.id}] ${slug} | ABO | C0${c + 1} | ${day(inicio)}`,
      ofertaId: o.id,
      contaId: contas[0].id,
      status: ativa ? 'ativo' : 'pausado',
      criadaEm: day(inicio),
      conjuntos: [],
    }
    for (let j = 0; j < 3; j++) {
      const cr = crs[(c * 3 + j) % crs.length]
      const adId = metaId()
      qualidade[adId] = between(0.6, 1.45)
      inicioAnuncio[adId] = inicio
      ofertaDoAnuncio[adId] = o.id
      const reprovado = o.id === 'OF02' && c === 1 && j === 2
      camp.conjuntos.push({
        id: metaId(),
        nome: `[${o.id}] C0${c + 1} | CJ${j + 1} | ${publicos[(j + c) % publicos.length]}`,
        publico: publicos[(j + c) % publicos.length],
        orcamentoDia: Math.round(o.perfil.orcamento * between(0.8, 1.2)),
        status: camp.status,
        anuncio: {
          id: adId,
          nome: `[${o.id}] ${cr.id} v${cr.versao} | ${cr.gancho.replace(/"/g, '').slice(0, 28)}`,
          criativoId: cr.id,
          status: reprovado ? 'reprovado' : camp.status,
        },
      })
    }
    campanhas.push(camp)
  }
}
// Campanha fora do padrão de nomes (para mostrar o "sem vínculo")
{
  const adId = metaId()
  qualidade[adId] = 0.9
  inicioAnuncio[adId] = LAST - 4
  ofertaDoAnuncio[adId] = 'OF01'
  campanhas.push({
    id: metaId(),
    nome: 'Campanha de Mensagens - Cópia',
    ofertaId: null,
    contaId: contas[0].id,
    status: 'ativo',
    criadaEm: day(LAST - 4),
    conjuntos: [
      {
        id: metaId(), nome: 'Novo conjunto de anúncios', publico: 'Aberto BR', orcamentoDia: 25, status: 'ativo',
        anuncio: { id: adId, nome: 'Novo anúncio de mensagens', criativoId: 'CR002', status: 'ativo' },
      },
    ],
  })
}

// ---------------------------------------------------------------- Chips & aparelhos
export const aparelhos: Aparelho[] = [
  { id: 'AP1', modelo: 'Motorola Moto G24', apelido: 'WPP1-Motorola', status: 'ok' },
  { id: 'AP2', modelo: 'Samsung Galaxy A15', apelido: 'Samsung Preto', status: 'ok' },
  { id: 'AP3', modelo: 'Xiaomi Redmi 13C', apelido: 'Redmi Azul', status: 'ok' },
  { id: 'AP4', modelo: 'Samsung Galaxy A05s', apelido: 'Samsung Branco', status: 'ok' },
  { id: 'AP5', modelo: 'Motorola Moto E14', apelido: 'Moto Reserva', status: 'ok' },
]
const operadoras = ['Vivo', 'Claro', 'TIM', 'TIM', 'Claro']
const motivos = ['Banido pelo WhatsApp', 'Restrição de envio', 'Banido pelo WhatsApp', 'Desconectou e não voltou', 'Denúncias em massa']
const ddds = ['61', '85', '11', '71', '98', '81', '21', '62']
const nomesReais: Record<string, string> = { OF01: 'WPP1-Motorola', OF02: 'OF2 - SIBO/SIFO', OF03: 'OF3 - Fotos' }

export const chips: Chip[] = []
let chipSeq = 1
let apSeq = 0
const novoNumero = () => `55${pick(ddds)}9${digits(8)}`
for (const o of ofertasBase) {
  if (!o.perfil) continue
  const lanes = o.status === 'escalando' ? 2 : 1
  for (let lane = 0; lane < lanes; lane++) {
    let t = o.perfil.inicio
    let n = 0
    while (t <= o.perfil.fim) {
      const vida = int(3, 15)
      const queda = t + vida
      const ap = aparelhos[apSeq++ % aparelhos.length]
      const id = `CH${String(chipSeq++).padStart(2, '0')}`
      const nome = n === 0 && lane === 0 && nomesReais[o.id] ? nomesReais[o.id] : `${o.id} · ${o.nome.split(' ')[0]} #${String(n + 1).padStart(2, '0')}${lane ? 'B' : ''}`
      const base = {
        id, nome, numero: novoNumero(), operadora: pick(operadoras), custo: 15,
        compra: day(Math.max(0, t - int(0, 2))), ativacao: day(t), aparelhoId: ap.id, ofertaId: o.id,
        leonaConnectionId: int(64000, 71000),
      }
      if (queda > o.perfil.fim) {
        if (o.perfil.fim === LAST) {
          chips.push({ ...base, queda: null, status: 'ativo' })
        } else {
          // oferta pausada: chip ficou parado na reserva
          chips.push({ ...base, queda: null, status: 'reserva', fimUso: day(o.perfil.fim) })
        }
        break
      }
      chips.push({ ...base, queda: day(queda), motivoQueda: pick(motivos), status: 'caiu' })
      t = queda + (rnd() < 0.3 ? 1 : 0)
      n++
    }
  }
}
for (let i = 0; i < 3; i++) {
  chips.push({
    id: `CH${String(chipSeq++).padStart(2, '0')}`, nome: `Reserva #${i + 1}`, numero: novoNumero(),
    operadora: pick(operadoras), custo: 15, compra: day(LAST - int(0, 3)), ativacao: null, queda: null,
    aparelhoId: 'AP5', ofertaId: null, leonaConnectionId: 0, status: 'reserva',
  })
}

// ---------------------------------------------------------------- Insights + vendas
const primeiros = ['Ana', 'Maria', 'José', 'Francisca', 'Antônio', 'Joana', 'Raimunda', 'Paulo', 'Luzia', 'Carlos', 'Márcia', 'Sebastião', 'Rita', 'João', 'Aparecida', 'Cláudia', 'Edna', 'Marcos', 'Rosângela', 'Valdir', 'Simone', 'Jaqueline', 'Eliane', 'Roberto']
const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Gomes', 'Barbosa']
const dddsVenda = ['11', '11', '21', '71', '71', '81', '85', '85', '98', '61', '31', '62', '91', '27', '92', '51', '41', '84', '83', '86']
const horaPeso = [0.3, 0.2, 0.1, 0.1, 0.1, 0.2, 0.5, 1, 1.4, 1.6, 1.7, 1.8, 2.2, 2.0, 1.6, 1.5, 1.5, 1.7, 2.1, 2.6, 3.0, 2.9, 2.2, 1.1]
const horaTotal = horaPeso.reduce((a, b) => a + b, 0)
function hora() {
  let r = rnd() * horaTotal
  for (let h = 0; h < 24; h++) {
    r -= horaPeso[h]
    if (r <= 0) return h
  }
  return 20
}

export const insights: InsightDia[] = []
export const vendas: Venda[] = []
let vendaId = 9_904_120
const perfilDe = Object.fromEntries(ofertasBase.filter((o) => o.perfil).map((o) => [o.id, o.perfil!]))
const ticketDe = Object.fromEntries(ofertasBase.map((o) => [o.id, o.ticket]))

function chipAtivo(ofertaId: string, d: string): string {
  const vivos = chips.filter(
    (c) => c.ofertaId === ofertaId && c.ativacao && c.ativacao <= d && (!c.queda || c.queda > d) && (!c.fimUso || c.fimUso >= d),
  )
  return (vivos.length ? pick(vivos) : chips.find((c) => c.ofertaId === ofertaId)!).id
}

for (const camp of campanhas) {
  for (const cj of camp.conjuntos) {
    const ad = cj.anuncio
    const of = ofertaDoAnuncio[ad.id]
    const p = perfilDe[of]
    for (let i = inicioAnuncio[ad.id]; i <= p.fim; i++) {
      const d = day(i)
      const idade = i - inicioAnuncio[ad.id]
      const fadiga = idade > 14 ? Math.max(0.55, 1 - (idade - 14) * 0.025) : 1
      const parcial = i === LAST ? 0.62 : 1
      const reprovado = ad.status === 'reprovado' && i > LAST - 3
      if (reprovado) continue
      const gasto = +(cj.orcamentoDia * between(0.82, 1.04) * parcial).toFixed(2)
      const q = qualidade[ad.id] * fadiga
      const conversas = Math.max(0, Math.round((gasto / (p.custoConversa / q)) * between(0.85, 1.15)))
      const cliques = Math.round(conversas * between(1.3, 1.9))
      const impressoes = Math.round(cliques / between(0.011, 0.024))
      insights.push({ anuncioId: ad.id, data: d, gasto, impressoes, cliques, conversas })
      const taxa = p.conversao * Math.min(1.35, Math.max(0.6, q))
      for (let k = 0; k < conversas; k++) {
        if (rnd() > taxa) continue
        const h = hora()
        if (i === LAST && h > new Date().getHours()) continue
        const bump = rnd() < 0.16 ? 10 : 0
        const valor = +(ticketDe[of] + bump).toFixed(2)
        vendas.push({
          id: vendaId++,
          data: `${d}T${String(h).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00`,
          valor,
          ofertaId: of,
          anuncioId: rnd() < 0.05 ? null : ad.id,
          chipId: chipAtivo(of, d),
          ddd: pick(dddsVenda),
          cliente: `${pick(primeiros)} ${pick(sobrenomes)} ${pick(sobrenomes)}`,
          origem: rnd() < 0.85 ? 'approved_sale' : 'ai_receipt',
        })
      }
    }
  }
}
vendas.sort((a, b) => (a.data < b.data ? 1 : -1))

// ---------------------------------------------------------------- Despesas
export const despesas: Despesa[] = []
let dSeq = 1
const did = () => `DP${String(dSeq++).padStart(3, '0')}`
for (const c of chips) {
  despesas.push({ id: did(), data: c.compra, categoria: 'chips', descricao: `Chip ${c.operadora} — ${c.nome}`, valor: c.custo, tipo: 'pontual', chipId: c.id })
}
despesas.push(
  { id: did(), data: day(3), categoria: 'aparelhos', descricao: 'Samsung Galaxy A15 (Pix)', valor: 899, tipo: 'pontual' },
  { id: did(), data: day(18), categoria: 'aparelhos', descricao: 'Xiaomi Redmi 13C (Pix)', valor: 749, tipo: 'pontual' },
  { id: did(), data: day(36), categoria: 'aparelhos', descricao: 'Motorola Moto E14 (Pix)', valor: 599, tipo: 'pontual' },
)
const recorrentes: [number, Despesa['categoria'], string, number][] = [
  [5, 'plataforma', 'Leona — plano mensal', 297],
  [8, 'ia', 'ChatGPT Plus', 110],
  [12, 'ia', 'CapCut Pro', 32.9],
  [15, 'ia', 'ElevenLabs Creator', 116],
  [20, 'outros', 'Proxy / VPN dos aparelhos', 45],
]
for (let i = 0; i < DIAS_HISTORICO; i++) {
  const dt = addDays(TODAY, i - (DIAS_HISTORICO - 1))
  for (const [dia, categoria, descricao, valor] of recorrentes) {
    if (dt.getDate() === dia) despesas.push({ id: did(), data: isoDate(dt), categoria, descricao, valor, tipo: 'recorrente_mensal' })
  }
}
despesas.sort((a, b) => (a.data < b.data ? 1 : -1))

// ---------------------------------------------------------------- Aprendizados
const crDe = (of: string, n: number) => criativos.filter((c) => c.ofertaId === of)[n]?.id
export const aprendizados: Aprendizado[] = [
  {
    id: 'AP-07', data: day(LAST - 2), ofertaId: 'OF02', criativoId: crDe('OF02', 0),
    hipotese: 'Depoimento em primeira pessoa converte mais que vídeo explicativo de médico.',
    acao: 'Rodamos CR com depoimento ("Minha barriga desinchou em 4 dias") contra o explicativo, mesmo público.',
    resultado: 'Custo por conversa 31% menor e conversão no WhatsApp 2,1× maior.',
    decisao: 'Escalar depoimentos. Gerar 3 variações com vozes diferentes no ElevenLabs.', veredito: 'ganhou',
  },
  {
    id: 'AP-06', data: day(LAST - 5), ofertaId: 'OF03', criativoId: crDe('OF03', 0),
    hipotese: 'Vídeo de reação (vó chorando) gera mais conversas que só mostrar a montagem.',
    acao: 'Teste 1-3-1 com 3 ganchos de reação vs. 0 de demonstração.',
    resultado: 'Reação: R$ 0,58/conversa. Demonstração (teste anterior): R$ 1,10.',
    decisao: 'Padrão para a oferta: sempre abrir com reação. Testar upsell de Novena (OF08).', veredito: 'ganhou',
  },
  {
    id: 'AP-05', data: day(LAST - 9), ofertaId: 'OF04',
    hipotese: 'Público de mães de primeira viagem compra guia de puerpério a R$ 19,90.',
    acao: 'Subimos 3 conjuntos com interesses de gestação/bebê.',
    resultado: 'Muitas conversas, mas conversão de 5% — CPA acima do ticket.',
    decisao: 'Remodelar oferta: ticket R$ 9,90 + order bump do checklist.', veredito: 'perdeu',
  },
  {
    id: 'AP-04', data: day(LAST - 13), ofertaId: 'OF05',
    hipotese: 'Ângulo de "diagnóstico tardio" sustenta a oferta de Lipedema.',
    acao: '30 dias rodando, 3 criativos, 2 renovações de chip.',
    resultado: 'ROAS médio 0,9 e 4 chips caídos — denúncias por tema de saúde.',
    decisao: 'Pausar. Revisitar com prova social real antes de voltar.', veredito: 'perdeu',
  },
  {
    id: 'AP-03', data: day(LAST - 20), ofertaId: 'OF01',
    hipotese: 'Dois chips por oferta (lanes A/B) evitam perder vendas quando um cai.',
    acao: 'OF01 e OF02 passaram a rodar com 2 chips em paralelo.',
    resultado: 'Zero horas de anúncio rodando sem número; vendas por dia mais estáveis.',
    decisao: 'Regra: oferta em escala sempre com 2 chips + 1 reserva.', veredito: 'ganhou',
  },
  {
    id: 'AP-02', data: day(LAST - 31), ofertaId: 'OF06',
    hipotese: 'Planner para concurso vende em público frio por mensagem.',
    acao: '12 dias de teste, 3 ganchos.',
    resultado: 'Custo por conversa de R$ 3+ e conversão de 3%. Público pede PDF grátis.',
    decisao: 'Matar a oferta. Nicho não combina com venda por WhatsApp a frio.', veredito: 'perdeu',
  },
  {
    id: 'AP-01', data: day(LAST - 38), ofertaId: 'OF01', criativoId: crDe('OF01', 0),
    hipotese: 'Gancho de economia ("parei de usar óleo") bate gancho de receita.',
    acao: 'Mesmo vídeo, só trocando os 3 primeiros segundos.',
    resultado: 'Empate técnico em custo por conversa; economia vendeu 12% mais.',
    decisao: 'Manter os dois e testar novas aberturas a cada 10 dias.', veredito: 'neutro',
  },
]
