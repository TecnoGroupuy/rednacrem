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
const hasApiConfigured = () => {
  const baseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_URL : '';
  return Boolean(String(baseUrl || '').trim());
};

const buildClientName = (source = {}) => {
  const parts = [source.nombre || source.name || '', source.apellido || ''];
  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(' ') || source.nombre || source.name || 'Cliente';
};

const mapBackendContactRow = (item = {}) => ({
  id: item.id || '',
  name: item.name || '',
  phone: item.phone || '',
  celular: item.celular || item.cellphone || item.telefono_celular || item.telefonoCelular || '',
  city: item.city || '',
  status: item.status || '',
  last: item.last || '',
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

const buildBackendClientName = (item = {}) => {
  const nombre = item.nombre || item.name || '';
  const apellido = item.apellido || '';
  return [nombre, apellido].map((part) => String(part || '').trim()).filter(Boolean).join(' ') || nombre || item.name || 'Cliente';
};

const mapBackendPortfolioRow = (item = {}) => {
  const productObj = item.product && typeof item.product === 'object' ? item.product : null;
  const cuotaRaw = productObj?.fee ?? productObj?.precio ?? productObj?.price
    ?? item.fee ?? item.cuota ?? item.cuota_mensual ?? item.precio ?? item.price;
  const cuotaValue = typeof cuotaRaw === 'string' && cuotaRaw.trim() ? cuotaRaw : cuotaRaw;
  const feeValue = typeof cuotaValue === 'number' ? formatFee(cuotaValue) : cuotaValue || '';
  const productName = productObj?.nombre || productObj?.name || item.product || item.producto || item.productoNombre || item.producto_nombre || item.servicio || '';
  const planName = productObj?.plan || productObj?.planNombre || productObj?.plan_nombre || item.plan || item.planNombre || item.plan_nombre || '';
  const statusLabel = productObj?.estadoLabel || productObj?.estado || item.status || item.estado || item.contactoEstado || '';
  return {
    id: item.id || '',
    name: item.name || buildBackendClientName(item),
    product: productName,
    plan: planName,
    fee: item.fee || feeValue,
    status: statusLabel,
    email: item.email || item.mail || '',
    phone: item.phone || item.telefono || item.telefono_principal || '',
    celular: item.celular || item.cellphone || item.telefono_celular || item.telefonoCelular || '',
    fechaVenta: productObj?.fechaAlta || item.fechaVenta || item.fecha_venta || item.ventaFecha || item.createdAt || null,
    vendedor: productObj?.sellerName || productObj?.seller_name || item.vendedor || item.vendedorNombre || item.vendedor_nombre || '',
    medioPago: productObj?.medioPago || productObj?.medio_pago || item.medioPago || item.medio_pago || '',
    documento: item.documento || item.documento_numero || '',
    createdAt: item.createdAt || item.created_at || null,
    updatedAt: item.updatedAt || item.updated_at || null,
    cuotasPagas: Number(item.cuotasPagas ?? item.cuotas_pag ?? productObj?.cuotasPagas ?? 0),
    carenciaCuotas: Number(item.carenciaCuotas ?? item.carencia_cuotas ?? item.carenciaCuotas ?? productObj?.carenciaCuotas ?? 0)
  };
};

const mapBackendClientDetail = (item = {}) => {
  const contact = item.contact || item.contacto || item.client || null;
  const base = mapBackendPortfolioRow(item);
  const productsArray = Array.isArray(item.products) && item.products.length
    ? item.products
    : (Array.isArray(item.productos) ? item.productos : []);
  const product =
    item.product && typeof item.product === 'object'
      ? item.product
      : (item.producto && typeof item.producto === 'object' ? item.producto : (productsArray[0] || null));
  const saleSource = Array.isArray(item.sales) && item.sales.length
    ? item.sales[0]
    : (Array.isArray(item.salesHistory) && item.salesHistory.length ? item.salesHistory[0] : null);
  return {
    ...base,
    product: product || base.product,
    products: productsArray,
    telefono: item.telefono || item.phone || contact?.telefono || contact?.phone || base.phone || '',
    celular: item.celular || item.cellphone || item.telefono_celular || item.telefonoCelular || contact?.celular || contact?.cellphone || contact?.telefono_celular || contact?.telefonoCelular || '',
    fechaNacimiento: item.fechaNacimiento || item.fecha_nacimiento || contact?.fechaNacimiento || contact?.fecha_nacimiento || null,
    direccion: item.direccion || item.address || contact?.direccion || contact?.address || '',
    departamento: item.departamento || item.state || contact?.departamento || contact?.state || '',
    pais: item.pais || item.country || contact?.pais || contact?.country || '',
    fechaVenta: product?.fechaAlta || product?.fecha_alta || saleSource?.fechaAlta || saleSource?.fecha_alta || item.fechaVenta || item.fecha_venta || item.ventaFecha || item.createdAt || null,
    vendedor: product?.sellerName || product?.seller_name || saleSource?.sellerName || saleSource?.seller_name || item.vendedor || item.vendedorNombre || item.vendedor_nombre || '',
    medioPago: product?.medioPago || product?.medio_pago || saleSource?.medioPago || saleSource?.medio_pago || item.medioPago || item.medio_pago || '',
    observaciones: item.observaciones || item.notes || ''
  };
};

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
  const query = (term || '').trim().toLowerCase();
  if (!query) return [];
  if (!hasApiConfigured()) {
    await delay(120);
    return listPortfolioClients().filter((client) => {
      const text = [client.numeroCliente, client.nombre, client.documento, client.telefono].join(' ').toLowerCase();
      return text.includes(query);
    });
  }
  const { portfolio = [], table = [] } = await fetchClientsDirectory();
  const base = portfolio.length ? portfolio : table;
  return base
    .map((client) => ({
      id: client.id,
      nombre: client.nombre || client.name || '',
      numeroCliente: client.numeroCliente || client.numero_cliente || client.id || '',
      documento: client.documento || '',
      telefono: client.telefono || client.phone || '',
      productoActualNombre: client.productoActualNombre || client.product || ''
    }))
    .filter((client) => {
      const text = [client.numeroCliente, client.nombre, client.documento, client.telefono, client.productoActualNombre]
        .join(' ')
        .toLowerCase();
      return text.includes(query);
    });
};

export const fetchContactsList = async () => {
  if (!hasApiConfigured()) {
    return contactsDirectoryMock.map(mapMockContactRow);
  }

  const response = await api.get('/contacts');
  const items = Array.isArray(response)
    ? response
    : (Array.isArray(response?.items) ? response.items : (Array.isArray(response?.data) ? response.data : []));
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
        status: client.status,
        email: '',
        phone: '',
        documento: '',
        cuotasPagas: 0,
        carenciaCuotas: 0
      })),
      portfolio: fallback
    };
  }

  const response = await api.get('/clients');
  const items = Array.isArray(response)
    ? response
    : (Array.isArray(response?.items)
        ? response.items
        : (Array.isArray(response?.clients)
            ? response.clients
            : (Array.isArray(response?.data) ? response.data : [])));
  const portfolio = items.map(mapBackendPortfolioRow);
  const table = portfolio.map((item) => ({
    id: item.id,
    name: item.name,
    product: item.product,
    plan: item.plan,
    fee: item.fee,
    status: item.status,
    email: item.email,
    phone: item.phone,
    celular: item.celular,
    fechaVenta: item.fechaVenta,
    vendedor: item.vendedor,
    medioPago: item.medioPago,
    documento: item.documento,
    cuotasPagas: item.cuotasPagas,
    carenciaCuotas: item.carenciaCuotas
  }));
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
  const source = response?.metrics || response || {};
  return {
    activos: Number(source.activos ?? source.activos_total ?? DEFAULT.activos),
    enBaja: Number(source.enBaja ?? source.en_baja ?? DEFAULT.enBaja),
    cuotaPromedio: Number(source.cuotaPromedio ?? source.cuota_promedio ?? source.cuota ?? DEFAULT.cuotaPromedio),
    cuotaPromedioLabel: source.cuotaPromedioLabel || source.cuota_promedio_label || DEFAULT.cuotaPromedioLabel
  };
};

