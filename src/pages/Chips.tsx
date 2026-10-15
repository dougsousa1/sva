import clsx from 'clsx'
import { Battery, Cpu, HeartPulse, Skull, Smartphone, Timer } from 'lucide-react'
import { useMemo } from 'react'
import { aparelhos, chips, DIAS_HISTORICO, ofertas, vendas } from '../data/mock'
import { addDays, diffDays, isoDate, TODAY } from '../lib/date'
import { dataCurta, money, money0, telefone } from '../lib/format'
import { custoDiaChip, fimOperacao, ofertaById, VIDA_MEDIA_CHIP, vidaChip } from '../lib/metrics'
import { Kpi, PageHeader, Panel, PanelHeader, Pill, Td, Th } from '../components/ui'

export default function Chips() {
  const inicio = isoDate(addDays(TODAY, -(DIAS_HISTORICO - 1)))
  const receitaChip = useMemo(() => {
    const m = new Map<string, { r: number; v: number }>()
    for (const v of vendas) {
      const x = m.get(v.chipId) ?? { r: 0, v: 0 }
      x.r += v.valor
      x.v++
      m.set(v.chipId, x)
    }
    return m
  }, [])

  const usados = chips.filter((c) => c.ativacao)
  const ativos = chips.filter((c) => c.status === 'ativo')
  const caidos = chips.filter((c) => c.status === 'caiu')
  const estoque = chips.filter((c) => c.status === 'reserva' && !c.ativacao)
  const recMediaCaido = caidos.length ? caidos.reduce((s, c) => s + (receitaChip.get(c.id)?.r ?? 0), 0) / caidos.length : 0
  const semanas = DIAS_HISTORICO / 7
  const ofertasComChip = ofertas.filter((o) => usados.some((c) => c.ofertaId === o.id))

  return (
    <>
      <PageHeader title="Chips & Aparelhos" sub="O histórico que a Leona apaga quando o número cai — guardado aqui, com custo e resultado de cada chip." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Ativos agora" value={String(ativos.length)} icon={HeartPulse} tone="emerald" hint="conectados na Leona" />
        <Kpi label="Estoque reserva" value={String(estoque.length)} icon={Battery} tone={estoque.length < 4 ? 'amber' : 'cyan'} hint="prontos para ativar" />
        <Kpi label="Vida média" value={`${VIDA_MEDIA_CHIP.toFixed(1)}d`} icon={Timer} tone="cyan" hint="até cair" />
        <Kpi label="Caídos" value={String(caidos.length)} icon={Skull} tone="rose" hint={`${(caidos.length / semanas).toFixed(1)} por semana`} />
        <Kpi label="Receita / chip" value={money0(recMediaCaido)} icon={Smartphone} tone="violet" hint="média antes de cair" />
        <Kpi label="Gasto com chips" value={money0(chips.length * 15)} icon={Cpu} hint={`${chips.length} comprados · ${DIAS_HISTORICO}d`} />
      </div>

      {/* Linha do tempo */}
      <Panel className="mt-5">
        <PanelHeader title="Linha do tempo dos chips" icon={Timer} sub={`últimos ${DIAS_HISTORICO} dias · cada barra é um chip, do dia que ativou até cair`} right={
          <div className="hidden gap-4 text-[11px] text-ink-2 md:flex">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-emerald" />ativo</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-rose/70" />caiu</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-ink-3/60" />reserva</span>
          </div>
        } />
        <div className="overflow-x-auto p-5">
          <div className="min-w-[900px]">
            <div className="mb-2 ml-[170px] flex justify-between text-[10px] text-ink-3">
              {Array.from({ length: 8 }, (_, i) => <span key={i} className="num">{dataCurta(isoDate(addDays(TODAY, -(DIAS_HISTORICO - 1) + Math.round((i * (DIAS_HISTORICO - 1)) / 7))))}</span>)}
            </div>
            {ofertasComChip.map((o) => {
              const meus = usados.filter((c) => c.ofertaId === o.id)
              const lanes = [...new Set(meus.map((c) => (c.nome.endsWith('B') ? 'B' : 'A')))]
              return lanes.map((ln) => (
                <div key={o.id + ln} className="flex items-center gap-3 border-t border-line/40 py-2">
                  <div className="w-[158px] shrink-0 truncate text-xs">
                    <span className="num mr-1.5" style={{ color: o.cor }}>{o.id}</span>
                    <span className="text-ink-2">{o.nome}{lanes.length > 1 ? ` · ${ln}` : ''}</span>
                  </div>
                  <div className="relative h-6 flex-1 rounded-md bg-white/[.02]">
                    {meus.filter((c) => (c.nome.endsWith('B') ? 'B' : 'A') === ln).map((c) => {
                      const a = Math.max(0, diffDays(inicio, c.ativacao!))
                      const f = diffDays(inicio, fimOperacao(c)!) + 1
                      return (
                        <div
                          key={c.id}
                          title={`${c.nome} · ${vidaChip(c)} dias · ${c.motivoQueda ?? c.status}`}
                          className={clsx(
                            'absolute top-0.5 bottom-0.5 rounded-[5px] border text-[9px] leading-[18px] overflow-hidden px-1 num',
                            c.status === 'ativo' ? 'border-emerald/60 bg-emerald/25 text-emerald shadow-[0_0_14px_-2px_#34d399]' : c.status === 'caiu' ? 'border-rose/40 bg-rose/15 text-rose/90' : 'border-ink-3/40 bg-ink-3/15 text-ink-2',
                          )}
                          style={{ left: `${(a / DIAS_HISTORICO) * 100}%`, width: `calc(${((f - a) / DIAS_HISTORICO) * 100}% - 2px)` }}
                        >
                          {vidaChip(c)}d
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            })}
          </div>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <PanelHeader title="Todos os chips" icon={Smartphone} />
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 border-b border-line bg-surface">
                <tr><Th>Conexão</Th><Th>Número</Th><Th>Oferta</Th><Th>Aparelho</Th><Th>Status</Th><Th right>Vida</Th><Th right>Custo/dia</Th><Th right>Vendas</Th><Th right>Receita</Th></tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {[...chips].sort((a, b) => (a.status === b.status ? ((b.ativacao ?? b.compra) > (a.ativacao ?? a.compra) ? 1 : -1) : a.status === 'ativo' ? -1 : b.status === 'ativo' ? 1 : 0)).map((c) => {
                  const rv = receitaChip.get(c.id)
                  const o = c.ofertaId ? ofertaById.get(c.ofertaId) : null
                  return (
                    <tr key={c.id} className="hover:bg-white/[.02]">
                      <Td className="text-ink">{c.nome}</Td>
                      <Td className="num text-xs text-ink-2">{telefone(c.numero)}</Td>
                      <Td>{o ? <span className="num text-xs" style={{ color: o.cor }}>{o.id}</span> : <span className="text-ink-3">—</span>}</Td>
                      <Td className="text-xs text-ink-2">{aparelhos.find((a) => a.id === c.aparelhoId)?.apelido}</Td>
                      <Td>
                        {c.status === 'ativo' && <Pill tone="emerald">ativo</Pill>}
                        {c.status === 'caiu' && <span title={c.motivoQueda}><Pill tone="rose">caiu {dataCurta(c.queda!)}</Pill></span>}
                        {c.status === 'reserva' && <Pill>{c.ativacao ? 'parado' : 'reserva'}</Pill>}
                      </Td>
                      <Td right>{c.ativacao ? `${vidaChip(c)}d` : '—'}</Td>
                      <Td right className="text-ink-2">{c.ativacao ? money(custoDiaChip(c)) : '—'}</Td>
                      <Td right>{rv?.v ?? 0}</Td>
                      <Td right className={rv ? 'text-emerald' : 'text-ink-3'}>{money0(rv?.r ?? 0)}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Aparelhos" icon={Cpu} sub="celulares de disparo (já pagos)" />
          <div className="space-y-2.5 p-4">
            {aparelhos.map((a) => {
              const meus = chips.filter((c) => c.aparelhoId === a.id && c.ativacao)
              const agora = meus.filter((c) => c.status === 'ativo')
              return (
                <div key={a.id} className="rounded-xl border border-line bg-surface-2/60 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-8 place-items-center rounded-lg border border-line-2 bg-bg">
                      <div className={clsx('h-1.5 w-1.5 rounded-full', a.status === 'ok' ? 'bg-emerald shadow-[0_0_8px_#34d399]' : 'bg-amber')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.apelido}</div>
                      <div className="text-xs text-ink-3">{a.modelo}</div>
                    </div>
                    {a.status === 'manutencao' ? <Pill tone="amber">manutenção</Pill> : <Pill tone="emerald">ok</Pill>}
                  </div>
                  <div className="mt-2.5 flex justify-between text-[11px] text-ink-3">
                    <span>{meus.length} chips já rodaram</span>
                    <span>{agora.length ? `rodando: ${agora.map((c) => c.nome).join(', ')}` : 'livre'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </>
  )
}
