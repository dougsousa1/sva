import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
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
  const [imposto, setImposto] = useState(0.13)
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
      setImposto,
    }),
    [preset, imposto],
  )
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp fora do AppProvider')
  return c
}
