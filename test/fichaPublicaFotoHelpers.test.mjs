// Foto de perfil obligatoria en el link de autocompletado (2026-10).
import test from 'node:test';
import assert from 'node:assert/strict';
import { puedeAvanzarDeFoto, faltantesConFoto } from '../src/modules/public/fichaPublicaFotoHelpers.js';

test('puedeAvanzarDeFoto: false sin foto_url', () => {
  assert.equal(puedeAvanzarDeFoto({ foto_url: null }), false);
  assert.equal(puedeAvanzarDeFoto({ foto_url: '' }), false);
  assert.equal(puedeAvanzarDeFoto({}), false);
  assert.equal(puedeAvanzarDeFoto(null), false);
});

test('puedeAvanzarDeFoto: true con foto_url', () => {
  assert.equal(puedeAvanzarDeFoto({ foto_url: 'https://example.com/foto.jpg' }), true);
});

test('faltantesConFoto: sin foto, "Foto de perfil" va primero en la lista', () => {
  const resultado = faltantesConFoto({ foto_url: null }, [{ label: 'Cédula (frente)' }, { label: 'Carné de salud' }]);
  assert.deepEqual(resultado, ['Foto de perfil', 'Cédula (frente)', 'Carné de salud']);
});

test('faltantesConFoto: con foto, no se agrega nada extra a la lista del checklist', () => {
  const resultado = faltantesConFoto({ foto_url: 'https://example.com/foto.jpg' }, [{ label: 'Cédula (frente)' }]);
  assert.deepEqual(resultado, ['Cédula (frente)']);
});

test('faltantesConFoto: con foto y checklist vacío, lista vacía (nada pendiente)', () => {
  assert.deepEqual(faltantesConFoto({ foto_url: 'https://example.com/foto.jpg' }, []), []);
});

test('faltantesConFoto: sin foto y checklist vacío, solo la foto', () => {
  assert.deepEqual(faltantesConFoto({ foto_url: null }, []), ['Foto de perfil']);
});
