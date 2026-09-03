-- Repara RPC asegurar_semanas (PostgREST requiere recarga de schema y retorno JSON).
-- Ejecutar en Supabase SQL Editor si aparece:
-- "Could not find the function public.asegurar_semanas without parameters in the schema cache"

drop function if exists public.asegurar_semanas();

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

grant execute on function public.asegurar_semanas() to authenticated, anon;
grant execute on function public.clonar_semana(text, text) to authenticated, anon;

notify pgrst, 'reload schema';

select public.asegurar_semanas();
