import { ROLE_KEYS } from '../../domain/roles.js';

export const usersMock = [
  { id: 'usr-001', nombre: 'Damian Olivera', email: 'admin@rednacrem.uy', telefono: '099 111 222', rol: ROLE_KEYS.SUPERADMIN, activo: true, ultimoAcceso: '2026-03-10T09:22:00', createdAt: '2026-01-03T10:00:00' },
  { id: 'usr-002', nombre: 'Valentina Sosa', email: 'direccion@rednacrem.uy', telefono: '099 222 333', rol: ROLE_KEYS.DIRECTOR, activo: true, ultimoAcceso: '2026-03-10T08:10:00', createdAt: '2026-01-03T10:05:00' },
  { id: 'usr-003', nombre: 'Marcos Viera', email: 'supervision@rednacrem.uy', telefono: '099 333 444', rol: ROLE_KEYS.SUPERVISOR, activo: true, ultimoAcceso: '2026-03-10T09:05:00', createdAt: '2026-01-03T10:10:00' },
  { id: 'usr-004', nombre: 'Laura Techera', email: 'ventas@rednacrem.uy', telefono: '099 444 555', rol: ROLE_KEYS.VENDEDOR, activo: true, ultimoAcceso: '2026-03-10T09:18:00', createdAt: '2026-01-03T10:15:00' },
  { id: 'usr-005', nombre: 'Ignacio Silva', email: 'operaciones@rednacrem.uy', telefono: '099 555 666', rol: ROLE_KEYS.OPERACIONES, activo: true, ultimoAcceso: '2026-03-09T19:40:00', createdAt: '2026-01-03T10:20:00' },
  { id: 'usr-006', nombre: 'Ana Pardo', email: 'atencion@rednacrem.uy', telefono: '099 666 777', rol: ROLE_KEYS.ATENCION, activo: true, ultimoAcceso: '2026-03-10T09:00:00', createdAt: '2026-01-03T10:25:00' },
  { id: 'usr-007', nombre: 'Sofia Rojas', email: 'sofia.rojas@rednacrem.uy', telefono: '099 777 888', rol: ROLE_KEYS.VENDEDOR, activo: true, ultimoAcceso: '2026-03-10T08:55:00', createdAt: '2026-01-03T10:30:00' }
];
