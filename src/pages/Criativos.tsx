import clsx from 'clsx'
import { Flame, TrendingDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { criativos, ofertas } from '../data/mock'
import { useApp } from '../lib/app-context'
import { money, money0, num, pct, x2 } from '../lib/format'
import { metricasAnuncios } from '../lib/metrics'
import { OfertaTag, PageHeader, Pill, Segmented, Sparkline, Thumb } from '../components/ui'

type Ordem = 'margem' | 'roas' | 'custoConversa' | 'vendas'

export default function Criativos() {
  const { periodo, imposto } = useApp()
  const [filtro, setFiltro] = useState('todas')
  const [ordem, setOrdem] = useState<Ordem>('margem')

  const lista = useMemo(() => {
    const ads = metricasAnuncios(periodo, imposto)
    return criativos
      .map((c) => {
        const meus = ads.filter((a) => a.info.anuncio.criativoId === c.id)
        const s = meus.reduce(
          (acc, a) => ({
            gastoImp: acc.gastoImp + a.gastoImp,
            receita: acc.receita + a.receita,
            vendas: acc.vendas + a.vendas,
            conversas: acc.conversas + a.conversas,
            impressoes: acc.impressoes + a.impressoes,
            cliques: acc.cliques + a.cliques,
          }),
          { gastoImp: 0, receita: 0, vendas: 0, conversas: 0, impressoes: 0, cliques: 0 },
        )
        const serie = meus.length ? meus[0].serie.map((_, i) => meus.reduce((t, a) => t + a.serie[i], 0)) : []
        return {
          c,
          ...s,
          margem: s.receita - s.gastoImp,
          roas: s.gastoImp ? s.receita / s.gastoImp : 0,
          custoConversa: s.conversas ? s.gastoImp / s.conversas : 0,
          ctr: s.impressoes ? s.cliques / s.impressoes : 0,
          ativo: meus.some((a) => a.info.anuncio.status === 'ativo'),
          reprovado: meus.some((a) => a.info.anuncio.status === 'reprovado'),
          fadiga: meus.some((a) => a.fadiga),
          serie,
        }
      })
      .filter((x) => filtro === 'todas' || x.c.ofertaId === filtro)
      .sort((a, b) => (ordem === 'custoConversa' ? (a.custoConversa || 99) - (b.custoConversa || 99) : b[ordem] - a[ordem]))
  }, [periodo, imposto, filtro, ordem])

  const comCriativo = ofertas.filter((o) => criativos.some((c) => c.ofertaId === o.id))

  return (
    <>
      <PageHeader
        title="Criativos"
        sub="Cada criativo ligado ao anúncio do Meta e às vendas da Leona (via source_id)."
        right={<Segmented value={ordem} onChange={setOrdem} options={[{ id: 'margem', label: 'Margem' }, { id: 'roas', label: 'ROAS' }, { id: 'custoConversa', label: 'Custo/conversa' }, { id: 'vendas', label: 'Vendas' }]} />}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {[{ id: 'todas', nome: 'Todas', cor: '#9aa5bd' }, ...comCriativo].map((o) => (
          <button
            key={o.id}
            onClick={() => setFiltro(o.id)}
            className={clsx('rounded-full border px-3 py-1 text-xs transition', filtro === o.id ? 'border-transparent text-bg' : 'border-line text-ink-2 hover:text-ink')}
            style={filtro === o.id ? { background: o.cor } : undefined}
          >
            {o.id !== 'todas' && <span className="num mr-1 opacity-70">{o.id}</span>}
            {o.nome}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {lista.map((x, i) => (
          <div key={x.c.id} className="panel fade-up overflow-hidden" style={{ animationDelay: `${i * 25}ms` }}>
            <div className="relative">
              <Thumb c={x.c} className="aspect-[16/10] rounded-none" />
              <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                {i < 3 && x.vendas > 0 && <Pill tone="emerald"><Flame size={11} /> top {i + 1}</Pill>}
                {x.fadiga && <Pill tone="amber"><TrendingDown size={11} /> fadiga</Pill>}
                {x.reprovado && <Pill tone="rose">reprovado</Pill>}
                {!x.ativo && !x.reprovado && <Pill>pausado</Pill>}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between text-xs">
                <OfertaTag id={x.c.ofertaId} nome={false} />
                <span className="num text-ink-3">{x.c.id} · v{x.c.versao} · {x.c.ferramenta}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat l="Margem" v={money0(x.margem)} c={x.margem >= 0 ? 'text-emerald' : 'text-rose'} />
                <Stat l="ROAS" v={x2(x.roas)} />
                <Stat l="Vendas" v={num(x.vendas)} />
                <Stat l="Custo/conv." v={x.conversas ? money(x.custoConversa) : '—'} />
                <Stat l="CTR" v={pct(x.ctr)} />
                <Stat l="Gasto" v={money0(x.gastoImp)} />
              </div>
              {x.serie.some((v) => v > 0) && (
                <div className="mt-3 h-8"><Sparkline data={x.serie} fill color={x.margem >= 0 ? '#34d399' : '#fb7185'} height={32} /></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function Stat({ l, v, c = 'text-ink' }: { l: string; v: string; c?: string }) {
  return (
    <div className="rounded-lg bg-white/[.025] px-1 py-1.5">
      <div className="text-[10px] text-ink-3">{l}</div>
      <div className={clsx('num text-[13px] font-medium', c)}>{v}</div>
    </div>
  )
}
