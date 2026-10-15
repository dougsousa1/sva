# SVA — Plano de Organização do Sistema (para aprovação)

> Status: **v2 — revisado com as respostas do dono (ver seção 11)**. Nada foi construído ainda. Este documento define *o que* o sistema vai controlar, *de onde* vêm os dados e *como* tudo se conecta. Depois de aprovado, viramos isso no sistema completo.

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
- **Aparelho (celular)**: modelo, apelido, chips que já rodou. *Sem rateio de custo* — a compra do celular entra como despesa pontual no mês em que foi paga (decisão do dono).
- Métricas por chip: **vida útil (dias)**, conversas recebidas, vendas, receita, **receita antes de cair**, custo do chip por venda.
- Métricas gerais: média de dias até cair, % de chips caídos por semana, custo mensal com reposição de chips.

### 4.6 Despesas (lançamento de custos)
- Categorias: **Tráfego** (automático via Meta), **Chips**, **Aparelhos**, **Plataforma Leona**, **Ferramentas de IA**, **Outros** (VPS, domínio, freelancer, impostos, taxas de pagamento).
- **Imposto do Meta (13%)**: calculado automaticamente sobre o gasto que a API retorna (a API do Meta informa o gasto **sem** o imposto). Percentual configurável.
- Tipo: **pontual** (compra de chip, celular) ou **recorrente mensal** (Leona, ferramentas de IA).
- Pode ser vinculada a uma oferta/chip específico ou ficar como **custo fixo mensal** — custos fixos **não são rateados** entre ofertas; entram só no resultado do mês.

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
| **Leona — Webhook** | Leona envia cada venda/evento para o sistema | Venda em **tempo real** (`source_id`, chip, produto, valor) | Instantâneo |
| **Leona — MCP** | Conciliação e consultas | Produtos, status das conexões (detectar chip caído), conferência diária das vendas | A cada 15–60 min + diário |
| **Telegram** | Bot próprio | Alertas e resumo diário | Instantâneo / 1× por dia |
| **Lançamento manual** | Formulário no sistema | Chips, celulares, mensalidades, outros custos, aprendizados | Quando acontecer |

---

## 6. Regras de cálculo (o coração do controle)

**Atribuição de venda:** `venda.source_id` = `anúncio.id` do Meta → venda pertence àquele anúncio → criativo → conjunto → campanha → oferta → produto.

O resultado é medido em **dois níveis**:

**Nível 1 — Margem de cada oferta (custos variáveis):**
1. **Tráfego com imposto**: gasto dos anúncios dela no Meta × **1,13** (13% de imposto).
2. **Chips**: custo do chip ÷ dias de vida do chip, alocado à oferta que o chip atendeu. (Chip de R$ 15 que durou 5 dias = R$ 3/dia.) Enquanto o chip está vivo, usa a média histórica de vida útil como estimativa e recalcula quando ele cair.

`Margem da oferta = receita − tráfego c/ imposto − chips`

**Nível 2 — Resultado do mês (empresa):**

`Lucro líquido do mês = soma das margens − custos fixos mensais (Leona, IA…) − despesas pontuais (celulares etc.)`

Mensalidades de sistema e celulares **não** são divididos entre ofertas — aparecem só no resultado do mês, junto com o **ponto de equilíbrio**: "quanto de margem preciso por dia para pagar os fixos".

**Métricas principais:**
- **Margem da oferta** e **Lucro líquido do mês** (acima)
- **ROAS** = receita ÷ tráfego c/ imposto · **ROI real** = lucro ÷ custo total
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

- 🔴 **Conta de anúncio com problema** (restrita/desativada, limite de gasto atingido, pagamento recusado).

Canal dos alertas: painel + **bot do Telegram**. Além dos alertas, o bot manda um **resumo diário** (ex.: 23h): receita, gasto c/ imposto, margem, melhores/piores ofertas, chips que caíram.

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
contas_anuncio      (id_meta, nome, status, limite_gasto, bm)
aparelhos           (id, modelo, apelido, status)
chips               (id, numero, operadora, custo, data_compra, data_ativacao, data_queda,
                     motivo_queda, aparelho_id, leona_connection_id, oferta_id)
