import { getApiClient } from './apiClient.js';

const STORAGE_KEY = 'rednacrem_module_states_v1';

export const ESTADO_MODULO = Object.freeze({
  ACTIVO: 'activo',
  DESARROLLO: 'desarrollo',
  DESHABILITADO: 'deshabilitado'
});

export const ESTADO_MODULO_OPTIONS = [
  { value: ESTADO_MODULO.ACTIVO, label: 'Activo' },
  { value: ESTADO_MODULO.DESARROLLO, label: 'En desarrollo' },
  { value: ESTADO_MODULO.DESHABILITADO, label: 'Deshabilitado' }
];

const normalizeEstado = (value) => {
  if (value === ESTADO_MODULO.DESARROLLO) return ESTADO_MODULO.DESARROLLO;
  if (value === ESTADO_MODULO.DESHABILITADO) return ESTADO_MODULO.DESHABILITADO;
  return ESTADO_MODULO.ACTIVO;
};

const readStorage = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const buildDefaults = ({ roleNav, roles }) => {
  const defaults = {};
  roles.forEach((role) => {
    defaults[role] = {};
  });

  roleNav.forEach((item) => {
    (item.roles || []).forEach((role) => {
      if (!defaults[role]) defaults[role] = {};
      defaults[role][item.path] = ESTADO_MODULO.ACTIVO;
    });
  });

  return defaults;
};

export const createInitialModuleStates = ({ roleNav, roles }) => {
  const defaults = buildDefaults({ roleNav, roles });
  const stored = readStorage();
  if (!stored) return defaults;

  const merged = {};
  Object.keys(defaults).forEach((role) => {
    merged[role] = {};
    Object.keys(defaults[role]).forEach((path) => {
      merged[role][path] = normalizeEstado(stored?.[role]?.[path] || defaults[role][path]);
    });
  });
  return merged;
};

export const persistModuleStates = (states) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch {}
};

export const setModuleState = (states, { role, path, estado }) => {
  const normalized = normalizeEstado(estado);
  return {
    ...states,
    [role]: {
      ...(states[role] || {}),
      [path]: normalized
    }
  };
};

export const getModuleState = (states, role, path) => normalizeEstado(states?.[role]?.[path]);

export const isModuleVisible = (states, role, path) => getModuleState(states, role, path) === ESTADO_MODULO.ACTIVO;

export async function fetchModuleStatesFromApi() {
  try {
    const api = getApiClient();
    const res = await api.get('/module-states');
    return res?.states || null;
  } catch {
    return null;
  }
}

export async function saveModuleStateToApi(roleKey, modulePath, estado) {
  try {
    const api = getApiClient();
    await api.put('/module-states', {
      role_key: roleKey,
      module_path: modulePath,
      estado
    });
    return true;
  } catch {
    return false;
  }
}
