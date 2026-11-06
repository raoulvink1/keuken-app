-- Gedeelde opslag voor Keukenbord.
-- Eén rij per onderdeel (menu, volgende, voorraad, ...). Geen directe tabeltoegang voor de app:
-- alles loopt via twee functies die de huiscode controleren.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.keuken_data (
  sleutel    text primary key,
  data       jsonb,
  bijgewerkt timestamptz not null default now()
);

create table if not exists public.keuken_toegang (
  code_hash text primary key,
  omschrijving text
);

alter table public.keuken_data enable row level security;
alter table public.keuken_toegang enable row level security;
revoke all on public.keuken_data, public.keuken_toegang from anon, authenticated;

create or replace function public.keuken_check(p_code text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_code is null or not exists (
    select 1 from public.keuken_toegang where code_hash = encode(extensions.digest(p_code, 'sha256'), 'hex')
  ) then
    raise exception 'geen toegang';
  end if;
end $$;

create or replace function public.keuken_lees(p_code text)
returns table (sleutel text, data jsonb, bijgewerkt timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.keuken_check(p_code);
  return query select k.sleutel, k.data, k.bijgewerkt from public.keuken_data k;
end $$;

create or replace function public.keuken_schrijf(p_code text, p_sleutel text, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = public, extensions as $$
declare t timestamptz := now();
begin
  perform public.keuken_check(p_code);
  if p_sleutel not in ('menu', 'volgende', 'recepten', 'voorraad', 'vaste', 'school', 'lijst') then
    raise exception 'onbekend onderdeel';
  end if;
  insert into public.keuken_data (sleutel, data, bijgewerkt) values (p_sleutel, p_data, t)
  on conflict (sleutel) do update set data = excluded.data, bijgewerkt = t;
  return t;
end $$;

revoke all on function public.keuken_check(text) from public, anon, authenticated;
revoke all on function public.keuken_lees(text), public.keuken_schrijf(text, text, jsonb) from public;
grant execute on function public.keuken_lees(text), public.keuken_schrijf(text, text, jsonb) to anon;
