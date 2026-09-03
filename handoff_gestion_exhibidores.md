# Gestión de Exhibidores — Handoff técnico (v2)

Documento de partida para implementar la web app de turnos. Define stack, seguridad, modelo de datos, archivos disponibles, mockup de referencia y la especificación de la pantalla de detalle de turno. Pensado para que otro agente (o desarrollador) pueda continuar sin contexto previo.

---

## 1. Contexto y objetivo

Un equipo de voluntarios acompaña exhibidores (stands) en puntos públicos de la ciudad, en turnos semanales recurrentes con día, hora y ubicación definidos.

Necesidades:

- **Administradores**: gestionan exhibidores, ubicaciones, turnos, voluntarios y asignaciones.
- **Voluntarios** (24 personas): ven el programa semanal completo, sus turnos asignados, y se **autogestionan**: pueden tomar un turno con cupo disponible o darse de baja de uno propio.
- Escala actual: 5 exhibidores, 7 ubicaciones, 24 voluntarios, 20 turnos semanales, 2 cupos por turno (extensible a N cupos sin cambiar el schema).

Reglas de negocio clave:

- Los turnos son **recurrentes por día de semana** (no fechas puntuales) en v1.
- Un turno se considera `Vacante` (0 asignados), `Parcial` (< cupos) o `Cubierto` (= cupos). El estado se **calcula**, no se guarda a mano.
- Un voluntario solo puede anotarse con su propia identidad y en turnos con cupo libre; la sobre-reserva se bloquea en la base de datos.
- Para tener 2 exhibidores en el mismo punto y horario, se cargan 2 filas de turno (una por exhibidor).

---

## 2. Stack (Opción B)

| Capa | Herramienta | Detalle |
|---|---|---|
| Base de datos + Auth + API | **Supabase** (plan Free) | PostgreSQL + PostgREST + GoTrue. Límites del free tier: 500 MB DB, 50.000 MAU, pausa del proyecto tras ~1 semana sin actividad (con uso semanal real no se pausa) |
| Repositorio | **GitHub** | Repo único: frontend + `supabase/schema_supabase.sql` + docs |
| Hosting frontend | **Vercel** (Hobby, gratis) | Deploy automático con push a `main` |
| Frontend v1 | HTML/CSS/JS estático + `supabase-js` v2 (ESM vía CDN) | Sin build step. Alternativa si crece: Next.js |
| Tiempo real | **Supabase Realtime** | Canal sobre `asignaciones` para reflejar tomas/bajas sin recargar |
| Notificaciones (fase posterior) | Supabase Database Webhooks → n8n/Make → WhatsApp/Telegram/email | Opcional, fuera del MVP |

Variables de entorno del frontend (públicas, seguras porque la seguridad vive en RLS):

```
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_ANON_KEY=<anon public key>
```

---

## 3. Roles y seguridad

La seguridad se aplica **en la base de datos** (Row Level Security), nunca en el frontend.

### Identidad y roles

- `auth.users` (Supabase Auth): login por email (invitación).
- `perfiles`: `user_id → auth.users(id)`, campo `rol` ∈ `admin | voluntario`.
- `voluntarios.user_id`: vincula la cuenta Auth con la ficha del voluntario (nullable hasta que la persona se registra).
- Funciones auxiliares `security definer` (evitan recursión en policies):
  - `es_admin()` → boolean
  - `mi_voluntario_id()` → text (`VOL-xx` del usuario logueado)

### Matriz de permisos (RLS)

| Acción | Voluntario | Admin |
|---|---|---|
| Leer turnos, ubicaciones, exhibidores, asignaciones | ✅ | ✅ |
| Leer su propia ficha de voluntario | ✅ (solo la suya) | ✅ (todas) |
| Insertar asignación | ✅ solo con `voluntario_id = mi_voluntario_id()` | ✅ |
| Eliminar asignación (darse de baja) | ✅ solo la suya | ✅ |
| Update de asignaciones | ❌ | ✅ |
| CRUD de turnos / ubicaciones / exhibidores / voluntarios | ❌ | ✅ |

- Rol `anon` (sin login): sin acceso a nada. Si se quiere un programa público de solo lectura, agregar policy `for select to anon` sobre las vistas.
- Protecciones adicionales en DB:
  - Trigger `validar_cupo_asignacion` (`before insert`, con `select ... for update` sobre el turno): rechaza la inserción si el turno está completo. Evita condición de carrera entre dos voluntarios.
  - Índice único parcial `(turno_id, voluntario_id) where estado = 'confirmada'`: un voluntario no puede anotarse dos veces al mismo turno.
  - Trigger `set_updated_at` en tablas maestras.

---

## 4. Modelo de datos

### Tablas

