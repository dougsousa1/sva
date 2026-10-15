# SVA — Plano de Organização do Sistema (para aprovação)

> Status: **rascunho para aprovação**. Nada foi construído ainda. Este documento define *o que* o sistema vai controlar, *de onde* vêm os dados e *como* tudo se conecta. Depois de aprovado, viramos isso no sistema completo.

---

## 1. Objetivo

Ter **um único lugar** onde a operação inteira fica visível:

- **Quanto entrou** (vendas da Leona) e **quanto saiu** (tráfego, chips, celulares, plataformas, IA, etc.).
- **O que está rodando**: produto → oferta remodelada → criativo → campanha/conjunto/anúncio no Meta → chip (número de WhatsApp) que recebeu a conversa → venda.
- **O que deu certo e o que não deu**: lucro real por produto, por oferta, por criativo, por chip e por dia, além de um histórico de aprendizados.

A pergunta que o sistema precisa responder em 10 segundos: **"Hoje, qual oferta/criativo está dando lucro de verdade, depois de pagar TODOS os custos?"**

---

## 2. O que já existe na Leona (verificado via MCP)

Consultei a conta **Empresa DOUGLAS DE SOUSA BEZERRA** (id 17804) para basear o plano em dados reais:

| Dado | Exemplo real | Por que importa |
|---|---|---|
| **Vendas** (`list_sales_history`) | R$ 40,00 — *Intestino Leve* — 10/10 | Fonte de receita |
| `source_id` na venda | `120250378915930554` | **É o ID do anúncio no Meta.** Permite ligar a venda direto ao anúncio/criativo → atribuição automática |
| `connection_id` / `instance_name` | `66857` / "OF2 - SIBO/SIFO" | Liga a venda ao **chip** que vendeu |
| `lead_ddd` | 11, 71, 98… | Permite ver quais regiões compram |
| **Produtos** (`list_products`) | Receitas AirFryer, Maternidade Leve, Foto com Santo, Intestino Leve, Lipedema | Catálogo base |
| **Conexões** (`list_connections`) | 2 conexões (ambas *disconnected*, provedor uazapi) | Status dos chips |

**Achado importante:** há vendas recentes vindas de conexões (`70023` "WPP1-Motorola", `68777` "OF3 - Fotos") que **não aparecem mais** na lista de conexões — ou seja, o chip caiu/foi removido e a Leona "esquece" ele. **O nosso sistema precisa guardar o histórico de cada chip por conta própria**, senão perdemos o custo e o resultado de chips que já caíram.

---

## 3. Fluxo da operação (como o sistema enxerga)

```
PRODUTO VALIDADO (ideia original / referência do mercado)
   └── OFERTA (remodelagem: nome, promessa, ângulo, preço, entregável feito com IA)
         └── CRIATIVO (vídeo/imagem, gancho, formato, versão)
               └── META: Campanha (Mensagens) → Conjuntos ABO (3) → Anúncios
                     └── CONVERSA iniciada no WhatsApp → CHIP / CELULAR (Leona)
                           └── VENDA (Leona, com source_id = ID do anúncio)

CUSTOS que entram em cada camada:
   Tráfego (Meta, por anúncio) · Chip (R$ 15 cada) · Celular · Leona · IA · outros
```

---

## 4. Módulos do sistema

### 4.1 Painel Geral (visão do dono)
- Receita, gasto total, **lucro líquido**, ROAS e ROI — por **dia / semana / mês**.
- "DRE diário": entrou X, saiu Y (tráfego + chips + plataformas + aparelhos rateados) = lucro Z.
- Top 5 ofertas e top 5 criativos lucrativos; piores 5 (candidatos a desligar).
- Alertas ativos (ver seção 7).

### 4.2 Produtos & Ofertas (biblioteca de ideias)
- **Produto validado**: nome, nicho, referência/fonte da validação (link do concorrente, biblioteca de anúncios), observações.
- **Oferta (remodelagem)**: produto de origem, nome novo, promessa, ângulo, preço/order bumps, link/arquivo do entregável gerado com IA, produto correspondente na Leona.
- **Status**: `Ideia → Em produção → Testando → Escalando → Pausada → Morta`.
- Por oferta: gasto, vendas, lucro, CPA, ticket médio, dias rodando.

### 4.3 Criativos
- Galeria (thumbnail/vídeo), oferta vinculada, gancho/headline, formato, versão (v1, v2…), quem criou, ferramenta de IA usada.
- Vinculado ao(s) **ID(s) de anúncio do Meta** → métricas automáticas: gasto, impressões, CTR, custo por conversa, vendas, CPA, lucro.
- Marcação de **fadiga** (CPA subindo / frequência alta).

