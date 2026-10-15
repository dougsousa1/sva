import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { Film, Image as ImageIcon, Layers, Play } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Criativo, OfertaStatus } from '../data/types'
import { ofertaById } from '../lib/metrics'

export function Panel({ className, children, glow }: { className?: string; children: ReactNode; glow?: boolean }) {
  return <section className={clsx('panel fade-up', glow && 'panel-glow', className)}>{children}</section>
}

export function PanelHeader({ title, icon: Icon, right, sub }: { title: string; icon?: LucideIcon; right?: ReactNode; sub?: string }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon size={15} className="shrink-0 text-cyan" />}
        <div className="min-w-0">
          <h3 className="truncate font-display text-[13px] font-semibold tracking-wide text-ink uppercase">{title}</h3>
          {sub && <p className="truncate text-xs text-ink-3">{sub}</p>}
        </div>
      </div>
      {right}
    </header>
  )
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

const tones = {
  cyan: 'text-cyan',
  violet: 'text-violet',
  emerald: 'text-emerald',
  amber: 'text-amber',
  rose: 'text-rose',
  ink: 'text-ink',
}
export type Tone = keyof typeof tones

export function Kpi({ label, value, hint, icon: Icon, tone = 'ink', delta, spark }: {
  label: string
  value: string
  hint?: ReactNode
  icon?: LucideIcon
  tone?: Tone
  delta?: number | null
  spark?: number[]
}) {
  return (
    <div className="panel fade-up relative overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[0.12em] text-ink-3 uppercase">{label}</span>
        {Icon && <Icon size={15} className={tones[tone]} />}
      </div>
      <div className={clsx('num mt-2 text-[22px] font-semibold md:text-2xl', tones[tone])}>{value}</div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-ink-3">
        <span className="truncate">{hint}</span>
        {delta != null && Number.isFinite(delta) && <Delta v={delta} />}
      </div>
      {spark && spark.length > 1 && (
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-10 opacity-60">
          <Sparkline data={spark} color={tone === 'rose' ? '#fb7185' : tone === 'violet' ? '#a78bfa' : tone === 'emerald' ? '#34d399' : '#22d3ee'} fill />
        </div>
      )}
    </div>
  )
}

export function Delta({ v, invert }: { v: number; invert?: boolean }) {
  const good = invert ? v < 0 : v >= 0
  return (
    <span className={clsx('num rounded-md px-1.5 py-0.5 text-[11px]', good ? 'bg-emerald/10 text-emerald' : 'bg-rose/10 text-rose')}>
      {v >= 0 ? '▲' : '▼'} {Math.abs(v * 100).toFixed(0)}%
    </span>
  )
}

export function Sparkline({ data, color = '#22d3ee', fill, height = 40 }: { data: number[]; color?: string; fill?: boolean; height?: number }) {
  const w = 100
  const max = Math.max(...data, 0.0001)
  const min = Math.min(...data, 0)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, height - ((v - min) / (max - min || 1)) * (height - 4) - 2])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const id = `g${color.slice(1)}`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const statusStyle: Record<OfertaStatus, [string, string]> = {
  ideia: ['Ideia', 'bg-violet/10 text-violet ring-violet/25'],
  producao: ['Em produção', 'bg-sky/10 text-sky ring-sky/25'],
  testando: ['Testando', 'bg-amber/10 text-amber ring-amber/25'],
  escalando: ['Escalando', 'bg-emerald/10 text-emerald ring-emerald/25'],
  pausada: ['Pausada', 'bg-ink-3/15 text-ink-2 ring-ink-3/30'],
  morta: ['Morta', 'bg-rose/10 text-rose ring-rose/25'],
}
export const statusLabel = (s: OfertaStatus) => statusStyle[s][0]

export function StatusBadge({ s }: { s: OfertaStatus }) {
  const [label, cls] = statusStyle[s]
  return <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', cls)}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{label}
  </span>
}

export function Pill({ children, tone = 'ink' }: { children: ReactNode; tone?: 'ink' | 'cyan' | 'emerald' | 'rose' | 'amber' | 'violet' }) {
  const map = {
    ink: 'bg-white/5 text-ink-2 ring-white/10',
    cyan: 'bg-cyan/10 text-cyan ring-cyan/25',
    emerald: 'bg-emerald/10 text-emerald ring-emerald/25',
    rose: 'bg-rose/10 text-rose ring-rose/25',
    amber: 'bg-amber/10 text-amber ring-amber/25',
    violet: 'bg-violet/10 text-violet ring-violet/25',
  }
  return <span className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap', map[tone])}>{children}</span>
}

export function OfertaTag({ id, nome = true }: { id: string | null; nome?: boolean }) {
  if (!id) return <Pill tone="amber">sem vínculo</Pill>
  const o = ofertaById.get(id)
  if (!o) return null
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="num rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${o.cor}1f`, color: o.cor }}>{o.id}</span>
      {nome && <span className="truncate text-ink">{o.nome}</span>}
    </span>
  )
}

/** Miniatura gerada do criativo (até termos os arquivos reais do Meta). */
export function Thumb({ c, className }: { c: Criativo; className?: string }) {
  const o = ofertaById.get(c.ofertaId)
  const cor = o?.cor ?? '#22d3ee'
  const seed = parseInt(c.id.slice(2), 10)
  const Icon = c.tipo === 'video' ? Film : c.tipo === 'carrossel' ? Layers : ImageIcon
  return (
    <div
      className={clsx('relative overflow-hidden rounded-xl', className)}
      style={{
        background: `radial-gradient(120% 80% at ${20 + (seed * 37) % 60}% ${10 + (seed * 53) % 40}%, ${cor}55, transparent 60%), radial-gradient(90% 70% at ${80 - (seed * 29) % 50}% 100%, #a78bfa40, transparent 60%), #0b0f1a`,
      }}
    >
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="absolute inset-x-3 bottom-3">
        <p className="line-clamp-3 font-display text-[13px] leading-snug font-semibold text-white drop-shadow">{c.gancho}</p>
      </div>
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur">
        <Icon size={11} /> {c.tipo}{c.duracao ? ` · ${c.duracao}s` : ''}
      </div>
      {c.tipo === 'video' && (
        <div className="absolute top-1/2 left-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-[70%] place-items-center rounded-full bg-white/10 ring-1 ring-white/25 backdrop-blur">
          <Play size={16} className="translate-x-px fill-white text-white" />
        </div>
      )}
    </div>
  )
}

export function ChartTip({ active, payload, label, fmt }: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
  label?: string
  fmt: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line-2 bg-surface/95 px-3 py-2 text-xs shadow-2xl backdrop-blur">
      <div className="num mb-1.5 text-ink-3">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <span className="num text-ink">{fmt(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  )
}

export function Th({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <th className={clsx('px-4 py-2.5 text-[10.5px] font-medium tracking-[0.1em] whitespace-nowrap text-ink-3 uppercase', right ? 'text-right' : 'text-left', className)}>{children}</th>
}
export function Td({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <td className={clsx('px-4 py-3 whitespace-nowrap', right && 'num text-right', className)}>{children}</td>
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface/70 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition',
            value === o.id ? 'bg-cyan/15 text-cyan shadow-[inset_0_0_0_1px_rgba(34,211,238,.35)]' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function money2Tone(v: number) {
  return v >= 0 ? 'text-emerald' : 'text-rose'
}
