# SVA Command

Central de operação da SVA: produtos → ofertas remodeladas → criativos → campanhas Meta (ABO 1-3-1) → chips/WhatsApp (Leona) → vendas, com o custo real de tudo (tráfego + imposto do Meta, chips, aparelhos, plataformas).

Dois modos:
- **Demonstração** (sem `.env`): dados simulados de `src/data/mock.ts`.
- **Ao vivo** (com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` — ver `.env.example`): login + dados do Supabase, alimentados pela API do Meta (`meta-sync`) e pelo webhook da Leona (`leona-webhook`).

Configuração do banco e das funções: [`docs/SETUP_SUPABASE.md`](docs/SETUP_SUPABASE.md). Plano geral: [`docs/PLANO_SISTEMA.md`](docs/PLANO_SISTEMA.md).

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
| `src/data/live.ts` | Carrega o Supabase e converte para o modelo do app |
| `src/components/` | Layout, login e componentes de interface |
| `supabase/migrations/` | Esquema do banco (tabelas, RLS, ofertas iniciais) |
| `supabase/functions/meta-sync` | Sincroniza conta, campanhas, conjuntos, anúncios, criativos e insights do Meta |
| `supabase/functions/leona-webhook` | Recebe as vendas da Leona em tempo real |

## Stack

React 19 + TypeScript + Vite + Tailwind CSS 4 + Recharts. Próximo passo: Supabase (banco, login, Edge Functions para webhook da Leona, sincronização do Meta e bot do Telegram) e deploy na Vercel.
