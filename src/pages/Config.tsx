import { Bot, Database, KeyRound, Megaphone, Percent, Send, Tag, Webhook } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useApp } from '../lib/app-context'
import { addDays, isoDate, TODAY } from '../lib/date'
import { money, x2 } from '../lib/format'
import { metricasGerais, metricasOferta, resultadoPeriodo } from '../lib/metrics'
import { chips, ofertas } from '../data/mock'
import { PageHeader, Panel, PanelHeader, Pill } from '../components/ui'

export default function Config() {
  const { imposto, setImposto } = useApp()
  return (
    <>
      <PageHeader title="Configurações & Integrações" sub="O que falta ligar para o sistema sair do modo demonstração." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Integracao icon={Megaphone} nome="Meta Marketing API" status="aguardando token">
          <p className="mb-3 text-sm text-ink-2">Traz campanhas, conjuntos, anúncios, gasto e conversas iniciadas, de hora em hora. Como gerar o token permanente:</p>
          <ol className="space-y-2.5 text-sm">
            <Passo n={1}>Em <b>business.facebook.com</b> → <b>Configurações do negócio</b>.</Passo>
            <Passo n={2}>No menu <b>Contas → Apps</b>: se não tiver um app, crie em <b>developers.facebook.com → Meus apps → Criar app</b> (tipo <i>Empresa</i>), vinculado ao seu Business Manager.</Passo>
            <Passo n={3}><b>Usuários → Usuários do sistema → Adicionar</b>. Nome: <code className="num text-cyan">SVA</code>, função <b>Administrador</b>.</Passo>
            <Passo n={4}>Clique no usuário criado → <b>Atribuir ativos</b> → <b>Contas de anúncios</b> → sua conta → controle total. Faça o mesmo com o <b>app</b>.</Passo>
            <Passo n={5}><b>Gerar novo token</b> → escolha o app → validade <b>Nunca</b> → marque <code className="num text-cyan">ads_read</code>, <code className="num text-cyan">ads_management</code>, <code className="num text-cyan">business_management</code>, <code className="num text-cyan">read_insights</code> → <b>Gerar</b>.</Passo>
            <Passo n={6}>Copie o token e anote o <b>ID da conta de anúncio</b> (no Gerenciador de Anúncios, o número depois de <code className="num">act=</code> na URL).</Passo>
          </ol>
          <div className="mt-4 flex gap-2 rounded-xl border border-amber/25 bg-amber/5 p-3 text-xs text-amber">
            <KeyRound size={14} className="mt-0.5 shrink-0" />
            O token dá acesso total à conta de anúncios. Guarde num lugar seguro e não mande em grupo/print. Ele vai direto para as variáveis secretas do servidor quando ligarmos o back-end.
          </div>
        </Integracao>

        <div className="space-y-5">
          <Integracao icon={Webhook} nome="Leona — Webhook de vendas" status="aguardando">
            <p className="text-sm text-ink-2">Cada venda aprovada chega em tempo real com <code className="num text-cyan">source_id</code> (ID do anúncio), chip, produto e valor. Vamos gerar a URL do webhook quando o back-end estiver no ar e você cola no painel da Leona.</p>
            <div className="num mt-3 rounded-lg border border-line bg-bg/70 px-3 py-2 text-xs text-ink-3">POST https://&lt;seu-dominio&gt;/api/webhooks/leona</div>
          </Integracao>
          <Integracao icon={Bot} nome="Telegram — alertas e resumo" status="aguardando">
            <ol className="space-y-2 text-sm">
              <Passo n={1}>No Telegram, abra <b>@BotFather</b> → <code className="num text-cyan">/newbot</code> → dê um nome (ex.: <i>SVA Alertas</i>).</Passo>
              <Passo n={2}>Guarde o <b>token do bot</b> que ele devolve.</Passo>
              <Passo n={3}>Mande um “oi” para o seu bot — assim ele consegue te responder.</Passo>
            </ol>
          </Integracao>
          <Integracao icon={Database} nome="Supabase — banco de dados" status="depois">
            <p className="text-sm text-ink-2">Combinado: primeiro o visual. Depois ligamos o banco, o login e as rotinas automáticas.</p>
          </Integracao>
        </div>

        <Panel>
          <PanelHeader title="Imposto do Meta" icon={Percent} sub="aplicado sobre todo gasto que vem da API" />
          <div className="p-5">
            <div className="flex items-center gap-4">
              <input type="range" min={0} max={0.2} step={0.0005} value={imposto} onChange={(e) => setImposto(Number(e.target.value))} aria-label="Imposto do Meta" className="flex-1 accent-cyan" />
              <label className="flex items-center gap-1">
                <input
                  key={imposto}
                  defaultValue={(imposto * 100).toFixed(2).replace('.', ',')}
                  onBlur={(e) => {
                    const v = Number(e.target.value.replace(',', '.'))
                    if (Number.isFinite(v) && v >= 0 && v <= 30) setImposto(+(v / 100).toFixed(4))
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  inputMode="decimal"
                  aria-label="Imposto em porcentagem"
                  className="num w-24 rounded-lg border border-line bg-bg/70 px-2 py-1 text-right text-2xl font-semibold text-cyan outline-none focus:border-cyan/60"
                />
                <span className="text-2xl font-semibold text-cyan">%</span>
              </label>
            </div>
            <p className="mt-3 text-xs text-ink-3">Digite o valor exato (ex.: 12,15) ou arraste. Todos os números do sistema (ROAS, CPA, margem) se recalculam.</p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Padrão de nomes no Meta" icon={Tag} sub="é assim que o sistema liga campanha → oferta → criativo" />
          <div className="space-y-2 p-5 text-sm">
            {[
              ['Campanha', '[OF02] INTESTINO-LEVE | ABO | C01 | 2026-10-15'],
              ['Conjunto', '[OF02] C01 | CJ1 | Mulheres 30-60'],
              ['Anúncio', '[OF02] CR014 v2 | Minha barriga desinchou'],
            ].map(([l, ex]) => (
              <div key={l} className="grid grid-cols-[80px_1fr] items-center gap-3">
                <span className="text-xs text-ink-3">{l}</span>
                <code className="num truncate rounded-lg border border-line bg-bg/70 px-3 py-2 text-xs text-ink">
                  <span className="text-cyan">[OF02]</span>{ex.slice(6).replace('CR014', '\u0000').split('\u0000').map((p, i, arr) => <span key={i}>{p}{i < arr.length - 1 && <span className="text-violet">CR014</span>}</span>)}
                </code>
              </div>
            ))}
          </div>
        </Panel>

        <TelegramPreview />
      </div>
    </>
  )
}

function Integracao({ icon: Icon, nome, status, children }: { icon: typeof Bot; nome: string; status: string; children: ReactNode }) {
  return (
    <Panel>
      <PanelHeader title={nome} icon={Icon} right={<Pill tone="amber"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> {status}</Pill>} />
      <div className="p-5">{children}</div>
    </Panel>
  )
}

function Passo({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="num grid h-5 w-5 shrink-0 place-items-center rounded-md bg-cyan/15 text-[11px] text-cyan">{n}</span>
      <span className="text-ink-2 [&_b]:font-medium [&_b]:text-ink">{children}</span>
    </li>
  )
}

function TelegramPreview() {
  const { imposto } = useApp()
  const ontem = isoDate(addDays(TODAY, -1))
  const p = { inicio: ontem, fim: ontem }
  const msg = useMemo(() => {
    const g = metricasGerais(p, imposto)
    const r = resultadoPeriodo(p, imposto)
    const rank = ofertas.map((o) => ({ o, m: metricasOferta(o.id, p, imposto) })).filter((x) => x.m.gasto > 0).sort((a, b) => b.m.margem - a.m.margem)
    const caiu = chips.filter((c) => c.queda === ontem)
    return { g, r, rank, caiu }
  }, [imposto, ontem])
  return (
    <Panel className="xl:col-span-2">
      <PanelHeader title="Prévia do resumo diário no Telegram" icon={Send} sub="enviado todo dia às 23h" />
      <div className="flex justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,.08),transparent_60%)] p-6">
        <div className="w-full max-w-md rounded-2xl rounded-tl-sm bg-[#182533] p-4 text-[13.5px] leading-relaxed text-[#e8eef4] shadow-xl">
          <div className="mb-1 text-xs font-semibold text-sky">SVA Alertas</div>
          <div>📊 <b>Resumo de ontem</b></div>
          <div className="mt-2">💰 Receita: <b className="num">{money(msg.g.receita)}</b> ({msg.g.vendas} vendas)</div>
          <div>📣 Gasto c/ imposto: <b className="num">{money(msg.g.gastoImp)}</b></div>
          <div>📈 ROAS: <b className="num">{x2(msg.g.roas)}</b> · CPA: <b className="num">{money(msg.g.cpa)}</b></div>
          <div>{msg.g.margem >= 0 ? '✅' : '🔻'} Margem: <b className="num">{money(msg.g.margem)}</b></div>
          <div className="text-[#8fa3b8]">   ponto de equilíbrio: {money(msg.r.equilibrioDia)}/dia</div>
          <div className="mt-2">🏆 Melhor: <b>{msg.rank[0]?.o.nome}</b> ({money(msg.rank[0]?.m.margem ?? 0)})</div>
          <div>⚠️ Pior: <b>{msg.rank.at(-1)?.o.nome}</b> ({money(msg.rank.at(-1)?.m.margem ?? 0)})</div>
          <div className="mt-2">📱 Chips caídos: <b>{msg.caiu.length ? msg.caiu.map((c) => c.nome).join(', ') : 'nenhum'}</b></div>
          <div className="mt-1 text-right text-[11px] text-[#8fa3b8]">23:00 ✓✓</div>
        </div>
      </div>
    </Panel>
  )
}
