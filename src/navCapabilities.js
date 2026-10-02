// Menú principal (antes vivía inline en main.jsx) + el predicado de
// visibilidad -- separado a un módulo sin JSX para poder testearlo con
// node:test (el frontend no tenía ningún framework de test hasta la
// auditoría "rol backoffice", 2026-10).
//
// Cada ítem sigue decidiéndose por `roles` (igual que siempre, cero
// cambios para los 6 roles existentes) más, opcionalmente, una
// `capability`: el nombre de una capacidad de pantalla (ver
// src/lib/permissions.js del backend, "pantalla.*") que viaja en
// /me -> permissions. SOLO los 5 ítems que backoffice necesita tienen
// `capability` -- el resto de los ~30 ítems de este array no se tocó ni un
// caracter, así que no pueden regresionar por este cambio.
import {
  Activity, Upload, Phone, PhoneCall, FileText, Briefcase, UserCheck, Zap, Layers, Settings,
  Webhook, BarChart3, Ambulance, Users, Package, HeartPulse, Calendar, Headphones, Shield, Flame,
  AlertTriangle, Bell, CreditCard, Building2
} from 'lucide-react';

export const ROLE_NAV = [
  { path: 'dashboard_global', label: 'Vista general', caption: 'Control transversal', roles: ['superadministrador'], icon: Activity },
  { path: 'sa_importaciones', label: 'Importaciones', caption: 'CSV por tipo de carga', roles: ['superadministrador'], icon: Upload },
  { path: 'sa_no_llamar', label: 'Base No llamar', caption: 'Bloqueos de contacto', roles: ['superadministrador'], icon: Phone },
  { path: 'sa_resultados', label: 'Resultados telefónicos', caption: 'Historial de gestiones', roles: ['superadministrador'], icon: PhoneCall },
  { path: 'sa_datos_trabajar', label: 'Datos para trabajar', caption: 'Preparación operativa', roles: ['superadministrador'], icon: FileText },
  { path: 'sa_productos', label: 'Productos', caption: 'Catálogo comercial', roles: ['superadministrador'], icon: Briefcase },
  { path: 'sa_usuarios', label: 'Usuarios y roles', caption: 'Accesos del sistema', roles: ['superadministrador'], icon: UserCheck },
  { path: 'sa_logs_actividad', label: 'Logs y actividad', caption: 'Monitoreo e inactividad', roles: ['superadministrador'], icon: Zap },
  { path: 'sa_estado_modulos', label: 'Estado de módulos', caption: 'Visibilidad por rol', roles: ['superadministrador'], icon: Layers },
  { path: 'sa_configuracion', label: 'Configuración', caption: 'Identidad y parámetros', roles: ['superadministrador'], icon: Settings },
  { path: 'sa_conexiones', label: 'Conexiones', caption: 'Webhooks externos', roles: ['superadministrador'], icon: Webhook },
  { path: 'dashboard', label: 'Monitor', caption: 'Resumen principal', roles: ['director', 'supervisor', 'vendedor', 'operaciones'], icon: Activity },
  { path: 'panel_control', label: 'Panel de control', caption: 'Resumen del día', roles: ['director', 'supervisor'], icon: BarChart3 },
  { path: 'operaciones/monitor', label: 'Monitor', caption: 'Seguimiento operativo', roles: ['director', 'operaciones'], icon: Activity },
  { path: 'operaciones/flotas', label: 'Flotas', caption: 'Vehiculos y mantenimiento', roles: ['director', 'operaciones'], icon: Ambulance },
  { path: 'operaciones/rrhh', label: 'RRHH', caption: 'Dotación y legajos', roles: ['director', 'operaciones'], icon: Users },
  { path: 'operaciones/servicios', label: 'Servicios', caption: 'Despacho y seguimiento', roles: ['director', 'operaciones'], icon: PhoneCall },
  { path: 'operaciones/economato', label: 'Economato', caption: 'Stock y movimientos', roles: ['director', 'operaciones'], icon: Package },
  { path: 'operaciones/equipos', label: 'Equipos', caption: 'Biomédicos y revisiones', roles: ['director', 'operaciones'], icon: HeartPulse },
  { path: 'operaciones/turnos', label: 'Turnos', caption: 'Cobertura y cambios', roles: ['director', 'operaciones'], icon: Calendar },
  { path: 'contactos', label: 'Contacto', caption: 'Base comercial', roles: ['director', 'vendedor'], icon: Users },
  { path: 'soporte', label: 'Atención al cliente', caption: 'Tickets y llamadas', roles: ['atencion_cliente'], icon: Headphones, badge: 12, capability: 'pantalla.soporte' },
  { path: 'recupero', label: 'Recupero', caption: 'Cartera en baja', roles: ['vendedor', 'atencion_cliente'], icon: FileText, capability: 'pantalla.recupero_vendedor' },
  { path: 'retencion', label: 'Retención', caption: 'Contratos en riesgo de baja', roles: ['supervisor', 'vendedor'], icon: Shield, capability: 'pantalla.retencion' },
  { path: 'clientes', label: 'Clientes', caption: 'Cartera activa', roles: ['superadministrador', 'director', 'operaciones', 'supervisor'], icon: UserCheck, capability: 'pantalla.clientes' },
  { path: 'campanas_redes', label: 'Datos calientes', caption: 'Datos en tiempo real', roles: ['superadministrador', 'director', 'supervisor'], icon: Flame },
  { path: 'contratos', label: 'Recupero', caption: 'Cartera de clientes', roles: ['director', 'supervisor', 'operaciones'], icon: FileText },
  { path: 'clientes', label: 'Mis ventas', caption: 'Clientes que cerré', roles: ['vendedor'], icon: UserCheck },
  { path: 'base_general', label: 'Mercado Abierto', caption: 'Datos fríos por CSV', roles: ['supervisor'], icon: Users },
  { path: 'equipo', label: 'Mi equipo', caption: 'Vendedores', roles: ['director', 'supervisor'], icon: Users },
  { path: 'lotes', label: 'Lotes', caption: 'Asignacion comercial', roles: ['supervisor'], icon: Layers },
  { path: 'seguimiento_vendedores', label: 'Codificaciones', caption: 'Codificaciones', roles: ['supervisor'], icon: BarChart3 },
  { path: 'numeros_error', label: 'Numeros con errores', caption: 'Fuera de flujo comercial', roles: ['supervisor'], icon: AlertTriangle },
  { path: 'solicitudes_registro', label: 'Solicitudes registro', caption: 'Aprobación vendedores', roles: ['supervisor'], icon: Bell },
  { path: 'agenda', label: 'Agenda', caption: 'Compromisos del día', roles: ['vendedor'], icon: Calendar, capability: 'pantalla.agenda' },
  { path: 'pagos', label: 'Pagos', caption: 'Cobranza y convenios', roles: ['director', 'operaciones'], icon: CreditCard },
  { path: 'servicios', label: 'Servicios', caption: 'Circuito operativo', roles: ['director', 'operaciones'], icon: Briefcase, badge: 12 },
  { path: 'proveedores', label: 'Proveedores', caption: 'Red de soporte', roles: ['director', 'operaciones'], icon: Building2 },
  { path: 'reportes', label: 'Reportes', caption: 'Exportables', roles: ['director', 'supervisor'], icon: BarChart3 },
  { path: 'config', label: 'Configuración', caption: 'Parámetros del sistema', roles: ['director'], icon: Settings }
];

