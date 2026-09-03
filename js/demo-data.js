/** Datos semilla locales — mismo estado que schema_supabase.sql (modo demo). */

export const DEMO_USER = {
  id: 'demo-user',
  email: 'lucas@demo.local',
  nombre: 'Lucas',
  voluntarioId: 'VOL-06',
  rol: 'voluntario',
};

export const DEMO_ADMIN = {
  ...DEMO_USER,
  nombre: 'Admin Demo',
  rol: 'admin',
};

const asignaciones = [
  ['TURNO-001', 'VOL-01'], ['TURNO-001', 'VOL-02'],
  ['TURNO-002', 'VOL-03'], ['TURNO-002', 'VOL-04'],
  ['TURNO-003', 'VOL-05'], ['TURNO-003', 'VOL-02'],
  ['TURNO-004', 'VOL-06'], ['TURNO-004', 'VOL-07'],
  ['TURNO-005', 'VOL-05'], ['TURNO-005', 'VOL-11'],
  ['TURNO-006', 'VOL-08'], ['TURNO-006', 'VOL-09'],
  ['TURNO-007', 'VOL-05'], ['TURNO-007', 'VOL-10'],
  ['TURNO-010', 'VOL-12'],
  ['TURNO-011', 'VOL-13'], ['TURNO-011', 'VOL-14'],
  ['TURNO-012', 'VOL-15'], ['TURNO-012', 'VOL-16'],
  ['TURNO-013', 'VOL-07'], ['TURNO-013', 'VOL-10'],
  ['TURNO-014', 'VOL-17'], ['TURNO-014', 'VOL-18'],
  ['TURNO-015', 'VOL-19'], ['TURNO-015', 'VOL-20'],
  ['TURNO-016', 'VOL-10'], ['TURNO-016', 'VOL-19'],
  ['TURNO-017', 'VOL-14'], ['TURNO-017', 'VOL-11'],
  ['TURNO-018', 'VOL-14'], ['TURNO-018', 'VOL-23'],
  ['TURNO-019', 'VOL-21'], ['TURNO-019', 'VOL-22'],
  ['TURNO-020', 'VOL-21'], ['TURNO-020', 'VOL-24'],
];

const voluntarios = {
  'VOL-01': { id: 'VOL-01', nombre: 'Mabel', telefono: null, email: null },
  'VOL-02': { id: 'VOL-02', nombre: 'Rocío', telefono: null, email: null },
  'VOL-03': { id: 'VOL-03', nombre: 'Nancy', telefono: null, email: null },
  'VOL-04': { id: 'VOL-04', nombre: 'Karen', telefono: null, email: null },
  'VOL-05': { id: 'VOL-05', nombre: 'Palmira', telefono: null, email: null },
  'VOL-06': { id: 'VOL-06', nombre: 'María', telefono: null, email: null },
  'VOL-07': { id: 'VOL-07', nombre: 'Beatriz', telefono: null, email: null },
  'VOL-08': { id: 'VOL-08', nombre: 'Mauricio', telefono: null, email: null },
  'VOL-09': { id: 'VOL-09', nombre: 'Álvaro', telefono: null, email: null },
  'VOL-10': { id: 'VOL-10', nombre: 'Vilma', telefono: null, email: null },
  'VOL-11': { id: 'VOL-11', nombre: 'Aura', telefono: null, email: null },
  'VOL-12': { id: 'VOL-12', nombre: 'Flia. Alba', telefono: null, email: null },
  'VOL-13': { id: 'VOL-13', nombre: 'Génesis', telefono: null, email: null },
  'VOL-14': { id: 'VOL-14', nombre: 'Susana', telefono: null, email: null },
  'VOL-15': { id: 'VOL-15', nombre: 'Fernanda', telefono: null, email: null },
  'VOL-16': { id: 'VOL-16', nombre: 'Daiana', telefono: null, email: null },
  'VOL-17': { id: 'VOL-17', nombre: 'Luciana / Lorena', telefono: null, email: null },
  'VOL-18': { id: 'VOL-18', nombre: 'Bruno / Paloma', telefono: null, email: null },
  'VOL-19': { id: 'VOL-19', nombre: 'Carmen', telefono: null, email: null },
  'VOL-20': { id: 'VOL-20', nombre: 'Isabel', telefono: null, email: null },
  'VOL-21': { id: 'VOL-21', nombre: 'Carlos', telefono: null, email: null },
  'VOL-22': { id: 'VOL-22', nombre: 'Kevin', telefono: null, email: null },
  'VOL-23': { id: 'VOL-23', nombre: 'Geisha', telefono: null, email: null },
  'VOL-24': { id: 'VOL-24', nombre: 'Braian', telefono: null, email: null },
};

