// Modelo de dados do SVA — espelha docs/PLANO_SISTEMA.md (seção 8).
// Hoje é alimentado por dados de demonstração (mock.ts); depois vira Supabase.

export type OfertaStatus = 'ideia' | 'producao' | 'testando' | 'escalando' | 'pausada' | 'morta'

export interface Oferta {
  id: string // código usado no nome das campanhas, ex.: OF02
  nome: string
  produtoOrigem: string // produto validado que inspirou a remodelagem
  fonteValidacao: string
  nicho: string
  promessa: string
  angulo: string
  ticket: number
  status: OfertaStatus
  cor: string
  leonaProductId?: number
  criadaEm: string
}

export type CriativoTipo = 'video' | 'imagem' | 'carrossel'

export interface Criativo {
  id: string // CR014
  ofertaId: string | null
  tipo: CriativoTipo
  gancho: string
  versao: number
  ferramenta: string
  duracao?: number
  thumbnailUrl?: string | null
  imagemUrl?: string | null
  videoUrl?: string | null
  previewLink?: string | null
  criadoEm: string
}

export type MetaStatus = 'ativo' | 'pausado' | 'reprovado'

export interface Anuncio {
  id: string // ID do anúncio no Meta (= source_id da venda na Leona)
  nome: string
  criativoId: string
  status: MetaStatus
}

export interface Conjunto {
  id: string
  nome: string
  publico: string
  orcamentoDia: number
  status: MetaStatus
  anuncio: Anuncio
}

export interface Campanha {
  id: string
  nome: string
  ofertaId: string | null // null = sem oferta
  /** como a oferta foi ligada: escolhida à mão, código [OFxx] no nome, ou reconhecida pelo nome */
  vinculo?: 'manual' | 'codigo' | 'auto' | null
  contaId: string
  status: MetaStatus
  criadaEm: string
  conjuntos: Conjunto[]
}

export interface InsightDia {
  anuncioId: string
  data: string // YYYY-MM-DD
  gasto: number // sem imposto (como a API do Meta retorna)
  impressoes: number
  cliques: number
  conversas: number
}

export type ChipStatus = 'ativo' | 'caiu' | 'reserva'

export interface Chip {
  id: string
  nome: string // nome da conexão na Leona
  numero: string
  operadora: string
  custo: number
  compra: string
  ativacao: string | null
  queda: string | null
  motivoQueda?: string
  fimUso?: string // chip tirado de operação sem cair (ex.: oferta pausada)
  aparelhoId: string
  ofertaId: string | null
  leonaConnectionId: number
  status: ChipStatus
}

export interface Aparelho {
  id: string
  modelo: string
  apelido: string
  status: 'ok' | 'manutencao'
}

export interface Venda {
  id: string | number
  data: string // ISO com horário
  valor: number
  ofertaId: string
  anuncioId: string | null
  chipId: string
  instancia?: string | null
  ddd: string
  cliente: string
  origem: string
}

export type DespesaCategoria = 'chips' | 'aparelhos' | 'plataforma' | 'ia' | 'outros'

export interface Despesa {
  id: string
  data: string
  categoria: DespesaCategoria
  descricao: string
  valor: number
  tipo: 'pontual' | 'recorrente_mensal'
  chipId?: string
}

export interface Aprendizado {
  id: string
  data: string
  ofertaId: string
  criativoId?: string
  hipotese: string
  acao: string
  resultado: string
  decisao: string
  veredito: 'ganhou' | 'perdeu' | 'neutro'
}

export interface ContaAnuncio {
  id: string
  nome: string
  status: 'ativa' | 'restrita' | 'desativada'
  limiteDiario: number
}

// ---------------------------------------------------------------- Radar (Biblioteca de Anúncios)
export interface RadarPalavra {
  id: string
  termo: string
  ofertaId: string | null
  ativo: boolean
  limite: number
  ultimaBusca: string | null
}

export type RadarStatus = 'novo' | 'salvo' | 'descartado' | 'modelado'

export interface RadarAnuncio {
  id: string // ID do anúncio na Biblioteca
  palavraId: string | null
  termo: string
  ofertaId: string | null
  paginaNome: string
  paginaFoto: string | null
  titulo: string | null
  texto: string
  cta: string | null
  link: string | null
  imagemUrl: string | null
  videoUrl: string | null
  inicio: string | null
  ativo: boolean
  variacoes: number
  plataformas: string[]
  preco: number | null
  whatsapp: boolean
  nota: number
  status: RadarStatus
}

export interface RadarExecucao {
  id: string
  termo: string
  status: 'rodando' | 'concluida' | 'falhou'
  itens: number | null
  iniciadoEm: string
}
