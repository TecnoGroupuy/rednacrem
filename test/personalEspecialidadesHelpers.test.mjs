// Clasificación de personal por especialidad/formación (RRHH SU Emergencia,
// 2026-10).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  esMedico,
  esEnfermero,
  getEspecialidadesMedico,
  getFormacionEnfermero,
  isSinClasificar,
  poblacionLabel
} from '../src/modules/operaciones/rrhh/personalEspecialidadesHelpers.js';

function persona(roles, especialidades = [], extra = {}) {
  return { roles: roles.map((rol) => ({ rol })), especialidades, ...extra };
}

test('esMedico/esEnfermero: jefaturas equivalentes cuentan', () => {
  assert.equal(esMedico(persona(['Medico'])), true);
  assert.equal(esMedico(persona(['Jefe_medico'])), true);
  assert.equal(esMedico(persona(['Enfermero'])), false);
  assert.equal(esEnfermero(persona(['Enfermero'])), true);
  assert.equal(esEnfermero(persona(['Jefe_de_enfermeria'])), true);
  assert.equal(esEnfermero(persona(['Medico'])), false);
});

test('getEspecialidadesMedico / getFormacionEnfermero: separan por tipo', () => {
  const especialidades = [
    { id: '1', tipo: 'especialidad', nombre: 'Pediatría' },
    { id: '2', tipo: 'formacion', nombre: 'Auxiliar de Enfermería' }
  ];
  assert.deepEqual(getEspecialidadesMedico(persona(['Medico'], especialidades)).map((e) => e.id), ['1']);
  assert.equal(getFormacionEnfermero(persona(['Enfermero'], especialidades))?.id, '2');
  assert.equal(getFormacionEnfermero(persona(['Enfermero'], [])), null);
});

test('isSinClasificar: médico sin especialidades', () => {
  assert.equal(isSinClasificar(persona(['Medico'], [])), true);
  assert.equal(isSinClasificar(persona(['Medico'], [{ id: '1', tipo: 'especialidad' }])), false);
});

test('isSinClasificar: enfermero sin formación O sin población', () => {
  assert.equal(isSinClasificar(persona(['Enfermero'], [], { poblacion_enfermeria: null })), true, 'sin formación y sin población');
  assert.equal(isSinClasificar(persona(['Enfermero'], [{ id: '1', tipo: 'formacion' }], { poblacion_enfermeria: null })), true, 'con formación pero sin población');
  assert.equal(isSinClasificar(persona(['Enfermero'], [], { poblacion_enfermeria: 'adultos' })), true, 'con población pero sin formación');
  assert.equal(isSinClasificar(persona(['Enfermero'], [{ id: '1', tipo: 'formacion' }], { poblacion_enfermeria: 'adultos' })), false, 'con ambos: clasificado');
});

test('isSinClasificar: no aplica (false) a roles que no son médico ni enfermero', () => {
  assert.equal(isSinClasificar(persona(['Chofer'], [])), false);
});

test('poblacionLabel: mapea los 3 valores, null para cualquier otra cosa', () => {
  assert.equal(poblacionLabel('adultos'), 'Adultos');
  assert.equal(poblacionLabel('pediatrica'), 'Pediátrica');
  assert.equal(poblacionLabel('ambas'), 'Ambas');
  assert.equal(poblacionLabel(null), null);
  assert.equal(poblacionLabel('algo_invalido'), null);
});