| Tabla | Columnas principales | Notas |
|---|---|---|
| `exhibidores` | id (text, `EXH-xx`), nombre_exhibidor, responsable_guarda, direccion_retiro, estado (`Activo`/`Inactivo`) | |
| `ubicaciones` | id (`UBIC-xx`), nombre_punto, referencia_exacta, link_maps | link_maps pendiente de completar |
| `voluntarios` | id (`VOL-xx`), nombre, telefono, email, user_id (uuid → auth.users), activo | telefono/email pendientes |
| `turnos` | id (`TURNO-xxx`), dia_semana (check Lunes…Domingo), orden_dia (1–7), hora_inicio, hora_fin (nullable), ubicacion_id FK, exhibidor_id FK, cupos (default 2) | Recurrencia semanal |
| `asignaciones` | id (identity), turno_id FK, voluntario_id FK, estado (`confirmada`/`cancelada`), created_at | Reemplaza a las viejas columnas voluntario_1/voluntario_2 |
| `perfiles` | user_id (uuid → auth.users), rol | |

### Vistas (lectura)

- `v_turnos_enriquecidos`: cronograma completo. Join turnos + ubicación + exhibidor + asignaciones; columnas calculadas: `ocupados`, `vacantes`, `estado_turno` (Vacante/Parcial/Cubierto), `voluntarios_label`.
- `v_exhibidores_resumen`: por exhibidor — total_turnos, vacantes (cupos libres), horarios.
- `v_ubicaciones_resumen`: por ubicación — total_turnos, vacantes, horarios.

### Cambios de criterio respecto al sistema origen

- `estado_turno` ahora es **calculado**; en el origen era manual e inconsistente (TURNO-010 figuraba "Cubierto" con 1 solo voluntario → ahora correctamente `Parcial`).
- `vacantes` cuenta **cupos libres**, no turnos vacíos (EXH-02: 2, EXH-03: 3).
- Datos incompletos a propósito (quedan `null`): `voluntarios.telefono`/`email` (eran NULL en origen), `ubicaciones.link_maps` (truncados en la captura de origen), `turnos.hora_fin` (duración de franja aún no definida).

---

## 5. Archivos disponibles (ya generados)

| Archivo | Contenido | Uso |
|---|---|---|
| `schema_supabase.sql` | DDL completo + funciones + triggers + RLS + grants + **datos semilla** (5 exhibidores, 7 ubicaciones, 24 voluntarios, 20 turnos, 35 asignaciones) | Ejecutar íntegro en Supabase → SQL Editor (corre como postgres, bypasea RLS). Validado: conteos y vistas verificados |
| `exhibidores.csv` | 5 filas | Importación alternativa / referencia |
| `turnos.csv` | 20 filas (incluye voluntario_1/voluntario_2 originales) | Referencia; en el schema nuevo esas columnas ya son filas de `asignaciones` |
| `ubicaciones.csv` | 7 filas | Referencia |
| `voluntarios.csv` | 24 filas | Referencia |
| `gestion_exhibidores.xlsx` | 5 hojas: las 4 tablas + `Turnos_Enriquecidos` | Referencia visual del cronograma / validación cruzada |

Estado inicial conocido (útil como **casos de prueba de aceptación**):

- `TURNO-008` (Viernes 18:30, UBIC-03, EXH-02): Vacante, 2 cupos libres.
- `TURNO-009` (Lunes 18:30, UBIC-04, EXH-03): Vacante, 2 cupos libres.
- `TURNO-010` (Miércoles 18:30, UBIC-04, EXH-03): Parcial, 1 cupo libre (ocupado por Flia. Alba).

---

## 6. Mockup de referencia (mobile-first)

Existe un mockup aprobado con la app ya maquetada; **conservar su lenguaje visual y componentes** (tarjetas blancas sobre fondo gris claro, badges de estado, bottom nav). Pantallas ya diseñadas:

- **Cronograma** (home): saludo, CTA a vacantes, contadores (turnos con cupo / total semanal), filtro por día con chips (`Todos, Lun…Dom`) y lista de tarjetas de turno agrupadas por día ("Martes · 5 turnos"). Cada tarjeta: día·hora, `TURNO-xxx`, badge de estado, punto, referencia, exhibidor con retiro truncado, voluntarios, link "Ver detalle y gestionar".
- **Ubicaciones**: listado con referencia, horarios resumidos, conteo de turnos y badge "N vacantes"; detalle de punto con botón "Abrir en Google Maps" y sus turnos.
- **Exhibidores**: listado con custodia, dirección de retiro y horarios; detalle con logística y, solo para admin, el formulario "Actualizar logística".
- **Detalle de turno**: breadcrumb, encabezado con badge, botón Maps, tarjeta Voluntarios, tarjeta Logística del exhibidor y banner de estado. Especificación completa en la sección 7.

Cambios decididos sobre el mockup (implementar como delta):

