# SVA Command

Central de operação da SVA: produtos → ofertas remodeladas → criativos → campanhas Meta (ABO 1-3-1) → chips/WhatsApp (Leona) → vendas, com o custo real de tudo (tráfego + imposto do Meta, chips, aparelhos, plataformas).

> **Fase atual: visual (modo demonstração).** Os dados são simulados em `src/data/mock.ts`, usando os produtos reais da conta Leona. As integrações (Meta API, webhook da Leona, Telegram, Supabase) entram nas próximas fases — ver [`docs/PLANO_SISTEMA.md`](docs/PLANO_SISTEMA.md).

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build      # gera dist/ (site estático)
```

## Estrutura

| Pasta | O que tem |
|---|---|
| `src/data/types.ts` | Modelo de dados (espelha a seção 8 do plano) |
| `src/data/mock.ts` | Dados de demonstração — será trocado pelo Supabase |
| `src/lib/metrics.ts` | Regras de cálculo: margem por oferta, lucro do período, rateio de chips, alertas |
| `src/pages/` | Painel, Ofertas, Criativos, Campanhas, Chips & Aparelhos, Vendas, Despesas, Aprendizados, Configurações |
| `src/components/` | Layout e componentes de interface |

## Stack

React 19 + TypeScript + Vite + Tailwind CSS 4 + Recharts. Próximo passo: Supabase (banco, login, Edge Functions para webhook da Leona, sincronização do Meta e bot do Telegram) e deploy na Vercel.
