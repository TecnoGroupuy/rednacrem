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
