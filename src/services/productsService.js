import { getApiClient } from './apiClient.js';

const api = getApiClient();
let productsStore = [];

const normalizeProduct = (item = {}) => ({
  id: item.id || item.product_id || '',
  nombre: item.nombre || item.name || '',
  categoria: item.categoria || item.category || 'General',
  descripcion: item.descripcion || item.description || '',
  observaciones: item.observaciones || item.notes || '',
  precio: Number(item.precio ?? item.price ?? 0),
  activo: item.activo !== false,
  disponible_venta: item.disponible_venta !== false,
  coberturas: Array.isArray(item.coberturas) ? item.coberturas : [],
  createdAt: item.createdAt || item.created_at || null,
  updatedAt: item.updatedAt || item.updated_at || null
});

export const listProducts = () => productsStore.map((item) => ({ ...item }));

export const listProductsAsync = async ({ search = '', filter = 'todos' } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filter === 'disponibles') params.set('disponible_venta', 'true');
  if (filter === 'activos') params.set('activo', 'true');
  if (filter === 'inactivos') params.set('activo', 'false');

  const qs = params.toString();
  const response = await api.get(qs ? `/products?${qs}` : '/products');
  const items = Array.isArray(response?.items)
    ? response.items
    : (Array.isArray(response) ? response : []);
  productsStore = items.map(normalizeProduct);
  return listProducts();
};

export const getProductById = async (id) => {
  if (!productsStore.length) {
    await listProductsAsync();
  }
  const found = productsStore.find((item) => item.id === id);
  if (!found) throw new Error('Producto no encontrado.');
  return { ...found };
};

export const createProduct = async (payload) => {
  const response = await api.post('/products', payload);
  const item = normalizeProduct(response?.item || response);
  productsStore = [item, ...productsStore.filter((product) => product.id !== item.id)];
  return { ...item };
};

export const updateProduct = async (id, patch) => {
  const response = await api.put(`/products/${id}`, patch);
  const item = normalizeProduct(response?.item || response);
  const index = productsStore.findIndex((product) => product.id === id);
  if (index >= 0) {
    productsStore[index] = item;
  } else {
    productsStore = [item, ...productsStore];
  }
  return { ...item };
};