const exhibidores = [
  { id: 'EXH-01', nombre_exhibidor: 'Exhibidor 1 (Flia. Molina)', responsable_guarda: 'Flia. Molina', direccion_retiro: 'Calle S. Ortiz y Corrientes', estado: 'Activo' },
  { id: 'EXH-02', nombre_exhibidor: 'Exhibidor 2 (Gibertoni)', responsable_guarda: 'Gibertoni', direccion_retiro: 'Calle Corrientes y Troilo', estado: 'Activo' },
  { id: 'EXH-03', nombre_exhibidor: 'Exhibidor 3 (Génesis-Miselda)', responsable_guarda: 'Génesis / Miselda', direccion_retiro: 'Calle Corrientes y Vera', estado: 'Activo' },
  { id: 'EXH-04', nombre_exhibidor: 'Exhibidor 4 (Zabala)', responsable_guarda: 'Zabala', direccion_retiro: 'Pqe Centenario', estado: 'Activo' },
  { id: 'EXH-05', nombre_exhibidor: 'Exhibidor 5 (Carmen)', responsable_guarda: 'Carmen', direccion_retiro: 'Corrientes y Troilo', estado: 'Activo' },
];

const ubicaciones = [
  { id: 'UBIC-01', nombre_punto: 'S. Ortiz y Corrientes', referencia_exacta: 'Esquina principal', link_maps: null },
  { id: 'UBIC-02', nombre_punto: 'S. Ortiz y Warnes', referencia_exacta: 'Esquina', link_maps: null },
  { id: 'UBIC-03', nombre_punto: 'Corrientes y Troilo', referencia_exacta: 'Esquina', link_maps: null },
  { id: 'UBIC-04', nombre_punto: 'Corrientes y Vera', referencia_exacta: 'Esquina', link_maps: null },
  { id: 'UBIC-05', nombre_punto: 'Mástil Pqe Centenario', referencia_exacta: 'Cerca del mástil', link_maps: null },
  { id: 'UBIC-06', nombre_punto: 'Av. Corrientes 4645', referencia_exacta: 'Boca subte trasera', link_maps: null },
  { id: 'UBIC-07', nombre_punto: 'E. de Israel y Corrientes', referencia_exacta: 'Av. Estado de Israel y Corrientes', link_maps: null },
];

const turnosRaw = [
  ['TURNO-001', 'Martes', 2, '18:00:00', 'UBIC-01', 'EXH-01', 2],
  ['TURNO-002', 'Miércoles', 3, '07:00:00', 'UBIC-01', 'EXH-01', 2],
  ['TURNO-003', 'Miércoles', 3, '18:30:00', 'UBIC-01', 'EXH-01', 2],
  ['TURNO-004', 'Martes', 2, '16:00:00', 'UBIC-02', 'EXH-01', 2],
  ['TURNO-005', 'Lunes', 1, '18:30:00', 'UBIC-03', 'EXH-02', 2],
  ['TURNO-006', 'Martes', 2, '13:00:00', 'UBIC-03', 'EXH-02', 2],
  ['TURNO-007', 'Martes', 2, '18:30:00', 'UBIC-03', 'EXH-02', 2],
  ['TURNO-008', 'Viernes', 5, '18:30:00', 'UBIC-03', 'EXH-02', 2],
  ['TURNO-009', 'Lunes', 1, '18:30:00', 'UBIC-04', 'EXH-03', 2],
  ['TURNO-010', 'Miércoles', 3, '18:30:00', 'UBIC-04', 'EXH-03', 2],
  ['TURNO-011', 'Viernes', 5, '18:30:00', 'UBIC-04', 'EXH-03', 2],
  ['TURNO-012', 'Jueves', 4, '09:00:00', 'UBIC-05', 'EXH-04', 2],
  ['TURNO-013', 'Viernes', 5, '15:00:00', 'UBIC-05', 'EXH-04', 2],
  ['TURNO-014', 'Jueves', 4, '18:00:00', 'UBIC-03', 'EXH-05', 2],
  ['TURNO-015', 'Sábado', 6, '08:30:00', 'UBIC-03', 'EXH-05', 2],
  ['TURNO-016', 'Domingo', 7, '08:30:00', 'UBIC-03', 'EXH-05', 2],
  ['TURNO-017', 'Martes', 2, '18:30:00', 'UBIC-06', 'EXH-01', 2],
  ['TURNO-018', 'Miércoles', 3, '18:30:00', 'UBIC-06', 'EXH-01', 2],
  ['TURNO-019', 'Sábado', 6, '08:30:00', 'UBIC-07', 'EXH-01', 2],
  ['TURNO-020', 'Domingo', 7, '08:30:00', 'UBIC-07', 'EXH-01', 2],
];

