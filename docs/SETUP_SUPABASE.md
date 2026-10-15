# Ligando o SVA Command ao Supabase (passo a passo)

Tudo é feito no painel do Supabase (supabase.com/dashboard → projeto **sva**). Não precisa instalar nada.
O token do Meta **só é colado no passo 4** — nunca em chat, print ou código.

---

## 1. Criar as tabelas
1. Menu lateral → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
3. Clique **Run**. Deve aparecer *Success. No rows returned*.

## 2. Criar o seu login
1. **Authentication → Users → Add user → Create new user**.
2. Seu e-mail + uma senha forte. Marque **Auto Confirm User**. Criar.
3. Volte ao **SQL Editor**, nova query, troque o e-mail e rode:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'SEU_EMAIL_AQUI';
   ```
   Só quem está nessa tabela enxerga os dados.

## 3. Fechar cadastro público
**Authentication → Sign In / Providers** → desligue **Allow new users to sign up** → Save.
(O sistema é só seu; ninguém mais pode criar conta.)

## 4. Guardar as chaves (Secrets)
**Edge Functions → Secrets → Add new secret**, uma por vez:

| Nome | Valor |
|---|---|
| `META_ACCESS_TOKEN` | o token que você gerou no Business Manager |
| `META_AD_ACCOUNT_ID` | `1045781699754389` |
| `SYNC_SECRET` | invente uma senha longa (32+ caracteres, letras e números) |
| `LEONA_WEBHOOK_SECRET` | outra senha longa, diferente da anterior |

Anote o `SYNC_SECRET` e o `LEONA_WEBHOOK_SECRET` — vai usar nos passos 6 e 7.

## 5. Publicar as duas funções
Para cada função abaixo: **Edge Functions → Deploy a new function → Via Editor**.

| Nome da função | Código para colar |
|---|---|
| `meta-sync` | [`supabase/functions/meta-sync/index.ts`](../supabase/functions/meta-sync/index.ts) |
| `leona-webhook` | [`supabase/functions/leona-webhook/index.ts`](../supabase/functions/leona-webhook/index.ts) |

Apague o código de exemplo, cole o nosso, **Deploy**.
Depois, em cada função → **Details/Settings** → desligue **Enforce JWT verification** (as duas checam a própria senha) → Save.

## 6. Atualização automática do Meta (de hora em hora)
**Integrations → Cron → Create job**:
- Nome: `meta-sync-horario`
- Agendamento: `0 * * * *` (todo início de hora)
- Tipo: **Supabase Edge Function** → método **POST** → função `meta-sync`
- Header: `x-sync-secret` = o seu `SYNC_SECRET`
- Body: `{"dias": 3}`

(Se o Cron pedir para ativar as extensões `pg_cron`/`pg_net`, pode ativar.)

## 7. Vendas da Leona (busca automática)
A tela "Webhooks de entrada" da Leona serve para **receber** dados, não para enviar — por isso o sistema **busca** as vendas na Leona pelo MCP, a cada 15 minutos.

1. Na Leona: **Configurações → MCP / Credenciais → Nova credencial → Token estático**, nome `SVA Supabase` → Criar. Copie o **token** e a **URL do MCP**.
2. No Supabase, **Edge Functions → Secrets**:
   - `LEONA_MCP_TOKEN` = o token
   - `LEONA_MCP_URL` = a URL do MCP da Leona
3. **Edge Functions → Deploy a new function → Via Editor**, nome `leona-sync`, código de [`supabase/functions/leona-sync/index.ts`](../supabase/functions/leona-sync/index.ts). Depois desligue **Verify JWT** dela.
4. **Integrations → Cron → Create job**: nome `leona-sync`, agendamento `*/15 * * * *`, Edge Function `leona-sync` (POST), header `x-sync-secret` = seu `SYNC_SECRET`, body `{"dias": 365}`.
   Depois da primeira rodada (que traz o histórico), troque o body para `{"dias": 2}`.

(A função `leona-webhook` continua publicada, mas não é usada nesse caminho.)

## 8. Me mandar (pode mandar no chat — são públicos)
**Project Settings → API Keys** (ou **Data API**):
- **Project URL** (`https://xxxx.supabase.co`)
- **Publishable key** (`sb_publishable_...`) — se só aparecer o formato antigo, a **anon public**

⚠️ **Nunca** mande a `secret` / `service_role` key nem o token do Meta.

Com isso eu configuro o sistema, publico na Vercel e te mando o link com login.
