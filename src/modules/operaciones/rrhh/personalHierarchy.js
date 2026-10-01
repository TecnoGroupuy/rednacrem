// Modulo puro: agrupa el array de personal (ya con `roles` y
// `regimen_turno`, tal como los devuelve GET /operaciones/personal desde
// el fix de N+1) en la jerarquia organizacional de RRHH. No hace fetch ni
// toca estado de React -- recibe personal, devuelve la estructura
// agrupada. Facil de testear aislado si hace falta mas adelante.
//
// Vocabulario de rol confirmado contra produccion (13 valores del CHECK
// constraint de su_personal_roles.rol): 10 quedan cubiertos por esta
// jerarquia, ya sea como rol de jefatura o como rol de base de un area.
// Los 3 restantes (Administrativo, Backoffice, Quimica) no tienen area
// asignada todavia y van a la seccion "Otros roles" para no perderlos de
// vista -- no se descartan silenciosamente.

const ROLES = {
  DIRECCION_TECNICA: 'Direccion_tecnica',
  JEFE_MEDICO: 'Jefe_medico',
  MEDICO: 'Medico',
  JEFE_ENFERMERIA: 'Jefe_de_enfermeria',
  ENFERMERO: 'Enfermero',
  AUXILIAR_DE_SERVICIO: 'Auxiliar_de_servicio',
  ECONOMATO: 'Economato',
  JEFE_CHOFERES: 'Jefe_de_choferes',
  CHOFER: 'Chofer',
  MANTENIMIENTO: 'Mantenimiento'
};

const HIERARCHY_ROLE_SET = new Set(Object.values(ROLES));

// Valores reconocidos de regimen_turno (migracion 081 agrega 'suplente' a
// los 'fijo'/'turnante' que ya existian desde la 069). Cualquier otro valor
// -- incluido null/undefined, pero tambien un string que no sea ninguno de
// estos tres -- cae en "Sin régimen asignado" en vez de desaparecer de la
// jerarquia: antes de este chequeo explicito, 'suplente' (al no ser 'fijo'
// ni 'turnante', y al ser un valor truthy que no pasaba el filtro
// `!p.regimen_turno` de "sin_regimen") quedaba afuera de los tres
// subgrupos de Enfermeria/Choferes por completo.
const REGIMEN_TURNO_VALUES = new Set(['fijo', 'turnante', 'suplente']);
const isRegimenTurno = (person, value) => person.regimen_turno === value;
const isSinRegimen = (person) => !REGIMEN_TURNO_VALUES.has(person.regimen_turno);

function hasRole(person, rol) {
  return (person.roles || []).some((item) => item.rol === rol);
}

function idSet(people) {
  return new Set(people.map((p) => p.id));
}

// Estado efectivo a mostrar (no confundir con person.estado, la columna
// cruda): licencia_vigente (GET /operaciones/personal, migracion 070) manda
// sobre el campo estado -- alguien puede seguir en estado='activo' en la
// base pero tener una licencia vigente cargada, y en ese caso se muestra
// como en licencia igual. El vencimiento de una licencia se refleja solo,
// sin mutar ningun estado a mano: licencia_vigente simplemente deja de
// venir del backend el dia que se vence.
export function getEffectiveEstado(person) {
  if (person.licencia_vigente) {
    return { estado: 'licencia', licencia: person.licencia_vigente };
  }
  if (person.estado === 'licencia') {
    return { estado: 'licencia', licencia: null };
  }
  return { estado: person.estado, licencia: null };
}

// Orden dentro de cada subgrupo: activos primero, despues licencia/
// suspendido (baja ya salio de la jerarquia antes de llegar aca, ver
// buildPersonalHierarchy). Ordenamiento estable de JS conserva el orden
// alfabetico previo (por apellido/nombre, ya viene asi del backend) dentro
// de cada nivel de prioridad.
const ESTADO_SORT_PRIORITY = { activo: 0, licencia: 1, suspendido: 2 };

