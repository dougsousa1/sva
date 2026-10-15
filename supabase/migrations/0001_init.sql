-- SVA Command — esquema inicial (docs/PLANO_SISTEMA.md, seção 8)
-- Cole no Supabase: SQL Editor → New query → Run.

-- ---------------------------------------------------------------- acesso
-- Sistema de um usuário só: apenas quem estiver em `admins` lê/escreve.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------- catálogo
create table public.ofertas (
  id text primary key,                        -- código usado no nome das campanhas: OF01
  nome text not null,
  produto_origem text,
  fonte_validacao text,
  nicho text,
  promessa text,
  angulo text,
  ticket numeric(10, 2) not null default 0,
  status text not null default 'ideia'
    check (status in ('ideia', 'producao', 'testando', 'escalando', 'pausada', 'morta')),
  cor text not null default '#22d3ee',
  leona_product_id bigint unique,
  criada_em date not null default current_date
);

create table public.criativos (
  id text primary key,                        -- CR014, ou AD-<id do anúncio> quando vem do Meta sem código
  oferta_id text references public.ofertas (id) on delete set null,
  tipo text not null default 'video' check (tipo in ('video', 'imagem', 'carrossel')),
  gancho text not null default '',
  versao int not null default 1,
  ferramenta text,
  duracao int,
  thumbnail_url text,
  meta_creative_id text,
  criado_em date not null default current_date
);
create index on public.criativos (oferta_id);

-- ---------------------------------------------------------------- Meta
create table public.contas_anuncio (
  id text primary key,                        -- act_123
  nome text not null,
  status text not null default 'ativa',
  moeda text,
  limite_diario numeric(12, 2),
  atualizado_em timestamptz not null default now()
);

create table public.meta_campanhas (
  id text primary key,
  conta_id text not null references public.contas_anuncio (id) on delete cascade,
  nome text not null,
  status text not null,
  oferta_id text references public.ofertas (id) on delete set null,  -- vínculo manual (sobrepõe o [OFxx] do nome)
  criada_em timestamptz,
  atualizado_em timestamptz not null default now()
);
create index on public.meta_campanhas (conta_id);
create index on public.meta_campanhas (oferta_id);

create table public.meta_conjuntos (
  id text primary key,
  campanha_id text not null references public.meta_campanhas (id) on delete cascade,
  nome text not null,
  status text not null,
  orcamento_dia numeric(12, 2),
  atualizado_em timestamptz not null default now()
);
create index on public.meta_conjuntos (campanha_id);

create table public.meta_anuncios (
  id text primary key,                        -- = source_id da venda na Leona
  conjunto_id text not null references public.meta_conjuntos (id) on delete cascade,
  campanha_id text not null references public.meta_campanhas (id) on delete cascade,
  nome text not null,
  status text not null,
  criativo_id text references public.criativos (id) on delete set null,
  criado_em timestamptz,
  atualizado_em timestamptz not null default now()
);
create index on public.meta_anuncios (conjunto_id);
create index on public.meta_anuncios (campanha_id);
create index on public.meta_anuncios (criativo_id);

create table public.meta_insights_dia (
  anuncio_id text not null references public.meta_anuncios (id) on delete cascade,
  data date not null,
  gasto numeric(12, 2) not null default 0,    -- sem imposto, como a API devolve
  impressoes bigint not null default 0,
  cliques bigint not null default 0,
  conversas int not null default 0,
  primary key (anuncio_id, data)
);
create index on public.meta_insights_dia (data);

-- ---------------------------------------------------------------- chips & aparelhos
create table public.aparelhos (
  id text primary key,
  modelo text not null,
  apelido text not null,
  status text not null default 'ok' check (status in ('ok', 'manutencao'))
);

create table public.chips (
  id text primary key default ('CH-' || substr(gen_random_uuid()::text, 1, 8)),
  nome text not null,
  numero text not null,
  operadora text,
  custo numeric(10, 2) not null default 15,
  compra date not null default current_date,
  ativacao date,
  queda date,
  motivo_queda text,
  fim_uso date,
  aparelho_id text references public.aparelhos (id) on delete set null,
  oferta_id text references public.ofertas (id) on delete set null,
  leona_connection_id bigint,
  status text not null default 'reserva' check (status in ('ativo', 'caiu', 'reserva'))
);
create index on public.chips (aparelho_id);
create index on public.chips (oferta_id);
create index on public.chips (leona_connection_id);

-- ---------------------------------------------------------------- dinheiro
create table public.vendas (
  id text primary key,                        -- id da venda na Leona
  data timestamptz not null,
  valor numeric(10, 2) not null,
  leona_product_id bigint,
  produto_nome text,
  anuncio_id text,                            -- source_id (sem FK: pode chegar antes do sync do Meta)
  leona_connection_id bigint,
  instancia text,
  ddd text,
  cliente text,
  origem text,
  raw jsonb,
  recebida_em timestamptz not null default now()
);
create index on public.vendas (data);
create index on public.vendas (anuncio_id);
create index on public.vendas (leona_product_id);

create table public.despesas (
  id text primary key default ('DP-' || substr(gen_random_uuid()::text, 1, 8)),
  data date not null default current_date,
  categoria text not null check (categoria in ('chips', 'aparelhos', 'plataforma', 'ia', 'outros')),
  descricao text not null,
  valor numeric(10, 2) not null check (valor > 0),
  tipo text not null default 'pontual' check (tipo in ('pontual', 'recorrente_mensal')),
  chip_id text references public.chips (id) on delete set null
);
create index on public.despesas (data);
create index on public.despesas (chip_id);

create table public.aprendizados (
  id text primary key default ('AP-' || substr(gen_random_uuid()::text, 1, 8)),
  data date not null default current_date,
  oferta_id text not null references public.ofertas (id) on delete cascade,
  criativo_id text references public.criativos (id) on delete set null,
  hipotese text not null,
  acao text not null default '',
  resultado text not null default '',
  decisao text not null default '',
  veredito text not null default 'neutro' check (veredito in ('ganhou', 'perdeu', 'neutro'))
);
create index on public.aprendizados (oferta_id);
create index on public.aprendizados (criativo_id);

create table public.configuracoes (
  chave text primary key,
  valor jsonb not null
);
insert into public.configuracoes (chave, valor) values ('imposto_meta', '0.13');

create table public.sync_log (
  id bigint generated always as identity primary key,
  fonte text not null,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  ok boolean,
  detalhe jsonb
);

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array[
    'ofertas', 'criativos', 'contas_anuncio', 'meta_campanhas', 'meta_conjuntos', 'meta_anuncios',
    'meta_insights_dia', 'aparelhos', 'chips', 'vendas', 'despesas', 'aprendizados', 'configuracoes', 'sync_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "admin total" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------- ofertas iniciais (produtos da Leona)
insert into public.ofertas (id, nome, nicho, ticket, status, cor, leona_product_id) values
  ('OF01', 'Receitas AirFryer', 'Culinária', 12.90, 'escalando', '#22d3ee', 16629),
  ('OF02', 'Intestino Leve', 'Saúde', 29.90, 'escalando', '#a78bfa', 15494),
  ('OF03', 'Foto com Santo', 'Religioso', 9.90, 'testando', '#34d399', 15729),
  ('OF04', 'Maternidade Leve', 'Maternidade', 19.90, 'testando', '#fbbf24', 16429),
  ('OF05', 'Lipedema', 'Saúde', 27.00, 'pausada', '#fb7185', 14619);
