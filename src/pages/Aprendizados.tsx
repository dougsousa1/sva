import clsx from 'clsx'
import { Brain, CircleCheck, CircleMinus, CircleX, Plus } from 'lucide-react'
import { useState } from 'react'
import { aprendizados, criativos, ofertas } from '../data/mock'
import type { Aprendizado } from '../data/types'
import { Botoes, BotaoAdicionar, Campo, Escolha, Modal, novoId, Texto } from '../components/Form'
import { useApp } from '../lib/app-context'
import { TODAY_ISO } from '../lib/date'
import { inserir } from '../lib/gravar'
import { dataMes } from '../lib/format'
import { criativoById } from '../lib/metrics'
import { OfertaTag, PageHeader, Pill } from '../components/ui'

const v = {
  ganhou: { icon: CircleCheck, c: 'text-emerald', bg: 'bg-emerald', l: 'Funcionou' },
  perdeu: { icon: CircleX, c: 'text-rose', bg: 'bg-rose', l: 'Não funcionou' },
  neutro: { icon: CircleMinus, c: 'text-amber', bg: 'bg-amber', l: 'Inconclusivo' },
}

export default function Aprendizados() {
  const [novo, setNovo] = useState(false)
  const cont = { ganhou: 0, perdeu: 0, neutro: 0 }
  aprendizados.forEach((a) => cont[a.veredito]++)
  return (
    <>
      <PageHeader
        title="Aprendizados"
        sub="A memória da operação: hipótese → teste → resultado → decisão. É o que evita repetir erro."
        right={<BotaoAdicionar onClick={() => setNovo(true)}><Plus size={16} /> Registrar teste</BotaoAdicionar>}
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
      {novo && <NovoAprendizado onClose={() => setNovo(false)} />}
      {!aprendizados.length && <p className="text-sm text-ink-3">Nenhum teste registrado ainda. Clique em “Registrar teste” sempre que testar um gancho, público, preço ou oferta.</p>}
    </>
  )
}

function NovoAprendizado({ onClose }: { onClose: () => void }) {
  const { atualizar } = useApp()
  const [f, setF] = useState({ oferta: ofertas[0]?.id ?? '', criativo: '', data: TODAY_ISO, hipotese: '', acao: '', resultado: '', decisao: '', veredito: 'neutro' as Aprendizado['veredito'] })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  const crs = criativos.filter((c) => c.ofertaId === f.oferta)
  return (
    <Modal
      titulo="Registrar teste"
      sub="Hipótese → o que foi feito → resultado → decisão."
      onClose={onClose}
      podeSalvar={!!f.oferta && !!f.hipotese.trim()}
      onSalvar={async () => {
        const a = {
          id: novoId('AP'), data: f.data, ofertaId: f.oferta, criativoId: f.criativo || undefined, hipotese: f.hipotese.trim(),
          acao: f.acao.trim(), resultado: f.resultado.trim(), decisao: f.decisao.trim(), veredito: f.veredito,
        }
        const err = await inserir('aprendizados', {
          id: a.id, data: a.data, oferta_id: a.ofertaId, criativo_id: a.criativoId ?? null, hipotese: a.hipotese,
          acao: a.acao, resultado: a.resultado, decisao: a.decisao, veredito: a.veredito,
        }, () => {
          aprendizados.unshift(a)
        })
        if (err) return err
        onClose()
        await atualizar()
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Escolha id="apr-oferta" label="Oferta" value={f.oferta} onChange={(v) => setF({ ...f, oferta: v, criativo: '' })} opcoes={ofertas.map((o) => ({ v: o.id, l: `${o.id} · ${o.nome}` }))} />
        <Campo id="apr-data" label="Data" tipo="date" value={f.data} onChange={set('data')} />
      </div>
      {crs.length > 0 && <Escolha id="apr-criativo" label="Criativo (opcional)" value={f.criativo} onChange={set('criativo')} opcoes={[{ v: '', l: '— nenhum —' }, ...crs.map((c) => ({ v: c.id, l: `${c.id} · ${c.gancho.slice(0, 40)}` }))]} />}
      <Texto id="apr-hipotese" label="Hipótese" value={f.hipotese} onChange={set('hipotese')} placeholder="Ex.: gancho de dor converte mais que gancho de curiosidade" />
      <Texto id="apr-acao" label="O que foi feito" value={f.acao} onChange={set('acao')} />
      <Texto id="apr-resultado" label="Resultado" value={f.resultado} onChange={set('resultado')} />
      <Texto id="apr-decisao" label="Decisão" value={f.decisao} onChange={set('decisao')} />
      <Botoes label="Veredito" value={f.veredito} onChange={(v) => setF({ ...f, veredito: v })} opcoes={[{ v: 'ganhou', l: 'Funcionou' }, { v: 'perdeu', l: 'Não funcionou' }, { v: 'neutro', l: 'Inconclusivo' }]} />
    </Modal>
  )
}
