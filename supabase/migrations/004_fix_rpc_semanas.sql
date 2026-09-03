-- Migración completa e idempotente: semanas + RPC (ejecutar UNA vez en SQL Editor).
-- Incluye todo lo de 003 por si falló a medias. Seguro re-ejecutar.

-- 1) Tabla semanas
create table if not exists public.semanas (
  id           text primary key,
  fecha_inicio date not null unique,
  fecha_fin    date not null,
  created_at   timestamptz not null default now(),
  check (fecha_fin = fecha_inicio + 6)
);

-- 2) Columnas en turnos (FK requiere que semanas exista)
alter table public.turnos
  add column if not exists semana_id text references public.semanas(id) on delete cascade,
  add column if not exists plantilla_id text;

create index if not exists idx_turnos_semana on public.turnos (semana_id, orden_dia, hora_inicio);

-- 3) Helper: lunes de la semana ISO
create or replace function public.lunes_de(p_fecha date)
returns date language sql immutable as $$
  select (p_fecha - (extract(isodow from p_fecha)::integer - 1))::date;
$$;

-- 4) Clonar semana origen → destino (turnos + asignaciones)
create or replace function public.clonar_semana(p_origen text, p_destino text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_origen = p_destino then
    return;
  end if;

  insert into public.turnos (
    id, semana_id, plantilla_id, dia_semana, orden_dia, hora_inicio, hora_fin,
    ubicacion_id, exhibidor_id, cupos
  )
  select
    coalesce(t.plantilla_id, t.id) || '@' || p_destino,
    p_destino,
    coalesce(t.plantilla_id, t.id),
    t.dia_semana,
    t.orden_dia,
    t.hora_inicio,
    t.hora_fin,
    t.ubicacion_id,
    t.exhibidor_id,
    t.cupos
  from public.turnos t
  where t.semana_id = p_origen
  on conflict (id) do nothing;

  insert into public.asignaciones (turno_id, voluntario_id, estado)
  select
    coalesce(t.plantilla_id, t.id) || '@' || p_destino,
    a.voluntario_id,
    a.estado
  from public.turnos t
  join public.asignaciones a on a.turno_id = t.id and a.estado = 'confirmada'
  where t.semana_id = p_origen
  on conflict do nothing;
end;
$$;

-- 5) Asegurar semana vigente + siguiente
drop function if exists public.asegurar_semanas();

create or replace function public.asegurar_semanas()
returns json language plpgsql security definer set search_path = public as $$
declare
  v_lunes date;
  v_siguiente date;
  v_vigente_id text;
  v_siguiente_id text;
begin
  v_lunes := public.lunes_de(current_date);
  v_siguiente := v_lunes + 7;
  v_vigente_id := to_char(v_lunes, 'YYYYMMDD');
  v_siguiente_id := to_char(v_siguiente, 'YYYYMMDD');

  delete from public.semanas where fecha_fin < v_lunes;

  insert into public.semanas (id, fecha_inicio, fecha_fin)
  values (v_vigente_id, v_lunes, v_lunes + 6)
  on conflict (id) do nothing;

  insert into public.semanas (id, fecha_inicio, fecha_fin)
  values (v_siguiente_id, v_siguiente, v_siguiente + 6)
  on conflict (id) do nothing;

  if not exists (select 1 from public.turnos where semana_id = v_vigente_id) then
    update public.turnos
       set semana_id = v_vigente_id,
           plantilla_id = coalesce(plantilla_id, id)
     where semana_id is null;

    if not exists (select 1 from public.turnos where semana_id = v_vigente_id) then
      raise exception 'No hay turnos plantilla para la semana vigente';
    end if;
  end if;

  if not exists (select 1 from public.turnos where semana_id = v_siguiente_id) then
    perform public.clonar_semana(v_vigente_id, v_siguiente_id);
  end if;

  return json_build_object(
    'vigente_id', v_vigente_id,
    'siguiente_id', v_siguiente_id
  );
end;
$$;

-- 6) Vistas (DROP necesario: PostgreSQL no permite cambiar columnas con CREATE OR REPLACE)
drop view if exists public.v_exhibidores_resumen;
drop view if exists public.v_ubicaciones_resumen;
drop view if exists public.v_turnos_enriquecidos;

