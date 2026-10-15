import clsx from 'clsx'
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Flame,
  Gauge,
  MessageCircle,
  Rocket,
  ShieldAlert,
  Smartphone,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chips, ofertas, vendas } from '../data/mock'
import { useApp } from '../lib/app-context'
import { addDays, diffDays, isoDate, parseDate } from '../lib/date'
import { dataCurta, money, money0, num, pct, x2 } from '../lib/format'
import {
  criativoById,
  gerarAlertas,
  inPeriodo,
  metricasAnuncios,
  metricasGerais,
  metricasOferta,
  resultadoPeriodo,
  serieDiaria,
  VIDA_MEDIA_CHIP,
  type Alerta,
  type Periodo,
} from '../lib/metrics'
import { ChartTip, Kpi, OfertaTag, Panel, PanelHeader, StatusBadge, Thumb } from '../components/ui'

function periodoAnterior(p: Periodo): Periodo {
  const n = diffDays(p.inicio, p.fim) + 1
  return { inicio: isoDate(addDays(parseDate(p.inicio), -n)), fim: isoDate(addDays(parseDate(p.inicio), -1)) }
}
const var_ = (a: number, b: number) => (b ? a / b - 1 : null)

const alertaIcon = { critico: ShieldAlert, atencao: AlertTriangle, oportunidade: Rocket }
const alertaCor = {
  critico: 'text-rose bg-rose/10 ring-rose/25',
  atencao: 'text-amber bg-amber/10 ring-amber/25',
  oportunidade: 'text-emerald bg-emerald/10 ring-emerald/25',
}

