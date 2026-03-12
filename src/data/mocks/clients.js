export const clientsMock = [
  {
    id: 'cli-001',
    nombre: 'Maria Gonzalez',
    documento: '41234567',
    telefonoPrincipal: '099 234 567',
    email: 'maria.gonzalez@mail.com',
    direccion: 'Rivera 2101, Montevideo',
    createdAt: '2025-11-10T13:15:00',
    productos: [
      { productoId: 'prd-001', fechaAlta: '2025-11-10T13:15:00', fechaBaja: null, estadoProducto: 'alta' },
      { productoId: 'prd-004', fechaAlta: '2025-09-01T10:00:00', fechaBaja: null, estadoProducto: 'alta' }
    ]
  },
  {
    id: 'cli-002',
    nombre: 'Juan Perez',
    documento: '43456789',
    telefonoPrincipal: '094 876 543',
    email: 'juan.perez@mail.com',
    direccion: '18 de Julio 1450, Canelones',
    createdAt: '2025-12-02T09:00:00',
    productos: [
      { productoId: 'prd-002', fechaAlta: '2025-12-02T09:00:00', fechaBaja: null, estadoProducto: 'alta' }
    ]
  },
  {
    id: 'cli-003',
    nombre: 'Roberto Silva',
    documento: '40123999',
    telefonoPrincipal: '095 444 333',
    email: 'roberto.silva@mail.com',
    direccion: 'Rodo 890, Montevideo',
    createdAt: '2026-01-21T17:22:00',
    productos: [
      { productoId: 'prd-002', fechaAlta: '2026-01-21T17:22:00', fechaBaja: null, estadoProducto: 'alta' }
    ]
  }
];
