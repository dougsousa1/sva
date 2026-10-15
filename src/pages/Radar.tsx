import clsx from 'clsx'
import { Copy, ExternalLink, Loader2, MessageCircle, Pause, Play, Plus, Radar as RadarIcon, RefreshCw, Search, Star, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { radarAnuncios, radarExecucoes, radarPalavras, ofertas } from '../data/mock'
import type { RadarAnuncio, RadarStatus } from '../data/types'
import { useApp } from '../lib/app-context'
import { diffDays, TODAY_ISO } from '../lib/date'
import { dataCurta, money } from '../lib/format'
import { alterar, inserir } from '../lib/gravar'
import { supabase } from '../lib/supabase'
import { Escolha, novoId } from '../components/Form'
import { OfertaTag, PageHeader, Panel, PanelHeader, Pill, Segmented } from '../components/ui'
import { criarOferta, NovaOferta } from './Ofertas'
import InsightsIA from '../components/InsightsIA'

const urlBiblioteca = (termo: string) =>
  'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&media_type=all' +
  `&q=${encodeURIComponent(termo)}&search_type=keyword_unordered`
const urlAnuncio = (id: string) => `https://www.facebook.com/ads/library/?id=${id}`
const diasNoAr = (a: RadarAnuncio) => (a.inicio ? Math.max(0, diffDays(a.inicio, TODAY_ISO)) : 0)

type Ordem = 'nota' | 'dias' | 'variacoes'

export default function Radar() {
  const { modo, atualizar, recarregar } = useApp()
  const [aba, setAba] = useState<RadarStatus>('novo')
  const [termo, setTermo] = useState('todos')
  const [ordem, setOrdem] = useState<Ordem>('nota')
  const [soWhats, setSoWhats] = useState(false)
  const [modelar, setModelar] = useState<RadarAnuncio | null>(null)
  const [, setTick] = useState(0)
  const [busca, setBusca] = useState<{ estado: 'parado' | 'rodando' | 'erro'; msg: string }>({ estado: 'parado', msg: '' })
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const contagem = useMemo(() => {
    const c: Record<RadarStatus, number> = { novo: 0, salvo: 0, descartado: 0, modelado: 0 }
    for (const a of radarAnuncios) c[a.status]++
    return c
  }, [radarAnuncios.length, aba, modelar])

  const lista = radarAnuncios
    .filter((a) => a.status === aba)
    .filter((a) => termo === 'todos' || a.palavraId === termo)
    .filter((a) => !soWhats || a.whatsapp)
    .sort((a, b) => (ordem === 'dias' ? diasNoAr(b) - diasNoAr(a) : ordem === 'variacoes' ? b.variacoes - a.variacoes : b.nota - a.nota))

  async function mudarStatus(a: RadarAnuncio, status: RadarStatus) {
    const antes = a.status
    a.status = status
    setTick((t) => t + 1)
    const err = await alterar('radar_anuncios', a.id, { status }, () => undefined)
    if (err) {
      a.status = antes
      setTick((t) => t + 1)
    }
  }

  /** Baixa o que o Apify já terminou (sem iniciar busca nova, não gasta crédito). */
  async function conferirAgora() {
    if (!supabase) return
    setBusca({ estado: 'rodando', msg: 'Conferindo coletas no Apify…' })
    const r = await supabase.functions.invoke('radar-sync', { body: { acao: 'coletar' } })
    await recarregar()
    if (r.error || !r.data?.ok) setBusca({ estado: 'erro', msg: r.data?.erro ?? r.error?.message ?? 'falhou ao conferir' })
    else setBusca({ estado: 'parado', msg: `${r.data.novos} anúncio(s) novo(s).` })
  }

  /** Inicia as coletas no Apify e vai conferindo a cada 20 s até terminarem (máx. ~6 min). */
  async function buscarAgora(palavraId?: string) {
    if (!supabase) return
    setBusca({ estado: 'rodando', msg: 'Iniciando coleta no Apify…' })
    const { data, error } = await supabase.functions.invoke('radar-sync', { body: { acao: 'buscar', palavra_id: palavraId } })
    if (error || !data?.ok) {
      setBusca({ estado: 'erro', msg: data?.erro ?? error?.message ?? 'falhou' })
      return
    }
    let tentativas = 0
    const conferir = async () => {
      tentativas++
      const r = await supabase!.functions.invoke('radar-sync', { body: { acao: 'coletar' } })
      if (r.error || !r.data?.ok) {
        setBusca({ estado: 'erro', msg: r.data?.erro ?? r.error?.message ?? 'falhou ao coletar' })
        return
      }
      await recarregar()
      const pendentes = radarExecucoes.filter((e) => e.status === 'rodando').length
      if (pendentes && tentativas < 18) {
        setBusca({ estado: 'rodando', msg: `Coletando… ${pendentes} busca(s) em andamento` })
        timer.current = window.setTimeout(conferir, 20_000)
      } else {
        setBusca({ estado: 'parado', msg: pendentes ? 'Ainda coletando — o agendamento termina sozinho.' : `Pronto: ${r.data.novos} anúncio(s) novo(s).` })
      }
    }
    setBusca({ estado: 'rodando', msg: `Coletando “${(data.iniciadas ?? []).join('”, “')}”… leva de 1 a 5 min` })
    timer.current = window.setTimeout(conferir, 20_000)
  }

  return (
    <>
      <PageHeader
        title="Radar de ofertas"
        sub="Garimpa a Biblioteca de Anúncios (Brasil, só ativos, 2x por semana) e dá nota para o que já está validado: tempo no ar, variações e funil por WhatsApp."
        right={
          modo === 'live' ? (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => buscarAgora()}
                disabled={busca.estado === 'rodando'}
                className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-sm font-medium text-bg shadow-[0_0_24px_-6px_#22d3ee] hover:brightness-110 disabled:opacity-60"
              >
                {busca.estado === 'rodando' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Buscar agora
              </button>
              {busca.msg && <span className={clsx('max-w-xs text-right text-[11px]', busca.estado === 'erro' ? 'text-rose' : 'text-ink-3')}>{busca.msg}</span>}
            </div>
          ) : (
            <Pill tone="amber">demonstração — a busca real roda no modo ao vivo</Pill>
          )
        }
      />

      <InsightsIA />

      <Palavras onBuscar={modo === 'live' ? buscarAgora : undefined} onMudou={async () => { await atualizar() }} buscando={busca.estado === 'rodando'} />
      {modo === 'live' && radarExecucoes.length > 0 && <Execucoes onConferir={conferirAgora} conferindo={busca.estado === 'rodando'} />}

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          value={aba}
          onChange={setAba}
          options={[
            { id: 'novo', label: `Novos ${contagem.novo}` },
            { id: 'salvo', label: `Salvos ${contagem.salvo}` },
            { id: 'modelado', label: `Modelados ${contagem.modelado}` },
            { id: 'descartado', label: `Descartados ${contagem.descartado}` },
          ]}
        />
        <select value={termo} onChange={(e) => setTermo(e.target.value)} aria-label="Filtrar por palavra-chave" className="rounded-xl border border-line bg-surface/70 px-3 py-2 text-xs text-ink-2 outline-none [color-scheme:dark]">
          <option value="todos">Todas as palavras</option>
          {radarPalavras.map((p) => <option key={p.id} value={p.id}>{p.termo}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-2">
          <input type="checkbox" checked={soWhats} onChange={(e) => setSoWhats(e.target.checked)} className="accent-cyan" /> Só funil de WhatsApp
        </label>
        <div className="ml-auto">
          <Segmented value={ordem} onChange={setOrdem} options={[{ id: 'nota', label: 'Nota' }, { id: 'dias', label: 'Dias no ar' }, { id: 'variacoes', label: 'Variações' }]} />
        </div>
      </div>

      {lista.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {lista.map((a, i) => (
            <CardAnuncio key={a.id} a={a} i={i} onStatus={(s) => mudarStatus(a, s)} onModelar={() => setModelar(a)} />
          ))}
        </div>
      ) : (
        <Panel className="p-8 text-center text-sm text-ink-3">
          {aba === 'novo'
            ? radarPalavras.length ? 'Nenhum anúncio novo ainda. Veja o andamento em “Buscas recentes” acima.' : 'Cadastre as palavras-chave acima para começar a garimpar.'
            : 'Nada aqui ainda.'}
        </Panel>
      )}

      {modelar && (
        <NovaOferta
          titulo="Modelar oferta"
          inicial={{
            nome: '',
            ticket: modelar.preco ? String(modelar.preco).replace('.', ',') : '',
            promessa: (modelar.titulo ?? modelar.texto).slice(0, 140),
            produtoOrigem: `${modelar.paginaNome} — ${(modelar.titulo ?? modelar.texto).slice(0, 60)}`,
            fonteValidacao: `${urlAnuncio(modelar.id)} · ${diasNoAr(modelar)} dias no ar · ${modelar.variacoes} variações`,
          }}
          onClose={() => setModelar(null)}
          onSalvar={async (o) => {
            const err = await criarOferta(o)
            if (err) return err
            const a = modelar
            await alterar('radar_anuncios', a.id, { status: 'modelado', oferta_id: o.id }, () => {
              a.status = 'modelado'
              a.ofertaId = o.id
            })
            setModelar(null)
            await atualizar()
          }}
        />
      )}
    </>
  )
}

function Palavras({ onBuscar, onMudou, buscando }: { onBuscar?: (id?: string) => void; onMudou: () => Promise<void>; buscando: boolean }) {
  const [termo, setTermo] = useState('')
  const [oferta, setOferta] = useState('')
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)

  async function adicionar() {
    const t = termo.trim()
    if (!t) return
    const id = novoId('RP')
    const err = await inserir('radar_palavras', { id, termo: t, oferta_id: oferta || null }, () => {
      radarPalavras.push({ id, termo: t, ofertaId: oferta || null, ativo: true, limite: 20, ultimaBusca: null })
    })
    if (err) return setErro(err)
    setTermo('')
    setErro('')
    await onMudou()
  }

  return (
    <Panel>
      <PanelHeader title="Palavras-chave" icon={RadarIcon} sub="O que o radar procura na Biblioteca. Ligue a uma oferta sua ou deixe livre para garimpar nichos novos." />
      <div className="flex flex-wrap gap-2 p-4">
        {radarPalavras.map((p) => (
          <div key={p.id} className={clsx('flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs', p.ativo ? 'border-line-2 bg-surface-2/70' : 'border-line bg-transparent opacity-60')}>
            <span className="font-medium text-ink">{p.termo}</span>
            {p.ofertaId && <OfertaTag id={p.ofertaId} nome={false} />}
            <span className="text-ink-3">{p.ultimaBusca ? `buscado ${dataCurta(p.ultimaBusca)}` : 'nunca buscado'}</span>
            <span className="mx-0.5 h-4 w-px bg-line-2" />
            {onBuscar && p.ativo && (
              <button title="Buscar só esta palavra agora" disabled={buscando} onClick={() => onBuscar(p.id)} className="text-ink-3 hover:text-cyan disabled:opacity-40"><Search size={13} /></button>
            )}
            <a title="Abrir esta busca na Biblioteca de Anúncios" href={urlBiblioteca(p.termo)} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-cyan"><ExternalLink size={13} /></a>
            <button
              title={p.ativo ? 'Pausar' : 'Reativar'}
              onClick={async () => {
                await alterar('radar_palavras', p.id, { ativo: !p.ativo }, () => { p.ativo = !p.ativo })
                await onMudou()
              }}
              className="text-ink-3 hover:text-ink"
            >
              {p.ativo ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              title="Remover"
              onClick={async () => {
                if (supabase) await supabase.from('radar_palavras').delete().eq('id', p.id)
                else radarPalavras.splice(radarPalavras.indexOf(p), 1)
                await onMudou()
              }}
              className="text-ink-3 hover:text-rose"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {copiado && <span className="text-[11px] text-emerald">copiado</span>}
      </div>
      <form
        className="flex flex-wrap items-end gap-2 border-t border-line p-4"
        onSubmit={(e) => {
          e.preventDefault()
          adicionar()
        }}
      >
        <label htmlFor="rp-termo" className="block min-w-[200px] flex-1 text-xs text-ink-2">
          Nova palavra-chave
          <input id="rp-termo" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Ex.: barriga inchada, novena, receitas fit" className="mt-1.5 w-full rounded-xl border border-line bg-bg/70 px-3 py-2.5 text-sm outline-none focus:border-cyan/60" />
        </label>
        <div className="w-56">
          <Escolha id="rp-oferta" label="Ligar a oferta (opcional)" value={oferta} onChange={setOferta} opcoes={[{ v: '', l: '— nicho novo —' }, ...ofertas.map((o) => ({ v: o.id, l: `${o.id} · ${o.nome}` }))]} />
        </div>
        <button disabled={!termo.trim()} className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2.5 text-sm font-medium text-bg disabled:opacity-40"><Plus size={15} /> Adicionar</button>
        <button
          type="button"
          onClick={async () => {
            const txt = radarPalavras.map((p) => p.termo).join(', ')
            try {
              await navigator.clipboard.writeText(txt)
              setCopiado('ok')
              setTimeout(() => setCopiado(null), 1500)
            } catch {
              /* sem clipboard */
            }
          }}
          className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-xs text-ink-2 hover:text-ink"
          title="Copiar todas as palavras"
        >
          <Copy size={13} />
        </button>
        {erro && <p className="w-full text-xs text-rose">{erro}</p>}
      </form>
    </Panel>
  )
}

function corNota(n: number) {
  return n >= 70 ? 'text-emerald border-emerald/50 bg-emerald/10' : n >= 45 ? 'text-amber border-amber/50 bg-amber/10' : 'text-ink-2 border-line-2 bg-white/5'
}

function CardAnuncio({ a, i, onStatus, onModelar }: { a: RadarAnuncio; i: number; onStatus: (s: RadarStatus) => void; onModelar: () => void }) {
  const [ver, setVer] = useState(false)
  const dias = diasNoAr(a)
  return (
    <div className="panel fade-up flex flex-col overflow-hidden" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
      <button type="button" onClick={() => setVer(true)} className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-surface-2 text-left" aria-label="Ver anúncio">
        {a.imagemUrl ? (
          <img src={a.imagemUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_30%_10%,rgba(34,211,238,.25),transparent_60%),radial-gradient(90%_70%_at_80%_100%,rgba(167,139,250,.25),transparent_60%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <p className="absolute inset-x-3 bottom-3 line-clamp-3 text-[13px] leading-snug font-medium text-white drop-shadow">{a.titulo ?? a.texto}</p>
        <div className={clsx('num absolute top-2.5 right-2.5 grid h-11 w-11 place-items-center rounded-full border-2 text-[15px] font-bold backdrop-blur', corNota(a.nota))} title="Nota de validação (0–100)">
          {a.nota}
        </div>
        {a.videoUrl && <div className="absolute top-2.5 left-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white/90">vídeo</div>}
      </button>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          {a.paginaFoto ? <img src={a.paginaFoto} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-white/10" />}
          <span className="truncate text-sm font-medium text-ink">{a.paginaNome || 'Página'}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill tone={dias >= 30 ? 'emerald' : 'ink'}>{dias} dias no ar</Pill>
          <Pill tone={a.variacoes >= 3 ? 'violet' : 'ink'}>{a.variacoes} variaç{a.variacoes === 1 ? 'ão' : 'ões'}</Pill>
          {a.whatsapp && <Pill tone="cyan"><MessageCircle size={11} /> WhatsApp</Pill>}
          {a.preco !== null && <Pill tone="amber">{money(a.preco)}</Pill>}
        </div>
        <div className="mt-2 text-[11px] text-ink-3">palavra: {a.termo}{a.ofertaId ? ' · ' : ''}{a.ofertaId && <OfertaTag id={a.ofertaId} nome={false} />}</div>
        <div className="mt-auto flex items-center gap-1.5 pt-4">
          {a.status !== 'modelado' && (
            <button onClick={onModelar} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan/15 py-2 text-xs font-medium text-cyan ring-1 ring-cyan/30 hover:bg-cyan/25">
              <Plus size={13} /> Modelar
            </button>
          )}
          {a.status !== 'salvo' && a.status !== 'modelado' && (
            <button title="Salvar" onClick={() => onStatus('salvo')} className="rounded-lg border border-line p-2 text-ink-2 hover:text-amber"><Star size={14} /></button>
          )}
          {a.status !== 'descartado' && a.status !== 'modelado' && (
            <button title="Descartar" onClick={() => onStatus('descartado')} className="rounded-lg border border-line p-2 text-ink-2 hover:text-rose"><X size={14} /></button>
          )}
          {(a.status === 'descartado' || a.status === 'salvo') && (
            <button title="Voltar para novos" onClick={() => onStatus('novo')} className="rounded-lg border border-line px-2 py-1.5 text-[11px] text-ink-2 hover:text-ink">restaurar</button>
          )}
          <a title="Ver na Biblioteca de Anúncios" href={urlAnuncio(a.id)} target="_blank" rel="noreferrer" className="rounded-lg border border-line p-2 text-ink-2 hover:text-cyan"><ExternalLink size={14} /></a>
        </div>
      </div>
      {ver && <VerAnuncio a={a} onClose={() => setVer(false)} />}
    </div>
  )
}

function VerAnuncio({ a, onClose }: { a: RadarAnuncio; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel panel-glow w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-semibold">{a.paginaNome}</div>
            <div className="text-[11px] text-ink-3">{diasNoAr(a)} dias no ar · {a.variacoes} variações · nota {a.nota}</div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-line p-1.5 text-ink-2 hover:text-ink" aria-label="Fechar"><X size={16} /></button>
        </div>
        {(a.videoUrl || a.imagemUrl) && (
          <div className="grid place-items-center bg-black">
            {a.videoUrl ? (
              <video src={a.videoUrl} poster={a.imagemUrl ?? undefined} controls autoPlay playsInline className="max-h-[60vh] w-full object-contain" />
            ) : (
              <img src={a.imagemUrl!} alt="" className="max-h-[60vh] w-full object-contain" />
            )}
          </div>
        )}
        <div className="max-h-[30vh] overflow-y-auto px-5 py-4 text-sm whitespace-pre-line text-ink-2">
          {a.titulo && <div className="mb-2 font-medium text-ink">{a.titulo}</div>}
          {a.texto}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3 text-xs">
          {a.cta && <Pill>{a.cta}</Pill>}
          {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="truncate text-cyan hover:underline">{a.link}</a>}
          <a href={urlAnuncio(a.id)} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1.5 rounded-lg border border-cyan/40 px-3 py-1.5 text-cyan hover:bg-cyan/10">
            <ExternalLink size={13} /> Biblioteca de Anúncios
          </a>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Execucoes({ onConferir, conferindo }: { onConferir: () => void; conferindo: boolean }) {
  const recentes = [...radarExecucoes].sort((a, b) => (a.iniciadoEm < b.iniciadoEm ? 1 : -1)).slice(0, 6)
  const pendentes = recentes.filter((e) => e.status === 'rodando').length
  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Buscas recentes"
        icon={Search}
        sub="Cada busca roda no Apify e leva de 1 a 5 minutos."
        right={
          <button onClick={onConferir} disabled={conferindo} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-2 hover:text-ink disabled:opacity-50">
            {conferindo ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Conferir agora{pendentes ? ` (${pendentes} rodando)` : ''}
          </button>
        }
      />
      <div className="divide-y divide-line/60">
        {recentes.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-xs">
            <span className={clsx('h-2 w-2 shrink-0 rounded-full', e.status === 'rodando' ? 'animate-pulse bg-amber' : e.status === 'falhou' ? 'bg-rose' : e.itens ? 'bg-emerald' : 'bg-ink-3')} />
            <span className="font-medium text-ink">{e.termo}</span>
            <span className="text-ink-3">{new Date(e.iniciadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            <span className={clsx(e.status === 'falhou' ? 'text-rose' : e.status === 'rodando' ? 'text-amber' : 'text-ink-2')}>
              {e.status === 'rodando' ? 'coletando…' : e.status === 'falhou' ? 'falhou' : `${e.itens ?? 0} anúncio(s)`}
            </span>
            {e.erro && <span className="w-full pl-5 text-[11px] break-words text-ink-3">{e.erro}</span>}
          </div>
        ))}
      </div>
    </Panel>
  )
}
