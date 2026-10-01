import process from 'node:process';
import { displayNombre, displayApellido, displayFullName } from '../src/modules/operaciones/rrhh/personDisplay.js';

const cases = [
  {
    label: 'VIRGINIA S. + DEL PINO RODRIGUEZ',
    person: { nombre: 'VIRGINIA S.', apellido: 'DEL PINO RODRIGUEZ' },
    expected: 'Virginia Del Pino'
  },
  {
    label: 'MARIA PAULA + FERNANDEZ PAIVA + nombre_uso Paula',
    person: { nombre: 'MARIA PAULA', apellido: 'FERNANDEZ PAIVA', nombre_uso: 'Paula' },
    expected: 'Paula Fernandez'
  },
  {
    label: 'PABLO DANIEL + AKIAN RODRIGUEZ',
    person: { nombre: 'PABLO DANIEL', apellido: 'AKIAN RODRIGUEZ' },
    expected: 'Pablo Akian'
  },
  {
    label: 'REINALDO A. + ESQUIVEL VELAZQUEZ',
    person: { nombre: 'REINALDO A.', apellido: 'ESQUIVEL VELAZQUEZ' },
    expected: 'Reinaldo Esquivel'
  },
  {
    label: 'X + DE LA FUENTE PEREZ',
    person: { nombre: 'X', apellido: 'DE LA FUENTE PEREZ' },
    expected: 'X De la Fuente'
  },
  {
    label: 'GERÉZ GARCÍA como apellido (se conservan las tildes)',
    person: { nombre: 'X', apellido: 'GERÉZ GARCÍA' },
    expected: 'X Geréz'
  }
];

let failed = 0;

for (const { label, person, expected } of cases) {
  const actual = displayFullName(person);
  if (actual === expected) {
    console.log(`OK   ${label} -> "${actual}"`);
  } else {
    failed += 1;
    console.error(`FAIL ${label} -> esperado "${expected}", obtuvo "${actual}"`);
  }
}

// Chequeos aislados adicionales (displayNombre/displayApellido por separado,
// no solo combinados).
const isolated = [
  { fn: displayNombre, label: 'displayNombre(nombre_uso="Paula")', input: { nombre: 'MARIA PAULA', nombre_uso: 'Paula' }, expected: 'Paula' },
  { fn: displayApellido, label: 'displayApellido("DEL PINO RODRIGUEZ")', input: { apellido: 'DEL PINO RODRIGUEZ' }, expected: 'Del Pino' },
  { fn: displayApellido, label: 'displayApellido("DE LOS SANTOS PEREZ")', input: { apellido: 'DE LOS SANTOS PEREZ' }, expected: 'De los Santos' },
  { fn: displayApellido, label: 'displayApellido(un solo apellido, sin segundo)', input: { apellido: 'AKIAN' }, expected: 'Akian' }
];

for (const { fn, label, input, expected } of isolated) {
  const actual = fn(input);
  if (actual === expected) {
    console.log(`OK   ${label} -> "${actual}"`);
  } else {
    failed += 1;
    console.error(`FAIL ${label} -> esperado "${expected}", obtuvo "${actual}"`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} caso(s) fallaron.`);
  process.exit(1);
}

console.log('\nTodos los casos de personDisplay pasaron.');
