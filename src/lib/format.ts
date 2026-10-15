const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const int = new Intl.NumberFormat('pt-BR')
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

export const money = (v: number) => brl.format(v)
export const money0 = (v: number) => brl0.format(v)
export const num = (v: number) => int.format(Math.round(v))
export const short = (v: number) => compact.format(v)
export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d).replace('.', ',')}%`
export const x2 = (v: number) => `${v.toFixed(2).replace('.', ',')}x`

const dm = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const dmy = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
export const dataCurta = (s: string) => dm.format(new Date(s.length === 10 ? `${s}T12:00:00` : s))
export const dataMes = (s: string) => dmy.format(new Date(s.length === 10 ? `${s}T12:00:00` : s)).replace('.', '')
export const hora = (s: string) => s.slice(11, 16)
export const telefone = (n: string) => {
  const m = n.match(/^55(\d{2})(\d{5})(\d{4})$/)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : n
}
