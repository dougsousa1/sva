import { Loader2, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Marca() {
  return (
    <div className="mb-8 flex items-center justify-center gap-2.5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan/25 to-violet/25 ring-1 ring-cyan/40">
        <svg viewBox="0 0 32 32" className="h-6 w-6">
          <path d="M5 22l7-12 5 7 3-4 7 9" stroke="#22d3ee" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="font-display text-xl font-bold tracking-wide">SVA<span className="text-cyan">.</span>command</div>
    </div>
  )
}

export default function Login({ onEntrar }: { onEntrar: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const input = 'mt-1.5 w-full rounded-xl border border-line bg-bg/70 px-3 py-2.5 text-sm outline-none focus:border-cyan/60 focus:shadow-[0_0_0_3px_rgba(34,211,238,.12)]'
  return (
    <div className="bg-grid grid min-h-full place-items-center px-4 py-10">
      <form
        className="panel panel-glow w-full max-w-sm p-7"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!supabase) return
          setEnviando(true)
          setErro('')
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
          setEnviando(false)
          if (error) setErro('E-mail ou senha incorretos.')
          else onEntrar()
        }}
      >
        <Marca />
        <label htmlFor="login-email" className="block text-xs text-ink-2">E-mail</label>
        <input id="login-email" type="email" autoComplete="email" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="login-senha" className="mt-4 block text-xs text-ink-2">Senha</label>
        <input id="login-senha" type="password" autoComplete="current-password" required className={input} value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erro && <p className="mt-3 text-xs text-rose">{erro}</p>}
        <button disabled={enviando} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan py-2.5 text-sm font-semibold text-bg disabled:opacity-60">
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />} Entrar
        </button>
      </form>
    </div>
  )
}

export function Carregando({ erro, onTentar }: { erro?: string; onTentar?: () => void }) {
  return (
    <div className="bg-grid grid min-h-full place-items-center px-4">
      <div className="text-center">
        <Marca />
        {erro ? (
          <>
            <p className="max-w-md text-sm text-rose">Não consegui carregar os dados: {erro}</p>
            <button onClick={onTentar} className="mt-4 rounded-xl border border-line px-4 py-2 text-sm text-ink-2 hover:text-ink">Tentar de novo</button>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm text-ink-2"><Loader2 size={16} className="animate-spin text-cyan" /> Carregando a operação…</p>
        )}
      </div>
    </div>
  )
}
