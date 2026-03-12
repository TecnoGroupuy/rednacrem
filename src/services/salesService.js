const familyTypeRank = (sale) => (sale.grupoFamiliar ? 1 : 0);

const nextSaleId = (sales) => {
  const max = sales.reduce((acc, item) => {
    const parsed = Number(String(item.id || '').replace('sale-', ''));
    return Number.isFinite(parsed) ? Math.max(acc, parsed) : acc;
  }, 0);
  return 'sale-' + String(max + 1).padStart(4, '0');
};

export const seedSalesFromContacts = (contacts) => contacts
  .filter((contact) => contact.estadoOperativo === 'finalizado_venta')
  .map((contact, index) => ({
    id: 'sale-' + String(index + 1).padStart(4, '0'),
    contactoId: contact.id,
    clienteNombre: contact.name,
    clienteTelefono: contact.phone,
    documento: '',
    productoId: contact.productId || '',
    cuota: 0,
    fechaVenta: new Date().toISOString(),
    grupoFamiliar: false,
    ventaOrigenId: '',
    relacionConTitular: '',
    observaciones: '',
    soldBy: contact.assignedTo || 'Vendedor'
  }));

export const getSalesByContact = (sales, contactoId) => sales
  .filter((sale) => sale.contactoId === contactoId)
  .slice()
  .sort((a, b) => familyTypeRank(a) - familyTypeRank(b) || b.fechaVenta.localeCompare(a.fechaVenta));

export const countSales = (sales) => sales.length;

export const upsertPrimarySale = (sales, contact, extras = {}) => {
  const existing = sales.find((sale) => sale.contactoId === contact.id && !sale.grupoFamiliar);
  if (existing) return sales;
  const newSale = {
    id: nextSaleId(sales),
    contactoId: contact.id,
    clienteNombre: contact.name,
    clienteTelefono: contact.phone,
    documento: extras.documento || '',
    productoId: extras.productId || contact.productId || '',
    cuota: Number(extras.cuota || 0),
    fechaVenta: new Date().toISOString(),
    grupoFamiliar: false,
    ventaOrigenId: '',
    relacionConTitular: '',
    observaciones: extras.observaciones || '',
    soldBy: contact.assignedTo || 'Vendedor'
  };
  return [newSale, ...sales];
};

export const removeSalesByContact = (sales, contactoId) => sales.filter((sale) => sale.contactoId !== contactoId);

export const addFamilySale = (sales, contact, payload) => {
  const primary = sales.find((sale) => sale.contactoId === contact.id && !sale.grupoFamiliar);
  if (!primary) return sales;
  const familySale = {
    id: nextSaleId(sales),
    contactoId: contact.id,
    clienteNombre: payload.nombre,
    clienteTelefono: payload.telefono,
    documento: payload.documento || '',
    productoId: payload.productoId || '',
    cuota: Number(payload.cuota || 0),
    fechaVenta: new Date().toISOString(),
    grupoFamiliar: true,
    ventaOrigenId: primary.id,
    relacionConTitular: payload.relacionConTitular,
    observaciones: payload.observaciones || '',
    soldBy: contact.assignedTo || 'Vendedor'
  };
  return [familySale, ...sales];
};
