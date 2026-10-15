import clsx from 'clsx'
import {
  BadgeDollarSign,
  Bell,
  Brain,
  Clapperboard,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  LogOut,
  Megaphone,
  Radar,
  Receipt,
  RefreshCw,
  Settings,
  Smartphone,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { PRESETS, useApp } from '../lib/app-context'
import { campanhas, vendas } from '../data/mock'
import { gerarAlertas } from '../lib/metrics'
import { supabase } from '../lib/supabase'
import ErrorBoundary from './ErrorBoundary'
import { Segmented } from './ui'

const nav = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/ofertas', label: 'Ofertas', icon: Lightbulb },
  { to: '/radar', label: 'Radar', icon: Radar },
  { to: '/criativos', label: 'Criativos', icon: Clapperboard },
  { to: '/campanhas', label: 'Campanhas', icon: Megaphone },
  { to: '/chips', label: 'Chips & Aparelhos', icon: Smartphone },
  { to: '/vendas', label: 'Vendas', icon: BadgeDollarSign },
  { to: '/despesas', label: 'Despesas', icon: Receipt },
  { to: '/aprendizados', label: 'Aprendizados', icon: Brain },
  { to: '/config', label: 'Configurações', icon: Settings },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan/25 to-violet/25 ring-1 ring-cyan/40">
        <svg viewBox="0 0 32 32" className="h-5 w-5">
          <path d="M5 22l7-12 5 7 3-4 7 9" stroke="#22d3ee" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="font-display text-[15px] font-bold tracking-wide">SVA<span className="text-cyan">.</span>command</div>
        <div className="text-[10px] tracking-[0.18em] text-ink-3 uppercase">Central de operação</div>
      </div>
    </div>
  )
}

function Relogio() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="num text-xs text-ink-2">{t.toLocaleTimeString('pt-BR')}</span>
}

function BotaoSync() {
  const { recarregar } = useApp()
  const [estado, setEstado] = useState<'parado' | 'rodando' | 'erro'>('parado')
  const [msg, setMsg] = useState('')
  return (
    <button
      title={msg || 'Puxar agora Meta e Leona (últimos 30 dias)'}
      disabled={estado === 'rodando'}
      onClick={async () => {
        if (!supabase) return
        setEstado('rodando')
        const [meta, leona] = await Promise.all([
          supabase.functions.invoke('meta-sync', { body: { dias: 30 } }),
          supabase.functions.invoke('leona-sync', { body: { dias: 30 } }),
        ])
        const erros = [
          meta.error || !meta.data?.ok ? `Meta: ${meta.data?.erro ?? meta.error?.message ?? 'falhou'}` : '',
          leona.error || !leona.data?.ok ? `Leona: ${leona.data?.erro ?? leona.error?.message ?? 'falhou'}` : '',
        ].filter(Boolean)
        setMsg(erros.length ? erros.join(' · ') : `${meta.data.anuncios} anúncios · ${leona.data.vendas} vendas`)
        await recarregar()
        setEstado(erros.length ? 'erro' : 'parado')
      }}
      className={clsx(
        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] transition',
        estado === 'erro' ? 'border-rose/30 text-rose' : 'border-line text-ink-2 hover:text-ink',
      )}
    >
      {estado === 'rodando' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
      {estado === 'rodando' ? 'Sincronizando…' : estado === 'erro' ? 'Erro no sync (passe o mouse)' : 'Sincronizar'}
    </button>
  )
}

export default function Layout() {
  const { preset, setPreset, imposto, modo, versao, sair } = useApp()
  const integracoes: [string, string, boolean][] =
    modo === 'demo'
      ? [['Meta Ads API', 'aguardando', false], ['Leona vendas', 'aguardando', false], ['Telegram bot', 'aguardando', false], ['Supabase', 'aguardando', false]]
      : [
          ['Meta Ads API', campanhas.length ? 'conectado' : 'sem dados', campanhas.length > 0],
          ['Leona vendas', vendas.length ? 'recebendo' : 'sem vendas', vendas.length > 0],
          ['Telegram bot', 'aguardando', false],
          ['Supabase', 'conectado', true],
        ]
  const alertas = useMemo(() => gerarAlertas(imposto), [imposto])
  const criticos = alertas.filter((a) => a.nivel === 'critico').length
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  return (
    <div className="bg-grid min-h-full">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-bg/80 backdrop-blur-xl lg:flex">
        <div className="px-5 pt-5 pb-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                  isActive ? 'bg-gradient-to-r from-cyan/12 to-transparent text-ink' : 'text-ink-2 hover:bg-white/[.03] hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-cyan shadow-[0_0_12px_#22d3ee]" />}
                  <Icon size={17} className={isActive ? 'text-cyan' : 'text-ink-3 group-hover:text-ink-2'} />
                  {label}
                  {to === '/' && criticos > 0 && (
                    <span className="num ml-auto rounded-md bg-rose/15 px-1.5 text-[10px] text-rose">{criticos}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-xl border border-line bg-surface/60 p-3.5">
          <div className="mb-2.5 text-[10px] font-medium tracking-[0.14em] text-ink-3 uppercase">Integrações</div>
          {integracoes.map(([n, s, ok]) => (
            <div key={n} className="flex items-center justify-between py-1 text-xs">
              <span className="text-ink-2">{n}</span>
              <span className={clsx('flex items-center gap-1.5', ok ? 'text-emerald' : 'text-amber')}><span className={clsx('h-1.5 w-1.5 rounded-full', ok ? 'bg-emerald' : 'bg-amber')} />{s}</span>
            </div>
          ))}
          {modo === 'live' && (
            <button onClick={sair} className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-[11px] text-ink-3 hover:text-ink"><LogOut size={12} /> Sair</button>
          )}
        </div>
      </aside>

      <div className="min-w-0 lg:pl-64">
        {/* Topbar */}
        <header className="sticky z-20 border-b border-line bg-bg/75 backdrop-blur-xl" style={{ top: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex items-center gap-3 px-4 py-3 md:px-8">
            <div className="lg:hidden"><Logo /></div>
            {modo === 'demo' ? (
              <div className="hidden items-center gap-2 rounded-lg border border-amber/25 bg-amber/5 px-2.5 py-1 text-[11px] text-amber md:flex">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber text-amber" />
                MODO DEMONSTRAÇÃO · dados simulados
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <div className="flex items-center gap-2 rounded-lg border border-emerald/25 bg-emerald/5 px-2.5 py-1 text-[11px] text-emerald">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald text-emerald" /> AO VIVO
                </div>
                <BotaoSync />
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden sm:block"><Segmented value={preset} options={PRESETS} onChange={setPreset} /></div>
              <Relogio />
              <NavLink to="/" className="relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface/70 text-ink-2 hover:text-ink">
                <Bell size={16} />
                {criticos > 0 && <span className="num absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold text-white">{criticos}</span>}
              </NavLink>
            </div>
          </div>
          <div className="px-4 pb-3 sm:hidden"><div className="overflow-x-auto"><Segmented value={preset} options={PRESETS} onChange={setPreset} /></div></div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx('flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs', isActive ? 'bg-cyan/15 text-cyan' : 'text-ink-2')
                }
              >
                <Icon size={14} /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="overflow-hidden"><div className="scanline" /></div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
          <ErrorBoundary key={`${versao}-${loc.pathname}`}>
            <Outlet key={versao} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
