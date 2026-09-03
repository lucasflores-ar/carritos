/** Cálculo de semanas (lunes–domingo) alineado con la función SQL lunes_de. */

export function lunesDe(ref = new Date()) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + toMonday);
  return d;
}

export function semanaIdFromDate(date) {
  const lunes = lunesDe(date);
  const y = lunes.getFullYear();
  const m = String(lunes.getMonth() + 1).padStart(2, '0');
  const day = String(lunes.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function diasDesdeLunes(lunes) {
  const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const start = new Date(lunes);
  start.setHours(0, 0, 0, 0);
  return DIAS_ORDEN.map((nombre, i) => {
    const fecha = new Date(start);
    fecha.setDate(start.getDate() + i);
    return {
      nombre,
      corto: DIAS_CORTOS[i],
      orden: i + 1,
      fecha,
      diaNum: fecha.getDate(),
    };
  });
}

export function getSemanasVigenteYSiguiente(ref = new Date()) {
  const vigenteLunes = lunesDe(ref);
  const siguienteLunes = new Date(vigenteLunes);
  siguienteLunes.setDate(vigenteLunes.getDate() + 7);

  return {
    vigente: {
      id: semanaIdFromDate(vigenteLunes),
      fecha_inicio: vigenteLunes,
      fecha_fin: addDays(vigenteLunes, 6),
      dias: diasDesdeLunes(vigenteLunes),
    },
    siguiente: {
      id: semanaIdFromDate(siguienteLunes),
      fecha_inicio: siguienteLunes,
      fecha_fin: addDays(siguienteLunes, 6),
      dias: diasDesdeLunes(siguienteLunes),
    },
  };
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function turnoIdForSemana(plantillaId, semanaId) {
  return `${plantillaId}@${semanaId}`;
}

export function plantillaFromTurnoId(turnoId) {
  const idx = turnoId.indexOf('@');
  return idx === -1 ? turnoId : turnoId.slice(0, idx);
}
