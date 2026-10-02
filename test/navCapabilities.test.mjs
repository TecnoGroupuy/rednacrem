// Auditoría "rol backoffice" (2026-10), corrección del punto "snapshot
// completo": cubre TODOS los ítems de ROLE_NAV y las 4 ramas de
// renderRoute que cambiaron, para los 7 roles -- cero diferencias salvo
// backoffice. Primer test del frontend (no había ningún framework antes);
// corre con `npm test` (node --test test/), igual convención que el
// backend.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_NAV,
  isNavItemVisibleForRole,
  canRenderSoporte,
  canRenderRetencion,
  canRenderRecuperoVendorView,
  canRenderAgendaVendorView
} from '../src/navCapabilities.js';

const EXISTING_ROLES = ['superadministrador', 'director', 'supervisor', 'operaciones', 'atencion_cliente', 'vendedor'];
const ALL_SEVEN_ROLES = [...EXISTING_ROLES, 'backoffice'];

// Capacidades de pantalla resueltas para backoffice -- mismas 5 que
// devuelve /me hoy (ver backend src/lib/permissions.js,
// ROLE_PERMISSIONS.backoffice). Los 6 roles existentes no dependen de
// `capabilities` para nada en ROLE_NAV (todo vía `roles`), así que su
// array va vacío.
const BACKOFFICE_PANTALLA_CAPABILITIES = [
  'pantalla.soporte',
  'pantalla.retencion',
  'pantalla.recupero_vendedor',
  'pantalla.clientes',
  'pantalla.agenda'
];
const CAPABILITIES_BY_ROLE = {
  superadministrador: [],
  director: [],
  supervisor: [],
  operaciones: [],
  atencion_cliente: [],
  vendedor: [],
  backoffice: BACKOFFICE_PANTALLA_CAPABILITIES
};

test('ROLE_NAV tiene 40 ítems (snapshot de longitud -- si cambia, confirmar que fue intencional)', () => {
  assert.equal(ROLE_NAV.length, 40);
});

test('exactamente 5 ítems tienen `capability` asignada, ninguno más', () => {
  const withCapability = ROLE_NAV.filter((item) => item.capability);
  assert.equal(withCapability.length, 5);
  assert.deepEqual(
    withCapability.map((item) => item.capability).sort(),
    [...BACKOFFICE_PANTALLA_CAPABILITIES].sort()
  );
});

test('SNAPSHOT COMPLETO: los 6 roles existentes ven EXACTAMENTE lo mismo que antes, en los 40 ítems', () => {
  // "Antes" = item.roles.includes(role) a secas (la única condición que
  // existía antes de este cambio). Si isNavItemVisibleForRole difiere de
  // esto para cualquiera de los 6 roles existentes en cualquiera de los 40
  // ítems, es una regresión real de menú.
  let comparisons = 0;
  for (const role of EXISTING_ROLES) {
    for (const item of ROLE_NAV) {
      const before = item.roles.includes(role);
      const after = isNavItemVisibleForRole(item, role, CAPABILITIES_BY_ROLE[role]);
      assert.equal(after, before, `${role} / ${item.path} ("${item.label}"): antes=${before} después=${after}`);
      comparisons += 1;
    }
  }
  // 6 roles x 40 ítems = 240 comparaciones -- si este número baja, algo se
  // dejó de cubrir.
  assert.equal(comparisons, EXISTING_ROLES.length * ROLE_NAV.length);
});

test('backoffice ve EXACTAMENTE los 5 ítems con capability, ninguno de los ~35 restantes', () => {
  const visible = ROLE_NAV.filter((item) => isNavItemVisibleForRole(item, 'backoffice', BACKOFFICE_PANTALLA_CAPABILITIES));
  assert.equal(visible.length, 5);
  assert.deepEqual(visible.map((item) => item.path).sort(), ['agenda', 'clientes', 'recupero', 'retencion', 'soporte']);
  // El path 'clientes' aparece 2 veces en ROLE_NAV (cartera completa, con
  // capability:'pantalla.clientes'; y "Mis ventas" de vendedor, sin
  // capability) -- confirmar que backoffice matchea la correcta.
  const clientesVisible = visible.find((item) => item.path === 'clientes');
  assert.equal(clientesVisible.label, 'Clientes');
  assert.equal(clientesVisible.capability, 'pantalla.clientes');
});

test('backoffice NO ve ninguno de los ítems sin capability (lotes, mercado abierto, captación, codificaciones, panel de control, etc.)', () => {
  const sinCapability = ROLE_NAV.filter((item) => !item.capability);
  assert.equal(sinCapability.length, 35);
  for (const item of sinCapability) {
    assert.equal(
      isNavItemVisibleForRole(item, 'backoffice', BACKOFFICE_PANTALLA_CAPABILITIES),
      false,
      `backoffice no debería ver "${item.label}" (${item.path})`
    );
  }
});

// --- Ramas de renderRoute (las 4 que cambiaron) ---

test('canRenderSoporte: atencion_cliente y backoffice sí, el resto no (sin cambios para atencion_cliente)', () => {
  for (const role of ALL_SEVEN_ROLES) {
    const expected = role === 'atencion_cliente' || role === 'backoffice';
    assert.equal(canRenderSoporte(role), expected, role);
  }
});

test('canRenderRetencion: supervisor, vendedor y backoffice sí, el resto no', () => {
  for (const role of ALL_SEVEN_ROLES) {
    const expected = role === 'supervisor' || role === 'vendedor' || role === 'backoffice';
    assert.equal(canRenderRetencion(role), expected, role);
  }
});

test('canRenderRecuperoVendorView: vendedor, atencion_cliente y backoffice sí, el resto no', () => {
  for (const role of ALL_SEVEN_ROLES) {
    const expected = role === 'vendedor' || role === 'atencion_cliente' || role === 'backoffice';
    assert.equal(canRenderRecuperoVendorView(role), expected, role);
  }
});

test('canRenderAgendaVendorView: vendedor y backoffice sí, el resto no', () => {
  for (const role of ALL_SEVEN_ROLES) {
    const expected = role === 'vendedor' || role === 'backoffice';
    assert.equal(canRenderAgendaVendorView(role), expected, role);
  }
});
