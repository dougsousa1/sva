import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import Login, { Carregando } from '../components/Login'
import { carregarAoVivo } from '../data/live'
import { supabase } from './supabase'
import { addDays, isoDate, TODAY } from './date'
import type { Periodo } from './metrics'

export type Preset = 'hoje' | '7d' | '14d' | '30d' | 'mes'

export const PRESETS: { id: Preset; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '14d', label: '14 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
]

function periodoDe(p: Preset): Periodo {
  const fim = isoDate(TODAY)
  switch (p) {
    case 'hoje':
      return { inicio: fim, fim }
    case '7d':
      return { inicio: isoDate(addDays(TODAY, -6)), fim }
    case '14d':
      return { inicio: isoDate(addDays(TODAY, -13)), fim }
    case '30d':
      return { inicio: isoDate(addDays(TODAY, -29)), fim }
    case 'mes':
      return { inicio: isoDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)), fim }
  }
}

interface Ctx {
  preset: Preset
  setPreset: (p: Preset) => void
  periodo: Periodo
  imposto: number
  setImposto: (v: number) => void
  /** 'demo' = dados simulados; 'live' = Supabase */
  modo: 'demo' | 'live'
  /** muda sempre que os dados são recarregados (usado como key para remontar as telas) */
  versao: number
  recarregar: () => Promise<void>
  sair: () => Promise<void>
}

const AppCtx = createContext<Ctx | null>(null)

function lerPreset(): Preset {
  try {
    const v = localStorage.getItem('sva.preset') as Preset | null
    return v && PRESETS.some((p) => p.id === v) ? v : '14d'
  } catch {
    return '14d'
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<Preset>(lerPreset)
  const [imposto, setImpostoState] = useState(0.13)
  const [versao, setVersao] = useState(0)
  const [estado, setEstado] = useState<'pronto' | 'login' | 'carregando' | 'erro'>(supabase ? 'carregando' : 'pronto')
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    if (!supabase) return
    try {
      const r = await carregarAoVivo(supabase)
      setImpostoState(r.imposto)
      setVersao((v) => v + 1)
      setEstado('pronto')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      setEstado('erro')
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) recarregar()
      else setEstado('login')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_OUT') setEstado('login')
    })
    return () => sub.subscription.unsubscribe()
  }, [recarregar])

  const value = useMemo<Ctx>(
    () => ({
      preset,
      setPreset: (p) => {
        setPresetState(p)
        try {
          localStorage.setItem('sva.preset', p)
        } catch {
          /* sem storage */
        }
      },
      periodo: periodoDe(preset),
      imposto,
      setImposto: (v) => {
        setImpostoState(v)
        supabase?.from('configuracoes').upsert({ chave: 'imposto_meta', valor: v }).then(() => undefined)
      },
      modo: supabase ? 'live' : 'demo',
      versao,
      recarregar,
      sair: async () => {
        await supabase?.auth.signOut()
      },
    }),
    [preset, imposto, versao, recarregar],
  )

  if (estado === 'login') return <Login onEntrar={() => { setEstado('carregando'); recarregar() }} />
  if (estado === 'carregando') return <Carregando />
  if (estado === 'erro') return <Carregando erro={erro} onTentar={() => { setEstado('carregando'); recarregar() }} />
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp fora do AppProvider')
  return c
}
