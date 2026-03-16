import { contactsDirectoryMock } from '../data/mocks/dashboard.js';
import { clientsMock } from '../data/mocks/clients.js';
import { productsMock } from '../data/mocks/products.js';
import { delay, maybeThrow } from './fakeApi.js';
import { getApiClient } from './apiClient.js';

const productById = Object.fromEntries(productsMock.map((item) => [item.id, item]));
const clientById = Object.fromEntries(clientsMock.map((item) => [item.id, item]));

export const PRODUCT_STATUS = {
  ALTA: 'alta',
  BAJA: 'baja'
};

const formatFee = (value) => {
  const fallback = value ? value : '';
  const numeric = typeof fallback === 'number' ? fallback : Number(String(fallback).replace(/[^0-9.\\-]/g, ''));
  if (Number.isNaN(numeric)) return fallback ? String(fallback) : '$ 0';
  return `$ ${numeric.toLocaleString('es-UY')}`;
};

const computeMonthsSince = (value) => {
  if (!value) return 0;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  const now = Date.now();
  const deltaDays = Math.max(0, now - parsed.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(deltaDays / 30);
};

const computePaidInstallments = (value) => Math.max(0, computeMonthsSince(value) + 2);

const api = getApiClient();
const hasApiConfigured = () => Boolean(import.meta.env?.VITE_API_URL);

const buildClientName = (source = {}) => {
  const parts = [source.nombre || source.name || '', source.apellido || ''];
  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(' ') || source.nombre || source.name || 'Cliente';
};

const mapBackendContactRow = (item = {}) => ({
  id: item.id || item.contactId || '',
  name: item.name || buildClientName(item),
  phone: item.phone || item.telefono || '',
  city: item.city || '',
  status: item.status || item.contactoEstado || 'Pendiente',
  last: item.last || (item.tipoPersona ? item.tipoPersona.replace('_', ' ') : ''),
  email: item.email || '',
  documento: item.documento || '',
  tipoPersona: item.tipoPersona,
  contactoEstado: item.contactoEstado,
  productosTotal: Number(item.productosTotal ?? item.productos_total ?? 0),
  productosActivos: Number(item.productosActivos ?? item.productos_activos ?? 0),
  createdAt: item.createdAt || item.created_at || null,
  updatedAt: item.updatedAt || item.updated_at || null
});

const mapMockContactRow = (item = {}, index = 0) => ({
  id: item.id || `mock-contact-${index}`,
  name: item.name,
  phone: item.phone,
  city: item.city,
  status: item.status,
  last: item.last,
  email: item.email || '',
  documento: item.documento || '',
  tipoPersona: item.tipoPersona || '',
  contactoEstado: item.contactoEstado || '',
  productosTotal: item.productosTotal || 0,
  productosActivos: item.productosActivos || 0,
  createdAt: item.createdAt || null,
  updatedAt: item.updatedAt || null
});

const mapBackendPortfolioRow = (item = {}) => {
  const name = buildClientName(item);
  const number = toClientNumber(item.id);
  const fechaAlta = item.fechaAlta || item.createdAt || item.created_at || null;
  const precioValue = Number(item.precio || item.cuota || 0);
  const carenciaMeses = Number(item.carenciaMeses ?? item.carenciaCuotas ?? item.carencia_cuotas ?? 12);
  return {
    id: item.id || '',
    name,
    productoActualNombre: item.productoActualNombre || item.product || 'Sin producto',
    productoContratoId: item.productoContratoId || item.productContractId || item.id || '',
    plan: item.plan || (String(item.productoEstado || item.productEstado || '').toLowerCase() === 'alta' ? 'Activo' : 'Inactivo'),
    fee: item.fee || formatFee(item.cuota || item.precio || precioValue),
    status: item.status || 'Al dia',
    email: item.email || '',
    phone: item.phone || item.telefono || '',
    documento: item.documento || '',
    direccion: item.direccion || '',
    estado: (item.estado || String(item.status || '').toLowerCase()).toLowerCase(),
    createdAt: fechaAlta,
    updatedAt: item.updatedAt || item.updated_at || null,
    numeroCliente: number,
    productoEstado: item.productoEstado || item.productEstado || '',
    cuotasPagas: computePaidInstallments(fechaAlta),
    carenciaMeses,
    precioMensual: precioValue,
    fechaAlta,
    vendedor: item.vendedor || 'Carlos Rodriguez',
    productoResumen: item.productoResumen || '',
    productoPlan: item.plan || '',
    productoDetalle: item.productoDetalle || ''
  };
};

const buildTableRowFromPortfolio = (item = {}) => ({
  id: item.id,
  name: item.name,
  product: item.productoActualNombre,
  plan: item.plan,
  fee: item.fee,
  status: item.status
});
const bootstrapProducts = () => {
  const rows = [];
  clientsMock.forEach((client, clientIndex) => {
    const sourceProducts = Array.isArray(client.productos) && client.productos.length
      ? client.productos
      : [{
          // Legacy compatibility for old mocks.
          productoId: client.productoActualId || '',
          fechaAlta: client.createdAt,
          fechaBaja: null,
          estadoProducto: client.estado === 'inactivo' ? PRODUCT_STATUS.BAJA : PRODUCT_STATUS.ALTA
        }];

    sourceProducts.forEach((product, productIndex) => {
      if (!product.productoId) return;
      rows.push({
        id: `cprd-${String(clientIndex + 1).padStart(2, '0')}${String(productIndex + 1).padStart(2, '0')}`,
        clientId: client.id,
        productoId: product.productoId,
        estadoProducto: product.estadoProducto === PRODUCT_STATUS.BAJA ? PRODUCT_STATUS.BAJA : PRODUCT_STATUS.ALTA,
        fechaAlta: product.fechaAlta || client.createdAt,
        fechaBaja: product.fechaBaja || null,
        motivoBaja: product.motivoBaja || '',
        ultimoTicketId: product.ultimoTicketId || ''
      });
    });
  });
  return rows;
};

let contactProductsStore = bootstrapProducts();

const toClientNumber = (id) => 'CL-' + String(id || '').replace('cli-', '').padStart(4, '0');

const enrichProduct = (item) => ({
  ...item,
  productoNombre: productById[item.productoId]?.nombre || 'Sin producto'
});

const getClientProducts = (clientId) => contactProductsStore
  .filter((item) => item.clientId === clientId)
  .map(enrichProduct)
  .sort((a, b) => String(b.fechaAlta || '').localeCompare(String(a.fechaAlta || '')));

const getActiveProductForClient = (clientId) => getClientProducts(clientId).find((item) => item.estadoProducto === PRODUCT_STATUS.ALTA) || null;

const getLatestProductForClient = (clientId) => getClientProducts(clientId)[0] || null;

const toPortfolioClient = (client) => {
  const activeProduct = getActiveProductForClient(client.id);
  const fallbackProduct = getLatestProductForClient(client.id);
  const selectedProduct = activeProduct || fallbackProduct;
  const isActive = !!activeProduct;

  return {
    id: client.id,
    numeroCliente: toClientNumber(client.id),
    nombre: client.nombre,
    documento: client.documento,
    telefono: client.telefonoPrincipal,
    email: client.email,
    direccion: client.direccion,
    estado: isActive ? 'activo' : 'inactivo',
    productoActualId: selectedProduct?.productoId || '',
    productoActualNombre: selectedProduct?.productoNombre || 'Sin producto',
    productoContratoId: selectedProduct?.id || '',
    createdAt: client.createdAt
  };
};

export const listClients = () => clientsMock.map((client) => {
  const portfolio = toPortfolioClient(client);
  return {
    id: client.id,
    name: client.nombre,
    product: portfolio.productoActualNombre || 'Sin producto',
    plan: portfolio.estado === 'activo' ? 'Activo' : 'Inactivo',
    fee: '$ ' + Number(productById[portfolio.productoActualId]?.precio || 0).toLocaleString('es-UY'),
    status: portfolio.estado === 'activo' ? 'Al dia' : 'Control'
  };
});

export const listPortfolioClients = () => clientsMock.map(toPortfolioClient);

export const getPortfolioClientById = (clientId) => {
  const found = clientById[clientId];
  return found ? toPortfolioClient(found) : null;
};

export const listContactProducts = (clientId) => {
  const items = clientId
    ? contactProductsStore.filter((item) => item.clientId === clientId)
    : contactProductsStore.slice();
  return items.map(enrichProduct).sort((a, b) => String(b.fechaAlta || '').localeCompare(String(a.fechaAlta || '')));
};

export const getContactProductById = (id) => {
  const found = contactProductsStore.find((item) => item.id === id);
  return found ? enrichProduct(found) : null;
};

export const getActiveContactProduct = (clientId) => {
  const found = contactProductsStore.find((item) => item.clientId === clientId && item.estadoProducto === PRODUCT_STATUS.ALTA);
  return found ? enrichProduct(found) : null;
};

export const listActiveContactProducts = (clientId) => listContactProducts(clientId)
  .filter((item) => item.estadoProducto === PRODUCT_STATUS.ALTA)
  .sort((a, b) => String(b.fechaAlta || '').localeCompare(String(a.fechaAlta || '')));

export const markContactProductAsBaja = async (productContractId, { fechaBaja, motivoBaja = '', ticketId = '' } = {}) => {
  await delay(100);
  const index = contactProductsStore.findIndex((item) => item.id === productContractId);
  maybeThrow(index < 0, 'Producto del contacto no encontrado.');

  contactProductsStore[index] = {
    ...contactProductsStore[index],
    estadoProducto: PRODUCT_STATUS.BAJA,
    fechaBaja: fechaBaja || new Date().toISOString(),
    motivoBaja: motivoBaja || contactProductsStore[index].motivoBaja || '',
    ultimoTicketId: ticketId || contactProductsStore[index].ultimoTicketId || ''
  };
  return enrichProduct(contactProductsStore[index]);
};

export const keepContactProductAlta = async (productContractId, { ticketId = '' } = {}) => {
  await delay(100);
  const index = contactProductsStore.findIndex((item) => item.id === productContractId);
  maybeThrow(index < 0, 'Producto del contacto no encontrado.');
  contactProductsStore[index] = {
    ...contactProductsStore[index],
    estadoProducto: PRODUCT_STATUS.ALTA,
    fechaBaja: null,
    ultimoTicketId: ticketId || contactProductsStore[index].ultimoTicketId || ''
  };
  return enrichProduct(contactProductsStore[index]);
};

export const listRecoverableProducts = () => listContactProducts()
  .filter((item) => item.estadoProducto === PRODUCT_STATUS.BAJA)
  .sort((a, b) => String(a.fechaBaja || '').localeCompare(String(b.fechaBaja || '')));

export const getContactLifecycle = (clientId, relatedTickets = []) => {
  const client = clientById[clientId];
  if (!client) return null;
  const products = listContactProducts(clientId).map((product) => ({
    ...product,
    tickets: relatedTickets.filter((ticket) => ticket.productoContratoId === product.id)
  }));
  return {
    contacto: {
      id: client.id,
      nombre: client.nombre,
      documento: client.documento,
      telefono: client.telefonoPrincipal,
      direccion: client.direccion
    },
    productos: products
  };
};

export const searchPortfolioClients = async (term) => {
  await delay(120);
  const query = (term || '').trim().toLowerCase();
  if (!query) return [];
  return listPortfolioClients().filter((client) => {
    const text = [client.numeroCliente, client.nombre, client.documento, client.telefono].join(' ').toLowerCase();
    return text.includes(query);
  });
};

export const fetchContactsList = async () => {
  if (!hasApiConfigured()) {
    return contactsDirectoryMock.map(mapMockContactRow);
  }

  const response = await api.get('/contacts');
  const items = Array.isArray(response?.items) ? response.items : [];
  return items.map(mapBackendContactRow);
};

export const fetchClientsDirectory = async () => {
  if (!hasApiConfigured()) {
    const fallback = listPortfolioClients();
    return {
      table: fallback.map((client) => ({
        id: client.id,
        name: client.name,
        product: client.product,
        plan: client.plan,
        fee: client.fee,
        status: client.status
      })),
      portfolio: fallback
    };
  }

  const response = await api.get('/clients');
  const items = Array.isArray(response?.items) ? response.items : [];
  const portfolio = items.map(mapBackendPortfolioRow);
  const table = portfolio.map(buildTableRowFromPortfolio);
  return { table, portfolio };
};

export const fetchClientsMetrics = async () => {
  const DEFAULT = {
    activos: 11203,
    enBaja: 28,
    cuotaPromedio: 4250,
    cuotaPromedioLabel: '$ 4.250'
  };

  if (!hasApiConfigured()) return DEFAULT;

  const response = await api.get('/clients/metrics');
  return {
    activos: Number(response?.metrics?.activos ?? DEFAULT.activos),
    enBaja: Number(response?.metrics?.enBaja ?? DEFAULT.enBaja),
    cuotaPromedio: Number(response?.metrics?.cuotaPromedio ?? DEFAULT.cuotaPromedio),
    cuotaPromedioLabel: response?.metrics?.cuotaPromedioLabel || DEFAULT.cuotaPromedioLabel
  };
};
