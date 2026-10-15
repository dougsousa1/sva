-- Radar — garimpo de ofertas validadas na Biblioteca de Anúncios (via Apify).
-- Cole no Supabase: SQL Editor → New query → Run.

create table public.radar_palavras (
  id text primary key default ('RP-' || substr(gen_random_uuid()::text, 1, 8)),
  termo text not null,
  oferta_id text references public.ofertas (id) on delete set null,
  ativo boolean not null default true,
  limite int not null default 20 check (limite between 5 and 200),
  ultima_busca timestamptz,
  criado_em timestamptz not null default now(),
  unique (termo)
);
create index on public.radar_palavras (oferta_id);

create table public.radar_execucoes (
  id text primary key,                         -- id da execução no Apify
  palavra_id text references public.radar_palavras (id) on delete cascade,
  termo text not null,
  status text not null default 'rodando' check (status in ('rodando', 'concluida', 'falhou')),
  dataset_id text,
  itens int,
  erro text,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz
);
create index on public.radar_execucoes (palavra_id);
create index on public.radar_execucoes (status);

create table public.radar_anuncios (
  id text primary key,                         -- ID do anúncio na Biblioteca
  palavra_id text references public.radar_palavras (id) on delete set null,
  termo text,
  oferta_id text references public.ofertas (id) on delete set null,  -- oferta ligada (ou criada pelo "Modelar")
  pagina_nome text,
  pagina_id text,
  pagina_foto text,
  titulo text,
  texto text,
  cta text,
  link text,
  imagem_url text,
  video_url text,
  inicio date,
  ativo boolean,
  variacoes int not null default 1,
  plataformas text[],
  preco numeric(10, 2),
  whatsapp boolean not null default false,
  nota int not null default 0,
  status text not null default 'novo' check (status in ('novo', 'salvo', 'descartado', 'modelado')),
  raw jsonb,
  visto_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.radar_anuncios (palavra_id);
create index on public.radar_anuncios (oferta_id);
create index on public.radar_anuncios (status, nota desc);

do $$
declare t text;
begin
  foreach t in array array['radar_palavras', 'radar_execucoes', 'radar_anuncios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "admin total" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t
    );
  end loop;
end $$;
