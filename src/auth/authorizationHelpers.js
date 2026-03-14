export const getEffectiveRoleForUi = ({ rolEfectivo, rolReal, fallback = 'atencion_cliente' }) =>
  rolEfectivo || rolReal || fallback;

export const getVisibleNavItemsForRole = ({ roleNav, role, moduleStates, isModuleVisible }) =>
  roleNav.filter((item) => item.roles.includes(role) && isModuleVisible(moduleStates, role, item.path));

export const hasRealRole = ({ rolReal, allowedRoles = [] }) =>
  !allowedRoles.length || allowedRoles.includes(rolReal);
