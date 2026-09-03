-- ============================================================
-- Gestion de Exhibidores - Schema completo para Supabase
-- Ejecutar en: Supabase Dashboard -> SQL Editor (corre como postgres, bypasea RLS)
-- Incluye: tablas, indices, funciones, triggers, vistas, RLS y datos semilla
-- ============================================================

create table if not exists public.exhibidores (
  id                 text primary key,
  nombre_exhibidor   text not null,
  responsable_guarda text,
  direccion_retiro   text,
  estado             text not null default 'Activo' check (estado in ('Activo','Inactivo')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.ubicaciones (
  id                text primary key,
  nombre_punto      text not null,
  referencia_exacta text,
  link_maps         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.voluntarios (
  id         text primary key,
  nombre     text not null,
  telefono   text,
  email      text,
  user_id    uuid unique references auth.users(id) on delete set null,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.turnos (
  id           text primary key,
  dia_semana   text not null check (dia_semana in ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')),
  orden_dia    smallint not null check (orden_dia between 1 and 7),
  hora_inicio  time not null,
  hora_fin     time,
  ubicacion_id text not null references public.ubicaciones(id),
  exhibidor_id text not null references public.exhibidores(id),
  cupos        smallint not null default 2 check (cupos > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.asignaciones (
  id            bigint generated always as identity primary key,
  turno_id      text not null references public.turnos(id) on delete cascade,
  voluntario_id text not null references public.voluntarios(id),
  estado        text not null default 'confirmada' check (estado in ('confirmada','cancelada')),
  created_at    timestamptz not null default now()
);

create table if not exists public.perfiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  rol        text not null default 'voluntario' check (rol in ('admin','voluntario')),
  created_at timestamptz not null default now()
);

create index if not exists idx_turnos_dia on public.turnos (orden_dia, hora_inicio);

create index if not exists idx_asig_turno on public.asignaciones (turno_id);

create index if not exists idx_asig_vol on public.asignaciones (voluntario_id);

create unique index if not exists idx_asig_unica_activa
  on public.asignaciones (turno_id, voluntario_id) where estado = 'confirmada';

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where user_id = auth.uid() and rol = 'admin');
$$;

create or replace function public.mi_voluntario_id()
returns text language sql stable security definer set search_path = public as $$
  select id from public.voluntarios where user_id = auth.uid();
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create or replace function public.validar_cupo_asignacion()
returns trigger language plpgsql as $$
declare
  v_cupos int;
  v_ocupados int;
begin
  select cupos into v_cupos from public.turnos where id = new.turno_id for update;
  if not found then
    raise exception 'Turno % no existe', new.turno_id;
  end if;
  select count(*) into v_ocupados from public.asignaciones
   where turno_id = new.turno_id and estado = 'confirmada';
  if v_ocupados >= v_cupos then
    raise exception 'El turno % ya esta completo (% de % cupos)', new.turno_id, v_ocupados, v_cupos;
  end if;
  return new;
end; $$;

create trigger trg_exhibidores_updated before update on public.exhibidores
  for each row execute function public.set_updated_at();

create trigger trg_ubicaciones_updated before update on public.ubicaciones
  for each row execute function public.set_updated_at();

create trigger trg_voluntarios_updated before update on public.voluntarios
  for each row execute function public.set_updated_at();

create trigger trg_turnos_updated before update on public.turnos
  for each row execute function public.set_updated_at();

create trigger trg_asig_cupo before insert on public.asignaciones
  for each row execute function public.validar_cupo_asignacion();

create or replace view public.v_turnos_enriquecidos as
select t.id, t.dia_semana, t.orden_dia, t.hora_inicio, t.hora_fin,
       t.ubicacion_id, u.nombre_punto, u.referencia_exacta, u.link_maps,
       t.exhibidor_id, e.nombre_exhibidor, e.responsable_guarda, e.direccion_retiro,
       e.estado as estado_exhibidor, t.cupos,
       count(a.id) filter (where a.estado = 'confirmada') as ocupados,
       t.cupos - count(a.id) filter (where a.estado = 'confirmada') as vacantes,
       case when count(a.id) filter (where a.estado = 'confirmada') = 0 then 'Vacante'
            when count(a.id) filter (where a.estado = 'confirmada') < t.cupos then 'Parcial'
            else 'Cubierto' end as estado_turno,
       string_agg(v.nombre, ' · ' order by a.created_at) filter (where a.estado = 'confirmada') as voluntarios_label
from public.turnos t
join public.ubicaciones u on u.id = t.ubicacion_id
join public.exhibidores e on e.id = t.exhibidor_id
left join public.asignaciones a on a.turno_id = t.id
left join public.voluntarios v on v.id = a.voluntario_id
group by t.id, t.dia_semana, t.orden_dia, t.hora_inicio, t.hora_fin, t.ubicacion_id, t.exhibidor_id, t.cupos,
         u.nombre_punto, u.referencia_exacta, u.link_maps,
         e.nombre_exhibidor, e.responsable_guarda, e.direccion_retiro, e.estado;

create or replace view public.v_exhibidores_resumen as
select e.id, e.nombre_exhibidor, e.responsable_guarda, e.direccion_retiro, e.estado,
       count(v.id) as total_turnos,
       coalesce(sum(v.vacantes), 0) as vacantes,
       string_agg(v.dia_semana || ' ' || to_char(v.hora_inicio, 'HH24:MI'), ', '
                  order by v.orden_dia, v.hora_inicio) as horarios
from public.exhibidores e
left join public.v_turnos_enriquecidos v on v.exhibidor_id = e.id
group by e.id, e.nombre_exhibidor, e.responsable_guarda, e.direccion_retiro, e.estado;

create or replace view public.v_ubicaciones_resumen as
select u.id, u.nombre_punto, u.referencia_exacta, u.link_maps,
       count(v.id) as total_turnos,
       coalesce(sum(v.vacantes), 0) as vacantes,
       string_agg(v.dia_semana || ' ' || to_char(v.hora_inicio, 'HH24:MI'), ', '
                  order by v.orden_dia, v.hora_inicio) as horarios
from public.ubicaciones u
left join public.v_turnos_enriquecidos v on v.ubicacion_id = u.id
group by u.id, u.nombre_punto, u.referencia_exacta, u.link_maps;

alter table public.exhibidores enable row level security;

alter table public.ubicaciones enable row level security;

alter table public.voluntarios enable row level security;

alter table public.turnos enable row level security;

alter table public.asignaciones enable row level security;

alter table public.perfiles enable row level security;

create policy exhibidores_select on public.exhibidores for select to authenticated using (true);

create policy exhibidores_admin on public.exhibidores for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy ubicaciones_select on public.ubicaciones for select to authenticated using (true);

create policy ubicaciones_admin on public.ubicaciones for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy turnos_select on public.turnos for select to authenticated using (true);

create policy turnos_admin on public.turnos for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy voluntarios_select on public.voluntarios for select to authenticated using (user_id = auth.uid() or public.es_admin());

create policy voluntarios_admin on public.voluntarios for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy asig_select on public.asignaciones for select to authenticated using (true);

create policy asig_insert on public.asignaciones for insert to authenticated with check (voluntario_id = public.mi_voluntario_id() or public.es_admin());

create policy asig_update_admin on public.asignaciones for update to authenticated using (public.es_admin()) with check (public.es_admin());

create policy asig_delete on public.asignaciones for delete to authenticated using (voluntario_id = public.mi_voluntario_id() or public.es_admin());

create policy perfiles_select on public.perfiles for select to authenticated using (user_id = auth.uid() or public.es_admin());

create policy perfiles_admin on public.perfiles for all to authenticated using (public.es_admin()) with check (public.es_admin());

grant select on public.v_turnos_enriquecidos to authenticated;

grant select on public.v_exhibidores_resumen to authenticated;

grant select on public.v_ubicaciones_resumen to authenticated;

insert into public.exhibidores (id, nombre_exhibidor, responsable_guarda, direccion_retiro, estado) values
  ('EXH-01', 'Exhibidor 1 (Flia. Molina)', 'Flia. Molina', 'Calle S. Ortiz y Corrientes', 'Activo'),
  ('EXH-02', 'Exhibidor 2 (Gibertoni)', 'Gibertoni', 'Calle Corrientes y Troilo', 'Activo'),
  ('EXH-03', 'Exhibidor 3 (Génesis-Miselda)', 'Génesis / Miselda', 'Calle Corrientes y Vera', 'Activo'),
  ('EXH-04', 'Exhibidor 4 (Zabala)', 'Zabala', 'Pqe Centenario', 'Activo'),
  ('EXH-05', 'Exhibidor 5 (Carmen)', 'Carmen', 'Corrientes y Troilo', 'Activo');

insert into public.ubicaciones (id, nombre_punto, referencia_exacta, link_maps) values
  ('UBIC-01', 'S. Ortiz y Corrientes', 'Esquina principal', null),
  ('UBIC-02', 'S. Ortiz y Warnes', 'Esquina', null),
  ('UBIC-03', 'Corrientes y Troilo', 'Esquina', null),
  ('UBIC-04', 'Corrientes y Vera', 'Esquina', null),
  ('UBIC-05', 'Mástil Pqe Centenario', 'Cerca del mástil', null),
  ('UBIC-06', 'Av. Corrientes 4645', 'Boca subte trasera', null),
  ('UBIC-07', 'E. de Israel y Corrientes', 'Av. Estado de Israel y Corrientes', null);

insert into public.voluntarios (id, nombre, telefono) values
  ('VOL-01', 'Mabel', null),
  ('VOL-02', 'Rocío', null),
  ('VOL-03', 'Nancy', null),
  ('VOL-04', 'Karen', null),
  ('VOL-05', 'Palmira', null),
  ('VOL-06', 'María', null),
  ('VOL-07', 'Beatriz', null),
  ('VOL-08', 'Mauricio', null),
  ('VOL-09', 'Álvaro', null),
  ('VOL-10', 'Vilma', null),
  ('VOL-11', 'Aura', null),
  ('VOL-12', 'Flia. Alba', null),
  ('VOL-13', 'Génesis', null),
  ('VOL-14', 'Susana', null),
  ('VOL-15', 'Fernanda', null),
  ('VOL-16', 'Daiana', null),
  ('VOL-17', 'Luciana / Lorena', null),
  ('VOL-18', 'Bruno / Paloma', null),
  ('VOL-19', 'Carmen', null),
  ('VOL-20', 'Isabel', null),
  ('VOL-21', 'Carlos', null),
  ('VOL-22', 'Kevin', null),
  ('VOL-23', 'Geisha', null),
  ('VOL-24', 'Braian', null);

insert into public.turnos (id, dia_semana, orden_dia, hora_inicio, ubicacion_id, exhibidor_id, cupos) values
  ('TURNO-001', 'Martes', 2, '18:00', 'UBIC-01', 'EXH-01', 2),
  ('TURNO-002', 'Miércoles', 3, '07:00', 'UBIC-01', 'EXH-01', 2),
  ('TURNO-003', 'Miércoles', 3, '18:30', 'UBIC-01', 'EXH-01', 2),
  ('TURNO-004', 'Martes', 2, '16:00', 'UBIC-02', 'EXH-01', 2),
  ('TURNO-005', 'Lunes', 1, '18:30', 'UBIC-03', 'EXH-02', 2),
  ('TURNO-006', 'Martes', 2, '13:00', 'UBIC-03', 'EXH-02', 2),
  ('TURNO-007', 'Martes', 2, '18:30', 'UBIC-03', 'EXH-02', 2),
  ('TURNO-008', 'Viernes', 5, '18:30', 'UBIC-03', 'EXH-02', 2),
  ('TURNO-009', 'Lunes', 1, '18:30', 'UBIC-04', 'EXH-03', 2),
  ('TURNO-010', 'Miércoles', 3, '18:30', 'UBIC-04', 'EXH-03', 2),
  ('TURNO-011', 'Viernes', 5, '18:30', 'UBIC-04', 'EXH-03', 2),
  ('TURNO-012', 'Jueves', 4, '09:00', 'UBIC-05', 'EXH-04', 2),
  ('TURNO-013', 'Viernes', 5, '15:00', 'UBIC-05', 'EXH-04', 2),
  ('TURNO-014', 'Jueves', 4, '18:00', 'UBIC-03', 'EXH-05', 2),
  ('TURNO-015', 'Sábado', 6, '08:30', 'UBIC-03', 'EXH-05', 2),
  ('TURNO-016', 'Domingo', 7, '08:30', 'UBIC-03', 'EXH-05', 2),
  ('TURNO-017', 'Martes', 2, '18:30', 'UBIC-06', 'EXH-01', 2),
  ('TURNO-018', 'Miércoles', 3, '18:30', 'UBIC-06', 'EXH-01', 2),
  ('TURNO-019', 'Sábado', 6, '08:30', 'UBIC-07', 'EXH-01', 2),
  ('TURNO-020', 'Domingo', 7, '08:30', 'UBIC-07', 'EXH-01', 2);

insert into public.asignaciones (turno_id, voluntario_id) values
  ('TURNO-001', 'VOL-01'),
  ('TURNO-001', 'VOL-02'),
  ('TURNO-002', 'VOL-03'),
  ('TURNO-002', 'VOL-04'),
  ('TURNO-003', 'VOL-05'),
  ('TURNO-003', 'VOL-02'),
  ('TURNO-004', 'VOL-06'),
  ('TURNO-004', 'VOL-07'),
  ('TURNO-005', 'VOL-05'),
  ('TURNO-005', 'VOL-11'),
  ('TURNO-006', 'VOL-08'),
  ('TURNO-006', 'VOL-09'),
  ('TURNO-007', 'VOL-05'),
  ('TURNO-007', 'VOL-10'),
  ('TURNO-010', 'VOL-12'),
  ('TURNO-011', 'VOL-13'),
  ('TURNO-011', 'VOL-14'),
  ('TURNO-012', 'VOL-15'),
  ('TURNO-012', 'VOL-16'),
  ('TURNO-013', 'VOL-07'),
  ('TURNO-013', 'VOL-10'),
  ('TURNO-014', 'VOL-17'),
  ('TURNO-014', 'VOL-18'),
  ('TURNO-015', 'VOL-19'),
  ('TURNO-015', 'VOL-20'),
  ('TURNO-016', 'VOL-10'),
  ('TURNO-016', 'VOL-19'),
  ('TURNO-017', 'VOL-14'),
  ('TURNO-017', 'VOL-11'),
  ('TURNO-018', 'VOL-14'),
  ('TURNO-018', 'VOL-23'),
  ('TURNO-019', 'VOL-21'),
  ('TURNO-019', 'VOL-22'),
  ('TURNO-020', 'VOL-21'),
  ('TURNO-020', 'VOL-24');


-- ============================================================
-- PASOS POSTERIORES (manual):
-- 1) Ejecutar supabase/migrations/001_auto_link_voluntario_on_signup.sql
-- 2) Ejecutar supabase/migrations/002_anon_readonly.sql
-- 2) Completar voluntarios.email (mismo email que la invitación Auth)
-- 3) Authentication -> Users -> invitar por email
-- 4) Admin: insert into public.perfiles (user_id, rol) values ('UUID', 'admin');
--    (el trigger crea rol voluntario; el admin se promueve con este insert/update)
-- 5) Completar telefono y link_maps si aplica
-- ============================================================