despesas            (id, categoria, descricao, valor, data, tipo[pontual|recorrente_mensal],
                     oferta_id?, chip_id?, aparelho_id?)
configuracoes       (imposto_meta_pct = 13, horario_resumo_telegram, ...)
vendas              (id_leona, data, valor, produto_leona_id, oferta_id, anuncio_meta_id,
                     chip_id, lead_ddd, origem)
aprendizados        (id, oferta_id?, criativo_id?, hipotese, acao, resultado, decisao, data)
```

---

## 9. Stack proposta e fases

**Stack sugerida:** Supabase (banco Postgres + login + cron) · Next.js hospedado na Vercel · rotinas de sincronização agendadas (Meta + Leona) · endpoint de webhook para a Leona · bot do Telegram. Usuário único (só o dono), com login simples — sem perfis/permissões.

| Fase | Entrega | Resultado |
|---|---|---|
| **1 — Base (MVP)** | Banco + cadastro de produtos/ofertas/criativos/chips/aparelhos/despesas + importação de vendas da Leona | Já dá para ver lucro real por oferta e por chip |
| **2 — Meta** | Sincronização da API do Meta (estrutura + gasto + conversas) e atribuição via `source_id` | Lucro por criativo/anúncio automaticamente |
| **3 — Painel & Alertas** | Dashboard geral, DRE diário, alertas de chip caído, CPA, fadiga | Decisão diária em minutos |
| **4 — Inteligência** | Aprendizados, ranking de ganchos/ângulos, sugestões de escala/pausa com IA | Replicar o que dá certo mais rápido |

---

## 10. Padrão de nomes no Meta (obrigatório para o sistema funcionar bem)

Como tudo roda na mesma conta de anúncio, o **nome** é o que separa as ofertas. Padrão sugerido:

```
Campanha:  [OF02] INTESTINO-LEVE | ABO | C01 | 2026-10-15
Conjunto:  [OF02] C01 | CJ1 | <público>
Anúncio:   [OF02] CR014 v2 | <gancho curto>
```

- `OF02` = código da oferta no sistema · `CR014` = código do criativo · `v2` = versão.
- O sistema lê o código entre colchetes e liga a campanha/anúncio à oferta e ao criativo **automaticamente**. Anúncio fora do padrão aparece como "sem vínculo" para corrigir com 1 clique.
- Não é preciso renomear o que já está rodando: o sistema permite vincular manualmente os anúncios antigos.

---

## 11. Decisões aprovadas (respostas do dono)

| # | Tema | Decisão | Impacto no sistema |
|---|---|---|---|
| 1 | Estrutura ABO | Mesma conta de anúncio para todas as ofertas | Vínculo oferta↔campanha pelo padrão de nomes (seção 10). Suporte a **várias contas** já previsto para contingência. |
| 2 | API do Meta | Dono gera token (usuário do sistema no BM) | Sincronização automática de gasto, conversas e estrutura. |
| 3 | Leona | MCP + Webhook disponíveis | Vendas em tempo real via webhook; MCP para conciliação e status dos chips. |
| 4 | Mensalidades | Gasto fixo mensal, **não** dividir por oferta | Dois níveis: margem por oferta e lucro do mês (seção 6). |
| 5 | Celular | Já pago (Pix) | Despesa pontual no mês da compra, sem depreciação. |
| 6 | Usuários | Só o dono | Login único, sem perfis. |
| 7 | Alertas | Telegram | Bot com alertas + resumo diário. |
| 8 | Outros custos | Só imposto do Meta de **13%** | Aplicado automaticamente sobre o gasto do Meta (configurável). |

### Pendente
- Confirmar se a estrutura é **1-3-1** (1 campanha → 3 conjuntos → 1 anúncio em cada).
- Para construir: token do Meta + ID da conta de anúncio, URL/segredo do webhook da Leona, bot do Telegram (criado no @BotFather) e projeto no Supabase.
