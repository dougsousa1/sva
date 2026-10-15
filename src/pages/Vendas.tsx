import { BadgeDollarSign, MapPin, Plus, Radio, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { chips, ofertas, vendas } from '../data/mock'
import { BotaoAdicionar, Campo, Escolha, Modal, numero } from '../components/Form'
import { TODAY_ISO } from '../lib/date'
import { alterar, excluir, inserir, tirar } from '../lib/gravar'
import type { Venda } from '../data/types'
import { useApp } from '../lib/app-context'
import { dataCurta, hora, money, money0, num } from '../lib/format'
import { chipById, criativoById, adIndex, inPeriodo } from '../lib/metrics'
import { Kpi, OfertaTag, PageHeader, Panel, PanelHeader, Pill, Td, Th } from '../components/ui'

export default function Vendas() {
  const { periodo, modo } = useApp()
  const [nova, setNova] = useState(false)
  const [editando, setEditando] = useState<Venda | null>(null)
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-emerald/25 bg-emerald/5 px-3 py-2 text-xs text-emerald">
              <Radio size={14} /> <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald text-emerald" /> {modo === 'demo' ? 'webhook Leona (demo)' : 'webhook Leona'}
            </div>
            <BotaoAdicionar onClick={() => setNova(true)}><Plus size={16} /> Venda manual</BotaoAdicionar>
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
                    <tr
                      key={v.id}
                      onClick={v.origem === 'manual' ? () => setEditando(v) : undefined}
                      title={v.origem === 'manual' ? 'Venda manual — clique para editar' : undefined}
                      className={v.origem === 'manual' ? 'cursor-pointer bg-cyan/[.03] hover:bg-white/[.04]' : 'hover:bg-white/[.02]'}
                    >
                      <Td className="num text-xs text-ink-2">{dataCurta(v.data)} <span className="text-ink-3">{hora(v.data)}</span></Td>
                      <Td className="max-w-[200px] truncate text-ink">{v.cliente}</Td>
                      <Td><OfertaTag id={v.ofertaId} nome={false} /></Td>
                      <Td className="text-xs">{cr ? <span className="text-ink-2"><span className="num text-ink-3">{cr.id}</span> {cr.gancho.slice(0, 30)}</span> : <Pill tone="amber">orgânico</Pill>}</Td>
                      <Td className="text-xs text-ink-2">{chipById.get(v.chipId)?.nome ?? v.instancia ?? '—'}</Td>
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
      {nova && <NovaVenda onClose={() => setNova(false)} />}
      {editando && <NovaVenda v={editando} onClose={() => setEditando(null)} />}
    </>
  )
}

/** Venda que não veio pela Leona (Pix direto, recompra etc.). */
function NovaVenda({ onClose, v: ed }: { onClose: () => void; v?: Venda }) {
  const { atualizar } = useApp()
  const agora = new Date()
  const [f, setF] = useState(ed
    ? { data: ed.data.slice(0, 10), hora: ed.data.slice(11, 16), valor: String(ed.valor).replace('.', ','), oferta: ed.ofertaId, chip: ed.chipId, cliente: ed.cliente, ddd: ed.ddd, anuncio: ed.anuncioId ?? '' }
    : {
        data: TODAY_ISO, hora: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`,
        valor: '', oferta: ofertas[0]?.id ?? '', chip: '', cliente: '', ddd: '', anuncio: '',
      })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  const valor = numero(f.valor)
  return (
    <Modal
      titulo={ed ? 'Editar venda manual' : 'Venda manual'}
      sub="Para vendas que não chegaram pelo webhook da Leona."
      onClose={onClose}
      podeSalvar={valor > 0 && !!f.oferta}
      onExcluir={ed ? async () => {
        const err = await excluir('vendas', String(ed.id), () => tirar(vendas, ed))
        if (err) return err
        onClose()
        await atualizar()
      } : undefined}
      onSalvar={async () => {
        const id = ed ? String(ed.id) : `M-${Date.now()}`
        const quando = new Date(`${f.data}T${f.hora || '12:00'}:00`)
        const of = ofertas.find((o) => o.id === f.oferta)
        const chip = chips.find((c) => c.id === f.chip)
        const gravarVenda = ed ? (linha: Record<string, unknown>, demo: () => void) => alterar('vendas', id, linha, demo) : (linha: Record<string, unknown>, demo: () => void) => inserir('vendas', { id, ...linha }, demo)
        const err = await gravarVenda({
          data: quando.toISOString(), valor, leona_product_id: of?.leonaProductId ?? null, produto_nome: f.oferta,
          anuncio_id: f.anuncio.trim() || null, leona_connection_id: chip?.leonaConnectionId || null, instancia: chip?.nome ?? null,
          ddd: f.ddd.trim() || null, cliente: f.cliente.trim() || null, origem: 'manual',
        }, () => {
          if (ed) tirar(vendas, ed)
          vendas.unshift({
            id, data: `${f.data}T${f.hora || '12:00'}:00`, valor, ofertaId: f.oferta, anuncioId: f.anuncio.trim() || null,
            chipId: f.chip, ddd: f.ddd.trim(), cliente: f.cliente.trim(), origem: 'manual',
          })
        })
        if (err) return err
        onClose()
        await atualizar()
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        <Campo id="vd-valor" label="Valor (R$)" tipo="number" value={f.valor} onChange={set('valor')} placeholder="19,90" mono />
        <Campo id="vd-data" label="Data" tipo="date" value={f.data} onChange={set('data')} />
        <Campo id="vd-hora" label="Hora" value={f.hora} onChange={set('hora')} placeholder="14:30" mono />
      </div>
      <Escolha id="vd-oferta" label="Oferta" value={f.oferta} onChange={set('oferta')} opcoes={ofertas.map((o) => ({ v: o.id, l: `${o.id} · ${o.nome}` }))} />
      <Escolha id="vd-chip" label="Chip que vendeu" value={f.chip} onChange={set('chip')} opcoes={[{ v: '', l: '— não sei —' }, ...chips.filter((c) => c.ativacao).map((c) => ({ v: c.id, l: c.nome }))]} />
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <Campo id="vd-cliente" label="Cliente" value={f.cliente} onChange={set('cliente')} placeholder="opcional" />
        <Campo id="vd-ddd" label="DDD" value={f.ddd} onChange={set('ddd')} placeholder="11" mono />
      </div>
      <Campo id="vd-anuncio" label="ID do anúncio (source_id)" value={f.anuncio} onChange={set('anuncio')} placeholder="opcional — liga a venda ao criativo" mono />
    </Modal>
  )
}
