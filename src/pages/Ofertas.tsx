import clsx from 'clsx'
import { ExternalLink, Lightbulb, Plus, Sparkles, Target, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { aprendizados, chips, criativos, ofertas } from '../data/mock'
import type { Oferta, OfertaStatus } from '../data/types'
import { useApp } from '../lib/app-context'
import { addDays, isoDate, parseDate } from '../lib/date'
import { dataCurta, money, money0, num, pct, x2 } from '../lib/format'
import { metricasOferta, serieDiaria, type Metricas } from '../lib/metrics'
import { ChartTip, PageHeader, Panel, Pill, Segmented, StatusBadge, Thumb, statusLabel } from '../components/ui'

const colunas: OfertaStatus[] = ['ideia', 'producao', 'testando', 'escalando', 'pausada', 'morta']

export default function Ofertas() {
  const { periodo, imposto } = useApp()
  const [aberta, setAberta] = useState<Oferta | null>(null)
  const [modo, setModo] = useState<'pipeline' | 'tabela'>('pipeline')
  const met = useMemo(() => new Map(ofertas.map((o) => [o.id, metricasOferta(o.id, periodo, imposto)])), [periodo, imposto])

  return (
    <>
      <PageHeader
        title="Produtos & Ofertas"
        sub="Do produto validado à oferta remodelada — com o resultado real de cada uma."
        right={
          <div className="flex items-center gap-2">
            <Segmented value={modo} onChange={setModo} options={[{ id: 'pipeline', label: 'Pipeline' }, { id: 'tabela', label: 'Tabela' }]} />
            <button className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-sm font-medium text-bg shadow-[0_0_24px_-6px_#22d3ee] hover:brightness-110">
              <Plus size={16} /> Nova oferta
            </button>
          </div>
        }
      />

      {modo === 'pipeline' ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          <div className="grid min-w-[960px] grid-cols-6 gap-3">
            {colunas.map((st) => {
              const lista = ofertas.filter((o) => o.status === st)
              return (
                <div key={st} className="rounded-2xl border border-line bg-surface/40 p-2.5">
                  <div className="mb-2.5 flex items-center justify-between px-1.5">
                    <StatusBadge s={st} />
                    <span className="num text-xs text-ink-3">{lista.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {lista.map((o) => <CardOferta key={o.id} o={o} m={met.get(o.id)!} onClick={() => setAberta(o)} />)}
                    {!lista.length && <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-3">vazio</div>}
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
                  const m = met.get(o.id)!
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

      {aberta && <Detalhe o={aberta} onClose={() => setAberta(null)} />}
    </>
  )
}

function CardOferta({ o, m, onClick }: { o: Oferta; m: Metricas; onClick: () => void }) {
  const ativo = m.gasto > 0 || m.vendas > 0
  return (
    <button onClick={onClick} className="group block w-full rounded-xl border border-line bg-surface-2/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-line-2 hover:shadow-[0_10px_30px_-12px_rgba(34,211,238,.35)]">
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

function Detalhe({ o, onClose }: { o: Oferta; onClose: () => void }) {
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
