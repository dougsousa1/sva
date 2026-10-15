import { BadgeDollarSign, MapPin, Radio, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { vendas } from '../data/mock'
import { useApp } from '../lib/app-context'
import { dataCurta, hora, money, money0, num } from '../lib/format'
import { chipById, criativoById, adIndex, inPeriodo } from '../lib/metrics'
import { Kpi, OfertaTag, PageHeader, Panel, PanelHeader, Pill, Td, Th } from '../components/ui'

export default function Vendas() {
  const { periodo } = useApp()
  const [q, setQ] = useState('')
  const lista = useMemo(() => vendas.filter((v) => inPeriodo(v.data, periodo)), [periodo])
  const filtrada = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return lista
    return lista.filter((v) => v.cliente.toLowerCase().includes(t) || v.ddd.includes(t) || v.ofertaId.toLowerCase().includes(t) || (v.anuncioId ?? '').includes(t))
  }, [lista, q])
  const receita = lista.reduce((s, v) => s + v.valor, 0)
  const semAtrib = lista.filter((v) => !v.anuncioId)
  const porDDD = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of lista) m.set(v.ddd, (m.get(v.ddd) ?? 0) + v.valor)
    return [...m.entries()].map(([ddd, valor]) => ({ ddd, valor })).sort((a, b) => b.valor - a.valor).slice(0, 12)
  }, [lista])

  return (
    <>
      <PageHeader
        title="Vendas"
        sub="Chegam pelo webhook da Leona com o source_id do anúncio — atribuição automática."
        right={
          <div className="flex items-center gap-2 rounded-xl border border-emerald/25 bg-emerald/5 px-3 py-2 text-xs text-emerald">
            <Radio size={14} /> <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald text-emerald" /> webhook Leona (demo)
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Vendas" value={num(lista.length)} icon={BadgeDollarSign} tone="cyan" />
        <Kpi label="Receita" value={money0(receita)} tone="emerald" />
        <Kpi label="Ticket médio" value={money(lista.length ? receita / lista.length : 0)} />
        <Kpi label="Sem atribuição" value={num(semAtrib.length)} tone="amber" hint="sem source_id (orgânico)" />
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader
            title="Feed de vendas"
            icon={BadgeDollarSign}
            right={
              <div className="flex items-center gap-2 rounded-lg border border-line bg-bg/60 px-2.5 py-1.5">
                <Search size={13} className="text-ink-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="cliente, DDD, OF02, ad id…" className="w-40 bg-transparent text-xs outline-none placeholder:text-ink-3 md:w-56" />
              </div>
            }
          />
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 border-b border-line bg-surface">
                <tr><Th>Quando</Th><Th>Cliente</Th><Th>Oferta</Th><Th>Criativo / anúncio</Th><Th>Chip</Th><Th>DDD</Th><Th right>Valor</Th></tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {filtrada.slice(0, 200).map((v) => {
                  const ad = v.anuncioId ? adIndex.get(v.anuncioId) : null
                  const cr = ad ? criativoById.get(ad.anuncio.criativoId) : null
                  return (
                    <tr key={v.id} className="hover:bg-white/[.02]">
                      <Td className="num text-xs text-ink-2">{dataCurta(v.data)} <span className="text-ink-3">{hora(v.data)}</span></Td>
                      <Td className="max-w-[200px] truncate text-ink">{v.cliente}</Td>
                      <Td><OfertaTag id={v.ofertaId} nome={false} /></Td>
                      <Td className="text-xs">{cr ? <span className="text-ink-2"><span className="num text-ink-3">{cr.id}</span> {cr.gancho.slice(0, 30)}</span> : <Pill tone="amber">orgânico</Pill>}</Td>
                      <Td className="text-xs text-ink-2">{chipById.get(v.chipId)?.nome}</Td>
                      <Td className="num text-xs text-ink-2">{v.ddd}</Td>
                      <Td right className="text-emerald">{money(v.valor)}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtrada.length > 200 && <p className="px-5 py-3 text-xs text-ink-3">Mostrando 200 de {filtrada.length}.</p>}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Receita por DDD" icon={MapPin} sub="de onde vêm os compradores" />
          <div className="space-y-2.5 p-5">
            {porDDD.map((d, i) => (
              <div key={d.ddd} className="grid grid-cols-[36px_1fr_84px] items-center gap-3 text-xs">
                <span className="num text-ink-2">{d.ddd}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/[.04]">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${(d.valor / porDDD[0].valor) * 100}%`, opacity: 1 - i * 0.05 }} />
                </div>
                <span className="num text-right text-ink">{money0(d.valor)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
