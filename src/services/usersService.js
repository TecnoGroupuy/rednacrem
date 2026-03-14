import { usersMock } from '../data/mocks/users.js';
import { ROLE_META } from '../domain/roles.js';
import { delay, maybeThrow } from './fakeApi.js';
import {
  listSuperadminUsers,
  createSuperadminUser,
  updateSuperadminUser
} from './superadminUsersService.js';

let usersStore = usersMock.map((item) => ({ ...item }));

const byId = () => Object.fromEntries(usersStore.map((user) => [user.id, user]));
const hasApiConfigured = () => Boolean((typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL));

const syncStore = (list) => {
  usersStore = list.map((item) => ({ ...item }));
  return usersStore;
};

export const listUsers = () => usersStore.map((item) => ({ ...item }));

export const listUsersAsync = async () => {
  if (hasApiConfigured()) {
    const rows = await listSuperadminUsers();
    syncStore(rows);
    return listUsers();
  }
  await delay(130);
  return listUsers();
};

export const getUsersByRole = (role) => usersStore.filter((user) => user.rol === role).map((item) => ({ ...item }));

export const getUserById = (id) => {
  const current = byId();
  return current[id] ? { ...current[id] } : null;
};

export const createUser = async (payload) => {
  maybeThrow(!payload?.nombre, 'El nombre del usuario es obligatorio.');
  maybeThrow(!payload?.email, 'El email del usuario es obligatorio.');

  if (hasApiConfigured()) {
    const created = await createSuperadminUser(payload);
    usersStore = [created, ...usersStore.filter((item) => item.id !== created.id)];
    return { ...created };
  }

  await delay(160);
  maybeThrow(usersStore.some((item) => item.email.toLowerCase() === payload.email.toLowerCase()), 'Ya existe un usuario con ese email.');

  const id = 'usr-' + String(Date.now()).slice(-6);
  const now = new Date().toISOString();
  const newUser = {
    id,
    nombre: payload.nombre,
    email: payload.email,
    telefono: payload.telefono || '',
    rol: payload.rol || 'vendedor',
    activo: payload.activo !== false,
    ultimoAcceso: now,
    createdAt: now
  };
  usersStore = [newUser, ...usersStore];
  return { ...newUser };
};

export const updateUser = async (id, patch) => {
  if (hasApiConfigured()) {
    const updated = await updateSuperadminUser(id, patch);
    usersStore = usersStore.map((item) => (item.id === id ? { ...item, ...updated } : item));
    return { ...updated };
  }

  await delay(150);
  const index = usersStore.findIndex((item) => item.id === id);
  maybeThrow(index < 0, 'Usuario no encontrado.');
  usersStore[index] = { ...usersStore[index], ...patch };
  return { ...usersStore[index] };
};

export const getRoleUsersDictionary = () => {
  const dict = {};
  Object.keys(ROLE_META).forEach((role) => {
    const user = usersStore.find((item) => item.rol === role);
    if (user) dict[role] = { name: user.nombre, email: user.email };
  });
  return dict;
};
