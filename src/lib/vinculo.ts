// Descobre a oferta de uma campanha pelo nome que ela já tem no Meta,
// sem precisar renomear nada (ex.: "INTESTINOLEVE ABO 3" → Intestino Leve).
import type { Oferta } from '../data/types'

export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

const PALAVRAS_GENERICAS = new Set(['oferta', 'produto', 'campanha', 'mensagens', 'vendas', 'leve', 'digital'])

/** Devolve o id da oferta mais provável, ou null se não houver um vencedor claro. */
export function ofertaPeloNome(nome: string, ofertas: Oferta[]): string | null {
  const alvo = normalizar(nome)
  let melhor: string | null = null
  let melhorPontos = 0
  let empate = false
  for (const o of ofertas) {
    let pontos = 0
    if (alvo.includes(normalizar(o.nome))) pontos = 100
    else {
      const palavras = o.nome.split(/\s+/).map(normalizar).filter((p) => p.length >= 5 && !PALAVRAS_GENERICAS.has(p))
      pontos = palavras.filter((p) => alvo.includes(p)).length * 10
    }
    if (pontos > melhorPontos) {
      melhor = o.id
      melhorPontos = pontos
      empate = false
    } else if (pontos > 0 && pontos === melhorPontos) empate = true
  }
  return melhorPontos > 0 && !empate ? melhor : null
}
