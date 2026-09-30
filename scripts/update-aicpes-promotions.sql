-- Run AFTER supabase/schema.sql if your project already has the earlier schema installed.
-- Adds the promotion column safely while keeping existing registration records.
alter table public.inscriptions
  add column if not exists promotion text not null default 'IT12';
alter table public.inscriptions alter column promotion set default 'IT12';

alter table public.inscriptions
  drop constraint if exists inscriptions_promotion_check;
alter table public.inscriptions
  add constraint inscriptions_promotion_check
  check (promotion ~ '^IT(1[2-9]|[2-9][0-9])$');

create index if not exists inscriptions_promotion_idx
  on public.inscriptions (promotion);

grant insert (promotion) on public.inscriptions to anon, authenticated;

-- Recreate admin listing RPC with promotion column and optional promotion filter.
drop function if exists public.admin_list_inscriptions(text,text,text,boolean,integer,integer);
drop function if exists public.admin_list_inscriptions(text,text,text,boolean,integer,integer,text);
create function public.admin_list_inscriptions(
  p_search text default null,
  p_ville text default null,
  p_niveau text default null,
  p_ascending boolean default false,
  p_offset integer default 0,
  p_limit integer default 10,
  p_promotion text default null
)
returns table (
  id uuid, nom text, prenoms text, sexe text, date_naissance date, promotion text,
  telephone text, email text, adresse text, niveau text, etablissement text,
  photo_url text, created_at timestamptz, total_count bigint
)
language sql stable security definer set search_path = public
as $$
  with filtered as (
    select i.* from public.inscriptions i
    where (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      and (p_search is null or i.nom ilike '%' || p_search || '%' or i.prenoms ilike '%' || p_search || '%')
      and (p_ville is null or i.adresse ilike '%, ' || p_ville)
      and (p_niveau is null or i.niveau = p_niveau)
      and (p_promotion is null or i.promotion = p_promotion)
  ), total as (select count(*)::bigint as value from filtered)
  select f.id, f.nom, f.prenoms, f.sexe, f.date_naissance, f.promotion,
    f.telephone, f.email, f.adresse, f.niveau, f.etablissement,
    f.photo_url, f.created_at, total.value
  from filtered f cross join total
  order by case when p_ascending then f.created_at end asc,
           case when not p_ascending then f.created_at end desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;
revoke all on function public.admin_list_inscriptions(text,text,text,boolean,integer,integer,text) from public, anon;
grant execute on function public.admin_list_inscriptions(text,text,text,boolean,integer,integer,text) to authenticated;

-- Recreate export RPC with the new promotion column.
drop function if exists public.admin_export_inscriptions(integer,integer);
create function public.admin_export_inscriptions(p_offset integer default 0, p_limit integer default 1000)
returns table (
  id uuid, nom text, prenoms text, sexe text, date_naissance date, promotion text,
  telephone text, email text, adresse text, niveau text, etablissement text,
  photo_url text, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select i.id, i.nom, i.prenoms, i.sexe, i.date_naissance, i.promotion,
    i.telephone, i.email, i.adresse, i.niveau, i.etablissement,
    i.photo_url, i.created_at
  from public.inscriptions i
  where (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  order by i.created_at desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 1000);
$$;
revoke all on function public.admin_export_inscriptions(integer,integer) from public, anon;
grant execute on function public.admin_export_inscriptions(integer,integer) to authenticated;
