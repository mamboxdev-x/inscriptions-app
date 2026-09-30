-- Supabase SQL Editor: execute this file before running the application.
create extension if not exists pgcrypto;

create table if not exists public.inscriptions (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(trim(nom)) between 1 and 100),
  prenoms text not null check (char_length(trim(prenoms)) between 1 and 150),
  sexe text not null check (sexe in ('Femme', 'Homme', 'Autre')),
  date_naissance date not null check (date_naissance <= current_date),
  telephone text not null check (telephone ~ '^\+?[0-9 ().-]{8,20}$'),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  adresse text not null check (char_length(trim(adresse)) between 2 and 300),
  niveau text not null check (char_length(trim(niveau)) between 1 and 80),
  etablissement text not null check (char_length(trim(etablissement)) between 1 and 200),
  photo_url text not null check (photo_url ~ '^portraits/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|jpeg|png|webp)$'),
  created_at timestamptz not null default now()
);

create index if not exists inscriptions_created_at_idx on public.inscriptions (created_at desc);
create index if not exists inscriptions_niveau_idx on public.inscriptions (niveau);
create index if not exists inscriptions_adresse_idx on public.inscriptions (adresse);
create index if not exists inscriptions_nom_search_idx on public.inscriptions using gin (to_tsvector('simple', nom || ' ' || prenoms));

alter table public.inscriptions enable row level security;
revoke all on public.inscriptions from anon, authenticated;
grant insert (nom, prenoms, sexe, date_naissance, telephone, email, adresse, niveau, etablissement, photo_url) on public.inscriptions to anon, authenticated;
grant select, update, delete on public.inscriptions to authenticated;

-- Public can submit only; logged-in users can only read/manage when they have the admin role.
-- Create an `admin` role in Authentication > Users > user app_metadata, e.g.
-- {"role":"admin"}. Never grant this role from client-side code.
-- Idempotent policy setup: allow this schema to be safely rerun during deployment.
drop policy if exists "Public may submit valid registration" on public.inscriptions;
drop policy if exists "Admins may read registrations" on public.inscriptions;
drop policy if exists "Admins may update registrations" on public.inscriptions;
drop policy if exists "Admins may delete registrations" on public.inscriptions;
create policy "Public may submit valid registration" on public.inscriptions
  for insert to anon, authenticated with check (
    char_length(trim(nom)) between 1 and 100 and
    char_length(trim(prenoms)) between 1 and 150 and
    sexe in ('Femme', 'Homme', 'Autre') and
    date_naissance <= current_date and
    telephone ~ '^\+?[0-9 ().-]{8,20}$' and
    email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and
    char_length(trim(adresse)) between 2 and 300 and
    char_length(trim(niveau)) between 1 and 80 and
    char_length(trim(etablissement)) between 1 and 200 and
    photo_url ~ '^portraits/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|jpeg|png|webp)$'
  );

create policy "Admins may read registrations" on public.inscriptions
  for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins may update registrations" on public.inscriptions
  for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins may delete registrations" on public.inscriptions
  for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Private photo bucket: public uploads only, admin reads/deletes. Size and MIME limits are enforced by the bucket.
drop policy if exists "Anyone may upload a portrait" on storage.objects;
drop policy if exists "Admins may view portraits" on storage.objects;
drop policy if exists "Admins may delete portraits" on storage.objects;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portraits', 'portraits', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

grant insert on storage.objects to anon, authenticated;
grant select, delete on storage.objects to authenticated;
create policy "Anyone may upload a portrait" on storage.objects
  for insert to anon, authenticated with check (
    bucket_id = 'portraits' and
    storage.foldername(name) = array['portraits']::text[] and
    storage.filename(name) ~ '^[a-f0-9-]{36}[.](jpg|png|webp)$'
  );
create policy "Admins may view portraits" on storage.objects
  for select to authenticated using (bucket_id = 'portraits' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins may delete portraits" on storage.objects
  for delete to authenticated using (bucket_id = 'portraits' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- The browser receives only rows from this admin-only RPC.
create or replace function public.admin_list_inscriptions(
  p_search text default null,
  p_ville text default null,
  p_niveau text default null,
  p_ascending boolean default false,
  p_offset integer default 0,
  p_limit integer default 10
)
returns table (
  id uuid, nom text, prenoms text, sexe text, date_naissance date,
  telephone text, email text, adresse text, niveau text, etablissement text,
  photo_url text, created_at timestamptz, total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
    select i.*
    from public.inscriptions i
    where (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      and (p_search is null or i.nom ilike '%' || p_search || '%' or i.prenoms ilike '%' || p_search || '%')
      and (p_ville is null or i.adresse ilike '%, ' || p_ville)
      and (p_niveau is null or i.niveau = p_niveau)
  ),
  total as (select count(*)::bigint as value from filtered)
  select f.id, f.nom, f.prenoms, f.sexe, f.date_naissance, f.telephone, f.email,
    f.adresse, f.niveau, f.etablissement, f.photo_url, f.created_at, total.value
  from filtered f cross join total
  order by
    case when p_ascending then f.created_at end asc,
    case when not p_ascending then f.created_at end desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;
revoke all on function public.admin_list_inscriptions(text,text,text,boolean,integer,integer) from public, anon;
grant execute on function public.admin_list_inscriptions(text,text,text,boolean,integer,integer) to authenticated;


create or replace function public.admin_export_inscriptions(p_offset integer default 0, p_limit integer default 1000)
returns table (
  id uuid, nom text, prenoms text, sexe text, date_naissance date,
  telephone text, email text, adresse text, niveau text, etablissement text,
  photo_url text, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.nom, i.prenoms, i.sexe, i.date_naissance, i.telephone, i.email,
    i.adresse, i.niveau, i.etablissement, i.photo_url, i.created_at
  from public.inscriptions i
  where (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  order by i.created_at desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 1000);
$$;
revoke all on function public.admin_export_inscriptions(integer,integer) from public, anon;
grant execute on function public.admin_export_inscriptions(integer,integer) to authenticated;

-- Returns an exact count to an authenticated user without the admin role,
-- so the signed-in dashboard is required for admin_count_inscriptions.
create or replace function public.admin_count_inscriptions()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.inscriptions
  where (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
$$;
revoke all on function public.admin_count_inscriptions() from public, anon;
grant execute on function public.admin_count_inscriptions() to authenticated;

-- Verify RLS and policies in Supabase. Do not put a service_role key in the browser.