### 4.4 Campanhas (Meta)
- Árvore Campanha → Conjunto (ABO, estrutura de 3) → Anúncio, sincronizada pela API do Meta.
- Por nível: orçamento diário, gasto, conversas iniciadas, custo por conversa, vendas atribuídas (via `source_id`), CPA, ROAS.
- Status (ativo/pausado/reprovado) e conta de anúncio usada.

### 4.5 Chips & Aparelhos (o ponto fraco da operação)
- **Chip**: número, operadora, custo (ex.: R$ 15), data de compra, data de ativação, **data em que caiu**, motivo (ban, restrição, desconexão), aparelho onde está, conexão na Leona, oferta que atende.
- **Aparelho (celular)**: modelo, custo de compra, data de compra, vida útil estimada (para rateio), chips que já rodou.
- Métricas por chip: **vida útil (dias)**, conversas recebidas, vendas, receita, **receita antes de cair**, custo do chip por venda.
- Métricas gerais: média de dias até cair, % de chips caídos por semana, custo mensal com reposição de chips.

### 4.6 Despesas (lançamento de custos)
- Categorias: **Tráfego** (automático via Meta), **Chips**, **Aparelhos**, **Plataforma Leona**, **Ferramentas de IA**, **Outros** (VPS, domínio, freelancer, impostos, taxas de pagamento).
- Tipo: **pontual** (compra de chip), **recorrente** (mensalidade Leona) ou **ativo com depreciação** (celular).
- Pode ser vinculada a uma oferta/chip/aparelho específico ou ficar como **custo geral** (rateado).

### 4.7 Vendas
- Importadas da Leona (automático), com produto, valor, chip, DDD, anúncio de origem.
- Vendas **sem `source_id`** ficam como "não atribuídas" (orgânico/indicação/recompra) — aparecem separadas para não distorcer o CPA.

### 4.8 Aprendizados (memória da operação)
- Registro de testes: **hipótese → o que foi feito → resultado → decisão** ("gancho de dor funcionou melhor que gancho de curiosidade em Intestino Leve").
- Vinculado à oferta/criativo. É o que impede repetir erro e permite replicar o que deu certo.

---

## 5. Integrações

| Fonte | Como | O que traz | Frequência |
|---|---|---|---|
| **Meta Marketing API** | Token de usuário do sistema (Business Manager) + `ad account id` | Estrutura campanha/conjunto/anúncio, criativos, gasto, impressões, cliques, conversas iniciadas (`onsite_conversion.messaging_conversation_started_7d`) | A cada 1h + fechamento diário |
| **Leona** | MCP (já conectado) e/ou API/webhook da Leona para automação contínua | Vendas (`source_id`, chip, produto, valor), produtos, status das conexões | A cada 15–60 min |
| **Lançamento manual** | Formulário no sistema | Chips, celulares, mensalidades, outros custos, aprendizados | Quando acontecer |

> ⚠️ Ponto a confirmar: o MCP da Leona funciona muito bem para consultas via Claude, mas para o sistema sincronizar **sozinho** 24h precisamos de um token de API ou webhook da Leona (ver perguntas na seção 10).

---

## 6. Regras de cálculo (o coração do controle)

**Atribuição de venda:** `venda.source_id` = `anúncio.id` do Meta → venda pertence àquele anúncio → criativo → conjunto → campanha → oferta → produto.

**Custo real de cada oferta no dia =**
1. **Tráfego**: gasto exato dos anúncios dela (Meta).
2. **Chips**: custo do chip ÷ dias de vida do chip, alocado à oferta que o chip atendeu. (Chip de R$ 15 que durou 5 dias = R$ 3/dia.) Enquanto o chip está vivo, usa a média histórica de vida útil como estimativa e recalcula quando ele cair.
3. **Aparelhos**: custo do celular depreciado (ex.: em 6 meses) e rateado entre os chips/ofertas que usaram o aparelho.
4. **Plataformas e custos gerais** (Leona, IA, etc.): mensalidade ÷ dias do mês, rateado entre as ofertas **proporcional à receita** (ou ao gasto com tráfego — escolher na aprovação).

