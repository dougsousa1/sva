import clsx from 'clsx'
import { CheckCircle2, ChevronDown, ChevronRight, Link2, Megaphone, TriangleAlert } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { campanhas, contas, ofertas } from '../data/mock'
import { supabase } from '../lib/supabase'
import type { MetaStatus } from '../data/types'
import { useApp } from '../lib/app-context'
import { money, money0, num, x2 } from '../lib/format'
import { metricasAnuncios, type MetricasAnuncio } from '../lib/metrics'
import { OfertaTag, PageHeader, Panel, PanelHeader, Pill } from '../components/ui'

const stTone: Record<MetaStatus, 'emerald' | 'ink' | 'rose'> = { ativo: 'emerald', pausado: 'ink', reprovado: 'rose' }

function soma(xs: MetricasAnuncio[]) {
  const s = xs.reduce((a, x) => ({ g: a.g + x.gastoImp, r: a.r + x.receita, v: a.v + x.vendas, c: a.c + x.conversas }), { g: 0, r: 0, v: 0, c: 0 })
  return { ...s, roas: s.g ? s.r / s.g : 0, cpa: s.v ? s.g / s.v : 0, cc: s.c ? s.g / s.c : 0, m: s.r - s.g }
}

export default function Campanhas() {
  const { periodo, imposto, modo } = useApp()
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set(campanhas.filter((c) => c.status === 'ativo').slice(0, 2).map((c) => c.id)))
  const [soAtivas, setSoAtivas] = useState(true)
  const ads = useMemo(() => new Map(metricasAnuncios(periodo, imposto).map((a) => [a.info.anuncio.id, a])), [periodo, imposto])
  const lista = campanhas.filter((c) => !soAtivas || c.status === 'ativo')
  const semVinculo = campanhas.filter((c) => !c.ofertaId).length
  const autoVinculo = campanhas.filter((c) => c.vinculo === 'auto').length

  const toggle = (id: string) => setAbertas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <>
      <PageHeader
        title="Campanhas Meta"
        sub="Estrutura ABO 1-3-1 sincronizada da API do Meta. Valores de gasto já incluem o imposto."
        right={
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={soAtivas} onChange={(e) => setSoAtivas(e.target.checked)} className="accent-cyan" /> Só ativas
          </label>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {contas.map((c) => (
          <div key={c.id} className="panel flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky/10 text-sky ring-1 ring-sky/25"><Megaphone size={18} /></div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{c.nome}</div>
              <div className="num text-xs text-ink-3">{c.id} · limite {money0(c.limiteDiario)}/dia</div>
            </div>
            <Pill tone="emerald">{c.status}</Pill>
          </div>
        ))}
        <div className="panel flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber/10 text-amber ring-1 ring-amber/25"><TriangleAlert size={18} /></div>
          <div className="text-sm">
            <div className="font-medium">Conta única = ponto único de falha</div>
            <div className="text-xs text-ink-3">Recomendado: 1–2 contas reserva aquecidas.</div>
          </div>
        </div>
        <div className="panel flex items-center gap-3 p-4">
          <div className={clsx('grid h-10 w-10 place-items-center rounded-xl ring-1', semVinculo ? 'bg-amber/10 text-amber ring-amber/25' : 'bg-emerald/10 text-emerald ring-emerald/25')}>
            {semVinculo ? <Link2 size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div className="text-sm">
            <div className="font-medium">Padrão de nomes</div>
            <div className="text-xs text-ink-3">{semVinculo ? `${semVinculo} campanha(s) sem oferta` : 'todas ligadas a uma oferta'}{autoVinculo ? ` · ${autoVinculo} reconhecida(s) pelo nome` : ''}</div>
          </div>
        </div>
      </div>

      <Panel>
        <PanelHeader title="Campanha → Conjunto → Anúncio" icon={Megaphone} sub="clique na campanha para abrir os 3 conjuntos" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="border-b border-line text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Nome</th>
                <th className="px-4 text-left font-medium">Oferta</th>
                <th className="px-4 text-left font-medium">Status</th>
                {['Orçam./dia', 'Gasto', 'Conversas', 'Custo/conv', 'Vendas', 'Receita', 'ROAS', 'CPA'].map((h) => <th key={h} className="px-4 text-right font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {lista.map((camp) => {
                const xs = camp.conjuntos.map((cj) => ads.get(cj.anuncio.id)).filter(Boolean) as MetricasAnuncio[]
                const s = soma(xs)
                const open = abertas.has(camp.id)
                return (
                  <Fragment key={camp.id}>
                    <tr onClick={() => toggle(camp.id)} className="cursor-pointer border-t border-line/70 bg-white/[.015] hover:bg-white/[.03]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {open ? <ChevronDown size={15} className="text-cyan" /> : <ChevronRight size={15} className="text-ink-3" />}
                          <span className="font-medium text-ink">{camp.nome}</span>
                        </div>
                      </td>
                      <td className="px-4" onClick={(e) => e.stopPropagation()}>
                        {modo === 'demo' ? (
                          <OfertaTag id={camp.ofertaId} nome={false} />
                        ) : camp.ofertaId && camp.vinculo !== 'auto' ? (
                          <OfertaTag id={camp.ofertaId} nome={false} />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Vincular campanhaId={camp.id} atual={camp.ofertaId} />
                            {camp.vinculo === 'auto' && <span title="Reconhecida pelo nome da campanha. Troque se estiver errada." className="text-[10px] text-cyan">auto</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4"><Pill tone={stTone[camp.status]}>{camp.status}</Pill></td>
                      <td className="num px-4 text-right">{money0(camp.conjuntos.reduce((t, c) => t + c.orcamentoDia, 0))}</td>
                      <Linha s={s} />
                    </tr>
                    {open && camp.conjuntos.map((cj) => {
                      const a = ads.get(cj.anuncio.id)
                      const s1 = soma(a ? [a] : [])
                      return (
                        <tr key={cj.id} className="border-t border-line/40 text-[13px]">
                          <td className="py-2.5 pr-4 pl-12">
                            <div className="text-ink-2">{cj.nome}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
                              <span className="h-px w-3 bg-line-2" /> {cj.anuncio.nome}
                              <span className="num text-[10px] text-ink-3/70">· id {cj.anuncio.id}</span>
                            </div>
                          </td>
                          <td className="px-4" />
                          <td className="px-4"><Pill tone={stTone[cj.anuncio.status]}>{cj.anuncio.status}</Pill></td>
                          <td className="num px-4 text-right text-ink-2">{money0(cj.orcamentoDia)}</td>
                          <Linha s={s1} />
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

function Linha({ s }: { s: ReturnType<typeof soma> }) {
  return (
    <>
      <td className="num px-4 text-right">{money0(s.g)}</td>
      <td className="num px-4 text-right">{num(s.c)}</td>
      <td className="num px-4 text-right">{s.c ? money(s.cc) : '—'}</td>
      <td className="num px-4 text-right">{num(s.v)}</td>
      <td className="num px-4 text-right">{money0(s.r)}</td>
      <td className={clsx('num px-4 text-right', s.roas >= 1.6 ? 'text-emerald' : s.roas >= 1.2 ? 'text-amber' : s.g ? 'text-rose' : 'text-ink-3')}>{x2(s.roas)}</td>
      <td className="num px-4 text-right text-ink-2">{s.v ? money(s.cpa) : '—'}</td>
    </>
  )
}

/** Liga uma campanha fora do padrão [OFxx] a uma oferta (grava no banco). */
function Vincular({ campanhaId, atual }: { campanhaId: string; atual?: string | null }) {
  const { recarregar } = useApp()
  return (
    <select
      defaultValue={atual ?? ''}
      aria-label="Vincular a uma oferta"
      onChange={async (e) => {
        if (!supabase || !e.target.value) return
        await supabase.from('meta_campanhas').update({ oferta_id: e.target.value }).eq('id', campanhaId)
        await recarregar()
      }}
      className={atual ? 'rounded-md border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 text-[11px] text-cyan outline-none' : 'rounded-md border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[11px] text-amber outline-none'}
    >
      <option value="">vincular…</option>
      {ofertas.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.nome}</option>)}
    </select>
  )
}
