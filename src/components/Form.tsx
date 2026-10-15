import clsx from 'clsx'
import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export const inputCls =
  'mt-1.5 w-full rounded-xl border border-line bg-bg/70 px-3 py-2.5 text-sm text-ink outline-none [color-scheme:dark] focus:border-cyan/60 focus:shadow-[0_0_0_3px_rgba(34,211,238,.12)]'

/** Janela de formulário. `onSalvar` devolve uma mensagem de erro (ou nada, se deu certo). */
export function Modal({ titulo, sub, onClose, onSalvar, onExcluir, podeSalvar = true, rotulo = 'Salvar', children }: {
  titulo: ReactNode
  sub?: string
  onClose: () => void
  onSalvar: () => Promise<string | void>
  /** Se passado, mostra "Excluir" (pede confirmação com um 2º clique). */
  onExcluir?: () => Promise<string | void>
  podeSalvar?: boolean
  rotulo?: string
  children: ReactNode
}) {
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        className="panel panel-glow w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault()
          if (!podeSalvar || salvando) return
          setSalvando(true)
          setErro('')
          const r = await onSalvar()
          setSalvando(false)
          if (r) setErro(r)
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">{titulo}</h3>
            {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">{children}</div>
        {erro && <p className="mt-3 text-xs text-rose">{erro}</p>}
        <div className="mt-6 flex gap-2">
          {onExcluir && (
            <button
              type="button"
              disabled={salvando}
              onClick={async () => {
                if (!confirmar) return setConfirmar(true)
                setSalvando(true)
                const r = await onExcluir()
                setSalvando(false)
                if (r) setErro(r)
              }}
              onBlur={() => setConfirmar(false)}
              className={clsx(
                'rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-40',
                confirmar ? 'border-rose bg-rose text-white' : 'border-rose/40 text-rose hover:bg-rose/10',
              )}
            >
              {confirmar ? 'Confirmar exclusão' : 'Excluir'}
            </button>
          )}
          <button disabled={!podeSalvar || salvando} className="flex-1 rounded-xl bg-cyan py-2.5 text-sm font-semibold text-bg disabled:opacity-40">
            {salvando ? 'Salvando…' : rotulo}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

export function Campo({ id, label, value, onChange, tipo = 'text', placeholder, mono }: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  tipo?: 'text' | 'date' | 'number' | 'tel'
  placeholder?: string
  mono?: boolean
}) {
  return (
    <label htmlFor={id} className="block text-xs text-ink-2">
      {label}
      <input
        id={id}
        type={tipo === 'number' ? 'text' : tipo}
        inputMode={tipo === 'number' ? 'decimal' : tipo === 'tel' ? 'tel' : undefined}
        className={clsx(inputCls, mono && 'num')}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function Texto({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label htmlFor={id} className="block text-xs text-ink-2">
      {label}
      <textarea id={id} rows={2} className={clsx(inputCls, 'resize-y')} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export function Escolha({ id, label, value, onChange, opcoes }: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  opcoes: { v: string; l: string }[]
}) {
  return (
    <label htmlFor={id} className="block text-xs text-ink-2">
      {label}
      <select id={id} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {opcoes.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}

export function Botoes<T extends string>({ label, value, onChange, opcoes }: { label: string; value: T; onChange: (v: T) => void; opcoes: { v: T; l: string }[] }) {
  return (
    <div>
      <div className="text-xs text-ink-2">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {opcoes.map((o) => (
          <button
            type="button"
            key={o.v}
            onClick={() => onChange(o.v)}
            className={clsx('rounded-full border px-3 py-1.5 text-xs', value === o.v ? 'border-cyan/50 bg-cyan/15 text-cyan' : 'border-line text-ink-2 hover:text-ink')}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BotaoAdicionar({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-sm font-medium whitespace-nowrap text-bg shadow-[0_0_24px_-6px_#22d3ee] hover:brightness-110">
      {children}
    </button>
  )
}

export const numero = (s: string) => Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0
export const novoId = (prefixo: string) => `${prefixo}-${Math.random().toString(36).slice(2, 8)}`