function buildTurnosEnriquecidos() {
  const asigByTurno = {};
  for (const [turnoId, volId] of asignaciones) {
    if (!asigByTurno[turnoId]) asigByTurno[turnoId] = [];
    asigByTurno[turnoId].push(volId);
  }

  return turnosRaw.map(([id, dia_semana, orden_dia, hora_inicio, ubicacion_id, exhibidor_id, cupos]) => {
    const u = ubicaciones.find((x) => x.id === ubicacion_id);
    const e = exhibidores.find((x) => x.id === exhibidor_id);
    const volIds = asigByTurno[id] || [];
    const ocupados = volIds.length;
    const vacantes = cupos - ocupados;
    let estado_turno = 'Cubierto';
    if (ocupados === 0) estado_turno = 'Vacante';
    else if (ocupados < cupos) estado_turno = 'Parcial';
    const voluntarios_label = volIds.map((vid) => voluntarios[vid].nombre).join(' · ') || null;

    return {
      id,
      dia_semana,
      orden_dia,
      hora_inicio,
      hora_fin: null,
      ubicacion_id,
      nombre_punto: u.nombre_punto,
      referencia_exacta: u.referencia_exacta,
      link_maps: u.link_maps,
      exhibidor_id,
      nombre_exhibidor: e.nombre_exhibidor,
      responsable_guarda: e.responsable_guarda,
      direccion_retiro: e.direccion_retiro,
      estado_exhibidor: e.estado,
      cupos,
      ocupados,
      vacantes,
      estado_turno,
      voluntarios_label,
    };
  });
}

function buildExhibidoresResumen(turnos) {
  return exhibidores.map((e) => {
    const mine = turnos.filter((t) => t.exhibidor_id === e.id);
    return {
      ...e,
      total_turnos: mine.length,
      vacantes: mine.reduce((s, t) => s + t.vacantes, 0),
      horarios: mine
        .sort((a, b) => a.orden_dia - b.orden_dia || a.hora_inicio.localeCompare(b.hora_inicio))
        .map((t) => `${t.dia_semana} ${formatHora(t.hora_inicio)}`)
        .join(', '),
    };
  });
}

function buildUbicacionesResumen(turnos) {
  return ubicaciones.map((u) => {
    const mine = turnos.filter((t) => t.ubicacion_id === u.id);
    return {
      ...u,
      total_turnos: mine.length,
      vacantes: mine.reduce((s, t) => s + t.vacantes, 0),
      horarios: mine
        .sort((a, b) => a.orden_dia - b.orden_dia || a.hora_inicio.localeCompare(b.hora_inicio))
        .map((t) => `${t.dia_semana} ${formatHora(t.hora_inicio)}`)
        .join(', '),
    };
  });
}

function formatHora(t) {
  return t.slice(0, 5);
}

export const demoStore = {
  turnos: buildTurnosEnriquecidos(),
  exhibidores: null,
  ubicaciones: null,
  asignaciones: asignaciones.map(([turno_id, voluntario_id], i) => ({
    id: i + 1,
    turno_id,
    voluntario_id,
    estado: 'confirmada',
    created_at: new Date().toISOString(),
  })),
  voluntarios,
  exhibidoresList: exhibidores,
  ubicacionesList: ubicaciones,
};

demoStore.exhibidores = buildExhibidoresResumen(demoStore.turnos);
demoStore.ubicaciones = buildUbicacionesResumen(demoStore.turnos);

export function demoGetAsignacionesPorTurno(turnoId) {
  return demoStore.asignaciones
    .filter((a) => a.turno_id === turnoId && a.estado === 'confirmada')
    .map((a) => ({
      ...a,
      voluntario: demoStore.voluntarios[a.voluntario_id],
    }));
}

export function demoTomarTurno(turnoId, voluntarioId) {
  const turno = demoStore.turnos.find((t) => t.id === turnoId);
  if (!turno || turno.vacantes <= 0) throw new Error('CUPO_LLENO');
  if (demoStore.asignaciones.some((a) => a.turno_id === turnoId && a.voluntario_id === voluntarioId && a.estado === 'confirmada')) {
    throw new Error('YA_ANOTADO');
  }
  demoStore.asignaciones.push({
    id: demoStore.asignaciones.length + 1,
    turno_id: turnoId,
    voluntario_id: voluntarioId,
    estado: 'confirmada',
    created_at: new Date().toISOString(),
  });
  refreshDemoTurnos();
}

export function demoDarseDeBaja(turnoId, voluntarioId) {
  const idx = demoStore.asignaciones.findIndex(
    (a) => a.turno_id === turnoId && a.voluntario_id === voluntarioId && a.estado === 'confirmada',
  );
  if (idx === -1) throw new Error('NO_ANOTADO');
  demoStore.asignaciones.splice(idx, 1);
  refreshDemoTurnos();
}

export function demoUpdateExhibidor(id, data) {
  const e = demoStore.exhibidoresList.find((x) => x.id === id);
  if (!e) throw new Error('NOT_FOUND');
  Object.assign(e, data);
  refreshDemoTurnos();
}

function refreshDemoTurnos() {
  demoStore.turnos = buildTurnosEnriquecidos();
  demoStore.exhibidores = buildExhibidoresResumen(demoStore.turnos);
  demoStore.ubicaciones = buildUbicacionesResumen(demoStore.turnos);
}
