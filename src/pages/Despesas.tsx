import { Pencil, Plus, Receipt, Repeat } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { despesas as base } from '../data/mock'
import type { Despesa, DespesaCategoria } from '../data/types'
import { useApp } from '../lib/app-context'
import { alterar, excluir, inserir, tirar } from '../lib/gravar'
import { Botoes, Campo, Escolha, Modal, novoId, numero } from '../components/Form'
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
  // null = fechado · 'nova' = lançar · Despesa = editar
  const [form, setForm] = useState<Despesa | 'nova' | null>(null)
  const lista = base.filter((d) => inPeriodo(d.data, periodo))
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
        right={<button onClick={() => setForm('nova')} className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-sm font-medium text-bg shadow-[0_0_24px_-6px_#22d3ee] hover:brightness-110"><Plus size={16} /> Lançar despesa</button>}
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
          <PanelHeader title="Lançamentos" icon={Receipt} sub="clique em um lançamento para editar ou excluir · o tráfego diário vem do Meta" />
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 border-b border-line bg-surface"><tr><Th>Data</Th><Th>Descrição</Th><Th>Categoria</Th><Th>Tipo</Th><Th right>Valor</Th><Th /></tr></thead>
              <tbody className="divide-y divide-line/50">
                {lista.map((d) => (
                  <tr key={d.id} onClick={() => setForm(d)} className="cursor-pointer hover:bg-white/[.03]" title="Editar">
                    <Td className="num text-xs text-ink-2">{dataCurta(d.data)}</Td>
                    <Td className="text-ink">{d.descricao}</Td>
                    <Td><span className="flex items-center gap-1.5 text-xs text-ink-2"><span className="h-2 w-2 rounded-sm" style={{ background: cats[d.categoria].c }} />{cats[d.categoria].l}</span></Td>
                    <Td>{d.tipo === 'recorrente_mensal' ? <Pill tone="cyan"><Repeat size={10} /> mensal</Pill> : <Pill>pontual</Pill>}</Td>
                    <Td right className="text-rose">{money(d.valor)}</Td>
                    <Td right className="text-ink-3"><Pencil size={13} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {form && <FormDespesa d={form === 'nova' ? null : form} onClose={() => setForm(null)} />}
    </>
  )
}

function FormDespesa({ d, onClose }: { d: Despesa | null; onClose: () => void }) {
  const { atualizar } = useApp()
  const [f, setF] = useState({
    descricao: d?.descricao ?? '',
    valor: d ? String(d.valor).replace('.', ',') : '',
    categoria: (d?.categoria ?? 'chips') as DespesaCategoria,
    tipo: (d?.tipo ?? 'pontual') as Despesa['tipo'],
    data: d?.data ?? TODAY_ISO,
  })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  const valor = numero(f.valor)
  const linha = { data: f.data, categoria: f.categoria, descricao: f.descricao.trim(), valor, tipo: f.tipo }
  return (
    <Modal
      titulo={d ? 'Editar despesa' : 'Lançar despesa'}
      onClose={onClose}
      podeSalvar={!!f.descricao.trim() && valor > 0}
      onSalvar={async () => {
        const err = d
          ? await alterar('despesas', d.id, linha, () => Object.assign(d, linha))
          : await inserir('despesas', linha, () => { base.unshift({ id: novoId('DP'), ...linha }) })
        if (err) return err
        onClose()
        await atualizar()
      }}
      onExcluir={d ? async () => {
        const err = await excluir('despesas', d.id, () => tirar(base, d))
        if (err) return err
        onClose()
        await atualizar()
      } : undefined}
    >
      <Campo id="dp-descricao" label="Descrição" value={f.descricao} onChange={set('descricao')} placeholder="Ex.: 5 chips Claro" />
      <div className="grid grid-cols-2 gap-3">
        <Campo id="dp-valor" label="Valor (R$)" tipo="number" value={f.valor} onChange={set('valor')} placeholder="75,00" mono />
        <Campo id="dp-data" label="Data" tipo="date" value={f.data} onChange={set('data')} />
      </div>
      <Escolha id="dp-categoria" label="Categoria" value={f.categoria} onChange={set('categoria')} opcoes={(['chips', 'aparelhos', 'plataforma', 'ia', 'outros'] as const).map((c) => ({ v: c, l: cats[c].l }))} />
      <Botoes label="Tipo" value={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} opcoes={[{ v: 'pontual', l: 'Pontual' }, { v: 'recorrente_mensal', l: 'Mensal' }]} />
    </Modal>
  )
}
