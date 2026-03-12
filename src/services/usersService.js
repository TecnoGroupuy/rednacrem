import { usersMock } from '../data/mocks/users.js';
import { ROLE_META } from '../domain/roles.js';
import { delay, maybeThrow } from './fakeApi.js';

let usersStore = usersMock.map((item) => ({ ...item }));

const byId = () => Object.fromEntries(usersStore.map((user) => [user.id, user]));

export const listUsers = () => usersStore.map((item) => ({ ...item }));
export const listUsersAsync = async () => {
  await delay(130);
  return listUsers();
};

export const getUsersByRole = (role) => usersStore.filter((user) => user.rol === role).map((item) => ({ ...item }));

export const getUserById = (id) => {
  const current = byId();
  return current[id] ? { ...current[id] } : null;
};

export const createUser = async (payload) => {
  await delay(160);
  maybeThrow(!payload?.nombre, 'El nombre del usuario es obligatorio.');
  maybeThrow(!payload?.email, 'El email del usuario es obligatorio.');
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
