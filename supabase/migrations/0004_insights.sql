-- Insights com IA dos seus anúncios campeões + texto completo dos criativos.
-- Cole no Supabase: SQL Editor → New query → Run.

alter table public.criativos add column if not exists texto text;

create table public.insights_ia (
  id uuid primary key default gen_random_uuid(),
  oferta_id text references public.ofertas (id) on delete cascade,  -- null = todas as ofertas
  criado_em timestamptz not null default now(),
  entrada jsonb not null,
  resultado jsonb not null
);
create index on public.insights_ia (oferta_id, criado_em desc);

alter table public.insights_ia enable row level security;
create policy "admin total" on public.insights_ia for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