function AlertaItem({ a }: { a: Alerta }) {
  const Icon = alertaIcon[a.nivel]
  return (
    <div className="flex gap-3 px-5 py-3 transition hover:bg-white/[.02]">
      <div className={clsx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 ring-inset', alertaCor[a.nivel])}>
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink">{a.titulo}</div>
        <div className="line-clamp-2 text-xs text-ink-3">{a.detalhe}</div>
      </div>
      <span className="num ml-auto shrink-0 text-[10px] text-ink-3">{dataCurta(a.quando)}</span>
    </div>
  )
}

export default function Dashboard() {
  const { periodo, imposto } = useApp()
  const ant = periodoAnterior(periodo)

  const d = useMemo(() => {
    const g = metricasGerais(periodo, imposto)
    const ga = metricasGerais(ant, imposto)
    const res = resultadoPeriodo(periodo, imposto)
    const serie = serieDiaria(periodo.inicio === periodo.fim ? { inicio: isoDate(addDays(parseDate(periodo.fim), -13)), fim: periodo.fim } : periodo, imposto)
    const porOferta = ofertas
      .map((o) => ({ o, m: metricasOferta(o.id, periodo, imposto) }))
      .filter((x) => x.m.gasto > 0 || x.m.vendas > 0)
      .sort((a, b) => b.m.margem - a.m.margem)
    const ads = metricasAnuncios(periodo, imposto).filter((a) => a.vendas > 0).sort((a, b) => b.margem - a.margem)
    const horas = Array.from({ length: 24 }, (_, h) => ({ h: `${String(h).padStart(2, '0')}h`, vendas: 0 }))
    for (const v of vendas) if (inPeriodo(v.data, periodo)) horas[Number(v.data.slice(11, 13))].vendas++
    return { g, ga, res, serie, porOferta, ads, horas }
  }, [periodo, ant.inicio, imposto])

  const alertas = useMemo(() => gerarAlertas(imposto), [imposto])
  const ativos = chips.filter((c) => c.status === 'ativo').length
  const reserva = chips.filter((c) => c.status === 'reserva' && !c.ativacao).length
  const caidos7 = chips.filter((c) => c.queda && c.queda >= isoDate(addDays(parseDate(periodo.fim), -6))).length
  const spark = (k: 'receita' | 'gasto' | 'margem' | 'vendas') => d.serie.map((p) => p[k])
  const { g, ga, res } = d

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Panel glow className="overflow-hidden">
        <div className="grid gap-6 p-5 md:p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              <Activity size={13} className="text-cyan" /> Lucro líquido do período
            </div>
            <div className={clsx('num mt-2 text-4xl font-semibold md:text-5xl', res.lucro >= 0 ? 'text-gradient' : 'text-rose')}>{money(res.lucro)}</div>
            <p className="mt-2 max-w-xl text-sm text-ink-2">
              Margem das ofertas <span className="num text-ink">{money0(g.margem)}</span> − custos fixos{' '}
              <span className="num text-ink">{money0(res.fixos)}</span> − compras pontuais <span className="num text-ink">{money0(res.pontuais)}</span>
            </p>
            {/* Cascata do resultado */}
            <div className="mt-5 space-y-2">
              {[
                { l: 'Receita', v: g.receita, c: '#22d3ee' },
                { l: `Tráfego + imposto ${Math.round(imposto * 100)}%`, v: -g.gastoImp, c: '#a78bfa' },
                { l: 'Chips (rateio por vida útil)', v: -g.chips, c: '#fbbf24' },
                { l: 'Fixos (Leona, IA…)', v: -res.fixos, c: '#38bdf8' },
                { l: 'Pontuais (celulares…)', v: -res.pontuais, c: '#64748b' },
              ].map((r) => (
                <div key={r.l} className="grid grid-cols-[140px_1fr_96px] items-center gap-3 text-xs md:grid-cols-[190px_1fr_110px]">
                  <span className="truncate text-ink-2">{r.l}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[.04]">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (Math.abs(r.v) / Math.max(g.receita, 1)) * 100)}%`, background: r.c, boxShadow: `0 0 12px ${r.c}88` }} />
                  </div>
                  <span className={clsx('num text-right', r.v >= 0 ? 'text-ink' : 'text-ink-2')}>{money0(r.v)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat icon={Target} label="ROAS (c/ imposto)" value={x2(g.roas)} tone={g.roas >= 1.6 ? 'text-emerald' : g.roas >= 1.2 ? 'text-amber' : 'text-rose'} sub={`meta ≥ 1,60x`} />
            <MiniStat icon={Gauge} label="CPA real" value={money(g.cpa)} sub={`ticket médio ${money(g.ticketMedio)}`} />
            <MiniStat icon={MessageCircle} label="Custo / conversa" value={money(g.custoConversa)} sub={`${num(g.conversas)} conversas`} />
            <MiniStat icon={Zap} label="Conversão WhatsApp" value={pct(g.conversao)} sub="vendas ÷ conversas" />
            <div className="col-span-2 rounded-xl border border-line bg-white/[.02] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-2">Ponto de equilíbrio diário (fixos ÷ 30)</span>
                <span className="num text-ink">{money(res.equilibrioDia)}/dia</span>
              </div>
              {(() => {
                const dias = diffDays(periodo.inicio, periodo.fim) + 1
                const mDia = g.margem / dias
                const p = Math.max(0, Math.min(1, mDia / (res.equilibrioDia * 4)))
                return (
                  <>
                    <div className="relative mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/[.05]">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan to-emerald" style={{ width: `${p * 100}%` }} />
                      <div className="absolute top-0 bottom-0 w-px bg-white/70" style={{ left: '25%' }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-ink-3">
                      <span>margem média: <span className="num text-emerald">{money(mDia)}/dia</span></span>
                      <span className="num">{(mDia / Math.max(res.equilibrioDia, 1)).toFixed(1)}× o equilíbrio</span>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </Panel>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Receita" value={money0(g.receita)} icon={BadgeDollarSign} tone="cyan" delta={var_(g.receita, ga.receita)} hint={`${num(g.vendas)} vendas`} spark={spark('receita')} />
        <Kpi label="Gasto c/ imposto" value={money0(g.gastoImp)} icon={Wallet} tone="violet" delta={var_(g.gastoImp, ga.gastoImp)} hint={`Meta ${money0(g.gasto)} + ${Math.round(imposto * 100)}%`} spark={spark('gasto')} />
        <Kpi label="Margem ofertas" value={money0(g.margem)} icon={TrendingUp} tone={g.margem >= 0 ? 'emerald' : 'rose'} delta={var_(g.margem, ga.margem)} hint="receita − tráfego − chips" spark={spark('margem')} />
        <Kpi label="Chips" value={`${ativos} ativos`} icon={Smartphone} tone="amber" hint={`${caidos7} caíram em 7d · ${reserva} reserva`} />
      </div>

      {/* Gráfico + alertas */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <PanelHeader title="Receita × Gasto × Margem" icon={Activity} sub="por dia, gasto já com imposto do Meta" right={
            <div className="hidden gap-4 text-[11px] text-ink-2 sm:flex">
              <Leg c="#22d3ee" l="Receita" /><Leg c="#a78bfa" l="Gasto" /><Leg c="#34d399" l="Margem" />
            </div>
          } />
          <div className="h-[300px] p-3 pr-5">
            <ResponsiveContainer>
              <ComposedChart data={d.serie} margin={{ top: 10, left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="gRec" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="1" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="data" tickFormatter={dataCurta} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} width={56} tickFormatter={(v) => money0(v).replace('R$', '').trim()} />
                <Tooltip content={<ChartTip fmt={money} />} labelFormatter={(l) => dataCurta(String(l))} cursor={{ stroke: 'rgba(255,255,255,.12)' }} />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#22d3ee" strokeWidth={2} fill="url(#gRec)" />
                <Bar dataKey="gasto" name="Gasto c/ imposto" fill="#a78bfa" fillOpacity={0.35} radius={[4, 4, 0, 0]} barSize={14} />
                <Line type="monotone" dataKey="margem" name="Margem" stroke="#34d399" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="flex flex-col">
          <PanelHeader title="Alertas" icon={ShieldAlert} sub="também enviados no Telegram" right={<span className="num rounded-md bg-rose/10 px-2 py-0.5 text-[11px] text-rose">{alertas.length}</span>} />
          <div className="max-h-[300px] flex-1 divide-y divide-line overflow-y-auto">
            {alertas.map((a) => <AlertaItem key={a.id} a={a} />)}
          </div>
        </Panel>
      </div>

      {/* Ranking ofertas + top criativos */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Ranking de ofertas" icon={Flame} sub="ordenado por margem" right={<Link to="/ofertas" className="text-xs text-cyan hover:underline">ver todas →</Link>} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 text-left text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">Oferta</th>
                  {['Receita', 'Gasto', 'Margem', 'ROAS', 'CPA'].map((h) => <th key={h} className="px-4 py-2.5 text-right text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {d.porOferta.map(({ o, m }) => {
                  const maxM = Math.max(...d.porOferta.map((x) => Math.abs(x.m.margem)), 1)
                  return (
                    <tr key={o.id} className="hover:bg-white/[.02]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <OfertaTag id={o.id} />
                          <StatusBadge s={o.status} />
                        </div>
                      </td>
                      <td className="num px-4 text-right">{money0(m.receita)}</td>
                      <td className="num px-4 text-right text-ink-2">{money0(m.gastoImp + m.chips)}</td>
                      <td className="px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/[.05] 2xl:block">
                            <div className={clsx('h-full rounded-full', m.margem >= 0 ? 'bg-emerald' : 'bg-rose')} style={{ width: `${(Math.abs(m.margem) / maxM) * 100}%` }} />
                          </div>
                          <span className={clsx('num', m.margem >= 0 ? 'text-emerald' : 'text-rose')}>{money0(m.margem)}</span>
                        </div>
                      </td>
                      <td className={clsx('num px-4 text-right', m.roas >= 1.6 ? 'text-emerald' : m.roas >= 1.2 ? 'text-amber' : 'text-rose')}>{x2(m.roas)}</td>
                      <td className="num px-4 text-right text-ink-2">{m.vendas ? money(m.cpa) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Criativos campeões" icon={Rocket} sub="maior margem no período" right={<Link to="/criativos" className="text-xs text-cyan hover:underline">galeria →</Link>} />
          <div className="divide-y divide-line/60">
            {d.ads.slice(0, 5).map((a, i) => {
              const cr = criativoById.get(a.info.anuncio.criativoId)!
              return (
                <div key={a.info.anuncio.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="num w-4 text-xs text-ink-3">{i + 1}</span>
                  <Thumb c={cr} className="h-12 w-10 shrink-0 [&_p]:hidden [&>div:nth-child(3)]:hidden [&>div:last-child]:h-6 [&>div:last-child]:w-6" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-ink">{cr.gancho}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-3"><OfertaTag id={cr.ofertaId} nome={false} /><span className="num">{cr.id} v{cr.versao}</span>· {a.vendas} vendas</div>
                  </div>
                  <div className="text-right">
                    <div className="num text-sm text-emerald">{money0(a.margem)}</div>
                    <div className="num text-[11px] text-ink-3">{x2(a.roas)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Horário + chips */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Vendas por horário" icon={Activity} sub="onde concentrar orçamento e atendimento" />
          <div className="h-[220px] p-3 pr-5">
            <ResponsiveContainer>
              <BarChart data={d.horas}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="h" axisLine={false} tickLine={false} interval={2} />
                <YAxis axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip content={<ChartTip fmt={(v) => `${v} vendas`} />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
                <Bar dataKey="vendas" name="Vendas" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Saúde dos chips" icon={Smartphone} right={<Link to="/chips" className="text-xs text-cyan hover:underline">detalhes →</Link>} />
          <div className="grid grid-cols-3 gap-3 p-5">
            <BigNum label="Vida média" v={`${VIDA_MEDIA_CHIP.toFixed(1)} dias`} />
            <BigNum label="Custo chip / venda" v={money(g.vendas ? g.chips / g.vendas : 0)} />
            <BigNum label="Caíram (7d)" v={String(caidos7)} tone="text-rose" />
          </div>
          <div className="space-y-2.5 px-5 pb-5">
            {chips.filter((c) => c.status === 'ativo').map((c) => {
              const dias = diffDays(c.ativacao!, periodo.fim) + 1
              const risco = dias / VIDA_MEDIA_CHIP
              return (
                <div key={c.id} className="grid grid-cols-[1fr_120px_56px] items-center gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={clsx('h-2 w-2 shrink-0 rounded-full', risco > 1 ? 'bg-rose' : risco > 0.7 ? 'bg-amber' : 'bg-emerald')} />
                    <span className="truncate text-ink">{c.nome}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[.05]">
                    <div className={clsx('h-full rounded-full', risco > 1 ? 'bg-rose' : risco > 0.7 ? 'bg-amber' : 'bg-emerald')} style={{ width: `${Math.min(100, risco * 100)}%` }} />
                  </div>
                  <span className="num text-right text-ink-2">{dias}d</span>
                </div>
              )
            })}
            <p className="pt-1 text-[11px] text-ink-3">Barra = idade do chip ÷ vida média. Vermelho: já passou da média — tenha reserva pronta.</p>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Leg({ c, l }: { c: string; l: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{l}</span>
}

function MiniStat({ icon: Icon, label, value, sub, tone = 'text-ink' }: { icon: typeof Target; label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[.02] p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-3"><Icon size={13} className="text-cyan" />{label}</div>
      <div className={clsx('num mt-1.5 text-xl font-semibold', tone)}>{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-ink-3">{sub}</div>
    </div>
  )
}

function BigNum({ label, v, tone = 'text-ink' }: { label: string; v: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[.02] p-3">
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className={clsx('num mt-1 text-lg font-semibold', tone)}>{v}</div>
    </div>
  )
}
