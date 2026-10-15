import clsx from 'clsx'
import { Plus, Receipt, Repeat, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { despesas as base } from '../data/mock'
import type { Despesa, DespesaCategoria } from '../data/types'
import { useApp } from '../lib/app-context'
import { TODAY_ISO } from '../lib/date'
import { dataCurta, money, money0 } from '../lib/format'
import { inPeriodo, metricasGerais } from '../lib/metrics'
import { ChartTip, Kpi, PageHeader, Panel, PanelHeader, Pill, Td, Th } from '../components/ui'

const cats: Record<DespesaCategoria | 'trafego' | 'imposto', { l: string; c: string }> = {
  trafego: { l: 'Tráfego Meta', c: '#a78bfa' },
  imposto: { l: 'Imposto Meta', c: '#c084fc' },
  chips: { l: 'Chips', c: '#fbbf24' },
  aparelhos: { l: 'Aparelhos', c: '#64748b' },
  plataforma: { l: 'Plataforma (Leona)', c: '#38bdf8' },
  ia: { l: 'Ferramentas de IA', c: '#22d3ee' },
  outros: { l: 'Outros', c: '#fb7185' },
}

export default function Despesas() {
  const { periodo, imposto } = useApp()
  const [extras, setExtras] = useState<Despesa[]>([])
  const [form, setForm] = useState(false)
  const todas = useMemo(() => [...extras, ...base], [extras])
  const lista = todas.filter((d) => inPeriodo(d.data, periodo))
  const g = metricasGerais(periodo, imposto)

  const porCat = useMemo(() => {
    const m: Record<string, number> = { trafego: g.gasto, imposto: g.gasto * imposto }
    for (const d of lista) m[d.categoria] = (m[d.categoria] ?? 0) + d.valor
    return Object.entries(m).filter(([, v]) => v > 0).map(([k, v]) => ({ k, name: cats[k as keyof typeof cats].l, value: v, cor: cats[k as keyof typeof cats].c })).sort((a, b) => b.value - a.value)
  }, [lista, g.gasto, imposto])
  const total = porCat.reduce((s, x) => s + x.value, 0)
  const fixos = lista.filter((d) => d.tipo === 'recorrente_mensal').reduce((s, d) => s + d.valor, 0)

  return (
    <>
      <PageHeader
        title="Despesas"
        sub="Tráfego e imposto entram sozinhos pela API do Meta. O resto você lança aqui (ou pelo Telegram, futuramente)."
        right={<button onClick={() => setForm(true)} className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-sm font-medium text-bg shadow-[0_0_24px_-6px_#22d3ee] hover:brightness-110"><Plus size={16} /> Lançar despesa</button>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total do período" value={money0(total)} icon={Receipt} tone="rose" />
        <Kpi label="Tráfego + imposto" value={money0(g.gastoImp)} tone="violet" hint={`imposto: ${money0(g.gasto * imposto)}`} />
        <Kpi label="Fixos mensais" value={money0(fixos)} icon={Repeat} tone="cyan" hint="Leona, IA, proxy…" />
        <Kpi label="Chips comprados" value={money0(lista.filter((d) => d.categoria === 'chips').reduce((s, d) => s + d.valor, 0))} tone="amber" hint={`${lista.filter((d) => d.categoria === 'chips').length} chips`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Para onde vai o dinheiro" icon={Receipt} />
          <div className="relative h-[230px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={porCat} dataKey="value" innerRadius={68} outerRadius={98} paddingAngle={2} stroke="none">
                  {porCat.map((x) => <Cell key={x.k} fill={x.cor} />)}
                </Pie>
                <Tooltip content={<ChartTip fmt={money} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div><div className="text-[11px] text-ink-3">total</div><div className="num text-lg font-semibold">{money0(total)}</div></div>
            </div>
          </div>
          <div className="space-y-2 px-5 pb-5">
            {porCat.map((x) => (
              <div key={x.k} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: x.cor }} />
                <span className="text-ink-2">{x.name}</span>
                <span className="num ml-auto text-ink">{money0(x.value)}</span>
                <span className="num w-11 text-right text-ink-3">{((x.value / total) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Lançamentos" icon={Receipt} sub="tráfego diário fica de fora desta lista (vem do Meta)" />
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 border-b border-line bg-surface"><tr><Th>Data</Th><Th>Descrição</Th><Th>Categoria</Th><Th>Tipo</Th><Th right>Valor</Th></tr></thead>
              <tbody className="divide-y divide-line/50">
                {lista.map((d) => (
                  <tr key={d.id} className={clsx('hover:bg-white/[.02]', extras.includes(d) && 'bg-cyan/5')}>
                    <Td className="num text-xs text-ink-2">{dataCurta(d.data)}</Td>
                    <Td className="text-ink">{d.descricao}</Td>
                    <Td><span className="flex items-center gap-1.5 text-xs text-ink-2"><span className="h-2 w-2 rounded-sm" style={{ background: cats[d.categoria].c }} />{cats[d.categoria].l}</span></Td>
                    <Td>{d.tipo === 'recorrente_mensal' ? <Pill tone="cyan"><Repeat size={10} /> mensal</Pill> : <Pill>pontual</Pill>}</Td>
                    <Td right className="text-rose">{money(d.valor)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {form && <NovaDespesa onClose={() => setForm(false)} onSave={(d) => { setExtras((x) => [d, ...x]); setForm(false) }} />}
    </>
  )
}

function NovaDespesa({ onClose, onSave }: { onClose: () => void; onSave: (d: Despesa) => void }) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<DespesaCategoria>('chips')
  const [tipo, setTipo] = useState<Despesa['tipo']>('pontual')
  const [data, setData] = useState(TODAY_ISO)
  const v = Number(valor.replace(',', '.'))
  const ok = descricao.trim() && v > 0
  const input = 'w-full rounded-xl border border-line bg-bg/70 px-3 py-2.5 text-sm outline-none focus:border-cyan/60 focus:shadow-[0_0_0_3px_rgba(34,211,238,.12)]'
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        className="panel panel-glow w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ id: `NEW${Date.now()}`, data, categoria, descricao, valor: v, tipo }) }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Lançar despesa</h3>
          <button type="button" onClick={onClose} className="text-ink-3 hover:text-ink"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <label className="block text-xs text-ink-2">Descrição<input autoFocus className={clsx(input, 'mt-1.5')} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: 5 chips Claro" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-ink-2">Valor (R$)<input inputMode="decimal" className={clsx(input, 'num mt-1.5')} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="75,00" /></label>
            <label className="block text-xs text-ink-2">Data<input type="date" className={clsx(input, 'mt-1.5 [color-scheme:dark]')} value={data} onChange={(e) => setData(e.target.value)} /></label>
          </div>
          <label className="block text-xs text-ink-2">Categoria
            <select className={clsx(input, 'mt-1.5')} value={categoria} onChange={(e) => setCategoria(e.target.value as DespesaCategoria)}>
              {(['chips', 'aparelhos', 'plataforma', 'ia', 'outros'] as const).map((c) => <option key={c} value={c}>{cats[c].l}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['pontual', 'recorrente_mensal'] as const).map((t) => (
              <button type="button" key={t} onClick={() => setTipo(t)} className={clsx('rounded-xl border px-3 py-2.5 text-sm', tipo === t ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-line text-ink-2')}>
                {t === 'pontual' ? 'Pontual' : 'Mensal'}
              </button>
            ))}
          </div>
        </div>
        <button disabled={!ok} className="mt-6 w-full rounded-xl bg-cyan py-2.5 text-sm font-semibold text-bg disabled:opacity-40">Salvar</button>
        <p className="mt-2.5 text-center text-[11px] text-ink-3">Modo demonstração: fica só nesta sessão até ligarmos o banco.</p>
      </form>
    </div>
  )
}
