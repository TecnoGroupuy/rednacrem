// Carga de médicos facturadores SU Emergencia (2026-10): antes de sumar el
// subgrupo 'facturadores', un médico con tipo_personal='facturador' tenía
// rol Medico pero no matcheaba ni 'internos' (tipo_personal==='interno') ni
// 'contratados' (==='externo') -- quedaba invisible en la jerarquía de
// RRHH aunque estuviera bien cargado en la base. Este test cubre
// exactamente ese caso, más que los otros dos tipos no se rompieron.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalHierarchy } from '../src/modules/operaciones/rrhh/personalHierarchy.js';

function medico(id, tipoPersonal) {
  return { id, nombre: `Medico${id}`, apellido: '', estado: 'activo', tipo_personal: tipoPersonal, roles: [{ rol: 'Medico' }] };
}

function persona(id, roles, extra = {}) {
  return { id, nombre: `Persona${id}`, apellido: '', estado: 'activo', roles: roles.map((rol) => ({ rol })), ...extra };
}

test('médico facturador aparece en el subgrupo "Facturadores" de Médicos', () => {
  const personal = [medico('1', 'interno'), medico('2', 'externo'), medico('3', 'facturador')];
  const { areas } = buildPersonalHierarchy(personal);
  const medicina = areas.find((a) => a.key === 'medicina');
  const facturadores = medicina.subgroups.find((sg) => sg.key === 'facturadores');
  assert.ok(facturadores, 'el subgrupo facturadores existe');
  assert.deepEqual(facturadores.members.map((m) => m.id), ['3']);
});

test('internos y contratados no se rompieron por el subgrupo nuevo', () => {
  const personal = [medico('1', 'interno'), medico('2', 'externo'), medico('3', 'facturador')];
  const { areas } = buildPersonalHierarchy(personal);
  const medicina = areas.find((a) => a.key === 'medicina');
  const internos = medicina.subgroups.find((sg) => sg.key === 'internos');
  const contratados = medicina.subgroups.find((sg) => sg.key === 'contratados');
  assert.deepEqual(internos.members.map((m) => m.id), ['1']);
  assert.deepEqual(contratados.members.map((m) => m.id), ['2']);
});

test('medicina.total cuenta a los facturadores (antes quedaban afuera del total)', () => {
  const personal = [medico('1', 'interno'), medico('2', 'externo'), medico('3', 'facturador'), medico('4', 'facturador')];
  const { areas } = buildPersonalHierarchy(personal);
  const medicina = areas.find((a) => a.key === 'medicina');
  assert.equal(medicina.total, 4);
});

// --- Economato como subgrupo de Enfermería (2026-10) ---
// Antes era un area propia bajo Direccion tecnica, al mismo nivel que
// Medicina/Enfermeria/Choferes. Pasa a ser un subgrupo mas DENTRO de
// Enfermeria (misma jefatura, igual que Medicina ya tiene
// Internos/Contratados/Facturadores como subgrupos).

test('Economato ya NO es un area propia -- no aparece en `areas`', () => {
  const personal = [persona('1', ['Economato'])];
  const { areas } = buildPersonalHierarchy(personal);
  assert.equal(areas.find((a) => a.key === 'economato'), undefined);
});

test('rol Economato aparece en el subgrupo "Economato" DENTRO de Enfermería', () => {
  const personal = [persona('1', ['Economato'])];
  const { areas } = buildPersonalHierarchy(personal);
  const enfermeria = areas.find((a) => a.key === 'enfermeria');
  assert.ok(enfermeria, 'el area enfermeria existe');
  const economato = enfermeria.subgroups.find((sg) => sg.key === 'economato');
  assert.ok(economato, 'el subgrupo economato existe dentro de enfermeria');
  assert.deepEqual(economato.members.map((m) => m.id), ['1']);
});

test('el total de Enfermería incluye a Economato', () => {
  const personal = [
    persona('1', ['Economato']),
    persona('2', ['Enfermero']),
    persona('3', ['Auxiliar_de_servicio'])
  ];
  const { areas } = buildPersonalHierarchy(personal);
  const enfermeria = areas.find((a) => a.key === 'enfermeria');
  assert.equal(enfermeria.total, 3);
});

// Roles múltiples: ANTES del cambio, una persona con Enfermero + Economato
// ya aparecía en dos lugares a la vez (Enfermería, en su subgrupo de
// régimen de turno, Y en el área Economato aparte) -- ninguna de las dos
// secciones excluía al otro rol, mismo criterio que ya documentaba "Otros
// roles" ("no se la saca de donde ya corresponde, solo se hace visible el
// rol suelto"). Se mantiene ese criterio: ahora ambas apariciones quedan
// DENTRO de la misma área (Enfermería), en dos subgrupos distintos, en vez
// de repartidas entre dos áreas.
test('roles múltiples (Enfermero + Economato): aparece en los DOS subgrupos de Enfermería a la vez', () => {
  const personal = [persona('1', ['Enfermero', 'Economato'])];
  const { areas } = buildPersonalHierarchy(personal);
  const enfermeria = areas.find((a) => a.key === 'enfermeria');
  const sinRegimen = enfermeria.subgroups.find((sg) => sg.key === 'sin_regimen');
  const economato = enfermeria.subgroups.find((sg) => sg.key === 'economato');
  assert.deepEqual(sinRegimen.members.map((m) => m.id), ['1']);
  assert.deepEqual(economato.members.map((m) => m.id), ['1']);
  // El total NO duplica a la persona -- se cuenta una vez por cada
  // subgrupo en el que aparece, igual que ya pasaba con enfermeros con
  // mas de un rol de esta misma area.
  assert.equal(enfermeria.total, 2);
});

test('la Jefa de Enfermería con rol Economato no se duplica en el subgrupo Economato (igual que ya no se duplica en los demás subgrupos)', () => {
  const personal = [persona('1', ['Jefe_de_enfermeria', 'Economato'])];
  const { areas } = buildPersonalHierarchy(personal);
  const enfermeria = areas.find((a) => a.key === 'enfermeria');
  assert.deepEqual(enfermeria.leaders.map((m) => m.id), ['1']);
  const economato = enfermeria.subgroups.find((sg) => sg.key === 'economato');
  assert.deepEqual(economato.members, []);
});

test('las demás áreas (Médicos, Choferes, Mantenimiento) no se vieron afectadas por el cambio de Economato', () => {
  const personal = [
    medico('1', 'interno'),
    persona('2', ['Chofer']),
    persona('3', ['Mantenimiento']),
    persona('4', ['Economato'])
  ];
  const { areas } = buildPersonalHierarchy(personal);
  const medicina = areas.find((a) => a.key === 'medicina');
  const choferes = areas.find((a) => a.key === 'choferes');
  const mantenimiento = areas.find((a) => a.key === 'mantenimiento');
  assert.equal(medicina.total, 1);
  assert.equal(choferes.total, 1);
  assert.equal(mantenimiento.total, 1);
});