// Único punto que decide "¿este rol ve este ítem?" -- reemplaza los
// `item.roles.includes(role)` sueltos que había en 3 lugares de main.jsx
// (getVisibleNavItemsForRole, el chequeo de redirect al cambiar de rol, y
// quedaba sin tocar en SuperadminWorkbench). `capabilities` es el array
// `permissions` que ya devuelve /me (useAuth()/useRolEfectivo(), sin
// plumbing nuevo).
export function isNavItemVisibleForRole(item, role, capabilities = []) {
  if (item.roles.includes(role)) return true;
  if (item.capability && capabilities.includes(item.capability)) return true;
  return false;
}

// Las 4 ramas de renderRoute (main.jsx) que cambiaron para backoffice --
// extraídas a funciones puras para poder testearlas sin montar el
// componente React completo (renderRoute vive adentro de App(), con
// decenas de variables de estado en closure). Las demás ramas de
// renderRoute no se tocaron, cero riesgo de regresión ahí.
export function canRenderSoporte(role) {
  return role === 'atencion_cliente' || role === 'backoffice';
}

export function canRenderRetencion(role) {
  return role === 'supervisor' || role === 'vendedor' || role === 'backoffice';
}

export function canRenderRecuperoVendorView(role) {
  return role === 'vendedor' || role === 'atencion_cliente' || role === 'backoffice';
}

export function canRenderAgendaVendorView(role) {
  return role === 'vendedor' || role === 'backoffice';
}
