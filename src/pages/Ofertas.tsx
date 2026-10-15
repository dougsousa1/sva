import clsx from 'clsx'
import { ExternalLink, Lightbulb, Plus, Sparkles, Target, X } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { aprendizados, chips, criativos, ofertas } from '../data/mock'
import type { Oferta, OfertaStatus } from '../data/types'
import { useApp } from '../lib/app-context'
import { addDays, isoDate, parseDate } from '../lib/date'
import { dataCurta, money, money0, num, pct, x2 } from '../lib/format'
import { metricasOferta, rebuildIndexes, serieDiaria, type Metricas } from '../lib/metrics'
import { supabase } from '../lib/supabase'
import { ChartTip, PageHeader, Panel, Pill, Segmented, StatusBadge, Thumb, statusLabel } from '../components/ui'

const colunas: OfertaStatus[] = ['ideia', 'producao', 'testando', 'escalando', 'pausada', 'morta']

export default function Ofertas() {
  const { periodo, imposto, modo: modoDados, recarregar } = useApp()
  const [aberta, setAberta] = useState<Oferta | null>(null)
  const [modo, setModo] = useState<'pipeline' | 'tabela'>('pipeline')
  const [, setTick] = useState(0)
  const [alvo, setAlvo] = useState<OfertaStatus | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [nova, setNova] = useState(false)
  const met = useMemo(() => new Map(ofertas.map((o) => [o.id, metricasOferta(o.id, periodo, imposto)])), [periodo, imposto, ofertas.length])

  /** Muda a etapa da oferta na hora e grava no banco (desfaz se o banco recusar). */
  async function mover(id: string, st: OfertaStatus) {
    const o = ofertas.find((x) => x.id === id)
    if (!o || o.status === st) return
    const antes = o.status
    o.status = st
    setTick((t) => t + 1)
    setErro('')
    if (modoDados === 'live' && supabase) {
      const { error } = await supabase.from('ofertas').update({ status: st }).eq('id', id)
      if (error) {
        o.status = antes
        setTick((t) => t + 1)
        setErro(`Não salvou a mudança de ${o.nome}: ${error.message}`)
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Produtos & Ofertas"
        sub="Do produto validado à oferta remodelada — com o resultado real de cada uma."
        right={
          <div className="flex items-center gap-2">
            <Segmented value={modo} onChange={setModo} options={[{ id: 'pipeline', label: 'Pipeline' }, { id: 'tabela', label: 'Tabela' }]} />
            <button onClick={() => setNova(true)} className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-sm font-medium text-bg shadow-[0_0_24px_-6px_#22d3ee] hover:brightness-110">
              <Plus size={16} /> Nova oferta
            </button>
          </div>
        }
      />

      {erro && <p className="mb-3 rounded-xl border border-rose/30 bg-rose/5 px-3 py-2 text-sm text-rose">{erro}</p>}
      {modo === 'pipeline' && <p className="mb-3 text-xs text-ink-3">Arraste os cards entre as colunas para mudar a etapa. No celular, toque no card e use “Mover para”.</p>}
      {modo === 'pipeline' ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          <div className="grid min-w-[960px] grid-cols-6 gap-3">
            {colunas.map((st) => {
              const lista = ofertas.filter((o) => o.status === st)
              return (
                <div
                  key={st}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (alvo !== st) setAlvo(st)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvo(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('text/plain')
                    setAlvo(null)
                    setArrastando(null)
                    if (id) mover(id, st)
                  }}
                  className={clsx(
                    'min-h-[240px] rounded-2xl border p-2.5 transition',
                    alvo === st ? 'border-cyan/60 bg-cyan/[.06] shadow-[0_0_0_1px_rgba(34,211,238,.25)_inset]' : 'border-line bg-surface/40',
                  )}
                >
                  <div className="mb-2.5 flex items-center justify-between px-1.5">
                    <StatusBadge s={st} />
                    <span className="num text-xs text-ink-3">{lista.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {lista.map((o) => (
                      <CardOferta
                        key={o.id}
                        o={o}
                        m={met.get(o.id) ?? metricasOferta(o.id, periodo, imposto)}
                        onClick={() => setAberta(o)}
                        arrastando={arrastando === o.id}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', o.id)
                          e.dataTransfer.effectAllowed = 'move'
                          setArrastando(o.id)
                        }}
                        onDragEnd={() => {
                          setArrastando(null)
                          setAlvo(null)
                        }}
                      />
                    ))}
                    {!lista.length && <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-3">{alvo === st ? 'solte aqui' : 'vazio'}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="border-b border-line text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Oferta</th>
                  <th className="px-4 text-left font-medium">Status</th>
                  {['Ticket', 'Conversas', 'Vendas', 'Conv.', 'Receita', 'Tráfego+imp', 'Chips', 'Margem', 'ROAS', 'CPA'].map((h) => <th key={h} className="px-4 text-right font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {ofertas.map((o) => {
                  const m = met.get(o.id) ?? metricasOferta(o.id, periodo, imposto)
                  return (
                    <tr key={o.id} onClick={() => setAberta(o)} className="cursor-pointer hover:bg-white/[.02]">
                      <td className="px-5 py-3"><span className="num mr-2 text-xs" style={{ color: o.cor }}>{o.id}</span>{o.nome}</td>
                      <td className="px-4"><StatusBadge s={o.status} /></td>
                      <td className="num px-4 text-right">{money(o.ticket)}</td>
                      <td className="num px-4 text-right">{num(m.conversas)}</td>
                      <td className="num px-4 text-right">{num(m.vendas)}</td>
                      <td className="num px-4 text-right">{pct(m.conversao)}</td>
                      <td className="num px-4 text-right">{money0(m.receita)}</td>
                      <td className="num px-4 text-right text-ink-2">{money0(m.gastoImp)}</td>
                      <td className="num px-4 text-right text-ink-2">{money0(m.chips)}</td>
                      <td className={clsx('num px-4 text-right', m.margem >= 0 ? 'text-emerald' : 'text-rose')}>{money0(m.margem)}</td>
                      <td className="num px-4 text-right">{x2(m.roas)}</td>
                      <td className="num px-4 text-right">{m.vendas ? money(m.cpa) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {aberta && <Detalhe o={aberta} onClose={() => setAberta(null)} onMover={(st) => mover(aberta.id, st)} />}
      {nova && (
        <NovaOferta
          onClose={() => setNova(false)}
          onSalvar={async (o) => {
            if (modoDados === 'live' && supabase) {
              const { error } = await supabase.from('ofertas').insert({
                id: o.id, nome: o.nome, nicho: o.nicho, ticket: o.ticket, status: o.status, cor: o.cor,
                promessa: o.promessa, angulo: o.angulo, produto_origem: o.produtoOrigem, fonte_validacao: o.fonteValidacao,
              })
              if (error) return error.message
              setNova(false)
              await recarregar()
              return
            }
            ofertas.push(o)
            rebuildIndexes()
            setNova(false)
            setTick((t) => t + 1)
          }}
        />
      )}
    </>
  )
}

function CardOferta({ o, m, onClick, arrastando, onDragStart, onDragEnd }: {
  o: Oferta
  m: Metricas
  onClick: () => void
  arrastando: boolean
  onDragStart: (e: DragEvent<HTMLButtonElement>) => void
  onDragEnd: () => void
}) {
  const ativo = m.gasto > 0 || m.vendas > 0
  return (
    <button
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={clsx(
        'group block w-full cursor-grab rounded-xl border border-line bg-surface-2/70 p-3 text-left transition active:cursor-grabbing hover:-translate-y-0.5 hover:border-line-2 hover:shadow-[0_10px_30px_-12px_rgba(34,211,238,.35)]',
        arrastando && 'scale-[.98] opacity-40',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="num rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${o.cor}1f`, color: o.cor }}>{o.id}</span>
        <span className="text-[10px] text-ink-3">{o.nicho}</span>
      </div>
      <div className="mt-2 font-display text-[15px] leading-tight font-semibold text-ink">{o.nome}</div>
      <div className="mt-1 line-clamp-2 text-[11.5px] text-ink-3">{o.promessa}</div>
      {ativo ? (
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 border-t border-line pt-2.5 text-[11px]">
          <span className="text-ink-3">Margem</span>
          <span className={clsx('num text-right', m.margem >= 0 ? 'text-emerald' : 'text-rose')}>{money0(m.margem)}</span>
          <span className="text-ink-3">ROAS</span>
          <span className="num text-right text-ink">{x2(m.roas)}</span>
          <span className="text-ink-3">Vendas</span>
          <span className="num text-right text-ink">{m.vendas}</span>
        </div>
      ) : (
        <div className="mt-3 border-t border-line pt-2.5 text-[11px] text-ink-3">Ticket previsto <span className="num text-ink-2">{money(o.ticket)}</span></div>
      )}
    </button>
  )
}

function Detalhe({ o, onClose, onMover }: { o: Oferta; onClose: () => void; onMover: (st: OfertaStatus) => void }) {
  const { imposto } = useApp()
  const p30 = { inicio: isoDate(addDays(parseDate(isoDate(new Date())), -29)), fim: isoDate(new Date()) }
  const m = metricasOferta(o.id, p30, imposto)
  const serie = serieDiaria(p30, imposto, o.id)
  const crs = criativos.filter((c) => c.ofertaId === o.id)
  const chs = chips.filter((c) => c.ofertaId === o.id)
  const aps = aprendizados.filter((a) => a.ofertaId === o.id)
  const cpaMax = m.vendas ? m.ticketMedio - m.chips / m.vendas : o.ticket

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-[720px] overflow-y-auto border-l border-line-2 bg-bg/95 p-5 shadow-2xl md:p-7" onClick={(e) => e.stopPropagation()} style={{ animation: 'fade-up .25s ease-out' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="num rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: `${o.cor}1f`, color: o.cor }}>{o.id}</span>
              <StatusBadge s={o.status} />
              <Pill>{o.nicho}</Pill>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold">{o.nome}</h2>
            <p className="mt-1 text-sm text-ink-2">{o.promessa}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-line p-2 text-ink-2 hover:text-ink"><X size={16} /></button>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-[11px] tracking-[0.1em] text-ink-3 uppercase">Mover para</div>
          <div className="flex flex-wrap gap-1.5">
            {colunas.map((st) => (
              <button
                key={st}
                onClick={() => onMover(st)}
                className={clsx('rounded-full border px-3 py-1 text-xs transition', o.status === st ? 'border-cyan/50 bg-cyan/15 text-cyan' : 'border-line text-ink-2 hover:text-ink')}
              >
                {statusLabel(st)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Info icon={Lightbulb} label="Produto validado de origem" v={o.produtoOrigem} />
          <Info icon={Target} label="Fonte da validação" v={o.fonteValidacao} />
          <Info icon={Sparkles} label="Ângulo da remodelagem" v={o.angulo} />
          <Info icon={ExternalLink} label="Produto na Leona" v={o.leonaProductId ? `#${o.leonaProductId} · ticket ${money(o.ticket)}` : 'ainda não cadastrado'} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Margem 30d', money0(m.margem), m.margem >= 0 ? 'text-emerald' : 'text-rose'],
            ['ROAS', x2(m.roas), 'text-ink'],
            ['CPA real', m.vendas ? money(m.cpa) : '—', 'text-ink'],
            ['CPA máximo', money(cpaMax), 'text-amber'],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-xl border border-line bg-surface/60 p-3">
              <div className="text-[11px] text-ink-3">{l}</div>
              <div className={clsx('num mt-1 text-lg font-semibold', c)}>{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-surface/50 p-3">
          <div className="mb-1 px-2 text-xs text-ink-3">Margem diária — últimos 30 dias</div>
          <div className="h-[180px]">
            <ResponsiveContainer>
              <AreaChart data={serie}>
                <defs>
                  <linearGradient id="gM" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor={o.cor} stopOpacity={0.4} />
                    <stop offset="1" stopColor={o.cor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="data" tickFormatter={dataCurta} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ChartTip fmt={money} />} labelFormatter={(l) => dataCurta(String(l))} />
                <Area dataKey="margem" name="Margem" stroke={o.cor} fill="url(#gM)" strokeWidth={2} type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {crs.length > 0 && (
          <>
            <h3 className="mt-6 mb-2.5 font-display text-sm font-semibold tracking-wide text-ink-2 uppercase">Criativos ({crs.length})</h3>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {crs.map((c) => <Thumb key={c.id} c={c} className="aspect-[9/14]" />)}
            </div>
          </>
        )}

        {chs.length > 0 && (
          <>
            <h3 className="mt-6 mb-2.5 font-display text-sm font-semibold tracking-wide text-ink-2 uppercase">Chips usados ({chs.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {chs.map((c) => <Pill key={c.id} tone={c.status === 'ativo' ? 'emerald' : c.status === 'caiu' ? 'rose' : 'ink'}>{c.nome}</Pill>)}
            </div>
          </>
        )}

        {aps.length > 0 && (
          <>
            <h3 className="mt-6 mb-2.5 font-display text-sm font-semibold tracking-wide text-ink-2 uppercase">Aprendizados</h3>
            <div className="space-y-2">
              {aps.map((a) => (
                <div key={a.id} className="rounded-xl border border-line bg-surface/60 p-3 text-sm">
                  <div className="text-ink">{a.hipotese}</div>
                  <div className="mt-1 text-xs text-ink-3">→ {a.decisao}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="mt-6 text-xs text-ink-3">Status atual: {statusLabel(o.status)} · criada em {dataCurta(o.criadaEm)}</p>
      </div>
    </div>
  )
}

function Info({ icon: Icon, label, v }: { icon: typeof Target; label: string; v: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-3"><Icon size={12} className="text-cyan" />{label}</div>
      <div className="mt-1 text-sm text-ink">{v}</div>
    </div>
  )
}

const cores = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#38bdf8', '#c084fc', '#a3e635', '#f472b6', '#2dd4bf']

function NovaOferta({ onClose, onSalvar }: { onClose: () => void; onSalvar: (o: Oferta) => Promise<string | void> }) {
  const proximo = useMemo(() => {
    const n = Math.max(0, ...ofertas.map((o) => Number(o.id.replace(/\D/g, '')) || 0)) + 1
    return `OF${String(n).padStart(2, '0')}`
  }, [])
  const [f, setF] = useState({ nome: '', nicho: '', ticket: '', promessa: '', angulo: '', produtoOrigem: '', fonteValidacao: '', status: 'ideia' as OfertaStatus })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const ticket = Number(f.ticket.replace(',', '.')) || 0
  const input = 'mt-1.5 w-full rounded-xl border border-line bg-bg/70 px-3 py-2.5 text-sm outline-none focus:border-cyan/60 focus:shadow-[0_0_0_3px_rgba(34,211,238,.12)]'
  const campo = (k: keyof typeof f, label: string, ph = '') => (
    <label htmlFor={`of-${k}`} className="block text-xs text-ink-2">
      {label}
      <input id={`of-${k}`} className={input} value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  )
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        className="panel panel-glow w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault()
          if (!f.nome.trim()) return
          setSalvando(true)
          const r = await onSalvar({
            id: proximo, nome: f.nome.trim(), nicho: f.nicho.trim(), ticket, promessa: f.promessa.trim(), angulo: f.angulo.trim(),
            produtoOrigem: f.produtoOrigem.trim(), fonteValidacao: f.fonteValidacao.trim(), status: f.status,
            cor: cores[ofertas.length % cores.length], criadaEm: isoDate(new Date()),
          })
          setSalvando(false)
          if (r) setErro(r)
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Nova oferta <span className="num ml-1 text-sm text-cyan">{proximo}</span></h3>
          <button type="button" onClick={onClose} className="text-ink-3 hover:text-ink"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          {campo('nome', 'Nome da oferta', 'Ex.: Detox 7 Dias')}
          <div className="grid grid-cols-2 gap-3">
            {campo('nicho', 'Nicho', 'Saúde')}
            {campo('ticket', 'Ticket (R$)', '19,90')}
          </div>
          {campo('produtoOrigem', 'Produto validado de origem', 'O que inspirou a remodelagem')}
          {campo('fonteValidacao', 'Fonte da validação', 'Link ou onde viu escalando')}
          {campo('promessa', 'Promessa', 'O resultado que a oferta vende')}
          {campo('angulo', 'Ângulo', 'Dor, desejo, curiosidade…')}
          <div>
            <div className="text-xs text-ink-2">Etapa</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {colunas.map((st) => (
                <button type="button" key={st} onClick={() => setF({ ...f, status: st })} className={clsx('rounded-full border px-3 py-1 text-xs', f.status === st ? 'border-cyan/50 bg-cyan/15 text-cyan' : 'border-line text-ink-2')}>
                  {statusLabel(st)}
                </button>
              ))}
            </div>
          </div>
        </div>
        {erro && <p className="mt-3 text-xs text-rose">{erro}</p>}
        <button disabled={!f.nome.trim() || salvando} className="mt-6 w-full rounded-xl bg-cyan py-2.5 text-sm font-semibold text-bg disabled:opacity-40">
          {salvando ? 'Salvando…' : 'Criar oferta'}
        </button>
        <p className="mt-2.5 text-center text-[11px] text-ink-3">Use o código <span className="num text-cyan">[{proximo}]</span> no nome das campanhas desta oferta no Meta.</p>
      </form>
    </div>
  )
}
