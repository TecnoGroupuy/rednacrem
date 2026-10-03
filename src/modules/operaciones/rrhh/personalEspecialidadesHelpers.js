// Clasificación de personal por especialidad (médico) / formación
// (enfermero), RRHH SU Emergencia 2026-10. Lógica pura, sin JSX, extraída
// para poder testearla con node:test -- mismo criterio que
// personalHierarchy.js/fichaPublicaFotoHelpers.js.
//
// "Jefaturas equivalentes": Jefe_medico cuenta como médico, Jefe_de_enfermeria
// como enfermero -- mismo criterio que MEDICO_ROLES_PARA_ESPECIALIDAD/
// ENFERMERO_ROLES_PARA_FORMACION en el backend (index.mjs).
const MEDICO_ROLES = new Set(['Medico', 'Jefe_medico']);
const ENFERMERO_ROLES = new Set(['Enfermero', 'Jefe_de_enfermeria']);

export function esMedico(person) {
  return (person?.roles || []).some((r) => MEDICO_ROLES.has(r.rol));
}

export function esEnfermero(person) {
  return (person?.roles || []).some((r) => ENFERMERO_ROLES.has(r.rol));
}

export function getEspecialidadesMedico(person) {
  return (person?.especialidades || []).filter((e) => e.tipo === 'especialidad');
}

export function getFormacionEnfermero(person) {
  return (person?.especialidades || []).find((e) => e.tipo === 'formacion') || null;
}

// "Sin clasificar": médico sin ninguna especialidad asignada, o enfermero
// sin formación O sin población cargada -- no aplica (false) a cualquier
// otro rol, la clasificación no les corresponde.
export function isSinClasificar(person) {
  if (esMedico(person)) return getEspecialidadesMedico(person).length === 0;
  if (esEnfermero(person)) return !getFormacionEnfermero(person) || !person?.poblacion_enfermeria;
  return false;
}

const POBLACION_LABELS = { adultos: 'Adultos', pediatrica: 'Pediátrica', ambas: 'Ambas' };

export function poblacionLabel(value) {
  return POBLACION_LABELS[value] || null;
}