create view public.v_turnos_enriquecidos as
select t.id,
       t.semana_id,
       s.fecha_inicio as semana_inicio,
       s.fecha_fin as semana_fin,
       t.plantilla_id,
       t.dia_semana,
       t.orden_dia,
       t.hora_inicio,
       t.hora_fin,
       t.ubicacion_id,
       u.nombre_punto,
       u.referencia_exacta,
       u.link_maps,
       t.exhibidor_id,
       e.nombre_exhibidor,
       e.responsable_guarda,
       e.direccion_retiro,
       e.estado as estado_exhibidor,
       t.cupos,
       count(a.id) filter (where a.estado = 'confirmada') as ocupados,
       t.cupos - count(a.id) filter (where a.estado = 'confirmada') as vacantes,
       case when count(a.id) filter (where a.estado = 'confirmada') = 0 then 'Vacante'
            when count(a.id) filter (where a.estado = 'confirmada') < t.cupos then 'Parcial'
            else 'Cubierto' end as estado_turno,
       string_agg(v.nombre, ' · ' order by a.created_at) filter (where a.estado = 'confirmada') as voluntarios_label
from public.turnos t
join public.semanas s on s.id = t.semana_id
join public.ubicaciones u on u.id = t.ubicacion_id
join public.exhibidores e on e.id = t.exhibidor_id
left join public.asignaciones a on a.turno_id = t.id
left join public.voluntarios v on v.id = a.voluntario_id
group by t.id, t.semana_id, s.fecha_inicio, s.fecha_fin, t.plantilla_id,
         t.dia_semana, t.orden_dia, t.hora_inicio, t.hora_fin, t.ubicacion_id, t.exhibidor_id, t.cupos,
         u.nombre_punto, u.referencia_exacta, u.link_maps,
         e.nombre_exhibidor, e.responsable_guarda, e.direccion_retiro, e.estado;

create view public.v_exhibidores_resumen as
select e.id,
       e.nombre_exhibidor,
       e.responsable_guarda,
       e.direccion_retiro,
       e.estado,
       count(v.id) as total_turnos,
       coalesce(sum(v.vacantes), 0) as vacantes,
       string_agg(v.dia_semana || ' ' || to_char(v.hora_inicio, 'HH24:MI'), ', '
                  order by v.orden_dia, v.hora_inicio) as horarios
from public.exhibidores e
left join public.v_turnos_enriquecidos v on v.exhibidor_id = e.id
  and v.semana_id = (
    select id from public.semanas
     where fecha_inicio <= current_date and fecha_fin >= current_date
     limit 1
  )
group by e.id, e.nombre_exhibidor, e.responsable_guarda, e.direccion_retiro, e.estado;

create view public.v_ubicaciones_resumen as
select u.id,
       u.nombre_punto,
       u.referencia_exacta,
       u.link_maps,
       count(v.id) as total_turnos,
       coalesce(sum(v.vacantes), 0) as vacantes,
       string_agg(v.dia_semana || ' ' || to_char(v.hora_inicio, 'HH24:MI'), ', '
                  order by v.orden_dia, v.hora_inicio) as horarios
from public.ubicaciones u
left join public.v_turnos_enriquecidos v on v.ubicacion_id = u.id
  and v.semana_id = (
    select id from public.semanas
     where fecha_inicio <= current_date and fecha_fin >= current_date
     limit 1
  )
group by u.id, u.nombre_punto, u.referencia_exacta, u.link_maps;

-- 7) RLS semanas
alter table public.semanas enable row level security;

drop policy if exists semanas_select on public.semanas;
create policy semanas_select on public.semanas for select to authenticated using (true);

drop policy if exists semanas_select_anon on public.semanas;
create policy semanas_select_anon on public.semanas for select to anon using (true);

-- 8) Permisos + recarga API
grant select on public.semanas to authenticated, anon;
grant select on public.v_turnos_enriquecidos to authenticated, anon;
grant select on public.v_exhibidores_resumen to authenticated, anon;
grant select on public.v_ubicaciones_resumen to authenticated, anon;
grant execute on function public.lunes_de(date) to authenticated, anon;
grant execute on function public.asegurar_semanas() to authenticated, anon;
grant execute on function public.clonar_semana(text, text) to authenticated, anon;

notify pgrst, 'reload schema';

-- 9) Ejecutar
select public.asegurar_semanas();
