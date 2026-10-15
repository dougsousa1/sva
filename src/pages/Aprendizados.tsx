import clsx from 'clsx'
import { Brain, CircleCheck, CircleMinus, CircleX, Plus } from 'lucide-react'
import { aprendizados } from '../data/mock'
import { dataMes } from '../lib/format'
import { criativoById } from '../lib/metrics'
import { OfertaTag, PageHeader, Pill } from '../components/ui'

const v = {
  ganhou: { icon: CircleCheck, c: 'text-emerald', bg: 'bg-emerald', l: 'Funcionou' },
  perdeu: { icon: CircleX, c: 'text-rose', bg: 'bg-rose', l: 'Não funcionou' },
  neutro: { icon: CircleMinus, c: 'text-amber', bg: 'bg-amber', l: 'Inconclusivo' },
}

export default function Aprendizados() {
  const cont = { ganhou: 0, perdeu: 0, neutro: 0 }
  aprendizados.forEach((a) => cont[a.veredito]++)
  return (
    <>
      <PageHeader
        title="Aprendizados"
        sub="A memória da operação: hipótese → teste → resultado → decisão. É o que evita repetir erro."
        right={<button className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-sm font-medium text-bg shadow-[0_0_24px_-6px_#22d3ee] hover:brightness-110"><Plus size={16} /> Registrar teste</button>}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(v) as (keyof typeof v)[]).map((k) => {
          const I = v[k].icon
          return <span key={k} className={clsx('flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs', v[k].c)}><I size={13} /> {v[k].l}: <span className="num">{cont[k]}</span></span>
        })}
      </div>

      <div className="relative ml-3 border-l border-line-2 pl-7 md:ml-5">
        {aprendizados.map((a, i) => {
          const I = v[a.veredito].icon
          const cr = a.criativoId ? criativoById.get(a.criativoId) : null
          return (
            <div key={a.id} className="fade-up relative mb-5" style={{ animationDelay: `${i * 40}ms` }}>
              <div className={clsx('absolute top-4 -left-[37px] grid h-5 w-5 place-items-center rounded-full ring-4 ring-bg', v[a.veredito].bg)}>
                <I size={12} className="text-bg" />
              </div>
              <div className="panel p-5">
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="num text-ink-3">{dataMes(a.data)}</span>
                  <OfertaTag id={a.ofertaId} />
                  {cr && <Pill>{cr.id} · {cr.gancho.slice(0, 32)}</Pill>}
                  <span className={clsx('ml-auto font-medium', v[a.veredito].c)}>{v[a.veredito].l}</span>
                </div>
                <h3 className="mt-3 flex items-start gap-2 font-display text-[17px] leading-snug font-semibold"><Brain size={18} className="mt-0.5 shrink-0 text-violet" />{a.hipotese}</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[['O que fizemos', a.acao], ['Resultado', a.resultado], ['Decisão', a.decisao]].map(([l, t], j) => (
                    <div key={l} className={clsx('rounded-xl border p-3 text-sm', j === 2 ? 'border-cyan/25 bg-cyan/5' : 'border-line bg-white/[.02]')}>
                      <div className="mb-1 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">{l}</div>
                      <div className="text-ink-2">{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
