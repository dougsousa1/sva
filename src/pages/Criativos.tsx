import clsx from 'clsx'
import { ChevronDown, ExternalLink, Flame, TrendingDown, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { criativos, ofertas } from '../data/mock'
import { useApp } from '../lib/app-context'
import { money, money0, num, pct, x2 } from '../lib/format'
import { adIndex, metricasAnuncios, ofertaById } from '../lib/metrics'
import type { Criativo, Oferta } from '../data/types'
import { PageHeader, Pill, Segmented, Sparkline, StatusBadge, Thumb } from '../components/ui'

type Ordem = 'margem' | 'roas' | 'custoConversa' | 'vendas'

interface Linha {
  c: Criativo
  ofertaId: string | null
  gastoImp: number
  receita: number
  vendas: number
  conversas: number
  impressoes: number
  cliques: number
  margem: number
  roas: number
  custoConversa: number
  ctr: number
  ativo: boolean
  reprovado: boolean
  fadiga: boolean
  serie: number[]
}

export default function Criativos() {
  const { periodo, imposto } = useApp()
  const [filtro, setFiltro] = useState('todas')
  const [ordem, setOrdem] = useState<Ordem>('margem')
  const [fechadas, setFechadas] = useState<Set<string>>(new Set())

  const linhas = useMemo<Linha[]>(() => {
    const ads = metricasAnuncios(periodo, imposto)
    return criativos.map((c) => {
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
      // Oferta do criativo: a dele, ou a da campanha onde o anúncio roda
      const ofertaId = c.ofertaId ?? [...adIndex.values()].find((a) => a.anuncio.criativoId === c.id && a.ofertaId)?.ofertaId ?? null
      return {
        c,
        ofertaId,
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
  }, [periodo, imposto])

  const grupos = useMemo(() => {
    const ordenar = (xs: Linha[]) =>
      [...xs].sort((a, b) =>
        a.gastoImp === 0 && b.gastoImp > 0 ? 1 : b.gastoImp === 0 && a.gastoImp > 0 ? -1
          : ordem === 'custoConversa' ? (a.custoConversa || 99) - (b.custoConversa || 99) : b[ordem] - a[ordem],
      )
    const gs = ofertas
      .map((o) => ({ id: o.id as string | null, o, itens: ordenar(linhas.filter((x) => x.ofertaId === o.id)) }))
      .filter((g) => g.itens.length)
    const sem = linhas.filter((x) => !x.ofertaId || !ofertaById.has(x.ofertaId))
    if (sem.length) gs.push({ id: null, o: undefined as unknown as Oferta, itens: ordenar(sem) })
    const total = (g: (typeof gs)[number]) => g.itens.reduce((t, x) => t + x.margem, 0)
    return gs
      .map((g) => ({
        ...g,
        gasto: g.itens.reduce((t, x) => t + x.gastoImp, 0),
        receita: g.itens.reduce((t, x) => t + x.receita, 0),
        vendas: g.itens.reduce((t, x) => t + x.vendas, 0),
        margem: total(g),
        ativos: g.itens.filter((x) => x.ativo).length,
      }))
      .sort((a, b) => (a.id === null ? 1 : b.id === null ? -1 : b.margem - a.margem))
  }, [linhas, ordem])

  const visiveis = grupos.filter((g) => filtro === 'todas' || (g.id ?? 'sem') === filtro)
  const alternar = (k: string) => setFechadas((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })

  return (
    <>
      <PageHeader
        title="Criativos"
        sub="Separados por oferta. Cada criativo ligado ao anúncio do Meta e às vendas da Leona (via source_id)."
        right={<Segmented value={ordem} onChange={setOrdem} options={[{ id: 'margem', label: 'Margem' }, { id: 'roas', label: 'ROAS' }, { id: 'custoConversa', label: 'Custo/conversa' }, { id: 'vendas', label: 'Vendas' }]} />}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {[{ k: 'todas', nome: 'Todas', cor: '#9aa5bd', n: linhas.length }, ...grupos.map((g) => ({ k: g.id ?? 'sem', nome: g.id ? g.o.nome : 'Sem oferta', cor: g.id ? g.o.cor : '#fbbf24', n: g.itens.length }))].map((o) => (
          <button
            key={o.k}
            onClick={() => setFiltro(o.k)}
            className={clsx('rounded-full border px-3 py-1 text-xs transition', filtro === o.k ? 'border-transparent text-bg' : 'border-line text-ink-2 hover:text-ink')}
            style={filtro === o.k ? { background: o.cor } : undefined}
          >
            {o.k !== 'todas' && o.k !== 'sem' && <span className="num mr-1 opacity-70">{o.k}</span>}
            {o.nome}
            <span className="num ml-1.5 opacity-60">{o.n}</span>
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {visiveis.map((g) => {
          const k = g.id ?? 'sem'
          const aberta = !fechadas.has(k)
          const cor = g.id ? g.o.cor : '#fbbf24'
          return (
            <section key={k}>
              <button onClick={() => alternar(k)} className="group mb-3 flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3 text-left">
                <ChevronDown size={16} className={clsx('text-ink-3 transition', !aberta && '-rotate-90')} />
                <span className="h-6 w-1 rounded-full" style={{ background: cor, boxShadow: `0 0 12px ${cor}` }} />
                <div className="flex min-w-0 items-center gap-2.5">
                  {g.id && <span className="num rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: `${cor}1f`, color: cor }}>{g.id}</span>}
                  <h2 className="truncate font-display text-lg font-semibold">{g.id ? g.o.nome : 'Sem oferta vinculada'}</h2>
                  {g.id && <StatusBadge s={g.o.status} />}
                </div>
                <span className="text-xs text-ink-3">{g.itens.length} criativos · {g.ativos} ativos</span>
                <div className="ml-auto flex flex-wrap gap-4 text-xs">
                  <Resumo l="Gasto" v={money0(g.gasto)} />
                  <Resumo l="Vendas" v={num(g.vendas)} />
                  <Resumo l="ROAS" v={x2(g.gasto ? g.receita / g.gasto : 0)} />
                  <Resumo l="Margem" v={money0(g.margem)} c={g.margem >= 0 ? 'text-emerald' : 'text-rose'} />
                </div>
              </button>
              {!g.id && aberta && (
                <p className="mb-3 text-xs text-amber">Esses criativos estão em campanhas sem oferta. Vincule a campanha em <b>Campanhas</b> (ou use o código [OFxx] no nome) e eles passam para a oferta certa.</p>
              )}
              {aberta && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {g.itens.map((x, i) => <Card key={x.c.id} x={x} i={i} />)}
                </div>
              )}
            </section>
          )
        })}
        {!visiveis.length && <p className="text-sm text-ink-3">Nenhum criativo ainda. Eles aparecem aqui depois da sincronização com o Meta.</p>}
      </div>
    </>
  )
}

function Resumo({ l, v, c = 'text-ink' }: { l: string; v: string; c?: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-ink-3">{l}</span>
      <span className={clsx('num font-medium', c)}>{v}</span>
    </span>
  )
}

function Card({ x, i }: { x: Linha; i: number }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="panel fade-up overflow-hidden" style={{ animationDelay: `${i * 25}ms` }}>
      {aberto && <Visualizador x={x} onClose={() => setAberto(false)} />}
      <button type="button" onClick={() => setAberto(true)} className="relative block w-full cursor-zoom-in text-left" aria-label={`Ver criativo ${x.c.id}`}>
        <Thumb c={x.c} className="aspect-[16/10] rounded-none" />
        <div className="absolute top-2.5 right-2.5 flex gap-1.5">
          {i < 3 && x.vendas > 0 && <Pill tone="emerald"><Flame size={11} /> top {i + 1}</Pill>}
          {x.fadiga && <Pill tone="amber"><TrendingDown size={11} /> fadiga</Pill>}
          {x.reprovado && <Pill tone="rose">reprovado</Pill>}
          {!x.ativo && !x.reprovado && <Pill>pausado</Pill>}
        </div>
      </button>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="num truncate text-ink-3">{x.c.id} · v{x.c.versao}{x.c.ferramenta ? ` · ${x.c.ferramenta}` : ''}</span>
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

/** Abre o criativo grande: vídeo com player, ou a imagem em alta, + link da prévia no Facebook. */
function Visualizador({ x, onClose }: { x: Linha; onClose: () => void }) {
  const c = x.c
  const [falhou, setFalhou] = useState(false)
  const imagem = c.imagemUrl ?? c.thumbnailUrl
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel panel-glow w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-semibold">{c.gancho}</div>
            <div className="num mt-0.5 truncate text-[11px] text-ink-3">{c.id}{c.ferramenta ? ` · ${c.ferramenta}` : ''}</div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-line p-1.5 text-ink-2 hover:text-ink" aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="grid place-items-center bg-black">
          {c.videoUrl && !falhou ? (
            <video src={c.videoUrl} poster={imagem ?? undefined} controls autoPlay playsInline onError={() => setFalhou(true)} className="max-h-[70vh] w-full bg-black object-contain" />
          ) : imagem ? (
            <img src={imagem} alt={c.gancho} className="max-h-[70vh] w-full object-contain" />
          ) : (
            <div className="p-10 text-sm text-ink-3">Sem mídia ainda — clique em Sincronizar para buscar no Meta.</div>
          )}
        </div>
        {falhou && <p className="px-5 pt-3 text-xs text-amber">O link do vídeo expirou. Clique em Sincronizar no topo para renovar, ou abra a prévia no Facebook.</p>}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 text-xs">
          <span className="text-ink-3">Margem <b className={clsx('num font-medium', x.margem >= 0 ? 'text-emerald' : 'text-rose')}>{money0(x.margem)}</b></span>
          <span className="text-ink-3">ROAS <b className="num font-medium text-ink">{x2(x.roas)}</b></span>
          <span className="text-ink-3">Vendas <b className="num font-medium text-ink">{num(x.vendas)}</b></span>
          <span className="text-ink-3">CTR <b className="num font-medium text-ink">{pct(x.ctr)}</b></span>
          {c.previewLink && (
            <a href={c.previewLink} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1.5 rounded-lg border border-cyan/40 px-3 py-1.5 text-cyan hover:bg-cyan/10">
              <ExternalLink size={13} /> Ver anúncio no Facebook
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