**Métricas principais:**
- **Lucro líquido** = receita − (tráfego + chips + aparelhos + plataformas + outros)
- **ROAS** = receita ÷ tráfego · **ROI real** = lucro ÷ custo total
- **CPA** = custo total ÷ vendas · **Custo por conversa** = tráfego ÷ conversas iniciadas
- **Taxa de conversão do WhatsApp** = vendas ÷ conversas iniciadas
- **Receita por chip** e **vida útil média do chip**
- **CPA máximo** (break-even) por oferta = ticket médio − custos variáveis por venda

---

## 7. Alertas automáticos

- 🔴 **Chip caiu** (conexão desconectou na Leona) → registrar data de queda e avisar para repor.
- 🔴 **Anúncio gastando sem venda** acima de X reais (ex.: 1,5× o CPA máximo).
- 🟠 **CPA acima do break-even** por 2 dias seguidos → sugerir pausar.
- 🟠 **Fadiga de criativo**: CPA subindo > 30% em relação à média de 3 dias.
- 🟢 **Oportunidade de escala**: ROAS acima da meta por 3 dias → sugerir duplicar/subir orçamento.
- 🟠 **Estoque de chips baixo** (menos de N chips reserva).

Canal dos alertas: painel + WhatsApp/Telegram/e-mail (a definir).

---

## 8. Modelo de dados (resumo)

```
produtos            (id, nome, nicho, fonte_validacao, notas)
ofertas             (id, produto_id, nome, promessa, angulo, preco, status, leona_product_id)
criativos           (id, oferta_id, tipo, gancho, versao, arquivo_url, ferramenta_ia, criado_por)
meta_campanhas      (id_meta, nome, objetivo, status, conta_anuncio)
meta_conjuntos      (id_meta, campanha_id, nome, orcamento_diario, status)
meta_anuncios       (id_meta, conjunto_id, criativo_id, oferta_id, nome, status)
meta_insights_dia   (anuncio_id, data, gasto, impressoes, cliques, conversas, ...)
aparelhos           (id, modelo, custo, data_compra, meses_depreciacao, status)
chips               (id, numero, operadora, custo, data_compra, data_ativacao, data_queda,
                     motivo_queda, aparelho_id, leona_connection_id, oferta_id)
despesas            (id, categoria, descricao, valor, data, tipo[pontual|recorrente|ativo],
                     oferta_id?, chip_id?, aparelho_id?)
vendas              (id_leona, data, valor, produto_leona_id, oferta_id, anuncio_meta_id,
                     chip_id, lead_ddd, origem)
aprendizados        (id, oferta_id?, criativo_id?, hipotese, acao, resultado, decisao, data)
```

---

## 9. Stack proposta e fases

**Stack sugerida:** Supabase (banco Postgres + login + cron) · Next.js hospedado na Vercel · rotinas de sincronização agendadas (Meta + Leona). Ambos já têm conector disponível nesta conta, o que acelera a implantação.

| Fase | Entrega | Resultado |
|---|---|---|
| **1 — Base (MVP)** | Banco + cadastro de produtos/ofertas/criativos/chips/aparelhos/despesas + importação de vendas da Leona | Já dá para ver lucro real por oferta e por chip |
| **2 — Meta** | Sincronização da API do Meta (estrutura + gasto + conversas) e atribuição via `source_id` | Lucro por criativo/anúncio automaticamente |
| **3 — Painel & Alertas** | Dashboard geral, DRE diário, alertas de chip caído, CPA, fadiga | Decisão diária em minutos |
| **4 — Inteligência** | Aprendizados, ranking de ganchos/ângulos, sugestões de escala/pausa com IA | Replicar o que dá certo mais rápido |

---

## 10. Perguntas para aprovarmos antes de construir

1. **Estrutura "ABO em três"**: é 1 campanha → 3 conjuntos → 1 anúncio cada (1-3-1), ou 1-3-3? Quantas contas de anúncio vocês usam?
2. **Acesso ao Meta**: vocês têm Business Manager com **usuário do sistema** para gerar token permanente? Quais IDs de conta de anúncio?
3. **Leona**: além do MCP, existe **token de API ou webhook** de venda para sincronização automática 24h?
4. **Rateio dos custos gerais** (Leona, IA): proporcional à **receita** ou ao **gasto com tráfego** de cada oferta?
5. **Celular**: depreciar em quantos meses? (sugestão: 6)
6. **Quem usa o sistema** e precisa de login? Alguém só pode ver e não editar?
7. Onde querem receber **alertas** (WhatsApp, Telegram, e-mail)?
8. Há outros custos fixos que não citei (VPS, proxy, contingência de BM/perfis, freelancer de criativo, imposto)?
