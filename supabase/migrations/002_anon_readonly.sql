-- Lectura pública (rol anon) del cronograma sin login.
-- Ejecutar en Supabase SQL Editor después del schema inicial.

grant select on public.v_turnos_enriquecidos to anon;
grant select on public.v_exhibidores_resumen to anon;
grant select on public.v_ubicaciones_resumen to anon;

create policy exhibidores_select_anon on public.exhibidores
  for select to anon using (true);

create policy ubicaciones_select_anon on public.ubicaciones
  for select to anon using (true);

create policy turnos_select_anon on public.turnos
  for select to anon using (true);

create policy asig_select_anon on public.asignaciones
  for select to anon using (estado = 'confirmada');

-- Solo nombre público en el cronograma (sin teléfono/email)
create policy voluntarios_select_anon on public.voluntarios
  for select to anon using (activo = true);