export const fetchClientDetail = async (clientId) => {
  if (!hasApiConfigured()) {
    const fallback = getPortfolioClientById(clientId);
    return fallback ? mapBackendClientDetail(fallback) : null;
  }
  const response = await api.get(`/clients/${clientId}`);
  const item = response?.item || response?.data || response || null;
  return item ? mapBackendClientDetail(item) : null;
};

export const createContactWithProducts = async (payload) => {
  const response = await api.post('/contacts', payload);
  return response?.item || response;
};

export const updateContact = async (contactId, payload) => {
  const response = await api.put(`/contacts/${contactId}`, payload);
  const item = response?.item || response;
  return item ? mapBackendClientDetail(item) : item;
};

export const downloadClientDocument = async (clientId, { template = 'standard', lang = 'es' } = {}) => {
  const query = new URLSearchParams();
  if (template) query.set('template', template);
  if (lang) query.set('lang', lang);
  const path = `/clients/${clientId}/document${query.toString() ? `?${query.toString()}` : ''}`;
  return api.getBlob(path);
};

export const notifyClientDocumentSent = async (clientId, { channel = 'whatsapp', note = '' } = {}) => {
  const payload = { channel, ...(note ? { note } : {}) };
  const response = await api.post(`/clients/${clientId}/document/sent`, payload);
  return response?.item || response;
};

export const deleteClient = async (clientId) => {
  const response = await api.del(`/clients/${clientId}`);
  return response?.item || response;
};
