export const ROLE_KEYS = {
  SUPERADMIN: 'superadministrador',
  DIRECTOR: 'director',
  SUPERVISOR: 'supervisor',
  VENDEDOR: 'vendedor',
  OPERACIONES: 'operaciones',
  ATENCION: 'atencion_cliente'
};

export const ROLE_CATALOG = [
  ROLE_KEYS.SUPERADMIN,
  ROLE_KEYS.DIRECTOR,
  ROLE_KEYS.SUPERVISOR,
  ROLE_KEYS.VENDEDOR,
  ROLE_KEYS.OPERACIONES,
  ROLE_KEYS.ATENCION
];

export const ROLE_META = {
  [ROLE_KEYS.SUPERADMIN]: { label: 'Superadministrador', description: 'Administración global del sistema', color: '#0f172a' },
  [ROLE_KEYS.DIRECTOR]: { label: 'Director', description: 'Visión ejecutiva del negocio', color: '#0f766e' },
  [ROLE_KEYS.SUPERVISOR]: { label: 'Supervisor', description: 'Gestión de equipo y lotes', color: '#2563eb' },
  [ROLE_KEYS.VENDEDOR]: { label: 'Vendedor', description: 'Agenda comercial y seguimiento', color: '#15803d' },
  [ROLE_KEYS.OPERACIONES]: { label: 'Operaciones', description: 'Servicios, proveedores y SLA', color: '#d97706' },
  [ROLE_KEYS.ATENCION]: { label: 'Atención al cliente', description: 'Mesa de ayuda y tickets', color: '#0f766e' }
};
