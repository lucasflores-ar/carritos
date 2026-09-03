-- Ejecutar en Supabase SQL Editor (una sola vez).
-- Vincula automáticamente auth.users → voluntarios al registrarse.
--
-- Cómo funciona:
-- 1) Crea perfil con rol 'voluntario' (on conflict skip — no pisa admins).
-- 2) Si user_metadata trae voluntario_id, vincula esa ficha.
-- 3) Si no, vincula por email (voluntarios.email = auth.users.email).
--
-- Requisito: cargar el email en voluntarios ANTES de invitar, con el mismo email de la invitación.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vol_id text;
begin
  insert into public.perfiles (user_id, rol)
  values (new.id, 'voluntario')
  on conflict (user_id) do nothing;

  v_vol_id := new.raw_user_meta_data->>'voluntario_id';

  if v_vol_id is not null then
    update public.voluntarios
    set user_id = new.id, updated_at = now()
    where id = v_vol_id
      and user_id is null;
  elsif new.email is not null then
    update public.voluntarios
    set user_id = new.id, updated_at = now()
    where user_id is null
      and activo = true
      and email is not null
      and lower(trim(email)) = lower(trim(new.email));
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create index if not exists idx_voluntarios_email_lower
  on public.voluntarios (lower(trim(email)))
  where email is not null;