1. **Bottom nav de 4 tabs**: Cronograma, **Mis turnos** (nuevo), Ubicaciones, Exhibidores. "Mis turnos" es la vista principal del voluntario: sus turnos ordenados por día/hora, cada uno como checklist pre-salida (punto + referencia + botón Maps + dirección de retiro + compañero).
2. **Tercer estado de badge**: agregar `Parcial` (ámbar) junto a `Cubierto` (verde) y `Vacante` (rojo).
3. **Contadores consistentes**: el home debe usar un único criterio — "Turnos con cupo: 3 · 5 cupos libres" — y el CTA "Ver una vacante" pasa a abrir la lista filtrada de turnos con cupo (TURNO-008, TURNO-009 y el parcial TURNO-010 al cargar las semillas).
4. **Formularios de admin condicionados**: renderizar "Actualizar logística" y la gestión de asignaciones solo si `es_admin()`; el RLS rechaza la escritura igual, pero el voluntario no debe verlos.
5. **Desktop**: la bottom nav pasa a sidebar/topbar y el cronograma a grilla semanal (7 columnas por día); con 20 turnos la cobertura se ve de un vistazo.

---

## 7. Pantalla detalle de turno — matriz de estados

Es la pantalla donde ocurre la autogestión. Contenido base (todas las variantes):

- Breadcrumb (`Cronograma › TURNO-xxx`), encabezado: `Día · HH:MM`, `TURNO-xxx`, badge de estado.
- Punto + referencia + botón "Abrir en Google Maps" (si `link_maps` es null, usar `https://www.google.com/maps/search/?api=1&query=<nombre_punto>, Buenos Aires`).
- Tarjeta **Voluntarios por cupos** (no solo nombres): una fila por cupo — "Cupo 1: María", "Cupo 2: libre — puede ser tuyo". Si el usuario está anotado, resaltar su nombre con "(vos)". Cuando `voluntarios.telefono` exista, el nombre del compañero es link a WhatsApp/llamada.
- Tarjeta **Logística del exhibidor**: nombre, "Retirar y devolver en…", custodia, link a la ficha del exhibidor.
- Banner de estado + CTA según la variante.

### Variantes

| # | Condición | Banner | CTA principal | Extra |
|---|---|---|---|---|
| 1 | `Vacante` y yo afuera | "Quedan N cupos libres" (rojo/ámbar) | **Tomar este turno** (grande, primario) | — |
| 2 | `Parcial` y yo afuera | "Queda 1 cupo — vas con {nombre}" (ámbar) | **Tomar este turno** | — |
| 3 | `Cubierto` y yo afuera | "Este turno ya tiene una cobertura registrada" (verde) | Ninguno | Opcional: "Avisame si se libera" (requiere notificaciones; fuera del MVP) |
| 4 | Estoy anotado (cualquier estado) | "Estás anotado a este turno" (azul) | **Darme de baja** (rojo suave, con diálogo de confirmación) | Checklist pre-salida visible |
| 5 | Soy admin (cualquier estado) | El correspondiente | Los CTA que apliquen | Gestión de asignaciones: agregar/quitar voluntarios ajenos; link a editar el turno |

### Reglas de comportamiento

- **Cómo se decide la variante**: `estado_turno` y `vacantes` vienen de `v_turnos_enriquecidos`; "estoy anotado" = existe fila en `asignaciones` con ese `turno_id` y `voluntario_id = mi_voluntario_id()`. No hace falta nada nuevo en la base.
- **Tomar turno**: `insert` en `asignaciones` (`turno_id`, `voluntario_id = mi_voluntario_id()`). Deshabilitar el botón si ya estoy anotado o no hay cupo.
- **Darse de baja**: `delete` de mi fila en `asignaciones`, previa confirmación.
- **Condición de carrera**: si el trigger `validar_cupo_asignacion` rechaza el insert, mostrar "Alguien tomó este cupo recién" y re-renderizar en estado Cubierto (nunca un error genérico).
- **Realtime**: suscribirse a cambios de `asignaciones` para que banner, cupos y CTA se actualicen si otra persona actúa mientras la pantalla está abierta.
- **Tras la acción**: refrescar la vista y el listado de origen (badge y contadores).

---

## 8. Setup paso a paso

1. **Supabase**: crear proyecto → SQL Editor → ejecutar `schema_supabase.sql` completo.
2. **Auth**: Authentication → Users → invitar/crear usuarios por email.
3. **Primer admin** (obtener UUID del usuario en Authentication):
   ```sql
   insert into public.perfiles (user_id, rol) values ('UUID-DEL-USUARIO', 'admin');
   ```
4. **Vincular voluntarios** (una vez registrados):
   ```sql
   update public.voluntarios set user_id = 'UUID-DEL-USUARIO' where id = 'VOL-01';
   ```
5. **Completar datos**: telefono/email de voluntarios, link_maps de ubicaciones, hora_fin si se define.
6. **Repo GitHub**: subir frontend + `supabase/schema_supabase.sql` + este documento.
7. **Vercel**: importar repo, configurar `SUPABASE_URL` y `SUPABASE_ANON_KEY`, deploy.

---

## 9. Roadmap posterior (fuera del MVP)

- Notificaciones (webhook al asignar/liberar + recordatorio día anterior) y "Avisame si se libera".
- `hora_fin` / duración de franjas.
- Instancias con fecha puntual si se deja de lado la recurrencia semanal pura.
- Vista pública read-only del programa (policy `anon` sobre vistas).
- Auditoría de cambios en asignaciones.
