import { productsMock } from '../data/mocks/products.js';
import { delay, maybeThrow } from './fakeApi.js';

let productsStore = productsMock.map((item) => ({ ...item }));

export const listProducts = () => productsStore.map((item) => ({ ...item }));

export const listProductsAsync = async () => {
  await delay(140);
  return listProducts();
};

export const getProductById = async (id) => {
  await delay(120);
  const found = productsStore.find((item) => item.id === id);
  maybeThrow(!found, 'Producto no encontrado.');
  return { ...found };
};

export const createProduct = async (payload) => {
  await delay(180);
  maybeThrow(!payload?.nombre, 'El nombre del producto es obligatorio.');
  const id = 'prd-' + String(Date.now()).slice(-6);
  const now = new Date().toISOString();
  const newProduct = {
    id,
    nombre: payload.nombre,
    categoria: payload.categoria || 'General',
    descripcion: payload.descripcion || '',
    precio: Number(payload.precio || 0),
    moneda: payload.moneda || 'UYU',
    activo: payload.activo !== false,
    createdAt: now,
    updatedAt: now
  };
  productsStore = [newProduct, ...productsStore];
  return { ...newProduct };
};

export const updateProduct = async (id, patch) => {
  await delay(160);
  const index = productsStore.findIndex((item) => item.id === id);
  maybeThrow(index < 0, 'Producto no encontrado.');
  const updated = { ...productsStore[index], ...patch, updatedAt: new Date().toISOString() };
  productsStore[index] = updated;
  return { ...updated };
};