function sortByEffectiveEstado(members) {
  return [...members].sort((a, b) => {
    const pa = ESTADO_SORT_PRIORITY[getEffectiveEstado(a).estado] ?? 9;
    const pb = ESTADO_SORT_PRIORITY[getEffectiveEstado(b).estado] ?? 9;
    return pa - pb;
  });
}

// Total y "necesita atencion" (arranca expandida) se derivan siempre del
// mismo lugar para no tener que mantenerlos sincronizados a mano en cada
// seccion.
function finalizeArea({ key, label, leaderRoleLabel, leaders, subgroups }) {
  const hasLeaderConcept = leaderRoleLabel !== null;
  const sortedSubgroups = subgroups.map((sg) => ({ ...sg, members: sortByEffectiveEstado(sg.members) }));
  const total = leaders.length + sortedSubgroups.reduce((sum, sg) => sum + sg.members.length, 0);
  return {
    key,
    label,
    hasLeaderConcept,
    leaderRoleLabel,
    leaders: sortByEffectiveEstado(leaders),
    subgroups: sortedSubgroups,
    total,
    needsAttention: hasLeaderConcept && leaders.length === 0 && total > 0
  };
}

export function buildPersonalHierarchy(personal = []) {
  const list = Array.isArray(personal) ? personal : [];

  // Egresados (estado='baja') salen de la jerarquia por defecto -- ni
  // siquiera compiten por un rol de jefatura. Se devuelven aparte para que
  // la UI arme su propia seccion "Egresados", atenuada, con fecha_egreso.
  const egresados = list.filter((p) => p.estado === 'baja');
  const egresadosIds = idSet(egresados);
  const activePersonal = list.filter((p) => !egresadosIds.has(p.id));

  // Direccion tecnica queda siempre arriba, sola, y se excluye de
  // cualquier otra seccion aunque tenga mas roles ademas (si esto llega a
  // pasar, se prioriza mostrarla solo como Direccion tecnica).
  const direccionTecnica = activePersonal.filter((p) => hasRole(p, ROLES.DIRECCION_TECNICA));
  const direccionTecnicaIds = idSet(direccionTecnica);
  const rest = activePersonal.filter((p) => !direccionTecnicaIds.has(p.id));

  // -- Medicina --
  const medicinaLeaders = rest.filter((p) => hasRole(p, ROLES.JEFE_MEDICO));
  const medicinaLeaderIds = idSet(medicinaLeaders);
  const medicos = rest.filter((p) => hasRole(p, ROLES.MEDICO) && !medicinaLeaderIds.has(p.id));
  const medicina = finalizeArea({
    key: 'medicina',
    label: 'Médicos',
    leaderRoleLabel: 'Jefe/a médico/a',
    leaders: medicinaLeaders,
    subgroups: [
      { key: 'internos', label: 'Internos', members: medicos.filter((p) => p.tipo_personal === 'interno') },
      {
        key: 'contratados',
        label: 'Contratados',
        members: medicos.filter((p) => p.tipo_personal === 'externo'),
        emptyMessage: 'Todavía no hay forma de cargar personal médico externo desde el alta (ver gap de empresas contratistas) -- esta subsección va a seguir vacía hasta que se resuelva.'
      }
    ]
  });

  // -- Enfermeria --
  const enfermeriaLeaders = rest.filter((p) => hasRole(p, ROLES.JEFE_ENFERMERIA));
  const enfermeriaLeaderIds = idSet(enfermeriaLeaders);
  const enfermeros = rest.filter((p) => hasRole(p, ROLES.ENFERMERO) && !enfermeriaLeaderIds.has(p.id));
  const auxiliares = rest.filter((p) => hasRole(p, ROLES.AUXILIAR_DE_SERVICIO) && !enfermeriaLeaderIds.has(p.id));
  const enfermeria = finalizeArea({
    key: 'enfermeria',
    label: 'Enfermería',
    leaderRoleLabel: 'Jefe/a de enfermería',
    leaders: enfermeriaLeaders,
    subgroups: [
      { key: 'fijos', label: 'Fijos', members: enfermeros.filter((p) => isRegimenTurno(p, 'fijo')) },
      { key: 'turnantes', label: 'Turnantes', members: enfermeros.filter((p) => isRegimenTurno(p, 'turnante')) },
      { key: 'suplentes', label: 'Suplentes', members: enfermeros.filter((p) => isRegimenTurno(p, 'suplente')) },
      { key: 'sin_regimen', label: 'Sin régimen asignado', members: enfermeros.filter(isSinRegimen) },
      { key: 'auxiliares', label: 'Auxiliares de servicio', members: auxiliares }
    ]
  });

  // -- Economato -- lista simple, sin concepto de jefatura.
  const economato = finalizeArea({
    key: 'economato',
    label: 'Economato',
    leaderRoleLabel: null,
    leaders: [],
    subgroups: [{ key: 'todos', label: null, members: rest.filter((p) => hasRole(p, ROLES.ECONOMATO)) }]
  });

  // -- Choferes --
  const choferesLeaders = rest.filter((p) => hasRole(p, ROLES.JEFE_CHOFERES));
  const choferesLeaderIds = idSet(choferesLeaders);
  const choferes = rest.filter((p) => hasRole(p, ROLES.CHOFER) && !choferesLeaderIds.has(p.id));
  const choferesArea = finalizeArea({
    key: 'choferes',
    label: 'Choferes',
    leaderRoleLabel: 'Jefe/a de choferes',
    leaders: choferesLeaders,
    subgroups: [
      { key: 'fijos', label: 'Fijos', members: choferes.filter((p) => isRegimenTurno(p, 'fijo')) },
      { key: 'turnantes', label: 'Turnantes', members: choferes.filter((p) => isRegimenTurno(p, 'turnante')) },
      { key: 'suplentes', label: 'Suplentes', members: choferes.filter((p) => isRegimenTurno(p, 'suplente')) },
      { key: 'sin_regimen', label: 'Sin régimen asignado', members: choferes.filter(isSinRegimen) }
    ]
  });

  // -- Mantenimiento -- lista simple, sin concepto de jefatura.
  const mantenimiento = finalizeArea({
    key: 'mantenimiento',
    label: 'Mantenimiento',
    leaderRoleLabel: null,
    leaders: [],
    subgroups: [{ key: 'todos', label: null, members: rest.filter((p) => hasRole(p, ROLES.MANTENIMIENTO)) }]
  });

  // -- Otros roles -- cualquier rol fuera del vocabulario de esta
  // jerarquia. Una persona puede aparecer aca ADEMAS de en su seccion de
  // area, si tiene un rol de cada tipo -- no se la saca de donde ya
  // corresponde, solo se hace visible el rol suelto para no perderlo.
  const otrosRolesMembers = rest.filter((p) =>
    (p.roles || []).some((item) => item.rol && !HIERARCHY_ROLE_SET.has(item.rol))
  );
  const otrosRoles = finalizeArea({
    key: 'otros_roles',
    label: 'Otros roles',
    leaderRoleLabel: null,
    leaders: [],
    subgroups: [{ key: 'todos', label: null, members: otrosRolesMembers }]
  });

  // -- Sin rol asignado -- nadie de estos aparece en ninguna seccion de
  // arriba (por definicion, roles vacio). Esperable seguido: cualquier
  // alta nueva empieza asi hasta que se le asigne un rol desde la ficha.
  const sinRolAsignadoMembers = rest.filter((p) => !(p.roles || []).length);
  const sinRolAsignado = finalizeArea({
    key: 'sin_rol_asignado',
    label: 'Sin rol asignado',
    leaderRoleLabel: null,
    leaders: [],
    subgroups: [{ key: 'todos', label: null, members: sinRolAsignadoMembers }]
  });

  return {
    direccionTecnica: sortByEffectiveEstado(direccionTecnica),
    areas: [medicina, enfermeria, economato, choferesArea, mantenimiento, otrosRoles, sinRolAsignado],
    // Orden alfabetico (ya viene asi del backend) -- no tiene sentido de
    // jefatura/subgrupo, es una lista lisa como Economato/Mantenimiento.
    egresados
  };
}
