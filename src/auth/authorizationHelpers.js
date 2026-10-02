import { isNavItemVisibleForRole } from '../navCapabilities.js';

export const getEffectiveRoleForUi = ({ rolEfectivo, rolReal, fallback = 'atencion_cliente' }) =>
  rolEfectivo || rolReal || fallback;

// capabilities: el array `permissions` que ya devuelve /me (ver
// navCapabilities.js) -- opcional, default [] para no romper ningún
// llamador existente que todavía no lo pase.
export const getVisibleNavItemsForRole = ({ roleNav, role, moduleStates, isModuleVisible, capabilities = [] }) =>
  roleNav.filter((item) => isNavItemVisibleForRole(item, role, capabilities) && isModuleVisible(moduleStates, role, item.path));

export const hasRealRole = ({ rolReal, allowedRoles = [] }) =>
  !allowedRoles.length || allowedRoles.includes(rolReal);
