import { clientsMock } from '../data/mocks/clients.js';
import { productsMock } from '../data/mocks/products.js';
import { delay, maybeThrow } from './fakeApi.js';

const productById = Object.fromEntries(productsMock.map((item) => [item.id, item]));
const clientById = Object.fromEntries(clientsMock.map((item) => [item.id, item]));

export const PRODUCT_STATUS = {
  ALTA: 'alta',
  BAJA: 'baja'
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
  await delay(120);
  const query = (term || '').trim().toLowerCase();
  if (!query) return [];
  return listPortfolioClients().filter((client) => {
    const text = [client.numeroCliente, client.nombre, client.documento, client.telefono].join(' ').toLowerCase();
    return text.includes(query);
  });
};
