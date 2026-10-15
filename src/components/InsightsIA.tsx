import clsx from 'clsx'
import { Brain, Check, Copy, Loader2, Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { criativos, insightsIA, ofertas, radarPalavras } from '../data/mock'
import type { InsightIA } from '../data/types'
import { useApp } from '../lib/app-context'
import { addDays, isoDate, TODAY } from '../lib/date'
import { dataCurta } from '../lib/format'
import { inserir } from '../lib/gravar'
import { adIndex, metricasAnuncios, ofertaById } from '../lib/metrics'
import { supabase } from '../lib/supabase'
import { novoId } from './Form'
import { Panel, PanelHeader, Pill } from './ui'

/** Monta os campeões e os piores criativos dos últimos 30 dias para a IA analisar. */
function montarEntrada(ofertaId: string, imposto: number) {
  const p = { inicio: isoDate(addDays(TODAY, -29)), fim: isoDate(TODAY) }
  const ads = metricasAnuncios(p, imposto)
  const linhas = criativos
    .map((c) => {
      const meus = ads.filter((a) => a.info.anuncio.criativoId === c.id)
      const of = c.ofertaId ?? meus.find((a) => a.info.ofertaId)?.info.ofertaId ?? [...adIndex.values()].find((a) => a.anuncio.criativoId === c.id)?.ofertaId ?? null
      const t = meus.reduce(
        (s, a) => ({ g: s.g + a.gastoImp, r: s.r + a.receita, v: s.v + a.vendas, cv: s.cv + a.conversas, i: s.i + a.impressoes, k: s.k + a.cliques }),
        { g: 0, r: 0, v: 0, cv: 0, i: 0, k: 0 },
      )
      return { c, of, ...t, margem: t.r - t.g, roas: t.g ? t.r / t.g : 0 }
    })
    .filter((x) => x.g > 0 && (!ofertaId || x.of === ofertaId))
  const fmt = (x: (typeof linhas)[number]) => ({
    gancho: x.c.gancho,
    texto: x.c.texto ?? '',
    tipo: x.c.tipo,
    oferta: x.of ? ofertaById.get(x.of)?.nome : null,
    gasto: Math.round(x.g),
    vendas: x.v,
    roas: +x.roas.toFixed(2),
    custo_conversa: x.cv ? +(x.g / x.cv).toFixed(2) : null,
    conversao: x.cv ? +((x.v / x.cv) * 100).toFixed(1) : null,
    ctr: x.i ? +((x.k / x.i) * 100).toFixed(2) : null,
  })
  const vencedores = [...linhas].filter((x) => x.v > 0).sort((a, b) => b.margem - a.margem).slice(0, 6)
  const ids = new Set(vencedores.map((x) => x.c.id))
  const perdedores = [...linhas].filter((x) => !ids.has(x.c.id) && x.g >= 10).sort((a, b) => a.roas - b.roas).slice(0, 4)
  const o = ofertaId ? ofertaById.get(ofertaId) : null
  return { oferta_id: ofertaId || null, oferta_nome: o?.nome ?? null, ticket: o?.ticket ?? null, vencedores: vencedores.map(fmt), perdedores: perdedores.map(fmt) }
}

export default function InsightsIA() {
  const { modo, imposto, atualizar } = useApp()
  // abre na oferta da análise mais recente
  const [oferta, setOferta] = useState(() => [...insightsIA].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))[0]?.ofertaId ?? '')
  const [estado, setEstado] = useState<{ s: 'parado' | 'gerando' | 'erro'; msg: string }>({ s: 'parado', msg: '' })
  const [, setTick] = useState(0)
  const [copiado, setCopiado] = useState<string | null>(null)

  const atual: InsightIA | undefined = useMemo(
    () => insightsIA.filter((i) => (i.ofertaId ?? '') === oferta).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))[0],
    [oferta, insightsIA.length, estado.s],
  )
  const termos = new Set(radarPalavras.map((p) => p.termo.toLowerCase()))

  async function gerar() {
    if (!supabase) return
    const entrada = montarEntrada(oferta, imposto)
    if (!entrada.vencedores.length) {
      setEstado({ s: 'erro', msg: 'Ainda não há criativos com vendas nos últimos 30 dias para esta oferta.' })
      return
    }
    setEstado({ s: 'gerando', msg: `Analisando ${entrada.vencedores.length} campeões e ${entrada.perdedores.length} perdedores…` })
    const { data, error } = await supabase.functions.invoke('insights-ia', { body: entrada })
    if (error || !data?.ok) {
      setEstado({ s: 'erro', msg: data?.erro ?? error?.message ?? 'falhou' })
      return
    }
    await atualizar()
    setEstado({ s: 'parado', msg: '' })
  }

  async function addRadar(termo: string, ofertaId: string | null) {
    const id = novoId('RP')
    const err = await inserir('radar_palavras', { id, termo, oferta_id: ofertaId }, () => {
      radarPalavras.push({ id, termo, ofertaId, ativo: true, limite: 20, ultimaBusca: null })
    })
    if (err) return setEstado({ s: 'erro', msg: err })
    await atualizar()
    setTick((t) => t + 1)
  }

  async function copiar(txt: string) {
    try {
      await navigator.clipboard.writeText(txt)
      setCopiado(txt)
      setTimeout(() => setCopiado(null), 1500)
    } catch {
      /* sem clipboard */
    }
  }

  const r = atual?.resultado
  return (
    <Panel glow className="mb-5">
      <PanelHeader
        title="Inteligência dos seus campeões"
        icon={Brain}
        sub="A IA lê os seus criativos que mais deram lucro (e os que não deram) e devolve padrões, ganchos e palavras para o Radar."
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select value={oferta} onChange={(e) => setOferta(e.target.value)} aria-label="Oferta analisada" className="rounded-lg border border-line bg-bg/70 px-2.5 py-1.5 text-xs text-ink-2 outline-none [color-scheme:dark]">
              <option value="">Todas as ofertas</option>
              {ofertas.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.nome}</option>)}
            </select>
            <button
              onClick={gerar}
              disabled={modo !== 'live' || estado.s === 'gerando'}
              title={modo !== 'live' ? 'Disponível no modo ao vivo' : 'Gera uma análise nova com os últimos 30 dias'}
              className="flex items-center gap-1.5 rounded-lg bg-violet/20 px-3 py-1.5 text-xs font-medium text-violet ring-1 ring-violet/40 hover:bg-violet/30 disabled:opacity-50"
            >
              {estado.s === 'gerando' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {r ? 'Gerar de novo' : 'Gerar insights'}
            </button>
          </div>
        }
      />
      {estado.msg && <p className={clsx('px-5 pt-3 text-xs', estado.s === 'erro' ? 'text-rose' : 'text-ink-3')}>{estado.msg}</p>}
      {!r ? (
        <p className="p-5 text-sm text-ink-3">
          Nenhuma análise ainda{oferta ? ' para esta oferta' : ''}. Clique em <b className="text-ink-2">Gerar insights</b> — usa os criativos com vendas dos últimos 30 dias.
        </p>
      ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <div className="mb-1 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">Resumo · {dataCurta(atual!.criadoEm)}</div>
            <p className="text-[15px] leading-relaxed text-ink">{r.resumo}</p>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-2 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">Palavras-chave para o Radar</div>
            <div className="flex flex-wrap gap-1.5">
              {r.palavras_chave.map((k) => {
                const tem = termos.has(k.toLowerCase())
                return (
                  <button
                    key={k}
                    disabled={tem}
                    onClick={() => addRadar(k, atual!.ofertaId)}
                    className={clsx('flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition', tem ? 'border-emerald/40 text-emerald' : 'border-cyan/40 text-cyan hover:bg-cyan/10')}
                    title={tem ? 'Já está no Radar' : 'Adicionar ao Radar'}
                  >
                    {tem ? <Check size={12} /> : <Plus size={12} />} {k}
                  </button>
                )
              })}
            </div>
          </div>

          <Bloco titulo="O que os campeões repetem" itens={r.padroes_vencedores} cor="text-emerald" />
          <Bloco titulo="O que evitar" itens={r.o_que_evitar} cor="text-rose" />

          <div>
            <div className="mb-2 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">Ganchos para testar</div>
            <div className="space-y-1.5">
              {r.ganchos.map((g) => (
                <button key={g} onClick={() => copiar(g)} className="flex w-full items-start gap-2 rounded-lg border border-line bg-white/[.02] px-3 py-2 text-left text-sm text-ink-2 hover:border-line-2 hover:text-ink" title="Copiar">
                  {copiado === g ? <Check size={14} className="mt-0.5 shrink-0 text-emerald" /> : <Copy size={14} className="mt-0.5 shrink-0 text-ink-3" />}
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">Ângulos</div>
              <div className="space-y-1.5">
                {r.angulos.map((a) => (
                  <div key={a.angulo} className="rounded-lg border border-violet/25 bg-violet/5 px-3 py-2 text-sm">
                    <span className="font-medium text-violet">{a.angulo}</span> <span className="text-ink-2">— {a.porque}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">Nichos vizinhos para garimpar</div>
              <div className="flex flex-wrap gap-1.5">
                {r.nichos_adjacentes.map((n) => {
                  const tem = termos.has(n.toLowerCase())
                  return (
                    <button key={n} disabled={tem} onClick={() => addRadar(n, null)} className={clsx('flex items-center gap-1', tem && 'opacity-60')} title={tem ? 'Já está no Radar' : 'Adicionar ao Radar como nicho novo'}>
                      <Pill tone={tem ? 'emerald' : 'amber'}>{tem ? <Check size={11} /> : <Plus size={11} />} {n}</Pill>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}

function Bloco({ titulo, itens, cor }: { titulo: string; itens: string[]; cor: string }) {
  return (
    <div>
      <div className="mb-2 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">{titulo}</div>
      <ul className="space-y-1.5">
        {itens.map((t) => (
          <li key={t} className="flex gap-2 text-sm text-ink-2">
            <span className={clsx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current', cor)} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}
