-- Mídia dos criativos (imagem em alta, vídeo e prévia do anúncio no Facebook).
-- Cole no Supabase: SQL Editor → New query → Run.
alter table public.criativos
  add column if not exists imagem_url text,
  add column if not exists video_url text,
  add column if not exists preview_link text;
