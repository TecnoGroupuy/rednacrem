
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider as OidcAuthProvider, useAuth as useOidcAuth } from 'react-oidc-context';
import { buildCognitoHostedUiLogoutUrl, cognitoAuthConfig } from './auth/cognitoConfig';
import {
  Menu, X, Bell, Search, ChevronDown, Briefcase, Users, UserCheck, Building2, Phone,
  Activity, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, AlertTriangle,
  DollarSign, Target, Download, Layers, Eye, Calendar, PhoneCall, CreditCard, FileText,
  Filter, Plus, CheckCircle2, Clock, Settings, Zap, BarChart3, Edit3, MoreHorizontal, Trash2,
  MessageSquare, Send, Headphones, Bot, User, Hash, Upload, LogOut, Coffee, Bath, PersonStanding,
  PauseCircle, XCircle,
  Info, Shield, ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart as RePieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { ROLE_META as ROLE_META_BASE } from './domain/roles.js';
import { getRoleUsersDictionary } from './services/usersService.js';
import { listProducts, listProductsAsync, createProduct, updateProduct } from './services/productsService.js';
import {
  listCommercialContacts,
  listCommercialContactsAsync,
  isCommercialContactActive,
  shouldAppearInSalesAgenda,
  shouldAppearInSalesClients,
  isErrorNumberContact,
  isContactBlockedForNoCall,
  isLotFinalizableFromContacts,
  registerCommercialManagement,
  updateCommercialContactProfile,
  bulkAssignCommercialContacts,
  assignSellerByLot,
  reactivateErrorContact,
  listDatosParaTrabajar,
  listAssignedLeadsAsync
} from './services/leadsService.js';
import {
  seedSalesFromContacts,
  getSalesByContact,
  countSales,
  upsertPrimarySale,
  addFamilySale,
  removeSalesByContact,
  listSalesBySellerAsync
} from './services/salesService.js';
import { listLots, listLotsAsync, createLot, updateLot, listSellersAsync } from './services/lotsService.js';
import {
  listTicketsAsync,
  createManualTicket,
  updateTicket,
  updateTicketStatus,
  updateServiceRequestStatus,
  addTicketNote,
  getTicketById,
  deriveTicketToOperations,
  closeTicketCase
} from './services/ticketsService.js';
import { listTicketsByClientId } from './services/ticketClientService.js';
import { listOperationsRows } from './services/operationsService.js';
import { listImports, previewCsvText, createImportFromCsv, deleteImportById, IMPORT_TYPES } from './services/importsService.js';
import { getNoCallImportJob } from './services/noCallImportService.js';
import { getImportRows } from './services/importRowsService.js';
import {
  listRecentActivity,
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  logActivityEvent
} from './services/activityService.js';
import { listPendingRegistrationRequests } from './services/supervisorApprovalsService.js';
import {
  searchPortfolioClients,
  listActiveContactProducts,
  getContactLifecycle,
  fetchContactsList,
  fetchClientsDirectory,
  fetchClientsMetrics
} from './services/clientsService.js';
import { fetchClientDetail } from './services/clientDetailService.js';
import { deleteClient } from './services/clientAdminService.js';
import { createContactWithProducts } from './services/clientCreateService.js';
import {
  getAlerts,
  getDirectorMetrics,
  getPortfolioTrend,
  getProductSplit,
  getTeamRows,
  getContactsDirectory
} from './services/dashboardService.js';
import SuperadminWorkbench from './components/SuperadminWorkbench.jsx';
import SupervisorLotWizard from './components/SupervisorLotWizard.jsx';
import ContactDetailModal from './components/ContactDetailModal.jsx';
import SupervisorContractsModule from './components/SupervisorContractsModule.jsx';
import SupervisorRegistrationRequestsModule from './components/SupervisorRegistrationRequestsModule.jsx';
import ClienteFichaForm from './components/ClienteFichaForm.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import BotonVistaRol from './components/BotonVistaRol.jsx';
import UiRoleGate from './components/UiRoleGate.jsx';
import RealRoleGate from './components/RealRoleGate.jsx';
import RequireRole from './components/guards/RequireRole.jsx';
import { AuthProvider as AppAuthProvider, useAuth } from './auth/AuthProvider.jsx';
import { getEffectiveRoleForUi, getVisibleNavItemsForRole, hasRealRole } from './auth/authorizationHelpers.js';
import { useRolEfectivo } from './hooks/useRolEfectivo.js';
import AuthGate from './components/auth/AuthGate.jsx';
import { downloadCsvFile } from './utils/importWizardHelpers.js';
import { getApiClient, getApiBaseUrl } from './services/apiClient.js';
import { io } from 'socket.io-client';
import {
  createInitialModuleStates,
  persistModuleStates,
  setModuleState,
  isModuleVisible,
  ESTADO_MODULO_OPTIONS
} from './services/moduleVisibilityService.js';

const ROLE_ICONS = {
  superadministrador: Settings,
  director: Building2,
  supervisor: Users,
  vendedor: Phone,
  operaciones: Briefcase,
  atencion_cliente: Headphones
};

const ROLE_META = Object.fromEntries(
  Object.entries(ROLE_META_BASE).map(([key, value]) => [key, { ...value, icon: ROLE_ICONS[key] || Activity }])
);

const USERS = getRoleUsersDictionary();
const SUPERADMIN_ROUTES = ['dashboard_global', 'sa_importaciones', 'sa_no_llamar', 'sa_resultados', 'sa_datos_trabajar', 'sa_productos', 'sa_usuarios', 'sa_logs_actividad', 'sa_estado_modulos', 'sa_configuracion'];

const metricIconByName = {
  Users,
  DollarSign,
  AlertTriangle,
  Target,
  TrendingDown,
  Activity
};

const mapMetricIcons = (items) => items.map((item) => ({
  ...item,
  icon: typeof item.icon === 'string' ? (metricIconByName[item.icon] || Activity) : item.icon
}));

const ALERTS = getAlerts();
const DIRECTOR_METRICS = mapMetricIcons(getDirectorMetrics());
const PORTFOLIO_TREND = getPortfolioTrend();
const PRODUCT_SPLIT = getProductSplit();
const TEAM_ROWS = getTeamRows();
const SALES_CONTACTS_SEED = listCommercialContacts();
const SUPERVISOR_LOTS_SEED = listLots();

const ROLE_NAV = [
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
      { path: 'dashboard', label: 'Dashboard', caption: 'Resumen principal', roles: ['director', 'supervisor', 'vendedor', 'operaciones'], icon: Activity },
      { path: 'contactos', label: 'Mercado Abierto', caption: 'Base comercial', roles: ['director', 'vendedor'], icon: Users },
      { path: 'recupero', label: 'Recupero', caption: 'Cartera en baja', roles: ['vendedor'], icon: FileText },
      { path: 'clientes', label: 'Clientes', caption: 'Cartera activa', roles: ['superadministrador', 'director', 'operaciones'], icon: UserCheck },
      { path: 'clientes', label: 'Mis ventas', caption: 'Clientes que cerré', roles: ['vendedor'], icon: UserCheck },
      { path: 'base_general', label: 'Base general', caption: 'Carga y preparacion', roles: ['supervisor'], icon: Users },
      { path: 'lotes', label: 'Lotes', caption: 'Asignacion comercial', roles: ['supervisor'], icon: Layers },
      { path: 'numeros_error', label: 'Numeros con errores', caption: 'Fuera de flujo comercial', roles: ['supervisor'], icon: AlertTriangle },
      { path: 'seguimiento_vendedores', label: 'Codificaciones', caption: 'Codificaciones', roles: ['supervisor'], icon: BarChart3 },
      { path: 'solicitudes_registro', label: 'Solicitudes registro', caption: 'Aprobación vendedores', roles: ['supervisor'], icon: Bell },
      { path: 'agenda', label: 'Agenda', caption: 'Compromisos del día', roles: ['vendedor'], icon: Calendar },
      { path: 'soporte', label: 'Atención al cliente', caption: 'Tickets y llamadas', roles: ['atencion_cliente'], icon: Headphones, badge: 12 },
      { path: 'contratos', label: 'Recupero', caption: 'Cartera de clientes', roles: ['director', 'supervisor', 'operaciones'], icon: FileText },
      { path: 'pagos', label: 'Pagos', caption: 'Cobranza y convenios', roles: ['director', 'operaciones'], icon: CreditCard },
      { path: 'servicios', label: 'Servicios', caption: 'Circuito operativo', roles: ['director', 'operaciones'], icon: Briefcase, badge: 12 },
      { path: 'proveedores', label: 'Proveedores', caption: 'Red de soporte', roles: ['director', 'operaciones'], icon: Building2 },
      { path: 'equipo', label: 'Equipo de venta', caption: 'Rendimiento comercial', roles: ['director', 'supervisor'], icon: Layers },
      { path: 'reportes', label: 'Reportes', caption: 'Exportables', roles: ['director', 'supervisor'], icon: BarChart3 },
      { path: 'config', label: 'Configuración', caption: 'Parámetros del sistema', roles: ['director'], icon: Settings }
    ];

const statusVariant = (label) => {
  if (['Al día', 'Al dia', 'Gestionado', 'Finalizado', 'Excelente'].includes(label)) return 'success';
  if (['Pendiente', 'En gestión', 'En gestion', 'Control', 'Atención', 'Atencion'].includes(label)) return 'warning';
  return 'info';
};

const formatTeamSinceDateLabel = (value) => {
  if (!value) return 'Sin registro';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin registro';
  return parsed.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatShortDate = (value) => {
  if (!value) return 'Sin registro';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin registro';
  return parsed.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

const formatCurrency = (value) => {
  const numeric = typeof value === 'number' ? value : Number(String(value || '').replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(numeric)) return value ? String(value) : '$ 0';
  return `$ ${numeric.toLocaleString('es-UY')}`;
};

const DEFAULT_CLIENT_METRICS = {
  activos: 11203,
  enBaja: 28,
  cuotaPromedio: 4250,
  cuotaPromedioLabel: '$ 4.250'
};

const buildClientMetricCards = (metrics = DEFAULT_CLIENT_METRICS) => ([
  { title: 'Activos', value: metrics.activos, change: 2.8, label: 'base viva', trend: 'up', icon: UserCheck, bg: 'rgba(21,128,61,0.12)', color: '#15803d' },
  { title: 'En baja', value: metrics.enBaja, change: -12.2, label: 'contención', trend: 'up', icon: TrendingDown, bg: 'rgba(190,18,60,0.12)', color: '#be123c' },
  { title: 'Cuota promedio', value: metrics.cuotaPromedioLabel || `$ ${Number(metrics.cuotaPromedio || 0).toLocaleString('es-UY')}`, change: 1.4, label: 'ticket medio', trend: 'up', icon: DollarSign, bg: 'rgba(217,119,6,0.12)', color: '#d97706' }
]);
    const normalizePaymentMethod = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      const normalized = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (['debito', 'debit'].includes(normalized)) return 'debito';
      if (['credito', 'credit'].includes(normalized)) return 'credito';
      if (['efectivo', 'cash'].includes(normalized)) return 'efectivo';
      if (['transferencia', 'transfer', 'transferencia bancaria'].includes(normalized)) return 'transferencia';
      if (['mi dinero', 'mi_dinero', 'midinero'].includes(normalized)) return 'mi_dinero';
      if (['ajupen'].includes(normalized)) return 'ajupen';
      if (['ajupen anp', 'ajupen_anp'].includes(normalized)) return 'ajupen_anp';
      if (['visa'].includes(normalized)) return 'visa';
      if (['pass card', 'pass_card', 'passcard'].includes(normalized)) return 'pass_card';
      if (['mastercard', 'master card'].includes(normalized)) return 'mastercard';
      if (['creditel'].includes(normalized)) return 'creditel';
      if (['cabal'].includes(normalized)) return 'cabal';
      if (['oca'].includes(normalized)) return 'oca';
      if (['antel'].includes(normalized)) return 'antel';
      if (['abitab'].includes(normalized)) return 'abitab';
      if (['master'].includes(normalized)) return 'master';
      if (['anjuped', 'anjuped'].includes(normalized)) return 'anjuped';
      if (['mercado pago', 'mercado_pago', 'mercadopago'].includes(normalized)) return 'mercado_pago';
      return normalized.replace(/\s/g, '_');
    };
    const paymentMethodLabel = (value) => {
      const normalized = normalizePaymentMethod(value);
      if (!normalized) return '';
      const labels = {
        debito: 'Débito',
        credito: 'Crédito',
        efectivo: 'Efectivo',
        transferencia: 'Transferencia',
        mi_dinero: 'Mi dinero',
        ajupen: 'AJUPEN',
        ajupen_anp: 'AJUPEN ANP',
        visa: 'VISA',
        pass_card: 'PASS CARD',
        mastercard: 'MASTERCARD',
        creditel: 'Creditel',
        cabal: 'Cabal',
        oca: 'OCA',
        antel: 'ANTEL',
        abitab: 'ABITAB',
        master: 'MASTER',
        anjuped: 'ANJUPED',
        mercado_pago: 'Mercado Pago'
      };
      return labels[normalized] || normalized;
    };
    const formatDateShort = (value) => {
      if (!value) return '';
      const text = String(value).trim();
      if (!text) return '';
      const parsed = new Date(text);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' });
      }
      const iso = text.includes('T') ? text.split('T')[0] : text;
      const parts = iso.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        if (year && month && day) return `${Number(day)}/${Number(month)}/${year}`;
      }
      return text;
    };
    const formatDateTimeShort = (value) => {
      if (!value) return '';
      const text = String(value).trim();
      if (!text) return '';
      const parsed = new Date(text);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleString('es-UY', {
          timeZone: 'America/Montevideo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return text;
    };
    const initials = (name) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    const pickCellular = (contact) => (contact?.celular || contact?.cellphone || contact?.telefono_celular || contact?.telefonoCelular || '');
    const pickDireccion = (contact) => (
      contact?.direccion
      || contact?.domicilio
      || contact?.direccion_completa
      || contact?.direccionCompleta
      || contact?.address
      || contact?.calle
      || contact?.street
      || contact?.ubicacion?.direccion
      || contact?.ubicacion?.direccion_completa
      || ''
    );
    const toStatusColor = (hex, alpha = 1) => {
      const clean = String(hex || '').replace('#', '');
      if (clean.length !== 6) return 'rgba(15, 23, 42, 0.4)';
      const r = Number.parseInt(clean.slice(0, 2), 16);
      const g = Number.parseInt(clean.slice(2, 4), 16);
      const b = Number.parseInt(clean.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    const PauseCircleSafe = typeof PauseCircle !== 'undefined' ? PauseCircle : Clock;

    const ESTADOS_USUARIO = {
      disponible: {
        id: 'disponible',
        label: 'Disponible',
        icon: CheckCircle2,
        color: '#22c55e',
        bloqueaPantalla: false,
        mensaje: 'Listo para atender gestiones'
      },
      inactivo: {
        id: 'inactivo',
        label: 'Inactivo',
        icon: PauseCircleSafe,
        color: '#94a3b8',
        bloqueaPantalla: false,
        mensaje: 'Sesión inactiva'
      },
      desconectado: {
        id: 'desconectado',
        label: 'Desconectado',
        icon: XCircle,
        color: '#94a3b8',
        bloqueaPantalla: false,
        mensaje: 'Sin actividad registrada'
      },
      bano: {
        id: 'bano',
        label: 'Baño',
        icon: Bath,
        color: '#f59e0b',
        bloqueaPantalla: true,
        mensaje: 'Tiempo de descanso personal'
      },
      descanso: {
        id: 'descanso',
        label: 'Descanso',
        icon: Coffee,
        color: '#f97316',
        bloqueaPantalla: true,
        mensaje: 'Momento de descanso'
      },
      supervisor: {
        id: 'supervisor',
        label: 'Con supervisor',
        icon: PersonStanding,
        color: '#a855f7',
        bloqueaPantalla: true,
        mensaje: 'Reunión con supervisor'
      }
    };

    const resolveEstadoUsuario = (estadoId) => ESTADOS_USUARIO[estadoId] || ESTADOS_USUARIO.disponible;

    function UserProfileMenu({ user, roleLabel, estadoActual, onEstadoChange, onLogout, onOpenProfile, notificationUserId, onNotificationsNavigate, userRole }) {
      const [menuOpen, setMenuOpen] = React.useState(false);
      const [unreadNotifications, setUnreadNotifications] = React.useState(0);
      const menuRef = React.useRef(null);
      const status = resolveEstadoUsuario(estadoActual);
      const StatusIcon = status.icon;

      React.useEffect(() => {
        const syncUnread = () => {
          setUnreadNotifications(listNotifications({ userId: notificationUserId, limit: 15 }).length);
        };
        syncUnread();
        const timer = window.setInterval(syncUnread, 15000);
        return () => window.clearInterval(timer);
      }, [notificationUserId]);

      React.useEffect(() => {
        const onClickOutside = (event) => {
          if (menuRef.current && !menuRef.current.contains(event.target)) {
            setMenuOpen(false);
          }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
      }, []);

      const onSelectStatus = (nextStatusId) => {
        onEstadoChange(nextStatusId);
        setMenuOpen(false);
      };

      return (
        <div className="user-menu" ref={menuRef}>
          <button className={'user-card user-card-button ' + (unreadNotifications > 0 ? 'has-alert' : '')} onClick={() => setMenuOpen((prev) => !prev)}>
            <div style={{ position: 'relative' }}>
              <div className="avatar">{initials(user.name)}</div>
              <span
                style={{
                  position: 'absolute',
                  right: -1,
                  bottom: -1,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: '2px solid #13253d',
                  background: status.color
                }}
              ></span>
            </div>
            <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.78rem', marginTop: 1 }}>{roleLabel}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 3, color: toStatusColor(status.color, 0.95), fontSize: '0.8rem', fontWeight: 600 }}>
                <StatusIcon size={14} />
                {status.label}
              </div>
            </div>
            <ChevronDown size={16} color="rgba(255,255,255,0.65)" style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }} />
          </button>

          {menuOpen ? (
            <div className="user-menu-popup">
              <div className="user-menu-section-title">Mi cuenta</div>
              <div className="user-menu-actions">
                <button className="user-menu-item" onClick={() => { setMenuOpen(false); onOpenProfile(); }}><User size={16} />Mi perfil</button>
                <NotificationsDropdown
                  userId={notificationUserId}
                  onNavigate={(targetRoute) => {
                    setMenuOpen(false);
                    onNotificationsNavigate(targetRoute);
                  }}
                  variant="menu"
                  menuLabel="Notificaciones"
                  onUnreadCountChange={setUnreadNotifications}
                  userRole={userRole}
                />
              </div>
              <div className="user-menu-separator"></div>
              <div className="user-menu-section-title">Cambiar estado</div>
              <div className="user-menu-actions" style={{ paddingTop: 2 }}>
                {Object.values(ESTADOS_USUARIO)
                  .filter((item) => item.id !== 'inactivo' && item.id !== 'desconectado')
                  .map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = status.id === item.id;
                  return (
                    <button
                      key={item.id}
                      className="user-menu-item"
                      onClick={() => onSelectStatus(item.id)}
                      style={isActive ? { background: toStatusColor(item.color, 0.14), color: toStatusColor(item.color, 1), border: '1px solid ' + toStatusColor(item.color, 0.38) } : null}
                    >
                      <ItemIcon size={16} color={isActive ? toStatusColor(item.color, 1) : 'rgba(255,255,255,0.58)'} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                      {isActive ? <CheckCircle2 size={15} color={toStatusColor(item.color, 1)} /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="user-menu-separator"></div>
              <div className="user-menu-actions">
                <button className="user-menu-item danger" onClick={onLogout}><LogOut size={16} />Cerrar sesión</button>
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    function PauseOverlay({ status, startedAt, onResume }) {
      const [seconds, setSeconds] = React.useState(0);
      const StatusIcon = status.icon;

      React.useEffect(() => {
        if (!startedAt) return;
        const tick = () => {
          const diff = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
          setSeconds(diff);
        };
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
      }, [startedAt]);

      const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
      const secs = String(seconds % 60).padStart(2, '0');
      const startedLabel = startedAt
        ? new Date(startedAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
        : '--:--';

      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'grid', placeItems: 'center', background: 'rgba(2, 6, 23, 0.86)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ width: 'min(480px, 100%)', borderRadius: 26, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(15,23,42,0.95)', boxShadow: '0 24px 50px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
            <div style={{ padding: '26px 20px', textAlign: 'center', background: toStatusColor(status.color, 0.12), borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: 76, height: 76, margin: '0 auto 12px', borderRadius: 20, background: status.color, display: 'grid', placeItems: 'center' }}>
                <StatusIcon size={34} color="#ffffff" />
              </div>
              <div style={{ fontFamily: 'inherit', fontSize: '1.7rem', fontWeight: 800, color: toStatusColor(status.color, 1) }}>{status.label}</div>
              <div style={{ color: 'rgba(226,232,240,0.78)', marginTop: 4 }}>{status.mensaje}</div>
            </div>
            <div style={{ padding: 22, textAlign: 'center' }}>
              <div style={{ color: 'rgba(148,163,184,0.95)', fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Tiempo transcurrido</div>
              <div style={{ fontFamily: 'inherit', fontSize: '3.1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.03em' }}>{minutes}:{secs}</div>
              <div style={{ marginTop: 12, borderRadius: 14, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(2,6,23,0.5)', padding: '10px 12px', color: 'rgba(203,213,225,0.86)' }}>
                Iniciado a las {startedLabel}
              </div>
              <button
                className="button primary"
                style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  console.log('[DEBUG BOTON] click en Volver al trabajo', new Date().toISOString());
                  onResume();
                }}
              >
                Volver al trabajo
              </button>
              <div style={{ marginTop: 10, color: 'rgba(148,163,184,0.78)', fontSize: '0.8rem' }}>Presiona el botón cuando estés listo para continuar</div>
            </div>
          </div>
        </div>
      );
    }

    const notificationTypeMeta = {
      info: {
        icon: Bell,
        color: '#2563eb',
        background: 'rgba(37,99,235,0.12)'
      },
      success: {
        icon: CheckCircle2,
        color: '#15803d',
        background: 'rgba(21,128,61,0.12)'
      },
      warning: {
        icon: AlertTriangle,
        color: '#d97706',
        background: 'rgba(217,119,6,0.14)'
      },
      error: {
        icon: AlertTriangle,
        color: '#be123c',
        background: 'rgba(190,18,60,0.14)'
      }
    };
    const AGENDA_NOTIFICATION_PREFIX = 'AGENDA::';

    const formatNotificationTime = (timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) return 'Ahora';
      if (diffMinutes < 60) return 'Hace ' + diffMinutes + ' min';
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return 'Hace ' + diffHours + ' h';
      return date.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    function NotificationsDropdown({ userId, onNavigate, variant = 'topbar', menuLabel = 'Notificaciones', onUnreadCountChange, userRole = null }) {
      const [open, setOpen] = React.useState(false);
      const [items, setItems] = React.useState(() => listNotifications({ userId, limit: 15 }));
      const [vendorAlertCount, setVendorAlertCount] = React.useState(0);
      const panelRef = React.useRef(null);
      const triggerRef = React.useRef(null);

      const refreshNotifications = React.useCallback(() => {
        setItems(listNotifications({ userId, limit: 15 }));
      }, [userId]);
      const parseAgendaNotification = (notification) => {
        const rawDescription = String(notification?.description || '');
        if (!rawDescription.startsWith(AGENDA_NOTIFICATION_PREFIX)) return null;
        const parts = rawDescription.split('::');
        const contactId = parts[1] || null;
        const message = parts.slice(2).join('::') || '';
        return { contactId, message };
      };

      React.useEffect(() => {
        refreshNotifications();
      }, [refreshNotifications]);

      React.useEffect(() => {
        let canceled = false;
        if (userRole === 'supervisor') {
          (async () => {
            try {
              const rows = await listPendingRegistrationRequests();
              if (!canceled) {
                setVendorAlertCount(rows.length);
              }
            } catch {
              if (!canceled) setVendorAlertCount(0);
            }
          })();
        } else {
          setVendorAlertCount(0);
        }
        return () => { canceled = true; };
      }, [userRole]);

      React.useEffect(() => {
        const intervalId = window.setInterval(refreshNotifications, 15000);
        return () => window.clearInterval(intervalId);
      }, [refreshNotifications]);

      React.useEffect(() => {
        if (!open) return;
        const onClickOutside = (event) => {
          const clickedPanel = panelRef.current && panelRef.current.contains(event.target);
          const clickedTrigger = triggerRef.current && triggerRef.current.contains(event.target);
          if (!clickedPanel && !clickedTrigger) setOpen(false);
        };
        const onEscape = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        document.addEventListener('keydown', onEscape);
        return () => {
          document.removeEventListener('mousedown', onClickOutside);
          document.removeEventListener('keydown', onEscape);
        };
      }, [open]);

      const unreadCount = getUnreadCount({ userId, limit: 15 });
      const badgeCount = unreadCount + (vendorAlertCount > 0 ? 1 : 0);
      const displayCount = badgeCount > 0 ? badgeCount : items.length;

      React.useEffect(() => {
        if (typeof onUnreadCountChange === 'function') {
          onUnreadCountChange(displayCount);
        }
      }, [displayCount, onUnreadCountChange]);

      const handleMarkAllRead = () => {
        markAllAsRead({ userId, limit: 15 });
        refreshNotifications();
      };

      const handleNotificationClick = (notification) => {
        if (!notification.read) {
          markAsRead({ userId, notificationId: notification.id });
        }
        refreshNotifications();
        const agendaData = parseAgendaNotification(notification);
        if (agendaData?.contactId) {
          onNavigate({ route: 'contactos', contactId: agendaData.contactId });
          setOpen(false);
          return;
        }
        if (notification.link) {
          onNavigate(notification.link);
          setOpen(false);
        }
      };

      return (
        <div className={'notifications-wrap ' + (variant === 'menu' ? 'menu-mode' : 'topbar-mode')}>
          {variant === 'menu' ? (
            <button
              ref={triggerRef}
              className="user-menu-item"
              title="Notificaciones"
              onClick={() => setOpen((prev) => !prev)}
            >
              <Bell size={16} />
              <span style={{ flex: 1, textAlign: 'left' }}>{menuLabel}</span>
              <span className="menu-notification-count">{displayCount > 99 ? '99+' : displayCount}</span>
            </button>
          ) : (
          <button
              ref={triggerRef}
              className="icon-button"
              title="Notificaciones"
              onClick={() => setOpen((prev) => !prev)}
            >
              <Bell size={20} color="#152235" />
              {badgeCount > 0 ? <span className="notification-dot">{badgeCount > 99 ? '99+' : badgeCount}</span> : null}
            </button>
          )}

          {open ? (
            variant === 'menu' ? (
              <div className="notifications-modal-overlay">
                <div ref={panelRef} className="notifications-panel modal-centered">
                  <div className="notifications-header">
                    <h4>Notificaciones</h4>
                    <button className="notifications-mark-all" onClick={handleMarkAllRead} disabled={items.length === 0}>
                      Marcar todo leído
                    </button>
                  </div>
              <div className="notifications-list">
                {vendorAlertCount > 0 ? (
                  <button
                    className="notification-item vendor-alert"
                    onClick={() => {
                      onNavigate('solicitudes_registro');
                      setOpen(false);
                    }}
                  >
                    <div className="notification-leading" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      <Bell size={15} />
                    </div>
                    <div className="notification-body">
                      <div className="notification-title-row">
                        <span className="notification-title">Solicitudes de registro</span>
                        <span className="notification-time">{vendorAlertCount} pendientes</span>
                      </div>
                      <p className="notification-description">Hay {vendorAlertCount} solicitud(es) de vendedores para aprobar.</p>
                    </div>
                  </button>
                ) : null}
                {items.length === 0 ? (
                  <div className="notifications-empty">Sin notificaciones recientes.</div>
                ) : (
                      items.map((notification) => {
                        const typeMeta = notificationTypeMeta[notification.type] || notificationTypeMeta.info;
                        const TypeIcon = typeMeta.icon;
                        const agendaData = parseAgendaNotification(notification);
                        const description = agendaData?.message || notification.description;
                        return (
                          <button
                            key={notification.id}
                            className={'notification-item ' + (notification.read ? 'is-read' : 'is-unread')}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="notification-leading" style={{ background: typeMeta.background, color: typeMeta.color }}>
                              <TypeIcon size={15} />
                            </div>
                            <div className="notification-body">
                              <div className="notification-title-row">
                                <span className="notification-title">{notification.title}</span>
                                <span className="notification-time">{formatNotificationTime(notification.timestamp)}</span>
                              </div>
                              <p className="notification-description">{description}</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="notifications-footer modal-footer">
                    <button className="notifications-view-all" onClick={() => setOpen(false)}>
                      Volver
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div ref={panelRef} className="notifications-panel topbar-anchored">
                <div className="notifications-header">
                  <h4>Notificaciones</h4>
                  <button className="notifications-mark-all" onClick={handleMarkAllRead} disabled={items.length === 0}>
                    Marcar todo leído
                  </button>
                </div>
              <div className="notifications-list">
                {vendorAlertCount > 0 ? (
                  <button
                    className="notification-item vendor-alert"
                    onClick={() => {
                      onNavigate('solicitudes_registro');
                      setOpen(false);
                    }}
                  >
                    <div className="notification-leading" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      <Bell size={15} />
                    </div>
                    <div className="notification-body">
                      <div className="notification-title-row">
                        <span className="notification-title">Solicitudes de registro</span>
                        <span className="notification-time">{vendorAlertCount} pendientes</span>
                      </div>
                      <p className="notification-description">Hay {vendorAlertCount} solicitud(es) de vendedores para aprobar.</p>
                    </div>
                  </button>
                ) : null}
                {items.length === 0 ? (
                  <div className="notifications-empty">Sin notificaciones recientes.</div>
                ) : (
                    items.map((notification) => {
                      const typeMeta = notificationTypeMeta[notification.type] || notificationTypeMeta.info;
                      const TypeIcon = typeMeta.icon;
                      const agendaData = parseAgendaNotification(notification);
                      const description = agendaData?.message || notification.description;
                      return (
                        <button
                          key={notification.id}
                          className={'notification-item ' + (notification.read ? 'is-read' : 'is-unread')}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="notification-leading" style={{ background: typeMeta.background, color: typeMeta.color }}>
                            <TypeIcon size={15} />
                          </div>
                          <div className="notification-body">
                            <div className="notification-title-row">
                              <span className="notification-title">{notification.title}</span>
                              <span className="notification-time">{formatNotificationTime(notification.timestamp)}</span>
                            </div>
                            <p className="notification-description">{description}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="notifications-footer">
                  <button
                    className="notifications-view-all"
                    onClick={() => {
                      onNavigate('sa_logs_actividad');
                      setOpen(false);
                    }}
                  >
                    Ver todas
                  </button>
                </div>
              </div>
            )
          ) : null}
        </div>
      );
    }

    function Button({ children, icon, variant = 'primary', className = '', onClick, type = 'button', disabled = false }) {
      return <button type={type} onClick={onClick} disabled={disabled} className={'button ' + variant + ' ' + className}>{icon}{children}</button>;
    }

    function Tag({ children, variant = 'info' }) {
      return <span className={'tag ' + variant}>{children}</span>;
    }

    function MetricCard({ item }) {
      const IconComp = item.icon;
      const trendClass = item.trend === 'down' && item.change > 0 ? 'down' : 'up';
      return (
        <div className="metric-card">
          <div className="metric-top">
            <div>
              <div className="metric-label">{item.title}</div>
              <h3 className="metric-value">{item.value}</h3>
              <div className={'trend ' + trendClass}>
                {trendClass === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                <span>{item.change > 0 ? '+' : ''}{item.change}%</span>
                <span style={{ fontWeight: 500, opacity: 0.7 }}>{item.label}</span>
              </div>
            </div>
            <div className="metric-icon" style={{ background: item.bg }}><IconComp size={24} color={item.color} /></div>
          </div>
        </div>
      );
    }

    function Panel({ title, subtitle, action, children, className = '' }) {
      return (
        <section className={'panel ' + className}>
          {(title || subtitle || action) && <div className="panel-header"><div>{title ? <h3 className="panel-title">{title}</h3> : null}{subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}</div>{action}</div>}
          {children}
        </section>
      );
    }

    function AlertsPanel({ alerts }) {
      return (
        <Panel title="Alertas estratégicas" subtitle="Señales que requieren acción ejecutiva" action={<Tag variant="danger">{alerts.length} activas</Tag>}>
          <div className="alert-list">
            {alerts.map((alert) => (
              <div key={alert.id} className={'alert ' + alert.type}>
                <div className="nav-icon" style={{ background: alert.type === 'critical' ? 'rgba(190,18,60,0.12)' : alert.type === 'warning' ? 'rgba(217,119,6,0.12)' : 'rgba(37,99,235,0.1)' }}>
                  {alert.type === 'critical' ? <AlertTriangle size={18} color="#be123c" /> : alert.type === 'warning' ? <Clock size={18} color="#d97706" /> : <CheckCircle2 size={18} color="#2563eb" />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{alert.title}</div>
                  <div style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{alert.detail}</div>
                  <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>{alert.time} · {alert.module}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      );
    }

    function DirectorDashboard() {
      return (
        <div className="view">
          <section className="hero">
            <div className="hero-panel">
              <Tag variant="success">Salud de cartera en recuperación</Tag>
              <h1 className="hero-title">Dirección con foco en crecimiento, retención y ejecución.</h1>
              <p className="hero-copy">La cartera mantiene aceleración positiva, con más altas netas, menor desgaste y una caída sostenida en morosidad. La prioridad del día es sostener cobranzas y resolver cuellos operativos.</p>
              <div className="hero-kpis">
                <div className="hero-kpi"><div className="hero-kpi-label">Altas netas del mes</div><div className="hero-kpi-value">+293</div></div>
                <div className="hero-kpi"><div className="hero-kpi-label">Conversión comercial</div><div className="hero-kpi-value">29,4%</div></div>
                <div className="hero-kpi"><div className="hero-kpi-label">SLA operativo</div><div className="hero-kpi-value">93,2%</div></div>
              </div>
              <div className="hero-grid"></div>
            </div>
            <div className="hero-side">
              <Panel title="Pulso del negocio" subtitle="Semáforos de dirección">
                <div className="status-stack">
                  <div className="status-item"><div className="status-ring" style={{ background: 'rgba(15,118,110,0.12)', color: '#0f766e' }}>A</div><div><div style={{ fontWeight: 700 }}>Adquisición</div><div style={{ color: 'var(--muted)' }}>Ritmo superior al objetivo semanal</div></div></div>
                  <div className="status-item"><div className="status-ring" style={{ background: 'rgba(217,119,6,0.12)', color: '#d97706' }}>C</div><div><div style={{ fontWeight: 700 }}>Cobranza</div><div style={{ color: 'var(--muted)' }}>Requiere refuerzo en tramos medios</div></div></div>
                  <div className="status-item"><div className="status-ring" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>O</div><div><div style={{ fontWeight: 700 }}>Operaciones</div><div style={{ color: 'var(--muted)' }}>SLA estable, con una incidencia crítica abierta</div></div></div>
                </div>
              </Panel>
              <Panel title="Acciones rápidas" subtitle="Atajos del comité ejecutivo">
                <div className="toolbar">
                  <Button variant="secondary" icon={<Download size={18} />}>Exportar comité</Button>
                  <Button variant="ghost" icon={<AlertTriangle size={18} />}>Ver riesgos</Button>
                  <Button icon={<Activity size={18} />}>Actualizar corte</Button>
                </div>
              </Panel>
            </div>
          </section>
          <section className="metrics-grid">{DIRECTOR_METRICS.map((item) => <MetricCard key={item.title} item={item} />)}</section>
          <section className="content-grid">
            <Panel className="span-8" title="Evolución de cartera" subtitle="Crecimiento y morosidad de los últimos seis cortes" action={<Tag variant="success">Tendencia positiva</Tag>}>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={PORTFOLIO_TREND}>
                    <CartesianGrid stroke="rgba(20,34,53,0.08)" vertical={false} />
                    <XAxis dataKey="month" stroke="#69788d" />
                    <YAxis yAxisId="left" stroke="#69788d" />
                    <YAxis yAxisId="right" orientation="right" stroke="#69788d" />
                    <Tooltip contentStyle={{ borderRadius: 18, border: '1px solid rgba(20,34,53,0.08)' }} />
                    <Line yAxisId="left" type="monotone" dataKey="cartera" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="morosidad" stroke="#be123c" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel className="span-4" title="Mix de productos" subtitle="Distribución actual de cartera">
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <RePieChart>
                    <Pie data={PRODUCT_SPLIT} innerRadius={72} outerRadius={106} dataKey="value" paddingAngle={4}>
                      {PRODUCT_SPLIT.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 18, border: '1px solid rgba(20,34,53,0.08)' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="list">{PRODUCT_SPLIT.map((item) => <div key={item.name} className="mini-stat"><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: item.color, display: 'inline-block' }}></span><span>{item.name}</span></div><strong>{item.value}%</strong></div>)}</div>
            </Panel>
          </section>
          <section className="content-grid">
            <Panel className="span-7" title="Altas vs. bajas" subtitle="Flujo comercial del último semestre">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={PORTFOLIO_TREND}>
                    <CartesianGrid stroke="rgba(20,34,53,0.08)" vertical={false} />
                    <XAxis dataKey="month" stroke="#69788d" />
                    <YAxis stroke="#69788d" />
                    <Tooltip contentStyle={{ borderRadius: 18, border: '1px solid rgba(20,34,53,0.08)' }} />
                    <Bar dataKey="altas" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="bajas" fill="#d97706" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel className="span-5" title="Mapa de alertas" subtitle="Frentes con mayor presión hoy">
              <div className="mini-stats">
                <div className="mini-stat"><div><div style={{ fontWeight: 700 }}>Montevideo</div><div style={{ color: 'var(--muted)' }}>Morosidad + reclamos</div></div><Tag variant="danger">Crítico</Tag></div>
                <div className="mini-stat"><div><div style={{ fontWeight: 700 }}>Canelones</div><div style={{ color: 'var(--muted)' }}>Buen desempeño comercial</div></div><Tag variant="success">Oportunidad</Tag></div>
                <div className="mini-stat"><div><div style={{ fontWeight: 700 }}>Litoral</div><div style={{ color: 'var(--muted)' }}>Baja cobertura de seguimiento</div></div><Tag variant="warning">Revisar</Tag></div>
                <div className="mini-stat"><div><div style={{ fontWeight: 700 }}>Interior Este</div><div style={{ color: 'var(--muted)' }}>Operación dentro de SLA</div></div><Tag variant="info">Estable</Tag></div>
              </div>
            </Panel>
          </section>
          <section className="content-grid">
            <Panel className="span-7" title="Rendimiento por supervisor" subtitle="Comparativo consolidado">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Supervisor</th><th>Ventas</th><th>Conversión</th><th>Salud</th></tr></thead>
                  <tbody>{TEAM_ROWS.map((row) => <tr key={row.name}><td><div className="person"><div className="person-badge">{initials(row.name)}</div><div><div style={{ fontWeight: 700 }}>{row.name}</div><div style={{ color: 'var(--muted)', fontSize: '0.86rem' }}>Zona comercial</div></div></div></td><td>{row.sales}</td><td>{row.conversion}</td><td><Tag variant={row.badge}>{row.health}</Tag></td></tr>)}</tbody>
                </table>
              </div>
            </Panel>
            <div className="span-5"><AlertsPanel alerts={ALERTS} /></div>
          </section>
        </div>
      );
    }

    function SupervisorDashboard() {
      const { user: authUser } = useAuth();
      const [detailAgent, setDetailAgent] = React.useState(null);
      const [detailTab, setDetailTab] = React.useState('actividad');
      const [selectedDate, setSelectedDate] = React.useState(() => new Date());
      const [activityExpanded, setActivityExpanded] = React.useState(false);
      const [teamSummary, setTeamSummary] = React.useState(null);
      const [teamLoading, setTeamLoading] = React.useState(false);
      const [teamError, setTeamError] = React.useState('');
      const [marketWidget, setMarketWidget] = React.useState({ status: 'idle', data: [], error: '', requestId: '' });
      const [recuperoWidget, setRecuperoWidget] = React.useState({ status: 'idle', data: [], error: '', requestId: '' });
      const marketRequestIdRef = React.useRef('');
      const recuperoRequestIdRef = React.useRef('');
      const [detailLoading, setDetailLoading] = React.useState(false);
      const [detailError, setDetailError] = React.useState('');
      const [teamConfig, setTeamConfig] = React.useState(null);
      const [detailData, setDetailData] = React.useState(null);
      const [detailWeek, setDetailWeek] = React.useState(null);
      const formatDateLabel = React.useCallback((value) => {
        try {
          return value.toLocaleDateString('es-UY', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
          return '';
        }
      }, []);
      const formatDateYmd = React.useCallback((value) => {
        if (!value) return '';
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }, []);
      const parsePercent = React.useCallback((value) => {
        if (value === null || value === undefined) return 0;
        const numeric = Number(String(value).replace('%', '').trim());
        if (Number.isNaN(numeric)) return 0;
        return numeric <= 1 ? Math.round(numeric * 100) : numeric;
      }, []);
      const toMinutes = React.useCallback((value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        const raw = String(value);
        const match = /(\d+)\s*h\s*(\d+)?/i.exec(raw);
        if (match) {
          const hours = Number(match[1] || 0);
          const mins = Number(match[2] || 0);
          return hours * 60 + mins;
        }
        const minsMatch = /(\d+)\s*m/i.exec(raw);
        if (minsMatch) return Number(minsMatch[1] || 0);
        const numeric = Number(raw);
        return Number.isNaN(numeric) ? 0 : numeric;
      }, []);
      const makeRequestId = React.useCallback((prefix) => (
        `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      ), []);
      const normalizeWidgetResponse = React.useCallback((response) => {
        const payload = response || {};
        const status = response?.status || response?.data?.status || '';
        const items = response?.data?.items || response?.items || [];
        const message = response?.message || response?.error || response?.data?.message || '';
        return { status, items, message, payload };
      }, []);
      const buildAgentRow = React.useCallback((item) => {
        const pausesMinutes = toMinutes(
          item?.pausesMinutes ??
          item?.pausasMinutos ??
          item?.pausas_minutos ??
          item?.tiempo_total_pausas_minutos ??
          item?.pauses?.minutes ??
          0
        );
        const pausesCount = Number(
          item?.pausesCount ??
          item?.pausasCantidad ??
          item?.cantidad_pausas ??
          item?.pauses?.count ??
          0
        );
        const conversion = parsePercent(
          item?.conversion ??
          item?.conversionRate ??
          item?.conversion_percent ??
          item?.conversionPercent ??
          0
        );
        const status = item?.status || item?.estado || item?.statusLabel || 'Activo';
        const name = item?.name || item?.nombre || item?.agent_name || '—';
        const login = item?.login || item?.login_at || item?.ingreso || item?.login_time || '—';
        const totalCalls = Number(item?.calls ?? item?.llamadas ?? item?.total_llamadas ?? 0);
        const totalSales = Number(item?.sales ?? item?.ventas ?? item?.total_ventas ?? 0);
        const workMinutes = toMinutes(item?.workTime ?? item?.tiempo_productivo ?? item?.work_time ?? item?.tiempo_conectado_minutos ?? 0);
        const workTime = workMinutes ? `${Math.floor(workMinutes / 60)}h ${workMinutes % 60}m` : (item?.workTime || item?.tiempo_productivo || item?.work_time || '—');
        return {
          id: item?.id || item?.agente_id || item?.agent_id || name,
          name,
          calls: totalCalls,
          sales: totalSales,
          conversion,
          status,
          pauses: { count: pausesCount, minutes: pausesMinutes },
          login,
          workTime,
          highlight: String(status).toLowerCase().includes('atencion') || String(status).toLowerCase().includes('atención')
        };
      }, [parsePercent, toMinutes]);
      const mapSummaryCards = React.useCallback((summary, agentsList) => {
        const normalizedSummary = summary || null;
        if (normalizedSummary) {
          return [
            { label: 'Agentes activos', value: normalizedSummary?.agentsActive || normalizedSummary?.agentesActivos || `${normalizedSummary?.activos ?? normalizedSummary?.agentes_activos ?? 0} / ${normalizedSummary?.total ?? normalizedSummary?.agentes_total ?? 0}`, sub: normalizedSummary?.attentionCount ? `${normalizedSummary.attentionCount} requiere atención` : (normalizedSummary?.nota || '') },
            { label: 'Total llamadas', value: normalizedSummary?.calls ?? normalizedSummary?.llamadas ?? normalizedSummary?.total_llamadas ?? '0', sub: normalizedSummary?.callsGoal ?? normalizedSummary?.meta_llamadas ? `Meta del equipo: ${normalizedSummary.callsGoal ?? normalizedSummary.meta_llamadas}` : '' },
            { label: 'Total ventas', value: normalizedSummary?.sales ?? normalizedSummary?.ventas ?? normalizedSummary?.total_ventas ?? '0', sub: normalizedSummary?.salesGoal ?? normalizedSummary?.meta_ventas ? `Meta: ${normalizedSummary.salesGoal ?? normalizedSummary.meta_ventas}` : '' },
            { label: 'Conv. promedio', value: normalizedSummary?.avgConversion ?? normalizedSummary?.conversion_promedio ? `${parsePercent(normalizedSummary.avgConversion ?? normalizedSummary.conversion_promedio)}%` : '0%', sub: normalizedSummary?.avgConversionNote || '' }
          ];
        }
        if (!agentsList.length) {
          return [];
        }
        const totalAgents = agentsList.length || 0;
        const attentionCount = agentsList.filter((agent) => agent.highlight).length;
        const totalCalls = agentsList.reduce((acc, agent) => acc + Number(agent.calls || 0), 0);
        const totalSales = agentsList.reduce((acc, agent) => acc + Number(agent.sales || 0), 0);
        const avgConversion = totalAgents ? Math.round(agentsList.reduce((acc, agent) => acc + Number(agent.conversion || 0), 0) / totalAgents) : 0;
        return [
          { label: 'Agentes activos', value: `${totalAgents - attentionCount} / ${totalAgents}`, sub: attentionCount ? `${attentionCount} requiere atención` : '' },
          { label: 'Total llamadas', value: String(totalCalls), sub: '' },
          { label: 'Total ventas', value: String(totalSales), sub: '' },
          { label: 'Conv. promedio', value: `${avgConversion}%`, sub: '' }
        ];
      }, [parsePercent]);

      const normalizeTeamPayload = React.useCallback((payload) => {
        if (!payload) return null;
        const base = payload?.data || payload;
        // Prefer "agents" (en inglés) porque ya viene normalizado con login/workTime.
        const agents = base?.agents || base?.data?.agents || base?.items || base?.team || base?.data?.items || [];
        const summary = base?.summary || base?.data?.summary || base?.kpis || null;
        const alertas = base?.alertas_activas || base?.alerts || base?.data?.alertas_activas || [];
        return { ...base, agents, summary, alertas_activas: alertas };
      }, []);

      const shouldApplyTeamUpdate = React.useCallback((payload) => {
        const normalized = normalizeTeamPayload(payload);
        if (!normalized || normalized?.ok === false) return false;
        const list = normalized?.agents || [];
        const hasAgents = Array.isArray(list) && list.length > 0;
        const summary = normalized?.summary || null;
        const summaryHasData = summary && [
          summary.calls, summary.llamadas, summary.total_llamadas,
          summary.sales, summary.ventas, summary.total_ventas,
          summary.avgConversion, summary.conversion_promedio
        ].some((value) => Number(value || 0) > 0);
        const agentsHaveData = hasAgents && list.some((agent) => (
          Number(agent?.calls ?? agent?.llamadas ?? agent?.total_llamadas ?? 0) > 0 ||
          Number(agent?.sales ?? agent?.ventas ?? agent?.total_ventas ?? 0) > 0 ||
          Number(agent?.conversion ?? agent?.conversionRate ?? agent?.conversion_percent ?? 0) > 0 ||
          Number(agent?.pausesMinutes ?? agent?.pausasMinutos ?? agent?.tiempo_total_pausas_minutos ?? 0) > 0
        ));
        return (hasAgents && (agentsHaveData || summaryHasData)) || summaryHasData;
      }, [normalizeTeamPayload]);

      const mergeTeamAgents = React.useCallback((prev, next) => {
        if (!next?.agents) return prev || next || null;
        if (!prev?.agents) return next;
        const prevById = new Map(prev.agents.map((agent) => [String(agent?.id || agent?.name || agent?.nombre || ''), agent]));
        const mergedAgents = next.agents.map((agent) => {
          const key = String(agent?.id || agent?.name || agent?.nombre || '');
          const prevAgent = prevById.get(key);
          if (!prevAgent) return agent;
          const merged = { ...prevAgent, ...agent };
          if (agent.login == null || agent.login === '') merged.login = prevAgent.login;
          if (agent.workTime == null || agent.workTime === '') merged.workTime = prevAgent.workTime;
          if (agent.pausesMinutes == null) merged.pausesMinutes = prevAgent.pausesMinutes;
          if (agent.pausesCount == null) merged.pausesCount = prevAgent.pausesCount;
          return merged;
        });
        return { ...prev, ...next, agents: mergedAgents };
      }, []);


      const normalizeDetail = React.useCallback((data, weekData, fallbackDetail) => {
        if (!data && !weekData && !fallbackDetail) return null;
        const raw = data?.detail || data?.agent || data?.data || data || {};
        const agent = raw.agente || raw.agent || raw.user || {};
        const metrics = raw.metricas || raw.metrics || raw.kpis || raw.summary || {};
        const shiftStart = agent.turno_inicio || raw.turno_inicio || '';
        const shiftEnd = agent.turno_fin || raw.turno_fin || '';
        const shift = raw.shift || raw.turno || raw.shiftLabel || raw.shift_label || (shiftStart || shiftEnd ? `${shiftStart || '—'} — ${shiftEnd || '—'}` : '') || fallbackDetail?.shift || '';
        const status = agent.estado || raw.status || raw.estado || fallbackDetail?.status || 'Activo';
        const countFrom = (value) => {
          if (Array.isArray(value)) return value.length;
          if (value && typeof value === 'object') {
            const maybe = value.count ?? value.total ?? value.value;
            return Number(maybe ?? 0);
          }
          return Number(value ?? 0);
        };
        const callsCount = countFrom(
          metrics.total_llamadas ?? metrics.calls ?? metrics.llamadas ??
          raw.callsCount ?? raw.calls_total ?? raw.llamadas_total ?? raw.llamadas ?? raw.calls
        );
        const salesCount = countFrom(
          metrics.total_ventas ?? metrics.sales ?? metrics.ventas ??
          raw.salesCount ?? raw.sales_total ?? raw.ventas_total ?? raw.ventas ?? raw.sales
        );
        const conversionRaw = metrics.conversion ?? metrics.conversionRate ??
          raw.conversion ?? raw.conversionRate ?? raw.pct_conversion ?? raw.conversion_pct ?? raw.conversionPercent;
        const derivedConversion = callsCount ? Math.round((salesCount / callsCount) * 100) : 0;
        let kpis = raw.kpis || raw.metrics || raw.kpi || null;
        if (!Array.isArray(kpis)) {
          kpis = [
            { label: 'Llamadas', value: String(Number.isFinite(callsCount) ? callsCount : 0), sub: metrics.meta_llamadas ? `Meta: ${metrics.meta_llamadas}` : (raw.callsGoal ? `Meta: ${raw.callsGoal}` : fallbackDetail?.kpis?.[0]?.sub || '') },
            { label: 'Ventas', value: String(Number.isFinite(salesCount) ? salesCount : 0), sub: metrics.meta_ventas ? `Meta: ${metrics.meta_ventas}` : (raw.salesGoal ? `Meta: ${raw.salesGoal}` : fallbackDetail?.kpis?.[1]?.sub || '') },
            { label: 'Conversión', value: `${parsePercent(conversionRaw ?? derivedConversion ?? fallbackDetail?.kpis?.[2]?.value ?? 0)}%`, sub: metrics.conversion_promedio_equipo ? `Promedio equipo: ${parsePercent(metrics.conversion_promedio_equipo)}%` : (raw.conversionMin ? `Mínimo: ${raw.conversionMin}%` : fallbackDetail?.kpis?.[2]?.sub || '') },
            { label: 'Tiempo productivo', value: metrics.porcentaje_productivo ? `${parsePercent(metrics.porcentaje_productivo)}%` : (raw.productivePercent ? `${parsePercent(raw.productivePercent)}%` : (fallbackDetail?.kpis?.[3]?.value || '—')), sub: metrics.tiempo_productivo_minutos ? `${metrics.tiempo_productivo_minutos}m` : (raw.productiveTime ? `${raw.productiveTime}` : fallbackDetail?.kpis?.[3]?.sub || '') }
          ];
        }
        const rawEvents = raw.eventos || raw.events || raw.activity || raw.events_turno || [];
        const diffMinutes = (start, end) => {
          if (!start || !end) return 0;
          const [sh, sm] = String(start).split(':').map(Number);
          const [eh, em] = String(end).split(':').map(Number);
          if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
          return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        };
        const timeline = raw.timeline || raw.timelineSegments || raw.turnoTimeline || raw.segments || fallbackDetail?.timeline || (Array.isArray(rawEvents) ? rawEvents.map((event) => {
          const tipo = String(event?.tipo || '').toLowerCase();
          const label = tipo === 'login' ? 'Trabajo'
            : tipo === 'trabajo' ? 'Trabajo'
              : tipo === 'descanso' ? 'Descanso'
                : (tipo === 'baño' || tipo === 'bano') ? 'Baño'
                  : tipo === 'supervisor' ? 'Con supervisor'
                    : tipo === 'logout' ? 'Logout'
                      : 'Trabajo';
          const duration = Number(event?.duracion_minutos ?? event?.duracion ?? event?.minutes ?? 0);
          const minutes = duration || diffMinutes(event?.inicio, event?.fin) || Number(event?.porcentaje_ancho ?? 0) || 1;
          const color = label === 'Trabajo' ? '#93c5fd'
            : label === 'Descanso' ? '#fdba74'
              : label === 'Con supervisor' ? '#c4b5fd'
                : label === 'Logout' ? '#e2e8f0'
                  : '#86efac';
          const extended = event?.excedido;
          return { label: extended && (label === 'Baño' || label === 'Descanso') ? `${label} extendido` : label, minutes, color };
        }) : []);
        const activityCandidate = raw.activity || raw.events || raw.eventos || raw.events_turno || fallbackDetail?.activity || [];
        const activity = Array.isArray(activityCandidate) ? activityCandidate.map((event) => {
          const tipo = String(event?.tipo || event?.event || '').toLowerCase();
          const label = tipo === 'login' ? 'Login' : tipo === 'logout' ? 'Logout' : tipo === 'trabajo' ? 'Trabajo' : tipo === 'descanso' ? 'Descanso' : (tipo === 'baño' || tipo === 'bano') ? 'Baño' : tipo === 'supervisor' ? 'Supervisor' : (event?.event || event?.tipo || '—');
          const duration = Number(event?.duracion_minutos ?? event?.duracion ?? event?.minutes ?? 0);
          const exceso = Number(event?.exceso_minutos ?? 0);
          return {
            time: event?.inicio || event?.hora || '',
            event: label,
            duration: Number.isFinite(duration) && duration ? `${duration}m` : '—',
            note: exceso ? `+${exceso}m sobre límite` : '',
            overLimit: Boolean(event?.excedido)
          };
        }) : [];
        const callsCandidate = raw.llamadas || raw.callsList || raw.lastCalls || raw.ultimasLlamadas || raw.calls || fallbackDetail?.calls || [];
        const calls = Array.isArray(callsCandidate) ? callsCandidate.map((call) => {
          const seconds = Number(call?.duracion_segundos ?? call?.duracion ?? 0);
          const minutes = Math.floor(seconds / 60);
          const remaining = seconds % 60;
          const duration = seconds ? `${minutes}m ${String(remaining).padStart(2, '0')}s` : '—';
          const resultRaw = String(call?.resultado || call?.result || '').toLowerCase();
          const result = resultRaw === 'venta' ? 'Venta' : resultRaw === 'callback' ? 'Callback' : resultRaw === 'no_contesta' ? 'No contesta' : 'No venta';
          return {
            time: call?.hora || '',
            duration,
            client: call?.cliente_nombre || call?.cliente || '—',
            result,
            shortCall: seconds > 0 ? seconds < 60 : false
          };
        }) : [];
        const pauses = raw.pausas || raw.pauses || raw.breaks || fallbackDetail?.pauses || [];
        const alertsCandidate = raw.alertas || raw.alerts || raw.warnings || fallbackDetail?.alerts || [];
        const alerts = Array.isArray(alertsCandidate) ? alertsCandidate.map((alert) => ({
          title: alert?.titulo || alert?.title || alert?.tipo || 'Alerta',
          detail: alert?.descripcion || alert?.detail || ''
        })) : alertsCandidate;
        let week = weekData?.week || weekData?.data || weekData || fallbackDetail?.week || null;
        if (week && Array.isArray(week?.dias)) {
          const trend = week.dias.map((day) => ({
            day: day.dia_nombre || day.dia || day.fecha || '',
            value: Number(day.conversion ?? 0)
          }));
          const resumen = week.resumen || {};
          const summary = [
            { label: 'Conversión promedio', value: `${parsePercent(resumen.conversion_promedio_semana ?? 0)}%` },
            { label: 'Total alertas', value: String(resumen.total_alertas_semana ?? 0) },
            { label: 'Total ventas', value: String(resumen.total_ventas_semana ?? 0) },
            { label: 'Total llamadas', value: String(resumen.total_llamadas_semana ?? 0) }
          ];
          week = { trend, summary };
        }
        return {
          shift,
          status,
          kpis,
          timeline,
          activity,
          activityRaw: Array.isArray(rawEvents) ? rawEvents : [],
          pauses,
          calls,
          alerts,
          week
        };
      }, [parsePercent]);

      const socketBase = React.useMemo(() => {
        const explicit = teamConfig?.socketUrl || teamConfig?.realtimeUrl || '';
        if (explicit) return explicit;
        const base = getApiBaseUrl() || '';
        if (!base) return '';
        return base.replace(/\/prod\/?$/i, '');
      }, [teamConfig]);

      React.useEffect(() => {
        let active = true;
        const api = getApiClient();
        const fetchConfig = async () => {
          try {
            const response = await api.get('/api/config');
            if (active) setTeamConfig(response || null);
          } catch {
            if (active) setTeamConfig(null);
          }
        };
        fetchConfig();
        return () => { active = false; };
      }, []);

      React.useEffect(() => {
        let active = true;
        const api = getApiClient();
        const dateStr = formatDateYmd(selectedDate);
        setTeamLoading(true);
        setTeamError('');
        api.get(`/api/supervisor/team-summary?fecha=${dateStr}`)
          .then((response) => {
            if (!active) return;
            if (response?.fecha && response.fecha !== dateStr) return;
            if (response?.data?.fecha && response.data.fecha !== dateStr) return;
            const normalized = normalizeTeamPayload(response);
            console.log('[DEBUG GET]', JSON.stringify(normalized?.agents?.slice(0, 1)));
            setTeamSummary(normalized || response || null);
          })
          .catch((err) => {
            if (!active) return;
            setTeamError(err?.message || 'No se pudo cargar el resumen del equipo.');
          })
          .finally(() => {
            if (!active) return;
            setTeamLoading(false);
          });
        return () => { active = false; };
      }, [formatDateYmd, selectedDate, normalizeTeamPayload]);

      const fetchMarketSummary = React.useCallback(() => {
        let active = true;
        const api = getApiClient();
        const dateStr = formatDateYmd(selectedDate);
        const requestId = makeRequestId('mercado');
        marketRequestIdRef.current = requestId;
        setMarketWidget((prev) => ({ ...prev, status: 'loading', error: '', requestId }));
        api.get(`/api/supervisor/sellers-summary?fecha=${dateStr}&tipo=captacion`)
          .then((response) => {
            if (!active) return;
            if (marketRequestIdRef.current !== requestId) return;
            if (response?.fecha && response.fecha !== dateStr) return;
            if (response?.data?.fecha && response.data.fecha !== dateStr) return;
            const { status, items, message } = normalizeWidgetResponse(response);
            if (status === 'success' || status === 'partial') {
              setMarketWidget({ status, data: Array.isArray(items) ? items : [], error: '', requestId });
              return;
            }
            if (status === 'empty') {
              setMarketWidget({ status, data: [], error: '', requestId });
              return;
            }
            if (status === 'error') {
              setMarketWidget((prev) => ({ ...prev, status: 'error', error: message || 'No pudimos cargar Mercado abierto', requestId }));
              return;
            }
            setMarketWidget((prev) => ({ ...prev, status: 'error', error: 'Respuesta inválida de Mercado abierto', requestId }));
          })
          .catch((err) => {
            if (!active) return;
            if (marketRequestIdRef.current !== requestId) return;
            setMarketWidget((prev) => ({ ...prev, status: 'error', error: err?.message || 'No pudimos cargar Mercado abierto', requestId }));
          });
        return () => { active = false; };
      }, [formatDateYmd, makeRequestId, normalizeWidgetResponse, selectedDate]);

      const fetchRecuperoSummary = React.useCallback(() => {
        let active = true;
        const api = getApiClient();
        const dateStr = formatDateYmd(selectedDate);
        const requestId = makeRequestId('recupero');
        recuperoRequestIdRef.current = requestId;
        setRecuperoWidget((prev) => ({ ...prev, status: 'loading', error: '', requestId }));
        api.get(`/api/supervisor/sellers-summary?fecha=${dateStr}&tipo=recupero`)
          .then((response) => {
            if (!active) return;
            if (recuperoRequestIdRef.current !== requestId) return;
            if (response?.fecha && response.fecha !== dateStr) return;
            if (response?.data?.fecha && response.data.fecha !== dateStr) return;
            const { status, items, message } = normalizeWidgetResponse(response);
            if (status === 'success' || status === 'partial') {
              setRecuperoWidget({ status, data: Array.isArray(items) ? items : [], error: '', requestId });
              return;
            }
            if (status === 'empty') {
              setRecuperoWidget({ status, data: [], error: '', requestId });
              return;
            }
            if (status === 'error') {
              setRecuperoWidget((prev) => ({ ...prev, status: 'error', error: message || 'No pudimos cargar Recupero', requestId }));
              return;
            }
            setRecuperoWidget((prev) => ({ ...prev, status: 'error', error: 'Respuesta inválida de Recupero', requestId }));
          })
          .catch((err) => {
            if (!active) return;
            if (recuperoRequestIdRef.current !== requestId) return;
            setRecuperoWidget((prev) => ({ ...prev, status: 'error', error: err?.message || 'No pudimos cargar Recupero', requestId }));
          });
        return () => { active = false; };
      }, [formatDateYmd, makeRequestId, normalizeWidgetResponse, selectedDate]);

      React.useEffect(() => {
        const cleanup = fetchMarketSummary();
        return () => { if (typeof cleanup === 'function') cleanup(); };
      }, [fetchMarketSummary]);

      React.useEffect(() => {
        const cleanup = fetchRecuperoSummary();
        return () => { if (typeof cleanup === 'function') cleanup(); };
      }, [fetchRecuperoSummary]);

      React.useEffect(() => {
        if (!detailAgent?.id) return () => {};
        let active = true;
        const api = getApiClient();
        const dateStr = formatDateYmd(selectedDate);
        setDetailLoading(true);
        setDetailError('');
        Promise.all([
          api.get(`/api/supervisor/agent-detail/${detailAgent.id}?fecha=${dateStr}`),
          api.get(`/api/supervisor/agent-week/${detailAgent.id}?fecha=${dateStr}`)
        ])
          .then(([detailResponse, weekResponse]) => {
            if (!active) return;
            setDetailData(detailResponse || null);
            setDetailWeek(weekResponse || null);
          })
          .catch((err) => {
            if (!active) return;
            setDetailError(err?.message || 'No se pudo cargar el detalle del agente.');
          })
          .finally(() => {
            if (!active) return;
            setDetailLoading(false);
          });
        return () => { active = false; };
      }, [detailAgent?.id, formatDateYmd, selectedDate]);

      React.useEffect(() => {
        setActivityExpanded(false);
      }, [detailAgent?.id]);
      const teamAgents = React.useMemo(() => {
        const items = teamSummary?.agents || teamSummary?.items || teamSummary?.team || teamSummary?.data?.agents || teamSummary?.data?.items || [];
        if (Array.isArray(items) && items.length) {
          return items.map(buildAgentRow);
        }
        return [];
      }, [buildAgentRow, teamSummary]);
      const summaryCards = React.useMemo(() => {
        const summary = teamSummary?.summary || teamSummary?.kpis || teamSummary?.resumen_equipo || teamSummary?.data?.summary || null;
        return mapSummaryCards(summary, teamAgents);
      }, [mapSummaryCards, teamAgents, teamSummary]);
      const attentionNote = React.useMemo(() => {
        if (teamSummary?.attentionNote) return teamSummary.attentionNote;
        const alerts = Array.isArray(teamSummary?.alertas_activas) ? teamSummary.alertas_activas : [];
        if (!alerts.length) return '';
        const knownNames = new Set(teamAgents.map((agent) => String(agent.name || '').trim()).filter(Boolean));
        const firstMatch = alerts.find((alert) => {
          const name = String(alert?.agente_nombre || '').trim();
          return name && knownNames.has(name);
        });
        const fallback = alerts.find((alert) => String(alert?.agente_nombre || '').trim());
        const picked = firstMatch || fallback || alerts[0];
        const label = String(picked?.agente_nombre || '').trim();
        if (!label) return '';
        return `${label} requiere atención — Conversión`.trim();
      }, [teamAgents, teamSummary]);
      const avgPauseMinutes = React.useMemo(() => {
        if (teamSummary?.avgPauseMinutes) return Number(teamSummary.avgPauseMinutes) || 0;
        if (!teamAgents.length) return 0;
        const total = teamAgents.reduce((acc, agent) => acc + Number(agent.pauses?.minutes || 0), 0);
        return Math.round(total / Math.max(teamAgents.length, 1));
      }, [teamAgents, teamSummary]);
      const activityBadge = (event) => {
        const key = String(event || '').toLowerCase();
        if (key.includes('login')) return { bg: 'rgba(59,130,246,0.15)', color: '#2563eb' };
        if (key.includes('trab')) return { bg: 'rgba(59,130,246,0.15)', color: '#2563eb' };
        if (key.includes('desc')) return { bg: 'rgba(249,115,22,0.16)', color: '#b45309' };
        if (key.includes('baño') || key.includes('bano')) return { bg: 'rgba(16,185,129,0.16)', color: '#15803d' };
        return { bg: 'rgba(148,163,184,0.2)', color: '#475569' };
      };
      const callBadge = (result) => {
        const key = String(result || '').toLowerCase();
        if (key.includes('venta')) return { bg: 'rgba(22,163,74,0.16)', color: '#15803d' };
        if (key.includes('callback')) return { bg: 'rgba(251,191,36,0.2)', color: '#b45309' };
        return { bg: 'rgba(148,163,184,0.2)', color: '#475569' };
      };
      const conversionBarColor = (value, status) => {
        if (status === 'Atención') return '#f59e0b';
        if (value >= 16) return '#22c55e';
        if (value >= 12) return '#3b82f6';
        return '#f97316';
      };
      const pauseBadgeStyle = (minutes, status) => {
        const isHigh = (avgPauseMinutes ? minutes >= avgPauseMinutes : minutes >= 45) || status === 'Atención';
        return {
          fontWeight: isHigh ? 700 : 500,
          color: isHigh ? '#b45309' : 'inherit'
        };
      };
      const sellerPercentStyle = (value) => {
        if (value >= 30) return { bg: 'rgba(34,197,94,0.18)', color: '#166534', dot: '#22c55e' };
        if (value >= 15) return { bg: 'rgba(234,179,8,0.18)', color: '#854d0e', dot: '#eab308' };
        return { bg: 'rgba(239,68,68,0.18)', color: '#991b1b', dot: '#ef4444' };
      };
      const sellerVentasStyle = (value) => {
        if (value >= 3) return { bg: 'rgba(34,197,94,0.18)', color: '#166534', dot: '#22c55e' };
        if (value >= 1) return { bg: 'rgba(234,179,8,0.18)', color: '#854d0e', dot: '#eab308' };
        return { bg: 'rgba(239,68,68,0.18)', color: '#991b1b', dot: '#ef4444' };
      };
      const sellerRechazosStyle = (value) => {
        if (value <= 5) return { bg: 'rgba(34,197,94,0.18)', color: '#166534', dot: '#22c55e' };
        if (value <= 12) return { bg: 'rgba(234,179,8,0.18)', color: '#854d0e', dot: '#eab308' };
        return { bg: 'rgba(239,68,68,0.18)', color: '#991b1b', dot: '#ef4444' };
      };
      const sellerSummary = React.useMemo(() => {
        if (!Array.isArray(marketWidget.data) || !marketWidget.data.length) return [];
        return marketWidget.data.map((item) => {
          const ventas = Number(item.ventas ?? 0);
          const seguimientos = Number(item.seguimientos ?? 0);
          const rellamadas = Number(item.rellamadas ?? 0);
          const no_contesta = Number(item.no_contesta ?? 0);
          const rechazos = Number(item.rechazos ?? 0);
          const datos_erroneos = Number(item.datos_erroneos ?? 0);
          const total_gestionado = Number(
            item.total_gestionado ?? item.gestionados ?? item.gestiones ?? (ventas + seguimientos + rellamadas + no_contesta + rechazos + datos_erroneos)
          );
          const nombre = item.nombre || item.name || '';
          const apellido = item.apellido || '';
          return {
            id: item.id || item.seller_id || item.user_id || `${nombre}-${apellido}` || item.email || item.name || item.nombre,
            nombre,
            apellido,
            asignados: Number(item.asignados ?? 0),
            gestiones: total_gestionado,
            ventas,
            seguimientos,
            rellamadas,
            no_contesta,
            rechazos,
            datos_erroneos,
            contacto: Number(item.contacto ?? 0) || 0,
            efectividad: Number(item.efectividad ?? 0) || 0
          };
        });
      }, [marketWidget.data]);
      const sellerMaxGestiones = React.useMemo(() => {
        if (!sellerSummary.length) return 0;
        return Math.max(...sellerSummary.map((row) => Number(row.gestiones || 0)));
      }, [sellerSummary]);
      const sellerRecuperoSummary = React.useMemo(() => {
        if (!Array.isArray(recuperoWidget.data) || !recuperoWidget.data.length) return [];
        return recuperoWidget.data
          .map((item) => {
            const ventas = Number(item.ventas ?? 0);
            const seguimientos = Number(item.seguimientos ?? 0);
            const rellamadas = Number(item.rellamadas ?? 0);
            const no_contesta = Number(item.no_contesta ?? 0);
            const rechazos = Number(item.rechazos ?? 0);
            const datos_erroneos = Number(item.datos_erroneos ?? 0);
            const total_gestionado = Number(
              item.total_gestionado ?? item.gestionados ?? item.gestiones ?? (ventas + seguimientos + rellamadas + no_contesta + rechazos + datos_erroneos)
            );
            const nombre = item.nombre || item.name || '';
            const apellido = item.apellido || '';
            return {
              id: item.id || item.seller_id || item.user_id || `${nombre}-${apellido}` || item.email || item.name || item.nombre,
              nombre,
              apellido,
              asignados: Number(item.asignados ?? 0),
              gestiones: total_gestionado,
              ventas,
              seguimientos,
              rellamadas,
              no_contesta,
              rechazos,
              datos_erroneos,
              contacto: Number(item.contacto ?? 0) || 0,
              efectividad: Number(item.efectividad ?? 0) || 0
            };
          })
          .filter((row) => Number(row.asignados || 0) > 0);
      }, [recuperoWidget.data]);
      const sellerRecuperoMaxGestiones = React.useMemo(() => {
        if (!sellerRecuperoSummary.length) return 0;
        return Math.max(...sellerRecuperoSummary.map((row) => Number(row.gestiones || 0)));
      }, [sellerRecuperoSummary]);
      const sellerTotalGestiones = React.useMemo(() => (
        sellerSummary.reduce((acc, row) => acc + Number(row.gestiones || 0), 0)
      ), [sellerSummary]);
      const sellerRecuperoTotalGestiones = React.useMemo(() => (
        sellerRecuperoSummary.reduce((acc, row) => acc + Number(row.gestiones || 0), 0)
      ), [sellerRecuperoSummary]);
      const SellerBadge = ({ value, styleFn, suffix = '' }) => {
        const c = styleFn(value);
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 12,
            background: c.bg,
            color: c.color,
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
            {value}{suffix}
          </span>
        );
      };
      const SellerAvatar = ({ nombre, apellido }) => {
        const name = String(nombre || '');
        const last = String(apellido || '');
        const initials = `${name[0] || 'U'}${last[0] || ''}`.trim().toUpperCase() || 'U';
        const colors = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];
        const colorIndex = (name.charCodeAt(0) || 0) + (last.charCodeAt(0) || 0);
        const color = colors[colorIndex % colors.length];
        return (
          <span style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: color,
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0
          }}>
            {initials}
          </span>
        );
      };
      const SellerMiniBar = ({ value, max }) => {
        const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(148,163,184,0.2)', borderRadius: 999, overflow: 'hidden', minWidth: 60 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#6366f1', borderRadius: 999, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 12, color: '#64748b', minWidth: 28, textAlign: 'right' }}>{value}</span>
          </div>
        );
      };
      const [jornadaView, setJornadaView] = React.useState('cards');
      const [jornadaFilter, setJornadaFilter] = React.useState('todos');
      const [jornadaAgents, setJornadaAgents] = React.useState([]);
      const [jornadaLoading, setJornadaLoading] = React.useState(false);
      const [jornadaError, setJornadaError] = React.useState('');
      const [jornadaMenuOpen, setJornadaMenuOpen] = React.useState(null);
      const jornadaTimezone = 'America/Montevideo';
      const jornadaColors = React.useMemo(() => ([
        '#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'
      ]), []);
      const getJornadaColor = React.useCallback((name) => {
        const safe = String(name || '');
        const sum = safe.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return jornadaColors[sum % jornadaColors.length];
      }, [jornadaColors]);
      const formatDurationFromSeconds = (seconds) => {
        if (!Number.isFinite(seconds)) return '--';
        const total = Math.max(0, Math.floor(Number(seconds)));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        return `${h}h ${m}m`;
      };
      const mapJornadaItem = React.useCallback((item) => {
        const nombre = item?.nombre || '';
        const apellido = item?.apellido || '';
        const fullName = `${nombre} ${apellido}`.trim() || '—';
        const initials = `${nombre[0] || ''}${apellido[0] || ''}`.trim().toUpperCase() || 'U';
        const loginLocal = item?.login_local;
        const logoutLocal = item?.logout_local;
        const loginTimeRaw = item?.login_time;
        const logoutTimeRaw = item?.logout_time;
        const logoutMissing = logoutTimeRaw == null;
        const totalJornadaSeg = item?.totalJornadaSeg ?? null;
        const isDisconnected = (!loginLocal || !String(loginLocal).trim())
          && (!logoutLocal || !String(logoutLocal).trim())
          && Number(item?.tiempoProductivoSeg ?? 0) === 0
          && Number(item?.descansosSeg ?? 0) === 0
          && Number(item?.banosSeg ?? 0) === 0
          && Number(item?.supervisorSeg ?? 0) === 0;
        const rawEstado = item?.estado_actual;
        const normalizedEstado = rawEstado ? String(rawEstado).toUpperCase() : '';
        const estadoMap = {
          TRABAJO: { state: 'disponible', label: 'Disponible' },
          DESCANSO: { state: 'descanso', label: 'En descanso' },
          BAÑO: { state: 'baño', label: 'En baño' },
          BANO: { state: 'baño', label: 'En baño' },
          SUPERVISOR: { state: 'capacitacion', label: 'En capacitación' },
          LOGOUT: { state: 'fin', label: 'Finalizado' }
        };
        const mappedEstado = normalizedEstado ? estadoMap[normalizedEstado] : null;
        return {
          id: item?.id || fullName,
          name: fullName,
          avatar: initials,
          color: getJornadaColor(fullName),
          currentState: isDisconnected ? 'desconectado' : (mappedEstado?.state || (logoutMissing ? 'disponible' : 'fin')),
          currentStateLabel: isDisconnected ? 'Desconectado' : (mappedEstado?.label || (logoutMissing ? 'En jornada' : 'Finalizado')),
          stateStartTime: null,
          loginTime: isDisconnected ? '--' : (loginTimeRaw || '--'),
          logoutTime: isDisconnected ? '--' : (logoutTimeRaw || (logoutMissing ? 'En curso' : '--')),
          times: {
            disponible: Number(item?.disponibleSeg ?? 0),
            descanso: Number(item?.descansosSeg ?? 0),
            baño: Number(item?.banosSeg ?? 0),
            capacitacion: Number(item?.supervisorSeg ?? 0),
            productivo: Number(item?.tiempoProductivoSeg ?? 0),
            total: totalJornadaSeg
          },
          labels: {
            productivo: item?.tiempoProductivoLabel,
            descansos: item?.descansosLabel,
            banos: item?.banosLabel,
            supervisor: item?.supervisorLabel,
            total: item?.totalJornadaLabel
          },
          schedule: []
        };
      }, [getJornadaColor]);

      const handleAgentLogout = React.useCallback(async (agent) => {
        if (!agent?.id) return;
        const api = getApiClient();
        try {
          await api.post('/api/agent/event', { agente_id: agent.id, tipo: 'LOGOUT' });
          setJornadaMenuOpen(null);
          const dateStr = formatDateYmd(selectedDate);
          const response = await api.get(`/api/reportes/jornada-diaria?fecha=${dateStr}&timezone=${encodeURIComponent(jornadaTimezone)}`);
          const items = response?.items || response?.data?.items || [];
          setJornadaAgents(Array.isArray(items) ? items.map(mapJornadaItem) : []);
        } catch (err) {
          setJornadaError(err?.message || 'No se pudo cerrar la sesión.');
        }
      }, [formatDateYmd, jornadaTimezone, mapJornadaItem, selectedDate]);
      const formatTimeSince = (date) => {
        if (!date) return '--';
        const diff = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
        if (diff < 60) return `${diff} min`;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `${h}h ${m}m`;
      };
      const filteredJornadaAgents = React.useMemo(() => {
        if (jornadaFilter === 'todos') return jornadaAgents;
        return jornadaAgents.filter((agent) => agent.currentState === jornadaFilter);
      }, [jornadaAgents, jornadaFilter]);
      const jornadaCounters = React.useMemo(() => ({
        active: jornadaAgents.filter((agent) => agent.currentState !== 'fin').length,
        pause: jornadaAgents.filter((agent) => agent.currentState === 'descanso' || agent.currentState === 'baño').length,
        finished: jornadaAgents.filter((agent) => agent.currentState === 'fin').length
      }), [jornadaAgents]);
      const jornadaAvgDisponible = React.useMemo(() => {
        if (!jornadaAgents.length) return 0;
        const total = jornadaAgents.reduce((acc, agent) => acc + Number(agent?.times?.disponible || 0), 0);
        return Math.round(total / Math.max(jornadaAgents.length, 1));
      }, [jornadaAgents]);
      const jornadaHours = React.useMemo(() => Array.from({ length: 10 }, (_, i) => 9 + i), []);
      const stateBadgeStyle = (state) => {
        if (state === 'disponible') return { background: '#d1fae5', color: '#065f46' };
        if (state === 'descanso') return { background: '#fef3c7', color: '#92400e' };
        if (state === 'baño') return { background: '#fef9c3', color: '#854d0e' };
        if (state === 'capacitacion') return { background: '#ede9fe', color: '#5b21b6' };
        if (state === 'fin') return { background: '#f1f5f9', color: '#475569', border: '2px dashed #cbd5e1' };
        return { background: '#e2e8f0', color: '#334155' };
      };
      const stateLabel = (state) => {
        if (state === 'disponible') return 'Disponible';
        if (state === 'descanso') return 'Descanso';
        if (state === 'baño') return 'Baño';
        if (state === 'capacitacion') return 'Capacitación';
        if (state === 'fin') return 'Jornada Finalizada';
        return 'Estado';
      };
      React.useEffect(() => {
        let active = true;
        const api = getApiClient();
        const dateStr = formatDateYmd(selectedDate);
        setJornadaLoading(true);
        setJornadaError('');
        api.get(`/api/reportes/jornada-diaria?fecha=${dateStr}&timezone=${encodeURIComponent(jornadaTimezone)}`)
          .then((response) => {
            if (!active) return;
            const items = response?.items || response?.data?.items || [];
            setJornadaAgents(Array.isArray(items) ? items.map(mapJornadaItem) : []);
          })
          .catch((err) => {
            if (!active) return;
            setJornadaError(err?.message || 'No se pudo cargar el reporte de jornada.');
            setJornadaAgents([]);
          })
          .finally(() => {
            if (!active) return;
            setJornadaLoading(false);
          });
        return () => { active = false; };
      }, [formatDateYmd, jornadaTimezone, mapJornadaItem, selectedDate]);

      React.useEffect(() => {
        if (!teamConfig) return () => {};
        if (teamConfig?.socketEnabled === false || teamConfig?.realtimeEnabled === false) return () => {};
        if (!socketBase) return () => {};
        const socket = io(socketBase, {
          transports: ['websocket'],
          withCredentials: true,
          auth: authUser?.accessToken ? { token: authUser.accessToken } : undefined
        });
        const api = getApiClient();
        const refreshSellerSummary = () => {
          fetchMarketSummary();
          fetchRecuperoSummary();
        };
        const refreshJornadaReport = () => {
          const dateStr = formatDateYmd(selectedDate);
          api.get(`/api/reportes/jornada-diaria?fecha=${dateStr}&timezone=${encodeURIComponent(jornadaTimezone)}`)
            .then((response) => {
              const items = response?.items || response?.data?.items || [];
              setJornadaAgents(Array.isArray(items) ? items.map(mapJornadaItem) : []);
            })
            .catch(() => {});
        };
        const refreshDetail = () => {
          if (!detailAgent?.id) return;
          const dateStr = formatDateYmd(selectedDate);
          Promise.all([
            api.get(`/api/supervisor/agent-detail/${detailAgent.id}?fecha=${dateStr}`),
            api.get(`/api/supervisor/agent-week/${detailAgent.id}?fecha=${dateStr}`)
          ]).then(([detailResponse, weekResponse]) => {
            setDetailData(detailResponse || null);
            setDetailWeek(weekResponse || null);
          }).catch(() => {});
        };
        socket.on('team_update', (payload) => {
          const payloadDate = payload?.fecha || payload?.data?.fecha || '';
          if (payloadDate && payloadDate !== formatDateYmd(selectedDate)) return;
          if (!shouldApplyTeamUpdate(payload)) return;
          const normalized = normalizeTeamPayload(payload);
          if (normalized) {
            setTeamSummary((prev) => {
              const prevNorm = normalizeTeamPayload(prev) || prev;
              return mergeTeamAgents(prevNorm, normalized);
            });
          }
          refreshSellerSummary();
        });
        socket.on('sellers_update', (payload) => {
          const payloadDate = payload?.fecha || payload?.data?.fecha || '';
          if (payloadDate && payloadDate !== formatDateYmd(selectedDate)) return;
          refreshSellerSummary();
        });
        socket.on('agent_event', (payload) => {
          const agentId = payload?.agentId || payload?.agente_id || payload?.agent_id || payload?.id;
          if (detailAgent?.id && agentId && String(agentId) === String(detailAgent.id)) {
            refreshDetail();
          }
          refreshJornadaReport();
        });
        socket.on('new_alert', (payload) => {
          const agentId = payload?.agentId || payload?.agente_id || payload?.agent_id || payload?.id;
          if (detailAgent?.id && agentId && String(agentId) === String(detailAgent.id)) {
            refreshDetail();
          }
        });
        socket.on('new_call', (payload) => {
          const agentId = payload?.agentId || payload?.agente_id || payload?.agent_id || payload?.id;
          if (detailAgent?.id && agentId && String(agentId) === String(detailAgent.id)) {
            refreshDetail();
          }
        });
        return () => {
          socket.disconnect();
        };
      }, [authUser?.accessToken, detailAgent?.id, fetchMarketSummary, fetchRecuperoSummary, formatDateYmd, jornadaTimezone, mapJornadaItem, selectedDate, socketBase, shouldApplyTeamUpdate, normalizeTeamPayload, mergeTeamAgents]);
      const activeDetail = normalizeDetail(detailData, detailWeek, null);
      const renderTimeline = (detail) => {
        const rawEvents = Array.isArray(detail?.activityRaw) ? detail.activityRaw : [];
        const toTimeMinutes = (value) => {
          if (!value) return null;
          const [h, m] = String(value).split(':').map(Number);
          if ([h, m].some((n) => Number.isNaN(n))) return null;
          return h * 60 + m;
        };
        const normalized = rawEvents
          .map((evt) => ({
            tipo: String(evt?.tipo || '').toLowerCase(),
            inicio: evt?.inicio || '',
            fin: evt?.fin || '',
            startMinutes: toTimeMinutes(evt?.inicio)
          }))
          .filter((evt) => evt.tipo);
        const firstLogin = normalized.find((evt) => evt.tipo === 'login');
        const lastLogout = [...normalized].reverse().find((evt) => evt.tipo === 'logout');
        const startLabel = firstLogin?.inicio || '—';
        const endLabel = lastLogout?.fin || lastLogout?.inicio || '—';
        return (
          <div style={{ background: 'rgba(248,250,252,0.7)', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 14, padding: 16, marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Línea de tiempo del turno</div>
            <div style={{ display: 'flex', height: 32, borderRadius: 999, overflow: 'hidden' }}>
              {(detail?.timeline || []).map((segment, idx) => (
                <div key={`${segment.label}-${idx}`} style={{ flexGrow: segment.minutes, background: segment.color }} title={`${segment.label} · ${segment.minutes}m`}></div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>
              <span>{startLabel}</span>
              <span>{endLabel}</span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: '0.82rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 4, background: '#93c5fd', marginRight: 6 }}></span>Trabajo</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 4, background: '#fdba74', marginRight: 6 }}></span>Descanso</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 4, background: '#f59e0b', marginRight: 6 }}></span>Baño extendido</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 4, background: '#86efac', marginRight: 6 }}></span>Baño</span>
            </div>
          </div>
        );
      };
      const renderActivitySummary = (detail) => {
        const rawEvents = Array.isArray(detail?.activityRaw) ? detail.activityRaw : [];
        const normalizeType = (value) => {
          const key = String(value || '').toLowerCase();
          if (key === 'login') return 'login';
          if (key === 'logout') return 'logout';
          if (key === 'trabajo') return 'trabajo';
          if (key === 'descanso') return 'descanso';
          if (key === 'supervisor') return 'supervisor';
          if (key === 'baño' || key === 'bano') return 'bano';
          return '';
        };
        const formatMinutes = (mins) => {
          if (mins === null || mins === undefined) return '—';
          const total = Math.max(0, Number(mins) || 0);
          const h = Math.floor(total / 60);
          const m = total % 60;
          return h ? `${h}h ${m}m` : `${m}m`;
        };
        const formatSeconds = (secs) => {
          if (secs === null || secs === undefined) return '—';
          const total = Math.max(0, Math.floor(Number(secs) || 0));
          const h = Math.floor(total / 3600);
          const m = Math.floor((total % 3600) / 60);
          const s = total % 60;
          if (h > 0) return `${h}h ${m}m ${s}s`;
          if (m > 0) return `${m}m ${s}s`;
          return `${s}s`;
        };
        const formatDuration = (inicio, fin) => {
          if (!inicio) return '—';
          const start = new Date(inicio);
          const end = fin ? new Date(fin) : new Date();
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';
          const totalSeconds = Math.floor((end - start) / 1000);
          if (totalSeconds < 60) return `${totalSeconds}s`;
          const mins = Math.floor(totalSeconds / 60);
          const hours = Math.floor(mins / 60);
          if (hours > 0) return `${hours}h ${mins % 60}m`;
          return `${mins}m`;
        };
        const formatMinutesWithRaw = (mins) => {
          if (mins === null || mins === undefined) return '—';
          const total = Math.max(0, Number(mins) || 0);
          if (!total) return '—';
          return total >= 60 ? `${total}m → ${formatMinutes(total)}` : `${total}m`;
        };
        const toTimeMinutes = (value) => {
          if (!value) return null;
          const [h, m] = String(value).split(':').map(Number);
          if ([h, m].some((n) => Number.isNaN(n))) return null;
          return h * 60 + m;
        };
        const toSecondsFromTimestamp = (value) => {
          if (!value) return null;
          const parsed = new Date(value);
          if (Number.isNaN(parsed.getTime())) return null;
          return Math.floor(parsed.getTime() / 1000);
        };
        const diffMinutes = (start, end) => {
          if (!start || !end) return null;
          const startMin = toTimeMinutes(start);
          const endMin = toTimeMinutes(end);
          if (startMin === null || endMin === null) return null;
          return Math.max(0, endMin - startMin);
        };
        const diffSeconds = (start, end) => {
          if (!start || !end) return null;
          const startSec = toSecondsFromTimestamp(start);
          const endSec = toSecondsFromTimestamp(end);
          if (startSec === null || endSec === null) return null;
          return Math.max(0, endSec - startSec);
        };
        const parsed = rawEvents
          .map((evt) => {
            const type = normalizeType(evt?.tipo);
            if (!type) return null;
            const duration = Number(evt?.duracion_minutos ?? evt?.duracion ?? evt?.minutes ?? 0);
            const computed = duration || diffMinutes(evt?.inicio, evt?.fin);
            const durationSeconds = Number(evt?.duracion_segundos ?? evt?.duration_seconds ?? evt?.seconds);
            const computedSeconds = Number.isFinite(durationSeconds)
              ? durationSeconds
              : (diffSeconds(evt?.inicio, evt?.fin)
                ?? (Number.isFinite(duration) ? Math.round(duration * 60) : null));
            return {
              type,
              start: evt?.inicio || '—',
              end: evt?.fin || '',
              duration: computed === null ? null : computed,
              durationSeconds: computedSeconds,
              inProgress: !evt?.fin && !duration,
              startMinutes: toTimeMinutes(evt?.inicio),
              rawInicio: evt?.inicio || '',
              rawFin: evt?.fin || ''
            };
          })
          .filter(Boolean)
          .sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0));
        const typeOrder = ['login', 'trabajo', 'bano', 'descanso', 'supervisor', 'logout'];
        const labelByType = {
          login: 'Ingreso',
          trabajo: 'Trabajo efectivo',
          bano: 'Baño',
          descanso: 'Descanso',
          supervisor: 'Con supervisor',
          logout: 'Cierre'
        };
        const iconByType = {
          login: '🟢',
          trabajo: '🟢',
          bano: '🟢',
          descanso: '🟡',
          supervisor: '🔵',
          logout: '🔴'
        };
        const grouped = typeOrder.map((type) => {
          const events = parsed.filter((evt) => evt.type === type);
          const totalMinutes = events.reduce((acc, evt) => acc + (evt.duration || 0), 0);
          const totalSeconds = events.reduce((acc, evt) => acc + (evt.durationSeconds || 0), 0);
          return { type, events, totalMinutes, totalSeconds, count: events.length };
        });
        const firstLogin = parsed.find((evt) => evt.type === 'login');
        const lastLogout = [...parsed].reverse().find((evt) => evt.type === 'logout');
        const totalWork = grouped.find((row) => row.type === 'trabajo')?.totalMinutes || 0;
        const totalWorkSeconds = grouped.find((row) => row.type === 'trabajo')?.totalSeconds || 0;
        const totalPausas = (grouped.find((row) => row.type === 'bano')?.totalMinutes || 0)
          + (grouped.find((row) => row.type === 'descanso')?.totalMinutes || 0)
          + (grouped.find((row) => row.type === 'supervisor')?.totalMinutes || 0);
        const totalPausasSeconds = (grouped.find((row) => row.type === 'bano')?.totalSeconds || 0)
          + (grouped.find((row) => row.type === 'descanso')?.totalSeconds || 0)
          + (grouped.find((row) => row.type === 'supervisor')?.totalSeconds || 0);
        const totalJornada = totalWork + totalPausas;
        const totalJornadaSeconds = totalWorkSeconds + totalPausasSeconds;
        const summaryRows = [
          { type: 'login', label: labelByType.login, icon: iconByType.login, text: firstLogin?.start || '—' },
          { type: 'trabajo', label: labelByType.trabajo, icon: iconByType.trabajo, text: formatMinutesWithRaw(totalWork), indent: true },
          ...['descanso', 'bano', 'supervisor'].map((type) => {
            const row = grouped.find((item) => item.type === type);
            const first = row?.events?.[0];
            const detail = row?.count
              ? `${first?.start || '—'} · ${first?.inProgress ? 'En curso' : formatMinutes(first?.duration)}`
              : '—';
            return { type, label: labelByType[type], icon: iconByType[type], text: detail };
          }),
          { type: 'logout', label: labelByType.logout, icon: iconByType.logout, text: lastLogout?.start || '—' }
        ];
        const multiRows = grouped.filter((row) => row.count > 1 && ['bano', 'descanso', 'supervisor'].includes(row.type));
        const summaryRowsByType = ['trabajo', 'bano', 'descanso', 'supervisor'].map((type) => {
          const row = grouped.find((item) => item.type === type);
          return {
            type,
            label: labelByType[type],
            count: row?.count || 0,
            totalMinutes: row?.totalMinutes || 0,
            totalSeconds: row?.totalSeconds || 0
          };
        });
        return (
          <div style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 16, padding: 14, maxHeight: 400, overflowY: 'auto', background: 'rgba(248,250,252,0.7)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Registro de actividad</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, background: '#fff', marginBottom: 12 }}>
              {[
                { label: 'Ingreso', value: firstLogin?.start || '—', icon: iconByType.login },
                { label: 'Cierre', value: lastLogout?.start || '—', icon: iconByType.logout },
                { label: 'Jornada total', value: formatSeconds(totalJornadaSeconds), icon: '⏱' }
              ].map((item, idx, arr) => (
                <div
                  key={item.label}
                  style={{
                    padding: '10px 12px',
                    borderRight: idx < arr.length - 1 ? '1px solid rgba(148,163,184,0.35)' : 'none',
                    background: idx % 2 === 0 ? 'rgba(248,250,252,0.9)' : '#fff'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.icon} {item.label}</div>
                  <div style={{ fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px', gap: 0, padding: '8px 12px', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                <div>Actividad</div>
                <div>Veces</div>
                <div>Tiempo total</div>
              </div>
              {summaryRowsByType.map((row) => (
                <div key={`summary-${row.type}`} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px', gap: 0, padding: '10px 12px', borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                  <div style={{ fontWeight: 600 }}>{row.label}</div>
                  <div>{row.count || '—'}</div>
                  <div>{row.count ? formatSeconds(row.totalSeconds) : '—'}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setActivityExpanded((prev) => !prev)}
              style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 10, padding: '8px 12px', background: '#fff', fontWeight: 600, cursor: 'pointer', width: 'fit-content', marginTop: 12 }}
            >
              {activityExpanded ? 'Ocultar detalle' : 'Ver detalle cronológico'}
            </button>
            {activityExpanded ? (
              <div style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 10, maxHeight: 200, overflowY: 'auto', background: '#fff', marginTop: 8 }}>
                {parsed.length ? parsed.map((evt, idx) => {
                  const label = labelByType[evt.type] || evt.type;
                  const durationLabel = evt.inProgress ? 'En curso' : formatDuration(evt.rawInicio, evt.rawFin);
                  return (
                    <div key={`detail-${idx}`} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 120px', gap: 10, padding: '6px 4px', borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                      <div>{evt.start}</div>
                      <div>{label}</div>
                      <div>{durationLabel || '—'}</div>
                    </div>
                  );
                }) : <div style={{ color: 'var(--muted)' }}>Sin eventos.</div>}
              </div>
            ) : null}
          </div>
        );
      };
      const detailStatus = activeDetail?.status || detailAgent?.status || 'Activo';
      const isAttentionView = detailStatus.toLowerCase().includes('atencion') || detailStatus.toLowerCase().includes('atención');
      const WidgetContainer = ({
        status,
        dataLength,
        errorText,
        emptyText,
        partialText,
        onRetry,
        children
      }) => {
        const hasData = dataLength > 0;
        const showTable = status === 'success' || status === 'partial' || (status === 'loading' && hasData);
        return (
          <>
            {status === 'partial' ? (
              <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(250,204,21,0.15)', color: '#92400e', fontWeight: 600 }}>
                {partialText}
              </div>
            ) : null}
            {status === 'loading' && hasData ? (
              <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Actualizando datos...</div>
            ) : null}
            {status === 'loading' && !hasData ? (
              <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando...</div>
            ) : null}
            {status === 'error' ? (
              <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>{errorText}</span>
                {onRetry ? (
                  <Button variant="ghost" onClick={onRetry}>Reintentar</Button>
                ) : null}
              </div>
            ) : null}
            {status === 'empty' ? (
              <div style={{ marginBottom: 12, color: 'var(--muted)' }}>{emptyText}</div>
            ) : null}
            {showTable ? children : null}
          </>
        );
      };
      return (
        <div className="view">
          <section className="content-grid">
            <Panel
              className="span-12"
              title="Mercado abierto"
              subtitle="Medición diaria por vendedor"
              action={(
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Button variant="ghost" onClick={() => setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1))}>‹</Button>
                  <div style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)', background: '#fff', fontWeight: 600 }}>{formatDateLabel(selectedDate)}</div>
                  <Button variant="ghost" onClick={() => setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1))}>›</Button>
                </div>
              )}
            >
              <div style={{ padding: 8, color: 'var(--muted)' }} />
            </Panel>
          </section>
          <section className="content-grid">
            <Panel
              className="span-12"
            >
              <WidgetContainer
                status={marketWidget.status}
                dataLength={sellerSummary.length}
                errorText="No pudimos cargar Mercado abierto"
                emptyText="No hay vendedores con lote asignado"
                partialText="Algunos datos no están disponibles"
                onRetry={fetchMarketSummary}
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Vendedor</th>
                        <th>Asignados</th>
                        <th>Gestiones del día</th>
                        <th>Ventas</th>
                        <th>Seguimientos</th>
                        <th>Rellamadas</th>
                        <th>No contesta</th>
                        <th>Rechazos</th>
                        <th>Datos err.</th>
                        <th>Contacto</th>
                        <th>Efectividad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerSummary.map((row, idx) => (
                        <tr key={row.id || `${row.nombre}-${row.apellido}-${idx}`}>
                          <td>
                            <div className="person">
                              <SellerAvatar nombre={row.nombre} apellido={row.apellido} />
                              <div>
                                <strong>{`${row.nombre || ''} ${row.apellido || ''}`.trim() || '—'}</strong>
                              </div>
                            </div>
                          </td>
                          <td>{row.asignados}</td>
                          <td style={{ minWidth: 130 }}>
                            <SellerMiniBar value={row.gestiones} max={sellerMaxGestiones} />
                          </td>
                          <td>
                            <SellerBadge value={row.ventas} styleFn={sellerVentasStyle} />
                          </td>
                          <td>{row.seguimientos}</td>
                          <td>{row.rellamadas}</td>
                          <td>{row.no_contesta}</td>
                          <td>
                            <SellerBadge value={row.rechazos} styleFn={sellerRechazosStyle} />
                          </td>
                          <td>{row.datos_erroneos}</td>
                          <td>
                            <SellerBadge value={row.contacto} styleFn={sellerPercentStyle} suffix="%" />
                          </td>
                          <td>
                            <SellerBadge value={row.efectividad} styleFn={sellerPercentStyle} suffix="%" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span>{sellerSummary.length} vendedores</span>
                  <span>Total gestiones: {sellerTotalGestiones}</span>
                </div>
              </WidgetContainer>
            </Panel>
          </section>
          <section className="content-grid">
            <Panel
              className="span-12"
              title="Recupero"
              subtitle="Gestión de recupero"
            >
              <WidgetContainer
                status={recuperoWidget.status}
                dataLength={sellerRecuperoSummary.length}
                errorText="No pudimos cargar Recupero"
                emptyText="No hay vendedores con lote de recupero"
                partialText="Algunos datos no están disponibles"
                onRetry={fetchRecuperoSummary}
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Vendedor</th>
                        <th>Asignados</th>
                        <th>Gestiones del día</th>
                        <th>Ventas</th>
                        <th>Seguimientos</th>
                        <th>Rellamadas</th>
                        <th>No contesta</th>
                        <th>Rechazos</th>
                        <th>Datos err.</th>
                        <th>Contacto</th>
                        <th>Efectividad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerRecuperoSummary.map((row, idx) => (
                        <tr key={`recupero-${row.id || `${row.nombre}-${row.apellido}-${idx}`}`}>
                          <td>
                            <div className="person">
                              <SellerAvatar nombre={row.nombre} apellido={row.apellido} />
                              <div>
                                <strong>{`${row.nombre || ''} ${row.apellido || ''}`.trim() || '—'}</strong>
                              </div>
                            </div>
                          </td>
                          <td>{row.asignados}</td>
                          <td style={{ minWidth: 130 }}>
                            <SellerMiniBar value={row.gestiones} max={sellerRecuperoMaxGestiones} />
                          </td>
                          <td>
                            <SellerBadge value={row.ventas} styleFn={sellerVentasStyle} />
                          </td>
                          <td>{row.seguimientos}</td>
                          <td>{row.rellamadas}</td>
                          <td>{row.no_contesta}</td>
                          <td>
                            <SellerBadge value={row.rechazos} styleFn={sellerRechazosStyle} />
                          </td>
                          <td>{row.datos_erroneos}</td>
                          <td>
                            <SellerBadge value={row.contacto} styleFn={sellerPercentStyle} suffix="%" />
                          </td>
                          <td>
                            <SellerBadge value={row.efectividad} styleFn={sellerPercentStyle} suffix="%" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span>{sellerRecuperoSummary.length} vendedores</span>
                  <span>Total gestiones: {sellerRecuperoTotalGestiones}</span>
                </div>
              </WidgetContainer>
            </Panel>
          </section>
          <section className="content-grid">
            <Panel className="span-12">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Log de Jornada Laboral</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>Seguimiento de tiempos y estados · {formatDateLabel(selectedDate)}</div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dbeafe', color: '#1e40af', padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#3b82f6', display: 'inline-block' }}></span>
                  Tracking Activo
                </div>
              </div>
              {jornadaLoading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando reporte de jornada...</div> : null}
              {jornadaError ? <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 600 }}>{jornadaError}</div> : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
                <div style={{ background: '#fff', borderRadius: 12, borderLeft: '4px solid #10b981', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>En Jornada</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{jornadaCounters.active}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Sesiones iniciadas</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, borderLeft: '4px solid #f59e0b', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>En Pausa</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{jornadaCounters.pause}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Descanso o baño</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, borderLeft: '4px solid #64748b', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Finalizados</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{jornadaCounters.finished}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Jornada completada</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, borderLeft: '4px solid #3b82f6', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Promedio Disponible</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{formatDurationFromSeconds(jornadaAvgDisponible)}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Tiempo productivo</div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: 10, minWidth: 'max-content' }}>
                  {[
                    { key: 'todos', label: 'Todos', dot: '#334155' },
                    { key: 'disponible', label: 'Disponible', dot: '#10b981' },
                    { key: 'descanso', label: 'Descanso', dot: '#f59e0b' },
                    { key: 'baño', label: 'Baño', dot: '#eab308' },
                    { key: 'capacitacion', label: 'Capacitación', dot: '#8b5cf6' },
                    { key: 'fin', label: 'Fin', dot: '#64748b' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setJornadaFilter(item.key)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        borderRadius: 999,
                        border: `2px solid ${jornadaFilter === item.key ? '#0f172a' : '#e2e8f0'}`,
                        background: jornadaFilter === item.key ? '#0f172a' : '#fff',
                        color: jornadaFilter === item.key ? '#fff' : '#475569',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: item.dot, display: 'inline-block' }}></span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Registro de Actividad</div>
                <div style={{ display: 'flex', background: '#e2e8f0', padding: 4, borderRadius: 8 }}>
                  {[
                    { key: 'cards', label: 'Vista Actual' },
                    { key: 'timeline', label: 'Timeline 09-18h' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setJornadaView(item.key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 13,
                        background: jornadaView === item.key ? '#fff' : 'transparent',
                        color: jornadaView === item.key ? '#0f172a' : '#64748b',
                        boxShadow: jornadaView === item.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {jornadaView === 'cards' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
                  {!filteredJornadaAgents.length ? (
                    <div style={{ padding: 12, color: 'var(--muted)' }}>No hay datos reales para esta fecha.</div>
                  ) : null}
                  {filteredJornadaAgents.map((agent) => {
                    const isFinished = agent.currentState === 'fin';
                    const isLongPause = (agent.currentState === 'baño' && agent.times.baño > 900)
                      || (agent.currentState === 'descanso' && agent.times.descanso > 1800);
                    const totalBase = agent.times.total || Math.max(agent.times.productivo, agent.times.disponible) || 28800;
                    const totalWorked = agent.times.disponible;
                    const progress = totalBase ? Math.min((totalWorked / totalBase) * 100, 100) : 0;
                    const labelDisponible = formatDurationFromSeconds(agent.times.disponible);
                    const labelDescanso = agent.labels?.descansos || formatDurationFromSeconds(agent.times.descanso);
                    const labelBanos = agent.labels?.banos || formatDurationFromSeconds(agent.times.baño);
                    const labelCapacitacion = agent.labels?.supervisor || formatDurationFromSeconds(agent.times.capacitacion);
                    const labelProductivo = agent.labels?.productivo || formatDurationFromSeconds(agent.times.productivo);
                    const labelTotal = agent.labels?.total || (agent.times.total ? formatDurationFromSeconds(agent.times.total) : '--');
                    return (
                      <div
                        key={agent.id}
                        style={{
                          background: isFinished ? '#f8fafc' : '#fff',
                          borderRadius: 16,
                          padding: 20,
                          border: `2px solid ${isLongPause ? '#ef4444' : 'transparent'}`,
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                      >
                        {isFinished ? (
                          <div style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 999, background: '#64748b', color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
                            Finalizado
                          </div>
                        ) : null}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: agent.color, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {agent.avatar}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{agent.name}</div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                Inicio: {agent.loginTime}{agent.logoutTime ? ` · Fin: ${agent.logoutTime}` : ''}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {agent.logoutTime === 'En curso' ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: 'rgba(59,130,246,0.12)', padding: '4px 10px', borderRadius: 999 }}>
                                En curso
                              </span>
                            ) : null}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onClick={() => setJornadaMenuOpen((prev) => (prev === agent.id ? null : agent.id))}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 8,
                                  border: '1px solid #e2e8f0',
                                  background: '#fff',
                                  color: '#0f172a',
                                  fontSize: 18,
                                  lineHeight: '18px',
                                  cursor: 'pointer'
                                }}
                                aria-label="Opciones"
                              >
                                ⋮
                              </button>
                              {jornadaMenuOpen === agent.id ? (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 34,
                                    right: 0,
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 10,
                                    boxShadow: '0 10px 20px rgba(15,23,42,0.12)',
                                    padding: 6,
                                    minWidth: 140,
                                    zIndex: 10
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleAgentLogout(agent)}
                                    style={{
                                      width: '100%',
                                      border: 'none',
                                      background: 'transparent',
                                      textAlign: 'left',
                                      padding: '8px 10px',
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: '#dc2626',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Cerrar sesión
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, marginBottom: 14, width: '100%', justifyContent: 'center', ...stateBadgeStyle(agent.currentState) }}>
                          {agent.currentStateLabel || stateLabel(agent.currentState)}
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 80, fontSize: 12, color: '#64748b' }}>Disponible</div>
                            <div style={{ flex: 1, height: 28, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                              <div style={{ width: '100%', height: '100%', background: '#10b981', display: 'flex', alignItems: 'center', padding: '0 10px', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                                {labelDisponible}
                              </div>
                            </div>
                          </div>
                          {agent.times.descanso > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <div style={{ width: 80, fontSize: 12, color: '#64748b' }}>Descansos</div>
                              <div style={{ flex: 1, height: 28, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ width: '100%', height: '100%', background: '#f59e0b', display: 'flex', alignItems: 'center', padding: '0 10px', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                                  {labelDescanso}
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {agent.times.baño > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <div style={{ width: 80, fontSize: 12, color: '#64748b' }}>Baños</div>
                              <div style={{ flex: 1, height: 28, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ width: '100%', height: '100%', background: '#eab308', display: 'flex', alignItems: 'center', padding: '0 10px', color: '#422006', fontSize: 12, fontWeight: 700 }}>
                                  {labelBanos}
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {agent.times.capacitacion > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 80, fontSize: 12, color: '#64748b' }}>Capacit.</div>
                              <div style={{ flex: 1, height: 28, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ width: '100%', height: '100%', background: '#8b5cf6', display: 'flex', alignItems: 'center', padding: '0 10px', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                                  {labelCapacitacion}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{labelProductivo}</div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiempo Productivo</div>
                          </div>
                          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: isFinished ? '#0f172a' : '#ea580c' }}>
                              {isFinished ? labelTotal : (agent.times.total ? formatDurationFromSeconds(Math.max(0, agent.times.total - totalWorked)) : '--')}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {isFinished ? 'Total Jornada' : 'Restante Est.'}
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: '#6366f1' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(10, 1fr)', gap: 4, marginBottom: 8, minWidth: 1000 }}>
                    <div></div>
                    {jornadaHours.map((hour) => (
                      <div key={hour} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', padding: 6, background: '#f8fafc', borderRadius: 6 }}>
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                  {filteredJornadaAgents.map((agent) => (
                    <div key={`timeline-${agent.id}`} style={{ display: 'grid', gridTemplateColumns: '140px repeat(10, 1fr)', gap: 4, marginBottom: 6, minWidth: 1000, alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: agent.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                          {agent.avatar}
                        </div>
                        {agent.name}
                      </div>
                      {jornadaHours.map((hour) => {
                        const hourStart = hour * 60;
                        const hourEnd = (hour + 1) * 60;
                        return (
                          <div key={`${agent.id}-${hour}`} style={{ height: 46, background: '#f8fafc', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                            {(agent.schedule || []).map((block, idx) => {
                              if (!block.start) return null;
                              const [startH, startM] = block.start.split(':').map(Number);
                              const blockStart = startH * 60 + startM;
                              let blockEnd;
                              if (block.end) {
                                const [endH, endM] = block.end.split(':').map(Number);
                                blockEnd = endH * 60 + endM;
                              } else {
                                const now = new Date();
                                blockEnd = now.getHours() * 60 + now.getMinutes();
                              }
                              if (blockStart >= hourEnd || blockEnd <= hourStart) return null;
                              const relStart = Math.max(0, blockStart - hourStart);
                              const relEnd = Math.min(60, blockEnd - hourStart);
                              const width = ((relEnd - relStart) / 60) * 100;
                              const left = (relStart / 60) * 100;
                              const blockColor = block.type === 'login' ? '#059669'
                                : block.type === 'disponible' ? '#34d399'
                                  : block.type === 'descanso' ? '#f59e0b'
                                    : block.type === 'baño' ? '#eab308'
                                      : block.type === 'capacitacion' ? '#8b5cf6'
                                        : '#64748b';
                              return (
                                <div
                                  key={`${agent.id}-${hour}-${idx}`}
                                  style={{
                                    position: 'absolute',
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    height: '100%',
                                    borderRadius: 4,
                                    background: block.type === 'fin'
                                      ? 'repeating-linear-gradient(45deg, #94a3b8, #94a3b8 6px, #64748b 6px, #64748b 12px)'
                                      : blockColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: '#fff',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    padding: '0 2px'
                                  }}
                                  title={`${agent.name}: ${block.start}-${block.end || 'Ahora'} ${block.label}`}
                                >
                                  {block.label}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                    {[
                      { label: 'Inicio', color: '#059669' },
                      { label: 'Disponible', color: '#34d399' },
                      { label: 'Descanso', color: '#f59e0b' },
                      { label: 'Baño', color: '#eab308' },
                      { label: 'Capacitación', color: '#8b5cf6' },
                      { label: 'Fin', color: 'repeating-linear-gradient(45deg, #94a3b8, #94a3b8 6px, #64748b 6px, #64748b 12px)' }
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
                        <span style={{ width: 16, height: 16, borderRadius: 4, background: item.color, display: 'inline-block' }}></span>
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          </section>
          {detailAgent ? (
            <div className="lot-wizard-overlay" onClick={() => setDetailAgent(null)}>
              <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 980 }}>
                <div className="lot-wizard-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="person-badge" style={{ width: 44, height: 44 }}>{initials(detailAgent.name)}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0 }}>{detailAgent.name}</h3>
                        <Tag variant={statusVariant(detailStatus)}>{detailStatus}</Tag>
                        <span style={{ color: 'var(--muted)', fontSize: '0.86rem' }}>
                          Login {detailAgent?.login || '—'} · {detailAgent?.workTime || '—'}
                        </span>
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{activeDetail?.shift}</div>
                    </div>
                  </div>
                  <button className="icon-button" style={{ width: 36, height: 36 }} onClick={() => setDetailAgent(null)}><X size={16} color="#152235" /></button>
                </div>
                {detailLoading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando detalle del agente...</div> : null}
                {detailError ? <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 600 }}>{detailError}</div> : null}
                {!detailLoading && !detailError && !activeDetail ? (
                  <div style={{ marginBottom: 12, color: 'var(--muted)' }}>No hay detalle disponible para este agente.</div>
                ) : null}
                {isAttentionView ? (
                  <>
                    <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.35)', color: '#b45309', fontWeight: 600 }}>
                      Alertas activas del turno
                    </div>
                    <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                      {(activeDetail?.alerts || []).map((alert) => (
                        <div key={alert.title} style={{ border: '1px solid rgba(180,83,9,0.35)', background: 'rgba(251,191,36,0.12)', padding: 12, borderRadius: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{alert.title}</div>
                          <div style={{ color: '#78350f' }}>{alert.detail}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                      {(activeDetail?.kpis || []).map((kpi) => (
                        <div key={kpi.label} style={{ background: 'rgba(248,250,252,0.9)', border: `1px solid ${kpi.alert ? 'rgba(249,115,22,0.65)' : 'rgba(15,23,42,0.08)'}`, borderRadius: 14, padding: 14 }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{kpi.label}</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{kpi.value}</div>
                          <div style={{ color: kpi.alert ? '#b45309' : 'var(--muted)', fontSize: '0.8rem', fontWeight: kpi.alert ? 700 : 400 }}>
                            {kpi.sub}
                          </div>
                          <div style={{ marginTop: 6, fontSize: '0.75rem', fontWeight: 700, color: kpi.alert ? '#b45309' : '#15803d' }}>
                            {kpi.alert ? '↓ bajo la meta' : '↑ vs meta'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                      {['actividad', 'llamadas', 'semana'].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setDetailTab(tab)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 12,
                            border: detailTab === tab ? '1px solid rgba(180,83,9,0.7)' : '1px solid rgba(15,23,42,0.12)',
                            background: detailTab === tab ? 'rgba(251,191,36,0.12)' : '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                          }}
                        >
                          {tab === 'semana' ? 'Esta semana' : tab}
                        </button>
                      ))}
                    </div>
                    {detailTab === 'actividad' ? (
                      <>
                        {renderActivitySummary(activeDetail)}
                        {renderTimeline(activeDetail)}
                      </>
                    ) : null}
                    {detailTab === 'llamadas' ? (
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Hora</th><th>Duración</th><th>Cliente</th><th>Resultado</th></tr></thead>
                          <tbody>
                            {(activeDetail?.calls || []).map((row, idx) => {
                              const badge = callBadge(row.result);
                              const shortWarning = row.shortCall && row.result.toLowerCase().includes('venta') === false;
                              return (
                                <tr key={`${row.client}-${idx}`} style={shortWarning ? { background: 'rgba(254,226,226,0.6)' } : undefined}>
                                  <td>{row.time}</td>
                                  <td style={{ color: shortWarning ? '#b91c1c' : 'inherit', fontWeight: shortWarning ? 700 : 500 }}>{row.duration}{shortWarning ? ' ⚠' : ''}</td>
                                  <td>{row.client}</td>
                                  <td><span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: badge.bg, color: badge.color, fontWeight: 600, fontSize: '0.75rem' }}>{row.result}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    {detailTab === 'semana' ? (
                      <div>
                        <div style={{ marginBottom: 12, fontWeight: 700 }}>Tendencia de conversión</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, alignItems: 'end', height: 140, marginBottom: 16 }}>
                          {(activeDetail?.week?.trend || []).map((item) => (
                            <div key={item.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: '100%', height: `${item.value * 8}px`, background: 'rgba(251,191,36,0.7)', borderRadius: 8 }}></div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.day}</div>
                            </div>
                          ))}
                        </div>
                        <div className="table-wrap" style={{ marginBottom: 14 }}>
                          <table>
                            <thead><tr><th>Día</th><th>Conversión</th><th>Alertas</th></tr></thead>
                            <tbody>
                              {(activeDetail?.week?.trend || []).map((item) => (
                                <tr key={`row-${item.day}`}>
                                  <td>{item.day}</td>
                                  <td>{item.value}%</td>
                                  <td>{item.value < 10 ? '⚠ Conversión baja' : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                          {(activeDetail?.week?.summary || []).map((row) => (
                            <div key={row.label} style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 12, background: '#fff' }}>
                              <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{row.label}</div>
                              <div style={{ fontWeight: 700 }}>{row.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                      {(activeDetail?.kpis || []).map((kpi) => (
                        <div key={kpi.label} style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 14, padding: 14 }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{kpi.label}</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{kpi.value}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{kpi.sub}</div>
                          <div style={{ marginTop: 6, fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>↑ vs meta</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: 18 }}>
                      {renderActivitySummary(activeDetail)}
                      {renderTimeline(activeDetail)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Últimas llamadas del día</div>
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Hora</th><th>Duración</th><th>Cliente</th><th>Resultado</th></tr></thead>
                          <tbody>
                            {(activeDetail?.calls || []).map((row, idx) => {
                              const badge = callBadge(row.result);
                              return (
                                <tr key={`${row.client}-${idx}`}>
                                  <td>{row.time}</td>
                                  <td>{row.duration}</td>
                                  <td>{row.client}</td>
                                  <td><span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: badge.bg, color: badge.color, fontWeight: 600, fontSize: '0.75rem' }}>{row.result}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      );
    }
    const salesStatusMeta = (status) => {
      const map = {
        nuevo:        { label: 'Nuevo',        bg: 'rgba(57,255,20,0.14)',  color: '#1F8F1F', border: 'rgba(57,255,20,0.55)', dot: '#FF1744' },
        no_contesta:  { label: 'No contesta',  bg: 'rgba(245,166,35,0.12)',  color: '#F5A623', border: 'rgba(245,166,35,0.3)'  },
        no_contacto:  { label: 'No contacto',  bg: 'rgba(245,166,35,0.12)',  color: '#F5A623', border: 'rgba(245,166,35,0.3)'  },
        rellamar:     { label: 'Rellamar',     bg: 'rgba(74,144,217,0.12)',  color: '#4A90D9', border: 'rgba(74,144,217,0.3)'  },
        volver_a_llamar: { label: 'Rellamar', bg: 'rgba(74,144,217,0.12)', color: '#4A90D9', border: 'rgba(74,144,217,0.3)' },
        seguimiento:  { label: 'Seguimiento',  bg: 'rgba(155,89,182,0.12)', color: '#9B59B6', border: 'rgba(155,89,182,0.3)'  },
        interesado:   { label: 'Seguimiento',   bg: 'rgba(155,89,182,0.12)', color: '#9B59B6', border: 'rgba(155,89,182,0.3)'  },
        rechazo:      { label: 'Rechazo',      bg: 'rgba(229,62,62,0.12)',  color: '#E53E3E', border: 'rgba(229,62,62,0.3)'   },
        dato_erroneo: { label: 'Dato erroneo', bg: 'rgba(230,126,34,0.12)', color: '#E67E22', border: 'rgba(230,126,34,0.3)'  },
        venta:        { label: 'Venta',        bg: 'rgba(39,174,96,0.12)',  color: '#27AE60', border: 'rgba(39,174,96,0.3)'   },
        alta:         { label: 'Alta',         bg: 'rgba(39,174,96,0.12)',  color: '#27AE60', border: 'rgba(39,174,96,0.3)'   },
        recuperado:   { label: 'Recuperado',   bg: 'rgba(39,174,96,0.12)',  color: '#27AE60', border: 'rgba(39,174,96,0.3)'   }
      };
      return map[status] || map.nuevo;
    };

    function SalesStatusBadge({ status, small = false }) {
      const meta = salesStatusMeta(status);
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: small ? '4px 8px' : '7px 11px', borderRadius: 999, border: '1px solid ' + meta.border, background: meta.bg, color: meta.color, fontWeight: 700, fontSize: small ? '0.73rem' : '0.8rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot || meta.color }}></span>{meta.label}</span>;
    }

    const getTodayYmdLocal = () => new Date().toLocaleDateString('en-CA');

    const formatNextAction = (value) => {
      if (!value) return '-';
      if (value.includes('T')) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      }
      return value;
    };

    const isSalesActiveContact = (contact) => isCommercialContactActive(contact);

    function SalesDashboard({ contacts, salesRecords, onGoRoute, onVentaCerrada }) {
      const [assignedData, setAssignedData] = React.useState({ contactos: [], total: 0 });
      const [stats, setStats] = React.useState(null);
      const [agendaHoy, setAgendaHoy] = React.useState([]);
      const [loadingDash, setLoadingDash] = React.useState(true);
      const [clientePendiente, setClientePendiente] = React.useState(null);
      const [showBannerPendiente, setShowBannerPendiente] = React.useState(false);
      React.useEffect(() => {
        const cargar = async () => {
          setLoadingDash(true);
          try {
            const api = getApiClient();
            const hoy = getTodayYmdLocal();

            const contactosData = await api.get('/leads/assigned?page=1&limit=200&tab=todos');
            if (contactosData.success || contactosData.ok) {
              setAssignedData({
                contactos: contactosData.data.contactos || [],
                total: contactosData.data.total || 0
              });
            }

            const statsData = await api.get(`/leads/daily-stats?fecha=${hoy}`);
            if (statsData.success || statsData.ok) {
              setStats(statsData.data);
            }

            const agendaData = await api.get('/agenda');
            if (agendaData.success || agendaData.ok) {
              setAgendaHoy(agendaData.data.items || []);
            }
          } catch (err) {
            console.error('[dashboard] error:', err);
          } finally {
            setLoadingDash(false);
          }
        };
        cargar();
        try {
          const stored = localStorage.getItem('cliente_pendiente_alta');
          if (stored) {
            const borrador = JSON.parse(stored);
            setClientePendiente(borrador);
            setShowBannerPendiente(true);
          }
        } catch {
          localStorage.removeItem('cliente_pendiente_alta');
        }
      }, []);
      const contactosAsignados = assignedData.total;
      const gestionados = stats?.tocados || 0;
      const ventasCerradas = stats?.ventas || 0;
      const seguimientosPendientes = stats?.seguimiento || 0;
      const metricsRow1 = [
        { title: 'Contactos asignados', value: String(contactosAsignados), change: 0, label: 'lote recibido', trend: 'up', icon: Users, bg: 'rgba(37,99,235,0.12)', color: '#2563eb' },
        { title: 'Ventas cerradas', value: String(ventasCerradas), change: 0, label: `efectividad ${stats?.pct_efectividad ?? 0}%`, trend: 'up', icon: CheckCircle2, bg: 'rgba(22,163,74,0.12)', color: '#15803d' },
        { title: 'En agenda hoy', value: String(seguimientosPendientes), change: 0, label: `${stats?.seguimiento ?? 0} activos`, trend: 'up', icon: Calendar, bg: 'rgba(245,158,11,0.12)', color: '#b45309' }
      ];

      return (
        <div className="view">
          {showBannerPendiente && clientePendiente ? (
            <div style={{ background: '#FFF8E1', border: '1px solid #F5A623', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#333', margin: 0 }}>Tenés un alta de cliente pendiente</p>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{clientePendiente.nombre} {clientePendiente.apellido} — guardado el {new Date(clientePendiente.timestamp).toLocaleString('es-UY', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onVentaCerrada && onVentaCerrada(clientePendiente)} style={{ background: '#F5A623', color: '#FFF', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Completar alta</button>
                <button onClick={() => { try { localStorage.removeItem('cliente_pendiente_alta'); } catch {} setShowBannerPendiente(false); setClientePendiente(null); }} style={{ background: 'transparent', color: '#999', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>Descartar</button>
              </div>
            </div>
          ) : null}
          <section className="metrics-grid-4">
            <div><MetricCard item={metricsRow1[0]} /></div>
            <div>
              <div className="metric-card">
                <div className="metric-top">
                  <div>
                    <div className="metric-label">Contactos gestionados</div>
                    <h3 className="metric-value">{gestionados}</h3>
                    <div className="trend up">
                      <span style={{ fontWeight: 500, opacity: 0.7 }}>
                        {contactosAsignados > 0
                          ? `${Math.round(gestionados / Math.max(contactosAsignados, 1) * 100)}% del lote`
                          : '0% del lote'}
                      </span>
                    </div>
                  </div>
                  <div className="metric-icon" style={{ background: 'rgba(139,92,246,0.12)' }}><CheckCircle2 size={24} color="#7c3aed" /></div>
                </div>
              </div>
            </div>
            <div><MetricCard item={metricsRow1[1]} /></div>
            <div><MetricCard item={metricsRow1[2]} /></div>
          </section>
          <section className="content-grid">
            <Panel className="span-8" title="Operación del día" subtitle="Trabaja solo tus contactos asignados">
              <div className="list">
                {agendaHoy.slice(0, 4).map((item) => {
                  const isVencido = new Date(item.fecha_agenda) < new Date(new Date().toDateString());
                  return (
                  <div
                    key={item.id}
                    className="status-item"
                    style={isVencido ? { borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.08)' } : undefined}
                  >
                    <div className="status-ring" style={{ background: 'rgba(15,118,110,0.12)', color: '#0f766e' }}><PhoneCall size={16} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>
                        {item.nombre} {item.apellido}
                      </div>
                      <div style={{ color: isVencido ? '#b45309' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        Agendado: {new Date(item.fecha_agenda).toLocaleString('es-UY', {
                          day: 'numeric', month: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                        {isVencido ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.18)', color: '#b45309', fontSize: 11, fontWeight: 700 }}>
                            Vencido
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <SalesStatusBadge status={item.estado_venta} small />
                  </div>
                  );
                })}
                {agendaHoy.length === 0 && (
                  <p style={{ color: '#aaa', fontSize: 13, padding: '16px 0' }}>
                    Sin seguimientos para hoy
                  </p>
                )}
              </div>
            </Panel>
          </section>
        </div>
      );
    }

    const ESTADOS_FINALES_GESTION = ['venta', 'rechazo', 'dato_erroneo'];

    const formatLastGestion = (isoStr) => {
      if (!isoStr) return '';
      try {
        return new Date(isoStr).toLocaleString('es-UY', {
          day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } catch {
        return '';
      }
    };

    const normalizeAssignedContact = (raw) => ({
      ...raw,
      name: [raw.nombre, raw.apellido].filter(Boolean).join(' ').trim() || raw.nombre || '',
      phone: raw.celular || raw.telefono || '',
      city: raw.departamento || raw.localidad || '',
      status: raw.estado_venta || 'nuevo',
      last: formatLastGestion(raw.ultima_gestion_real)
    });

    function SalesContactsView({ contacts, selectedId, onSelect, onRegister, salesRecords, products, onAssignFamilySale, onUpdateContact, onVentaCerrada, onOpenNewClient, mode = 'contactos', vendedorNewClientOpen = false }) {
      const api = getApiClient();
      const isRecupero = mode === 'recupero';
      const accentColor = isRecupero ? '#f97316' : '#1A5C4A';
      const accentSoft = isRecupero ? 'rgba(249,115,22,0.12)' : '#F0FAF6';
      const accentText = isRecupero ? '#9a3412' : '#1A5C4A';
      const accentMuted = isRecupero ? '#ea580c' : '#1A5C4A';
      const [localContacts, setLocalContacts] = React.useState(() => contacts.filter(isSalesActiveContact));
      const [loadingContacts, setLoadingContacts] = React.useState(true);
      const [stats, setStats] = React.useState(null);
      const [vistaMetricas, setVistaMetricas] = React.useState('hoy');
      const tabs = isRecupero
        ? [
          { key: 'nuevos', label: 'Nuevos' },
          { key: 'seguimiento', label: 'Seguimiento' },
          { key: 'no_contacto', label: 'No contacto' },
          { key: 'rechazo', label: 'Rechazos' },
          { key: 'recuperado', label: 'Recuperados' }
        ]
        : [
          { key: 'nuevo', label: 'Nuevos' },
          { key: 'no_contesta', label: 'No contesta' },
          { key: 'rechazo', label: 'Rechazos' }
        ];
      const estadosFinalesGestion = isRecupero ? ['alta', 'rechazo', 'dato_erroneo'] : ESTADOS_FINALES_GESTION;
      const estadosConAgenda = isRecupero ? ['interesado', 'volver_a_llamar'] : ['seguimiento', 'rellamar'];
      const opcionesGestion = isRecupero
        ? [
          { value: 'no_contesta', label: 'No contesta' },
          { value: 'volver_a_llamar', label: 'Rellamar' },
          { value: 'interesado', label: 'Seguimiento' },
          { value: 'rechazo', label: 'Rechazo' },
          { value: 'dato_erroneo', label: 'Dato erróneo' },
          { value: 'alta', label: 'Venta' }
        ]
        : [
          { value: 'no_contesta', label: 'No contesta' },
          { value: 'rellamar', label: 'Rellamar' },
          { value: 'seguimiento', label: 'Seguimiento' },
          { value: 'rechazo', label: 'Rechazo' },
          { value: 'dato_erroneo', label: 'Dato erróneo' },
          { value: 'venta', label: 'Venta' }
        ];
      const [tabActivo, setTabActivo] = React.useState(isRecupero ? 'nuevos' : 'nuevo');
      const [page, setPage] = React.useState(1);
      const [totalPages, setTotalPages] = React.useState(1);
      const [totalContactos, setTotalContactos] = React.useState(0);
      const LIMIT = 50;
      const [searchTerm, setSearchTerm] = React.useState('');
      const [searchDebounced, setSearchDebounced] = React.useState('');

      const loadStats = React.useCallback(async () => {
        try {
          const hoy = getTodayYmdLocal();
          const statsUrl = `/leads/daily-stats?fecha=${hoy}&tipo=${isRecupero ? 'recupero' : 'captacion'}`;
          const d = await api.get(statsUrl);
          console.log('[daily-stats]:', d);
          console.log('[daily-stats] respuesta completa:', JSON.stringify(d.data));
          if (d?.success || d?.ok) setStats(d.data);
        } catch (err) {
          console.error('[daily-stats] error:', err);
        }
      }, []); // eslint-disable-line react-hooks/exhaustive-deps
      const refreshSilencioso = React.useCallback(async () => {
        try {
          const hoy = getTodayYmdLocal();
          const params = new URLSearchParams({
            page: String(page),
            limit: String(LIMIT),
            tab: tabActivo
          });
          params.set('tipo', isRecupero ? 'recupero' : 'captacion');
          if (searchDebounced) params.set('search', searchDebounced);
          const contactosData = await api.get(`/leads/assigned?${params}`);
          if (contactosData?.success || contactosData?.ok) {
            const items = contactosData?.data?.contactos || [];
            setLocalContacts(items.map(normalizeAssignedContact));
            setTotalPages(contactosData?.data?.totalPages || 1);
            setTotalContactos(contactosData?.data?.total || 0);
          }

          const statsUrl = `/leads/daily-stats?fecha=${hoy}&tipo=${isRecupero ? 'recupero' : 'captacion'}`;
          const statsData = await api.get(statsUrl);
          if (statsData?.success || statsData?.ok) setStats(statsData.data);
        } catch (err) {
          console.error('[refresh] error silencioso:', err);
        }
      }, [page, tabActivo, searchDebounced]); // eslint-disable-line react-hooks/exhaustive-deps

      const cargarContactos = React.useCallback(async () => {
        setLoadingContacts(true);
        try {
          const params = new URLSearchParams({
            page: String(page),
            limit: String(LIMIT),
            tab: tabActivo
          });
          params.set('tipo', isRecupero ? 'recupero' : 'captacion');
          if (searchDebounced) params.set('search', searchDebounced);
          const d = await api.get(`/leads/assigned?${params}`);
          console.log('[assigned] params:', params.toString(), 'resp:', d);
          if (d?.success || d?.ok) {
            const items = d?.data?.contactos || [];
            setLocalContacts(items.map(normalizeAssignedContact));
            setTotalPages(d?.data?.totalPages || 1);
            setTotalContactos(d?.data?.total || 0);
          }
        } catch {
          const fallback = contacts.filter(isSalesActiveContact);
          setLocalContacts(fallback);
          setTotalPages(1);
          setTotalContactos(fallback.length);
        } finally {
          setLoadingContacts(false);
        }
      }, [contacts, page, tabActivo, searchDebounced]); // eslint-disable-line react-hooks/exhaustive-deps

      const [drawerContact, setDrawerContact] = React.useState(null);
      const drawerOpen = Boolean(drawerContact);

      React.useEffect(() => {
        if (vendedorNewClientOpen || drawerOpen) return;
        loadStats();
      }, [loadStats, vendedorNewClientOpen, drawerOpen]);
      const [nextLoading, setNextLoading] = React.useState(false);
      const [nextMessage, setNextMessage] = React.useState('');
      const [activeTab, setActiveTab] = React.useState('datos');
      const [estadoGestion, setEstadoGestion] = React.useState('');
      const [notaGestion, setNotaGestion] = React.useState('');
      const [fechaAgenda, setFechaAgenda] = React.useState('');
      const [horaAgenda, setHoraAgenda] = React.useState('');
      const [agendaSeleccionada, setAgendaSeleccionada] = React.useState(null);
      const [mostrarManual, setMostrarManual] = React.useState(false);
      const fechaAgendaRef = React.useRef('');
      const horaAgendaRef = React.useRef('');
      const [guardando, setGuardando] = React.useState(false);
      const [gestionError, setGestionError] = React.useState('');
      const [statusOverrides, setStatusOverrides] = React.useState({});
      const [clientePendiente, setClientePendiente] = React.useState(null);
      const [showBannerPendiente, setShowBannerPendiente] = React.useState(false);
      const [draftCelular, setDraftCelular] = React.useState('');
      const [savingCelular, setSavingCelular] = React.useState(false);
      const [savingDireccion, setSavingDireccion] = React.useState(false);
      const [familiares, setFamiliares] = React.useState([]);
      const [familiaresLoading, setFamiliaresLoading] = React.useState(false);
      const [draftDireccion, setDraftDireccion] = React.useState('');
      const [nuevoContactoOpen, setNuevoContactoOpen] = React.useState(false);
      const [nuevoContactoError, setNuevoContactoError] = React.useState('');
      const [nuevoContactoSaving, setNuevoContactoSaving] = React.useState(false);
      const [nuevoContacto, setNuevoContacto] = React.useState({
        nombre: '',
        apellido: '',
        documento: '',
        fecha_nacimiento: '',
        telefono: '',
        celular: '',
        correo_electronico: '',
        direccion: '',
        departamento: '',
        localidad: '',
        pais: 'Uruguay'
      });

      React.useEffect(() => {
        const handler = setTimeout(() => {
          setSearchDebounced(searchTerm.trim());
          setPage(1);
        }, 350);
        return () => clearTimeout(handler);
      }, [searchTerm]);

      React.useEffect(() => {
        if (vendedorNewClientOpen || drawerOpen) return;
        cargarContactos();
      }, [page, tabActivo, searchDebounced, vendedorNewClientOpen, drawerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

      const prevModalOpen = React.useRef(false);
      const prevDrawerOpen = React.useRef(false);
      React.useEffect(() => {
        const justClosedModal = prevModalOpen.current && !vendedorNewClientOpen;
        const justClosedDrawer = prevDrawerOpen.current && !drawerOpen;
        if (justClosedModal || justClosedDrawer) {
          cargarContactos();
          loadStats();
        }
        prevModalOpen.current = vendedorNewClientOpen;
        prevDrawerOpen.current = drawerOpen;
      }, [vendedorNewClientOpen, drawerOpen, cargarContactos, loadStats]);

      React.useEffect(() => {
        try {
          const stored = localStorage.getItem('cliente_pendiente_alta');
          if (stored) {
            const borrador = JSON.parse(stored);
            setClientePendiente(borrador);
            setShowBannerPendiente(true);
          }
        } catch {
          localStorage.removeItem('cliente_pendiente_alta');
        }
      }, []);

      const filteredContacts = React.useMemo(() => localContacts, [localContacts]);
      const visibleContacts = React.useMemo(
        () => filteredContacts.filter((contact) => (isRecupero ? true : contact.estado_venta !== 'dato_erroneo')),
        [filteredContacts, isRecupero]
      );

      const resetForm = () => {
        setActiveTab('datos');
        setEstadoGestion('');
        setNotaGestion('');
        setFechaAgenda('');
        setHoraAgenda('');
        setAgendaSeleccionada(null);
        setMostrarManual(false);
        fechaAgendaRef.current = '';
        horaAgendaRef.current = '';
        setGestionError('');
        setDraftCelular('');
        setDraftDireccion('');
      };

      const resolvePrincipalContactId = React.useCallback(() => {
        const selected = localContacts.find((c) => String(c.id) === String(selectedId))
          || localContacts[0]
          || null;
        if (!selected) return '';
        return selected.contact_id || selected.contactId || selected.contacto_id || selected.id || '';
      }, [localContacts, selectedId]);

      React.useEffect(() => {
        if (!selectedId) return;
        if (drawerContact?.id && String(drawerContact.id) === String(selectedId)) return;
        const selected = localContacts.find((c) => String(c.id) === String(selectedId));
        if (selected) openDrawer(selected);
      }, [drawerContact?.id, localContacts, selectedId]);

      const openNuevoContacto = () => {
        setNuevoContactoError('');
        setNuevoContacto({
          nombre: '',
          apellido: '',
          documento: '',
          fecha_nacimiento: '',
          telefono: '',
          celular: '',
          correo_electronico: '',
          direccion: '',
          departamento: '',
          localidad: '',
          pais: 'Uruguay'
        });
        setNuevoContactoOpen(true);
      };

      const handleGuardarNuevoContacto = async () => {
        const principalContactId = resolvePrincipalContactId();
        if (!principalContactId) {
          setNuevoContactoError('No se pudo determinar el contacto principal del lote.');
          return;
        }
        if (!nuevoContacto.nombre.trim() || !nuevoContacto.apellido.trim()) {
          setNuevoContactoError('Ingresa nombre y apellido.');
          return;
        }
        const payload = {
          principal_contact_id: principalContactId,
          contact: {
            nombre: nuevoContacto.nombre,
            apellido: nuevoContacto.apellido,
            documento: nuevoContacto.documento || '',
            fecha_nacimiento: nuevoContacto.fecha_nacimiento || '',
            telefono: nuevoContacto.telefono || '',
            celular: nuevoContacto.celular || '',
            correo_electronico: nuevoContacto.correo_electronico || '',
            direccion: nuevoContacto.direccion || '',
            departamento: nuevoContacto.departamento || '',
            localidad: nuevoContacto.localidad || '',
            pais: nuevoContacto.pais || 'Uruguay'
          }
        };
        setNuevoContactoSaving(true);
        setNuevoContactoError('');
        try {
          await api.post('/leads/new', payload);
          setNuevoContactoOpen(false);
          await refreshSilencioso();
        } catch (err) {
          setNuevoContactoError(err?.message || 'No se pudo crear el contacto.');
        } finally {
          setNuevoContactoSaving(false);
        }
      };

      const opcionesAgenda = () => {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        const formatYmd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        const formatHm = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
        const en1hora = new Date(now.getTime() + 60 * 60 * 1000);
        const en2horas = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const hoy = formatYmd(now);
        const antes16 = new Date(now);
        antes16.setHours(15, 45, 0, 0);
        const manana = new Date(now);
        manana.setDate(manana.getDate() + 1);
        const mananaStr = formatYmd(manana);
        return [
          { label: 'Llamar en 1 hora', hora: formatHm(en1hora), fecha: formatYmd(en1hora), visible: true },
          { label: 'Llamar en 2 horas', hora: formatHm(en2horas), fecha: formatYmd(en2horas), visible: true },
          { label: 'Llamar antes de las 16hs', hora: '15:45', fecha: hoy, visible: true },
          { label: 'Mañana por la mañana', hora: '10:00', fecha: mananaStr, visible: true },
          { label: 'Mañana por la tarde', hora: '17:00', fecha: mananaStr, visible: true }
        ].filter((o) => o.visible);
      };

      const seleccionarAgenda = (opcion) => {
        setAgendaSeleccionada(opcion);
        setFechaAgenda(opcion.fecha);
        setHoraAgenda(opcion.hora);
        fechaAgendaRef.current = opcion.fecha;
        horaAgendaRef.current = opcion.hora;
        setMostrarManual(false);
      };

      const openDrawer = (c) => {
        setDrawerContact(c);
        setNextMessage('');
        resetForm();
        setDraftCelular(c?.celular || pickCellular(c) || '');
        setDraftDireccion(pickDireccion(c));
        onSelect(c.id || null);
      };

      React.useEffect(() => {
        let active = true;
        const contactId = drawerContact?.id;
        if (!contactId) {
          setFamiliares([]);
          return () => {};
        }
        const api = getApiClient();
        setFamiliaresLoading(true);
        api.get(`/leads/${contactId}/familiares`)
          .then((response) => {
            if (!active) return;
            const items = response?.items || response?.data?.items || [];
            setFamiliares(Array.isArray(items) ? items : []);
          })
          .catch(() => {
            if (!active) return;
            setFamiliares([]);
          })
          .finally(() => {
            if (!active) return;
            setFamiliaresLoading(false);
          });
        return () => { active = false; };
      }, [drawerContact?.id]);

      const closeDrawer = () => {
        if (!estadoGestion) {
          setActiveTab('gestion');
          setGestionError('Seleccioná una codificación para cerrar.');
          return;
        }
        setDrawerContact(null);
        resetForm();
        onSelect(null);
      };

      const handleNextContact = async () => {
        if (nextLoading) return;
        setNextLoading(true);
        setNextMessage('');
        try {
          const nextUrl = `/leads/next?tipo=${isRecupero ? 'recupero' : 'captacion'}`;
          const res = await api.get(nextUrl);
          if (res?.data) {
            openDrawer(res.data);
          } else {
            setNextMessage(res?.message || 'No hay contactos disponibles en esta franja horaria.');
          }
        } catch {
          setNextMessage('No se pudo obtener el siguiente contacto.');
        } finally {
          setNextLoading(false);
        }
      };

      const buildVentaDraft = (contact) => ({
        contacto_id: String(contact.id),
        contact_id: contact.contact_id || contact.contactId || contact.contacto_id || contact.id || '',
        principal_contact_id: contact.contact_id || contact.contactId || contact.contacto_id || contact.id || '',
        nombre: contact.nombre || contact.name?.split(' ')[0] || '',
        apellido: contact.apellido || (contact.name?.split(' ').slice(1).join(' ')) || '',
        documento: contact.documento || '',
        fecha_nacimiento: contact.fecha_nacimiento || contact.fechaNacimiento || '',
        telefono: contact.telefono || contact.phone || '',
        celular: contact.celular || '',
        correo_electronico: contact.correo_electronico || contact.email || '',
        direccion: pickDireccion(contact) || '',
        departamento: contact.departamento || contact.departamento_residencia || contact.city || '',
        localidad: contact.localidad || contact.ciudad || contact.localidad_residencia || '',
        pais: contact.pais || 'Uruguay',
        batch_id: contact.batch_id || contact.lotId || '',
        timestamp: new Date().toISOString()
      });

      const handleGuardarGestion = async () => {
        if (guardando || !dc || !estadoGestion) return;
        setGuardando(true);
        setGestionError('');
        try {
          let fecha_agenda;
          if (estadosConAgenda.includes(estadoGestion)) {
            const fecha = fechaAgenda || fechaAgendaRef.current;
            const hora = horaAgenda || horaAgendaRef.current || '10:00';
            if (!fecha) {
              setGestionError('Seleccioná una opción de agenda antes de guardar.');
              setGuardando(false);
              return;
            }
            fecha_agenda = `${fecha}T${hora}:00`;
          }

          const gestionPayload = {
            status: estadoGestion,
            note: notaGestion.trim() || undefined,
            nextAction: fecha_agenda,
            fecha_agenda
          };

          const { gestion_id } = await registerCommercialManagement(dc.id, gestionPayload);

          const contactId = dc.id;
          const ahora = new Date().toISOString();
          const applyUpdate = (c) => ({
            ...c,
            status: estadoGestion,
            ultima_gestion_real: ahora,
            last: formatLastGestion(ahora)
          });

          if (estadosFinalesGestion.includes(estadoGestion)) {
            setLocalContacts((prev) => {
              const found = prev.find((c) => String(c.id) === String(contactId));
              const resto = prev.filter((c) => String(c.id) !== String(contactId));
              return found ? [...resto, applyUpdate(found)] : prev;
            });
          } else {
            setLocalContacts((prev) =>
              prev.map((c) => String(c.id) === String(contactId) ? applyUpdate(c) : c)
            );
          }

          setStatusOverrides((prev) => ({ ...prev, [contactId]: estadoGestion }));

          if (estadosConAgenda.includes(estadoGestion)) {
            try { localStorage.setItem('agenda_needs_refresh', 'true'); } catch {}
          }

          const isVentaFlow = (isRecupero && estadoGestion === 'alta') ||
                              (!isRecupero && estadoGestion === 'venta');

          if (isVentaFlow) {
            try {
              localStorage.setItem('cliente_pendiente_alta',
                JSON.stringify(buildVentaDraft(dc)));
            } catch {}

            closeDrawer();

            if (onOpenNewClient) {
              onOpenNewClient(buildVentaDraft(dc), gestion_id ?? null, null, 'registrar_venta');
            } else if (onVentaCerrada) {
              onVentaCerrada(dc, gestion_id ?? null);
            }

            await refreshSilencioso();
            return;
          }

          closeDrawer();
          await refreshSilencioso();

        } catch (err) {
          const msg = String(err?.message || '');
          if (msg.includes('409')) {
            setGestionError('Este contacto ya fue gestionado recientemente.');
          } else {
            setGestionError(msg || 'No se pudo guardar la gestión.');
          }
        } finally {
          setGuardando(false);
        }
      };

      const dc = drawerContact;
      const drawerNombre = dc ? (dc.name || [dc.nombre, dc.apellido].filter(Boolean).join(' ') || '-') : '';
      const drawerTelefono = dc ? (dc.phone || dc.telefono || '-') : '';
      const drawerCelular = dc ? (pickCellular(dc) || dc.celular || '-') : '';
      const drawerDireccion = dc ? (pickDireccion(dc) || '') : '';
      const drawerUbicacion = dc ? (dc.city || [dc.localidad, dc.departamento].filter(Boolean).join(', ') || '-') : '';
      const drawerFuente = dc ? (dc.source || dc.origen_dato || null) : null;
      const drawerLote = dc ? (dc.lotId || dc.batch_id || null) : null;
      const drawerEstado = dc ? (statusOverrides[dc.id] || dc.status || dc.estado_venta || 'nuevo') : 'nuevo';
      const headerTitle = isRecupero ? 'Recupero' : 'Contactos asignados';
      const headerSubtitle = isRecupero ? 'Gestiona tu cartera de clientes en baja' : 'Gestiona solo tu lote operativo';
      const isVentaFlow = (isRecupero && estadoGestion === 'alta') || (!isRecupero && estadoGestion === 'venta');

      return (
        <div className="view sales-contacts-view">
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              {isRecupero ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: accentText, background: accentSoft, padding: '4px 10px', borderRadius: 999, marginBottom: 6 }}>
                  RECUPERO
                </span>
              ) : null}
              <h2 style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 17 }}>{headerTitle}</h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{headerSubtitle}</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="searchbox" style={{ width: 280 }}>
                <Search size={16} color="#69788d" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre, teléfono o documento..." />
              </div>
              {!isRecupero ? (
                <button
                  onClick={openNuevoContacto}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: accentColor, border: `1px solid ${accentColor}`, borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} />
                  Nuevo contacto
                </button>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <button
                  onClick={handleNextContact}
                  disabled={nextLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: accentColor, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: nextLoading ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: nextLoading ? 0.7 : 1 }}
                >
                  <span>▶</span>
                  {nextLoading ? 'Buscando...' : 'Empezar gestión'}
                </button>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>El sistema te asigna el próximo contacto a llamar</span>
              </div>
            </div>
          </div>

          {nextMessage ? (
            <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#795548', marginBottom: 12 }}>
              {nextMessage}
            </div>
          ) : null}

          {nuevoContactoOpen ? (
            <>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 140 }} onClick={() => setNuevoContactoOpen(false)} />
              <div style={{ position: 'fixed', right: 24, top: 32, bottom: 32, width: 'min(560px, calc(100% - 48px))', background: '#fff', borderRadius: 24, boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)', padding: 24, zIndex: 141, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>Nuevo contacto</p>
                    <h3 style={{ margin: '6px 0', fontSize: 20, fontWeight: 700 }}>Agregar al lote</h3>
                  </div>
                  <button type="button" onClick={() => setNuevoContactoOpen(false)} style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' }}>
                    <X size={16} color="#475569" />
                  </button>
                </div>

                {nuevoContactoError ? (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#B91C1C' }}>
                    {nuevoContactoError}
                  </div>
                ) : null}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, overflowY: 'auto', paddingRight: 4 }}>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569' }}>
                    Nombre
                    <input className="input" value={nuevoContacto.nombre} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, nombre: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569' }}>
                    Apellido
                    <input className="input" value={nuevoContacto.apellido} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, apellido: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569' }}>
                    Documento
                    <input className="input" value={nuevoContacto.documento} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, documento: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569' }}>
                    Fecha de nacimiento
                    <input className="input" type="date" value={nuevoContacto.fecha_nacimiento} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, fecha_nacimiento: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569' }}>
                    Teléfono
                    <input className="input" value={nuevoContacto.telefono} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, telefono: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569' }}>
                    Celular
                    <input className="input" value={nuevoContacto.celular} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, celular: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569', gridColumn: '1 / -1' }}>
                    Email
                    <input className="input" value={nuevoContacto.correo_electronico} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, correo_electronico: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569', gridColumn: '1 / -1' }}>
                    Dirección
                    <input className="input" value={nuevoContacto.direccion} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, direccion: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569' }}>
                    Departamento
                    <input className="input" value={nuevoContacto.departamento} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, departamento: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569' }}>
                    Localidad
                    <input className="input" value={nuevoContacto.localidad} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, localidad: e.target.value }))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#475569' }}>
                    País
                    <input className="input" value={nuevoContacto.pais} onChange={(e) => setNuevoContacto((prev) => ({ ...prev, pais: e.target.value }))} />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className="button secondary" onClick={() => setNuevoContactoOpen(false)} style={{ padding: '8px 16px' }}>Cancelar</button>
                  <button className="button" onClick={handleGuardarNuevoContacto} disabled={nuevoContactoSaving} style={{ padding: '8px 16px', background: accentColor, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}>
                    {nuevoContactoSaving ? 'Guardando...' : 'Guardar contacto'}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {showBannerPendiente && clientePendiente ? (
            <div style={{ background: '#FFF8E1', border: '1px solid #F5A623', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#333', margin: 0 }}>Tenés un alta de cliente pendiente</p>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{clientePendiente.nombre} {clientePendiente.apellido} — guardado el {new Date(clientePendiente.timestamp).toLocaleString('es-UY', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onVentaCerrada && onVentaCerrada(clientePendiente)} style={{ background: '#F5A623', color: '#FFF', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Completar alta</button>
                <button onClick={() => { try { localStorage.removeItem('cliente_pendiente_alta'); } catch {} setShowBannerPendiente(false); setClientePendiente(null); }} style={{ background: 'transparent', color: '#999', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>Descartar</button>
              </div>
            </div>
          ) : null}

          {stats && (() => {
            const metricas = vistaMetricas === 'hoy'
              ? (isRecupero
                ? [
                  { label: 'Gestionados', value: stats?.gestiones_hoy, color: accentColor },
                  { label: 'No contacto', value: stats?.no_contesta_hoy, color: '#F5A623' },
                  { label: 'Rellamar', value: stats?.rellamar_hoy, color: '#4A90D9' },
                  { label: 'Seguimiento', value: stats?.tipificados_seguimiento_hoy, color: '#9B59B6' },
                  { label: 'Rechazos', value: stats?.rechazos_hoy, color: '#E53E3E' },
                  { label: 'Recuperos', value: stats?.ventas_hoy, color: '#27AE60' },
                  { label: 'Contacto', value: `${stats?.pct_contacto_hoy ?? 0}%`, color: '#4A90D9' },
                  { label: 'Efectividad', value: `${stats?.pct_efectividad_hoy ?? 0}%`, color: '#27AE60' }
                ]
                : [
                  { label: 'Tocados', value: stats?.gestiones_hoy, color: '#1A5C4A' },
                  { label: 'No contesta', value: stats?.no_contesta_hoy, color: '#F5A623' },
                  { label: 'Rellamar', value: stats?.rellamar_hoy, color: '#4A90D9' },
                  { label: 'Seguimiento', value: stats?.tipificados_seguimiento_hoy, color: '#9B59B6' },
                  { label: 'Rechazos', value: stats?.rechazos_hoy, color: '#E53E3E' },
                  { label: 'Ventas', value: stats?.ventas_hoy, color: '#27AE60' },
                  { label: 'Contacto', value: `${stats?.pct_contacto_hoy ?? 0}%`, color: '#4A90D9' },
                  { label: 'Efectividad', value: `${stats?.pct_efectividad_hoy ?? 0}%`, color: '#27AE60' }
                ])
              : (isRecupero
                ? [
                  { label: 'Asignados', value: stats?.total_asignados, color: '#333' },
                  { label: 'Seguimiento', value: stats?.seguimiento, color: '#9B59B6' },
                  { label: 'No contacto', value: stats?.no_contesta, color: '#F5A623' },
                  { label: 'Rechazos', value: stats?.rechazos, color: '#E53E3E' },
                  { label: 'Recuperos', value: stats?.ventas, color: '#27AE60' },
                  { label: 'Contacto', value: `${stats?.pct_contacto ?? 0}%`, color: '#4A90D9' },
                  { label: 'Efectividad', value: `${stats?.pct_efectividad ?? 0}%`, color: '#27AE60' }
                ]
                : [
                  { label: 'Asignados', value: stats?.total_asignados, color: '#333' },
                  { label: 'Nuevos', value: stats?.nuevos, color: '#9E9E9E' },
                  { label: 'No contesta', value: stats?.no_contesta, color: '#F5A623' },
                  { label: 'En agenda', value: stats?.seguimiento, color: '#9B59B6' },
                  { label: 'Rechazos', value: stats?.rechazos, color: '#E53E3E' },
                  { label: 'Ventas', value: stats?.ventas, color: '#27AE60' },
                  { label: 'Contacto', value: `${stats?.pct_contacto ?? 0}%`, color: '#4A90D9' },
                  { label: 'Efectividad', value: `${stats?.pct_efectividad ?? 0}%`, color: '#27AE60' }
                ]);

            return (
              <div style={{
                background: '#FFFFFF',
                borderRadius: 10,
                padding: '10px 16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{
                  display: 'flex',
                  background: '#F5F5F5',
                  borderRadius: 6,
                  padding: 2,
                  gap: 2,
                  flexShrink: 0,
                  marginRight: 8
                }}>
                  {['hoy', 'lote'].map((v) => (
                    <button
                      key={v}
                      onClick={() => setVistaMetricas(v)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 4,
                        border: 'none',
                        fontSize: 11,
                        fontWeight: vistaMetricas === v ? 600 : 400,
                        background: vistaMetricas === v ? accentColor : 'transparent',
                        color: vistaMetricas === v ? '#FFF' : '#888',
                        cursor: 'pointer'
                      }}
                    >
                      {v === 'hoy' ? 'Hoy' : 'Lote'}
                    </button>
                  ))}
                </div>

                <div style={{
                  width: 1, height: 32,
                  background: '#E0E0E0',
                  flexShrink: 0
                }} />

                <div style={{
                  display: 'flex',
                  flex: 1,
                  justifyContent: 'space-around',
                  alignItems: 'center'
                }}>
                  {metricas.map((m) => (
                    <div key={m.label} style={{
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }} title={m.tooltip || undefined}>
                      <span style={{
                        fontSize: 16, fontWeight: 700,
                        color: m.color, lineHeight: 1
                      }}>
                        {m.value ?? 0}
                      </span>
                      <span style={{
                        fontSize: 10, color: '#aaa',
                        lineHeight: 1, whiteSpace: 'nowrap'
                      }}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div style={{
            display: 'flex', gap: 4, marginBottom: 12,
            borderBottom: '1px solid #E0E0E0', paddingBottom: 0
          }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { console.log('[tabs] click:', t.key); setTabActivo(t.key); setPage(1); }}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tabActivo === t.key
                    ? `2px solid ${accentColor}` : '2px solid transparent',
                  color: tabActivo === t.key ? accentColor : '#888',
                  fontWeight: tabActivo === t.key ? 600 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  marginBottom: -1
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <table className="sales-contacts-table">
              <thead>
                <tr>
                  <th>Estado</th><th>Origen del dato</th><th>Contacto</th>
                  <th>Ubicación</th><th>Última gestión</th>
                </tr>
              </thead>
              <tbody>
                {visibleContacts.map((contact) => {
                  const statusRaw = contact.estado_venta || contact.resultado || contact.status || '';
                  const isRechazo = String(statusRaw).toLowerCase() === 'rechazo';
                  return (
                    <tr
                      key={contact.id}
                      className="support-row"
                      onClick={() => { if (!isRechazo) openDrawer(contact); }}
                      style={{ cursor: isRechazo ? 'not-allowed' : 'pointer', opacity: isRechazo ? 0.6 : 1 }}
                    >
                    {(() => {
                      const statusValue = statusOverrides[contact.id] || contact.status;
                      const isNuevo = String(statusValue || '').toLowerCase() === 'nuevo';
                      return (
                        <>
                          <td><SalesStatusBadge status={statusValue} small /></td>
                          <td>
                            {contact.origen_dato || contact.origen || contact.source || contact.origenDato || contact.origin || '—'}
                          </td>
                          <td>
                            <div className="person">
                              <div className="person-badge">{initials(contact.name)}</div>
                              <strong>{contact.name}</strong>
                            </div>
                          </td>
                          <td>{contact.city}</td>
                          <td>{!isNuevo && contact.last ? contact.last : <span style={{ color: '#ccc' }}>—</span>}</td>
                        </>
                      );
                    })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loadingContacts ? (
              <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando contactos...</div>
            ) : !visibleContacts.length ? (
              <div style={{ padding: 16, color: 'var(--muted)' }}>
                {isRecupero && tabActivo === 'nuevos'
                  ? 'No hay contactos nuevos de recupero'
                  : 'No hay contactos activos para la búsqueda aplicada.'}
              </div>
            ) : null}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            padding: '8px 0'
          }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
              {totalContactos.toLocaleString()} contactos
              {` en "${tabs.find((t) => t.key === tabActivo)?.label}"`}
            </p>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px',
                  background: page === 1 ? '#F0F0F0' : '#FFF',
                  color: page === 1 ? '#ccc' : '#333',
                  border: '1px solid #E0E0E0',
                  borderRadius: 6, fontSize: 12, cursor: page === 1 ? 'default' : 'pointer'
                }}
              >
                ← Anterior
              </button>

              <span style={{ fontSize: 12, color: '#666' }}>
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 12px',
                  background: page === totalPages ? '#F0F0F0' : '#FFF',
                  color: page === totalPages ? '#ccc' : '#333',
                  border: '1px solid #E0E0E0',
                  borderRadius: 6, fontSize: 12,
                  cursor: page === totalPages ? 'default' : 'pointer'
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>

          {dc ? (
            <>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200 }} />
              <div style={{ position: 'fixed', top: 0, right: 0, width: 'min(400px, 100vw)', height: '100%', background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.15)', zIndex: 201, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #F0F0F0', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#1A2235', marginBottom: 8 }}>{drawerNombre}</div>
                    <SalesStatusBadge status={drawerEstado} small />
                  </div>
                  <div style={{ width: 28, height: 28 }} />
                </div>

                <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #F0F0F0', marginBottom: 18 }}>
                    {[{ key: 'datos', label: 'Datos' }, { key: 'gestion', label: 'Gestión' }].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setGestionError(''); }}
                        style={{
                          padding: '8px 18px',
                          border: 'none',
                          background: activeTab === tab.key
                            ? 'none'
                            : (tab.key === 'gestion' ? 'rgba(26,92,74,0.08)' : 'none'),
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          color: activeTab === tab.key ? accentColor : (tab.key === 'gestion' ? accentColor : '#888'),
                          borderBottom: activeTab === tab.key ? `2px solid ${accentColor}` : '2px solid transparent',
                          marginBottom: -2,
                          borderRadius: tab.key === 'gestion' ? 8 : 0
                        }}
                      >{tab.label}</button>
                    ))}
                  </div>

                  {activeTab === 'datos' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '16px 0' }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px 0' }}>Teléfonos</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(dc.telefono || dc.phone) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Fijo</p>
                                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{dc.telefono || dc.phone}</p>
                              </div>
                              <a href={`tel:${(dc.telefono || dc.phone).replace(/\s/g, '')}`} style={{ background: '#1A5C4A', color: '#FFF', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>📞 Llamar</a>
                            </div>
                          )}
                          {(dc.celular || pickCellular(dc)) ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Celular</p>
                                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{dc.celular || pickCellular(dc)}</p>
                              </div>
                              <a href={`tel:${(dc.celular || pickCellular(dc)).replace(/\s/g, '')}`} style={{ background: '#1A5C4A', color: '#FFF', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>📞 Llamar</a>
                            </div>
                          ) : (
                            <div>
                              <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px 0' }}>Celular</p>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  className="input"
                                  placeholder="Ingresar celular"
                                  value={draftCelular}
                                  onChange={(e) => setDraftCelular(e.target.value)}
                                  style={{ flex: 1 }}
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!onUpdateContact || !dc?.id) return;
                                    if (!draftCelular.trim()) return;
                                    try {
                                      setSavingCelular(true);
                                      await onUpdateContact(dc.id, { celular: draftCelular.trim() });
                                      setDrawerContact((prev) => prev ? { ...prev, celular: draftCelular.trim() } : prev);
                                      setDraftCelular('');
                                    } finally {
                                      setSavingCelular(false);
                                    }
                                  }}
                                  disabled={savingCelular || !draftCelular.trim()}
                                  style={{
                                    border: 'none',
                                    background: '#1A5C4A',
                                    color: '#FFF',
                                    borderRadius: 8,
                                    padding: '8px 12px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: savingCelular || !draftCelular.trim() ? 'not-allowed' : 'pointer',
                                    opacity: savingCelular || !draftCelular.trim() ? 0.6 : 1,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          )}
                          {(dc.correo_electronico || dc.email) && (
                            <div>
                              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Email</p>
                              <a href={`mailto:${dc.correo_electronico || dc.email}`} style={{ fontSize: 13, color: '#1A5C4A', fontWeight: 500 }}>{dc.correo_electronico || dc.email}</a>
                            </div>
                          )}
                        </div>
                      </div>

                      {(dc.documento || dc.fecha_nacimiento) && (
                        <>
                          <hr style={{ border: 'none', borderTop: '1px solid #F0F0F0', margin: 0 }} />
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px 0' }}>Datos personales</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                              {dc.documento && (
                                <div>
                                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Documento</p>
                                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{dc.documento}</p>
                                </div>
                              )}
                              {dc.fecha_nacimiento && (
                                <div>
                                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Nacimiento</p>
                                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                                    {new Date(dc.fecha_nacimiento).toLocaleDateString('es-UY')}
                                    {dc.edad ? ` (${dc.edad} años)` : ''}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <>
                        <hr style={{ border: 'none', borderTop: '1px solid #F0F0F0', margin: 0 }} />
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px 0' }}>Ubicación</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {(dc.departamento || dc.city) && (
                              <div>
                                <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Departamento</p>
                                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{dc.departamento || dc.city}</p>
                              </div>
                            )}
                            {dc.localidad && (
                              <div>
                                <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Localidad</p>
                                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{dc.localidad}</p>
                              </div>
                            )}
                            <div style={{ gridColumn: '1 / -1' }}>
                              <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Dirección</p>
                              {drawerDireccion ? (
                                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{drawerDireccion}</p>
                              ) : (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input
                                    className="input"
                                    placeholder="Ingresar dirección"
                                    value={draftDireccion}
                                    onChange={(e) => setDraftDireccion(e.target.value)}
                                    style={{ flex: 1 }}
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!onUpdateContact || !dc?.id) return;
                                      if (!draftDireccion.trim()) return;
                                      try {
                                        setSavingDireccion(true);
                                        await onUpdateContact(dc.id, { direccion: draftDireccion.trim() });
                                        setDrawerContact((prev) => prev ? { ...prev, direccion: draftDireccion.trim() } : prev);
                                        setDraftDireccion('');
                                      } finally {
                                        setSavingDireccion(false);
                                      }
                                    }}
                                    disabled={savingDireccion || !draftDireccion.trim()}
                                    style={{
                                      border: 'none',
                                      background: '#1A5C4A',
                                      color: '#FFF',
                                      borderRadius: 8,
                                      padding: '8px 12px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: savingDireccion || !draftDireccion.trim() ? 'not-allowed' : 'pointer',
                                      opacity: savingDireccion || !draftDireccion.trim() ? 0.6 : 1,
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Guardar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                      <div>
                        <hr style={{ border: 'none', borderTop: '1px solid #F0F0F0', margin: 0 }} />
                        <div style={{ paddingTop: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px 0' }}>Familiar</p>
                          {familiaresLoading ? (
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando familiares...</div>
                          ) : familiares.length ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {familiares.map((item) => (
                                <div key={item.id || `${item.nombre}-${item.apellido}-${item.telefono}-${item.celular}`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                                    {[item.nombre, item.apellido].filter(Boolean).join(' ') || 'Contacto'}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#64748b' }}>
                                    {item.telefono ? `Fijo: ${item.telefono}` : ''}
                                    {item.telefono && item.celular ? ' · ' : ''}
                                    {item.celular ? `Celular: ${item.celular}` : ''}
                                    {!item.telefono && !item.celular ? 'Sin teléfonos' : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Sin familiares encontrados.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>Resultado de la gestión</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {opcionesGestion.map((opt) => (
                            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 6, border: estadoGestion === opt.value ? `1.5px solid ${accentColor}` : '1.5px solid #E8E8E8', background: estadoGestion === opt.value ? accentSoft : '#fff', fontSize: 13, fontWeight: estadoGestion === opt.value ? 600 : 400 }}>
                              <input
                                type="radio"
                                name="estadoGestion"
                                value={opt.value}
                                checked={estadoGestion === opt.value}
                                onChange={() => setEstadoGestion(opt.value)}
                                style={{ accentColor }}
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {estadosConAgenda.includes(estadoGestion) && (
                        <div style={{ background: '#F8F0FF', border: '1px solid rgba(155,89,182,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#9B59B6', margin: '0 0 10px 0' }}>Agenda de seguimiento</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {opcionesAgenda().map((op) => (
                              <button
                                key={op.label}
                                type="button"
                                onClick={() => seleccionarAgenda(op)}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '9px 12px',
                                  background: agendaSeleccionada?.label === op.label ? '#9B59B6' : '#FFF',
                                  color: agendaSeleccionada?.label === op.label ? '#FFF' : '#333',
                                  border: `1px solid ${agendaSeleccionada?.label === op.label ? '#9B59B6' : '#E0E0E0'}`,
                                  borderRadius: 8, fontSize: 13,
                                  fontWeight: agendaSeleccionada?.label === op.label ? 600 : 400,
                                  cursor: 'pointer'
                                }}
                              >
                                <span>{op.label}</span>
                                <span style={{ fontSize: 11, color: agendaSeleccionada?.label === op.label ? 'rgba(255,255,255,0.6)' : '#999' }}>{op.hora}hs</span>
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setMostrarManual(!mostrarManual);
                                setAgendaSeleccionada(null);
                                setFechaAgenda('');
                                setHoraAgenda('');
                              }}
                              style={{
                                padding: '8px 12px',
                                background: 'transparent',
                                color: mostrarManual ? '#9B59B6' : '#999',
                                border: `1px dashed ${mostrarManual ? '#9B59B6' : '#CCC'}`,
                                borderRadius: 8, fontSize: 12, cursor: 'pointer', textAlign: 'left'
                              }}
                            >
                              + Elegir otra fecha y hora
                            </button>
                          </div>
                          {mostrarManual && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <input
                                type="date"
                                value={fechaAgenda}
                                onChange={(e) => { setFechaAgenda(e.target.value); fechaAgendaRef.current = e.target.value; }}
                                min={new Date().toISOString().split('T')[0]}
                                style={{ flex: 1, padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13 }}
                              />
                              <input
                                type="time"
                                value={horaAgenda}
                                onChange={(e) => { setHoraAgenda(e.target.value); horaAgendaRef.current = e.target.value; }}
                                style={{ width: 110, padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13 }}
                              />
                            </div>
                          )}
                          {(agendaSeleccionada || (fechaAgenda && horaAgenda)) && (
                            <p style={{ fontSize: 11, color: '#9B59B6', margin: '8px 0 0 0', fontWeight: 500 }}>
                              Agendado: {agendaSeleccionada?.label || `${new Date(fechaAgenda + 'T12:00:00').toLocaleDateString('es-UY')} a las ${horaAgenda}hs`}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Nota (opcional)</div>
                        <textarea
                          value={notaGestion}
                          onChange={(e) => setNotaGestion(e.target.value)}
                          placeholder="Observaciones..."
                          rows={3}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                      </div>

                      {gestionError ? (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#B91C1C' }}>{gestionError}</div>
                      ) : null}

                      <button
                        onClick={handleGuardarGestion}
                        disabled={guardando || !estadoGestion}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: accentColor, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: (guardando || !estadoGestion) ? 'not-allowed' : 'pointer', opacity: (guardando || !estadoGestion) ? 0.5 : 1 }}
                      >
                        {guardando ? 'Guardando...' : (isVentaFlow ? 'Iniciar gestión' : 'Guardar gestión')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      );
    }

    function RecuperoContactsView(props) {
      return <SalesContactsView {...props} mode="recupero" />;
    }

    function SalesAgendaView({ onVentaCerrada }) {
      const agendaApi = getApiClient();
      const [seguimientos, setSeguimientos] = React.useState([]);
      const [loadingAgenda, setLoadingAgenda] = React.useState(true);
      const [drawerItem, setDrawerItem] = React.useState(null);
      const [agendaTab, setAgendaTab] = React.useState('datos');
      const [agEstado, setAgEstado] = React.useState('');
      const [agNota, setAgNota] = React.useState('');
      const [agFecha, setAgFecha] = React.useState('');
      const [agHora, setAgHora] = React.useState('');
      const [agSeleccionada, setAgSeleccionada] = React.useState(null);
      const [agMostrarManual, setAgMostrarManual] = React.useState(false);
      const agFechaRef = React.useRef('');
      const agHoraRef = React.useRef('');
      const [agGuardando, setAgGuardando] = React.useState(false);
      const [agError, setAgError] = React.useState('');

      const cargarAgenda = React.useCallback(async () => {
        setLoadingAgenda(true);
        try {
          const data = await agendaApi.get('/agenda');
          const items = data?.data?.items || [];
          setSeguimientos(items.filter((item) => !ESTADOS_FINALES_GESTION.includes(item.estado_venta)));
        } catch {
          setSeguimientos([]);
        } finally {
          setLoadingAgenda(false);
        }
      }, []); // eslint-disable-line react-hooks/exhaustive-deps

      React.useEffect(() => {
        try { localStorage.removeItem('agenda_needs_refresh'); } catch {}
        cargarAgenda();
        const handleFocus = () => {
          const needs = localStorage.getItem('agenda_needs_refresh');
          if (needs) {
            try { localStorage.removeItem('agenda_needs_refresh'); } catch {}
            cargarAgenda();
          }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
      }, []); // eslint-disable-line react-hooks/exhaustive-deps

      const agOpcionesAgenda = () => {
        const ahora = new Date();
        const hoy = ahora.toISOString().split('T')[0];
        const manana = new Date(ahora); manana.setDate(manana.getDate() + 1);
        const mananaStr = manana.toISOString().split('T')[0];
        const pasado = new Date(ahora); pasado.setDate(pasado.getDate() + 2);
        const pasadoStr = pasado.toISOString().split('T')[0];
        return [
          { label: 'Llamar esta mañana', hora: '10:00', fecha: hoy, visible: ahora.getHours() < 11 },
          { label: 'Llamar esta tarde', hora: '17:00', fecha: hoy, visible: ahora.getHours() < 16 },
          { label: 'Mañana a la mañana', hora: '10:00', fecha: mananaStr, visible: true },
          { label: 'Mañana a la tarde', hora: '17:00', fecha: mananaStr, visible: true },
          { label: 'En 2 días', hora: '10:00', fecha: pasadoStr, visible: true }
        ].filter((o) => o.visible);
      };

      const agSeleccionarAgenda = (op) => {
        setAgSeleccionada(op); setAgFecha(op.fecha); setAgHora(op.hora);
        agFechaRef.current = op.fecha; agHoraRef.current = op.hora;
        setAgMostrarManual(false);
      };

      const agResetForm = () => {
        setAgEstado(''); setAgNota(''); setAgFecha(''); setAgHora('');
        setAgSeleccionada(null); setAgMostrarManual(false);
        agFechaRef.current = ''; agHoraRef.current = '';
        setAgError('');
      };

      const abrirDrawer = (row) => { setDrawerItem(row); setAgendaTab('datos'); agResetForm(); };
      const cerrarDrawer = () => { setDrawerItem(null); agResetForm(); };

      const handleForzarRechazo = async (row) => {
        setAgGuardando(true); setAgError('');
        try {
          await agendaApi.post(`/leads/${row.contact_id}/management`, {
            status: 'rechazo',
            nota: 'Sin respuesta luego de 3 intentos consecutivos'
          });
          await agendaApi.patch(`/agenda/${row.id}/complete`, {}).catch(() => {});
          setSeguimientos((prev) => prev.filter((s) => s.id !== row.id));
          cerrarDrawer();
        } catch (err) {
          setAgError(err?.message || 'No se pudo registrar el rechazo.');
        } finally {
          setAgGuardando(false);
        }
      };

      const handleGuardarAgendaGestion = async () => {
        if (agGuardando || !drawerItem || !agEstado) return;
        setAgGuardando(true); setAgError('');
        try {
          const estadosConAgenda = ['seguimiento', 'rellamar'];
          let fecha_agenda;
          if (estadosConAgenda.includes(agEstado)) {
            const fecha = agFecha || agFechaRef.current;
            const hora = agHora || agHoraRef.current || '10:00';
            if (!fecha) {
              setAgError('Seleccioná una opción de agenda antes de guardar.');
              setAgGuardando(false);
              return;
            }
            fecha_agenda = `${fecha}T${hora}:00`;
          }
          const { gestion_id } = await registerCommercialManagement(
            drawerItem.contact_id,
            {
              status: agEstado,
              note: agNota.trim() || undefined,
              nextAction: fecha_agenda,
              fecha_agenda
            }
          );
          const itemGuardado = drawerItem;
          cerrarDrawer();
          if (ESTADOS_FINALES_GESTION.includes(agEstado)) {
            await agendaApi.patch(`/agenda/${itemGuardado.id}/complete`, {}).catch(() => {});
            setSeguimientos((prev) => prev.filter((s) => s.id !== itemGuardado.id));
            if (agEstado === 'venta' && onVentaCerrada) {
              try {
                const borrador = {
                  contacto_id: String(itemGuardado.contact_id),
                  nombre: itemGuardado.nombre || '',
                  apellido: itemGuardado.apellido || '',
                  documento: itemGuardado.documento || '',
                  fecha_nacimiento: itemGuardado.fecha_nacimiento || '',
                  telefono: itemGuardado.telefono || '',
                  celular: itemGuardado.celular || '',
                  correo_electronico: itemGuardado.correo_electronico || '',
                  batch_id: itemGuardado.batch_id || '',
                  timestamp: new Date().toISOString()
                };
                localStorage.setItem('cliente_pendiente_alta', JSON.stringify(borrador));
              } catch {}
              onVentaCerrada(itemGuardado, gestion_id);
            }
          } else {
            cargarAgenda();
          }
        } catch (err) {
          setAgError(err?.message || 'No se pudo guardar la gestión.');
        } finally {
          setAgGuardando(false);
        }
      };

      const ahora = new Date();
      const fmtFechaHora = (iso) => {
        if (!iso) return '—';
        try {
          return new Date(iso).toLocaleString('es-UY', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return iso; }
      };
      const labelPorResultado = (estado) => {
        if (!estado) return '';
        const meta = salesStatusMeta(estado);
        return meta?.label || estado;
      };

      return (
        <div className="view">
          <section className="content-grid">
            <Panel className="span-12" title="Mis seguimientos" subtitle="Contactos con compromiso de llamada pendiente">
              {loadingAgenda ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>Cargando agenda...</div>
              ) : seguimientos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#aaa' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px 0' }}>✓</p>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Sin seguimientos pendientes</p>
                  <p style={{ fontSize: 12, margin: '4px 0 0 0' }}>Cuando agendés un seguimiento aparecerá acá</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha y hora</th>
                        <th>Contacto</th>
                        <th>Teléfono</th>
                        <th>Intentos</th>
                        <th>Nota</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seguimientos.map((row) => {
                        const fechaDt = row.fecha_agenda ? new Date(row.fecha_agenda) : null;
                        const vencida = fechaDt && fechaDt < ahora;
                        const telefono = row.celular || row.telefono || '';
                        const intentos = row.intentos || 0;
                        const intentosMeta = intentos >= 3
                          ? { bg: '#FDECEA', color: '#E53E3E', label: `${intentos} intentos` }
                          : intentos === 2
                          ? { bg: 'rgba(245,166,35,0.15)', color: '#F5A623', label: `${intentos} intentos` }
                          : { bg: 'rgba(158,158,158,0.12)', color: '#9E9E9E', label: `${intentos} intentos` };
                        const notaText = row.nota ? (row.nota.length > 40 ? row.nota.slice(0, 40) + '…' : row.nota) : null;
                        const tipoAgenda = row.tipo_agenda || row.estado_venta;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => abrirDrawer(row)}
                            style={{ cursor: 'pointer', background: vencida ? '#FFF8E1' : undefined }}
                          >
                            <td>
                              <div style={{ color: vencida ? '#E53E3E' : undefined, fontWeight: vencida ? 600 : undefined }}>
                                {fechaDt ? fmtFechaHora(row.fecha_agenda) : '—'}
                              </div>
                              {vencida && (
                                <span style={{ display: 'inline-block', marginTop: 2, fontSize: 10, fontWeight: 700, background: '#E53E3E', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>Vencida</span>
                              )}
                            </td>
                            <td><strong>{[row.nombre, row.apellido].filter(Boolean).join(' ') || '—'}</strong></td>
                            <td>
                              {telefono
                                ? <a href={`tel:${telefono.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()} style={{ color: '#1A5C4A', fontWeight: 500 }}>{telefono}</a>
                                : '—'}
                            </td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: intentosMeta.bg, color: intentosMeta.color, fontSize: 12, fontWeight: 600 }}>
                                {intentosMeta.label}
                              </span>
                            </td>
                            <td style={{ color: notaText ? '#888' : '#ccc', fontSize: 13 }}>{notaText || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: tipoAgenda === 'seguimiento'
                                    ? '#F8F0FF' : '#F0F7FF',
                                  color: tipoAgenda === 'seguimiento'
                                    ? '#9B59B6' : '#4A90D9',
                                  border: `1px solid ${tipoAgenda === 'seguimiento'
                                    ? '#9B59B640' : '#4A90D940'}`
                                }}>
                                  {tipoAgenda === 'seguimiento' ? '● Seguimiento' : '● Rellamar'}
                                </span>

                                {row.estado_venta && row.estado_venta !== tipoAgenda && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: 20,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    background: {
                                      'no_contesta': '#FFF8EE',
                                      'rellamar': '#F0F7FF',
                                      'seguimiento': '#F8F0FF',
                                      'rechazo': '#FFF3F3',
                                      'venta': '#F0FFF4'
                                    }[row.estado_venta] || '#F5F5F5',
                                    color: {
                                      'no_contesta': '#F5A623',
                                      'rellamar': '#4A90D9',
                                      'seguimiento': '#9B59B6',
                                      'rechazo': '#E53E3E',
                                      'venta': '#27AE60'
                                    }[row.estado_venta] || '#888'
                                  }}>
                                    {labelPorResultado(row.estado_venta)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </section>

          {/* Drawer */}
          {drawerItem && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.35)', zIndex: 45 }}
                onClick={cerrarDrawer}
              />
              <div style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(420px, 100%)',
                backgroundColor: '#fff', boxShadow: '-4px 0 24px rgba(15,23,42,0.15)',
                zIndex: 46, display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{ padding: '20px 20px 0 20px', borderBottom: '1px solid #F0F0F0', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                        {[drawerItem.nombre, drawerItem.apellido].filter(Boolean).join(' ') || 'Contacto'}
                      </h3>
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <SalesStatusBadge status={drawerItem.estado_venta} small />
                        <span style={{ fontSize: 12, color: '#666' }}>
                          Agendado para: <strong>{fmtFechaHora(drawerItem.fecha_agenda)}</strong>
                        </span>
                      </div>
                      {drawerItem.nota && (
                        <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#666', fontStyle: 'italic' }}>{drawerItem.nota}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={cerrarDrawer}
                      style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', flexShrink: 0 }}
                    >✕</button>
                  </div>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 0, marginTop: 4 }}>
                    {[{ key: 'datos', label: 'Datos' }, { key: 'historial', label: 'Historial' }, { key: 'gestion', label: 'Gestión' }].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setAgendaTab(t.key)}
                        style={{
                          flex: 1, padding: '8px 0', border: 'none', background: 'transparent', cursor: 'pointer',
                          fontSize: 13, fontWeight: agendaTab === t.key ? 700 : 500,
                          color: agendaTab === t.key ? '#1A5C4A' : '#888',
                          borderBottom: `2px solid ${agendaTab === t.key ? '#1A5C4A' : 'transparent'}`
                        }}
                      >{t.label}</button>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  {agendaTab === 'datos' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '16px 0' }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px 0' }}>Teléfonos</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {drawerItem.telefono && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Fijo</p>
                                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{drawerItem.telefono}</p>
                              </div>
                              <a href={`tel:${drawerItem.telefono.replace(/\s/g, '')}`} style={{ background: '#1A5C4A', color: '#FFF', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Llamar</a>
                            </div>
                          )}
                          {drawerItem.celular && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Celular</p>
                                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{drawerItem.celular}</p>
                              </div>
                              <a href={`tel:${drawerItem.celular.replace(/\s/g, '')}`} style={{ background: '#1A5C4A', color: '#FFF', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Llamar</a>
                            </div>
                          )}
                          {!drawerItem.telefono && !drawerItem.celular && (
                            <p style={{ fontSize: 13, color: '#aaa' }}>Sin teléfonos registrados</p>
                          )}
                        </div>
                      </div>
                      {(drawerItem.documento || drawerItem.fecha_nacimiento || drawerItem.departamento || drawerItem.localidad || drawerItem.correo_electronico) && (
                        <>
                          <hr style={{ border: 'none', borderTop: '1px solid #F0F0F0', margin: 0 }} />
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px 0' }}>Datos personales</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                              {drawerItem.documento && (
                                <div>
                                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Documento</p>
                                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{drawerItem.documento}</p>
                                </div>
                              )}
                              {drawerItem.fecha_nacimiento && (
                                <div>
                                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Nacimiento</p>
                                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                                    {new Date(drawerItem.fecha_nacimiento).toLocaleDateString('es-UY')}
                                    {drawerItem.edad ? ` (${drawerItem.edad} años)` : ''}
                                  </p>
                                </div>
                              )}
                              {drawerItem.departamento && (
                                <div>
                                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Departamento</p>
                                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{drawerItem.departamento}</p>
                                </div>
                              )}
                              {drawerItem.localidad && (
                                <div>
                                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Localidad</p>
                                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{drawerItem.localidad}</p>
                                </div>
                              )}
                            </div>
                            {drawerItem.correo_electronico && (
                              <div style={{ marginTop: 12 }}>
                                <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px 0' }}>Email</p>
                                <a href={`mailto:${drawerItem.correo_electronico}`} style={{ fontSize: 13, color: '#1A5C4A', fontWeight: 500 }}>{drawerItem.correo_electronico}</a>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : agendaTab === 'historial' ? (
                    <div>
                      {(drawerItem.historial || []).length === 0 ? (
                        <p style={{ color: '#aaa', fontSize: 13, textAlign: 'center', marginTop: 24 }}>Sin gestiones registradas aún</p>
                      ) : (
                        (drawerItem.historial || []).map((h, i) => {
                          const hMeta = salesStatusMeta(h.resultado || h.estado);
                          return (
                            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #F0F0F0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: hMeta.color }}>{hMeta.label}</span>
                                <span style={{ fontSize: 11, color: '#999' }}>{fmtFechaHora(h.fecha)}</span>
                              </div>
                              {h.nota && <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0 0' }}>{h.nota}</p>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : ESTADOS_FINALES_GESTION.includes(drawerItem.estado_venta) ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#aaa' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#333', margin: '0 0 4px 0' }}>
                        Gestion finalizada
                      </p>
                      <p style={{ fontSize: 12, margin: 0 }}>
                        Este contacto tiene un resultado final y no puede ser gestionado nuevamente.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Alerta 3 intentos */}
                      {(drawerItem.intentos || 0) >= 3 && (
                        <div style={{ background: '#FFF3F3', border: '1px solid #E53E3E', borderRadius: 10, padding: '12px 14px' }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#E53E3E', margin: '0 0 4px 0' }}>No te contestó 3 veces</p>
                          <p style={{ fontSize: 12, color: '#666', margin: '0 0 10px 0' }}>Este contacto no respondió en 3 intentos consecutivos. Se recomienda finalizar como rechazo.</p>
                          <button
                            type="button"
                            onClick={() => handleForzarRechazo(drawerItem)}
                            disabled={agGuardando}
                            style={{ width: '100%', padding: 10, background: '#E53E3E', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: agGuardando ? 'not-allowed' : 'pointer', opacity: agGuardando ? 0.6 : 1 }}
                          >
                            Finalizar — Marcar como rechazo
                          </button>
                        </div>
                      )}

                      {/* Opciones */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>Resultado de la gestión</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { value: 'no_contesta', label: 'No contesta' },
                            { value: 'rellamar', label: 'Rellamar' },
                            { value: 'seguimiento', label: 'Seguimiento' },
                            { value: 'rechazo', label: 'Rechazo' },
                            { value: 'dato_erroneo', label: 'Dato erróneo' },
                            { value: 'venta', label: 'Venta' }
                          ].map((opt) => (
                            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 6, border: agEstado === opt.value ? '1.5px solid #1A5C4A' : '1.5px solid #E8E8E8', background: agEstado === opt.value ? '#F0FAF6' : '#fff', fontSize: 13, fontWeight: agEstado === opt.value ? 600 : 400 }}>
                              <input type="radio" name="agEstadoGestion" value={opt.value} checked={agEstado === opt.value} onChange={() => setAgEstado(opt.value)} style={{ accentColor: '#1A5C4A' }} />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Agenda rápida seguimiento */}
                      {['seguimiento', 'rellamar'].includes(agEstado) && (
                        <div style={{ background: '#F8F0FF', border: '1px solid rgba(155,89,182,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#9B59B6', margin: '0 0 10px 0' }}>Agenda de seguimiento</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {agOpcionesAgenda().map((op) => (
                              <button key={op.label} type="button" onClick={() => agSeleccionarAgenda(op)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: agSeleccionada?.label === op.label ? '#9B59B6' : '#FFF', color: agSeleccionada?.label === op.label ? '#FFF' : '#333', border: `1px solid ${agSeleccionada?.label === op.label ? '#9B59B6' : '#E0E0E0'}`, borderRadius: 8, fontSize: 13, fontWeight: agSeleccionada?.label === op.label ? 600 : 400, cursor: 'pointer' }}>
                                <span>{op.label}</span>
                                <span style={{ fontSize: 11, color: agSeleccionada?.label === op.label ? 'rgba(255,255,255,0.6)' : '#999' }}>{op.hora}hs</span>
                              </button>
                            ))}
                            <button type="button"
                              onClick={() => { setAgMostrarManual(!agMostrarManual); setAgSeleccionada(null); setAgFecha(''); setAgHora(''); }}
                              style={{ padding: '8px 12px', background: 'transparent', color: agMostrarManual ? '#9B59B6' : '#999', border: `1px dashed ${agMostrarManual ? '#9B59B6' : '#CCC'}`, borderRadius: 8, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                              + Elegir otra fecha y hora
                            </button>
                          </div>
                          {agMostrarManual && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <input type="date" value={agFecha} onChange={(e) => { setAgFecha(e.target.value); agFechaRef.current = e.target.value; }} min={new Date().toISOString().split('T')[0]} style={{ flex: 1, padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13 }} />
                              <input type="time" value={agHora} onChange={(e) => { setAgHora(e.target.value); agHoraRef.current = e.target.value; }} style={{ width: 110, padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13 }} />
                            </div>
                          )}
                          {(agSeleccionada || (agFecha && agHora)) && (
                            <p style={{ fontSize: 11, color: '#9B59B6', margin: '8px 0 0 0', fontWeight: 500 }}>
                              Agendado: {agSeleccionada?.label || `${new Date(agFecha + 'T12:00:00').toLocaleDateString('es-UY')} a las ${agHora}hs`}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Nota */}
                      <div>
                        <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Nota (opcional)</div>
                        <textarea value={agNota} onChange={(e) => setAgNota(e.target.value)} placeholder="Observaciones..." rows={3}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                      </div>

                      {agError && (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#B91C1C' }}>{agError}</div>
                      )}

                      <button type="button" onClick={handleGuardarAgendaGestion} disabled={agGuardando || !agEstado}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1A5C4A', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: (agGuardando || !agEstado) ? 'not-allowed' : 'pointer', opacity: (agGuardando || !agEstado) ? 0.5 : 1 }}>
                        {agGuardando ? 'Guardando...' : 'Guardar gestión'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    function CodificacionesView() {
      const api = React.useMemo(() => getApiClient(), []);
      const PAGE_SIZE = 10;
      const [rows, setRows] = React.useState([]);
      const [total, setTotal] = React.useState(0);
      const [page, setPage] = React.useState(1);
      const [loading, setLoading] = React.useState(false);
      const [error, setError] = React.useState('');
      const [searchPhone, setSearchPhone] = React.useState('');
      const [sellerId, setSellerId] = React.useState('');
      const [resultadoOriginal, setResultadoOriginal] = React.useState('');
      const [resultadoCorregido, setResultadoCorregido] = React.useState('');
      const [estadoAuditoria, setEstadoAuditoria] = React.useState('');
      const [fromDate, setFromDate] = React.useState('');
      const [toDate, setToDate] = React.useState('');
      const [queryFilters, setQueryFilters] = React.useState({});
      const [sellers, setSellers] = React.useState([]);
      const [catalogo, setCatalogo] = React.useState([]);
      const [catalogoLoading, setCatalogoLoading] = React.useState(false);
      const [catalogoError, setCatalogoError] = React.useState('');
      const [showFilters, setShowFilters] = React.useState(false);
      const [auditOpen, setAuditOpen] = React.useState(false);
      const [auditItem, setAuditItem] = React.useState(null);
      const [auditLoading, setAuditLoading] = React.useState(false);
      const [auditSaving, setAuditSaving] = React.useState(false);
      const [auditError, setAuditError] = React.useState('');
      const [auditResultado, setAuditResultado] = React.useState('');
      const [auditComentario, setAuditComentario] = React.useState('');
      const auditSelectRef = React.useRef(null);
      const [historyOpen, setHistoryOpen] = React.useState(false);
      const [historyLoading, setHistoryLoading] = React.useState(false);
      const [historyError, setHistoryError] = React.useState('');
      const [historyData, setHistoryData] = React.useState(null);
      const requestIdRef = React.useRef(0);

      const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
      const cellEllipsisStyle = React.useMemo(() => ({
        maxWidth: 160,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }), []);

      const hasFilters = React.useMemo(() => (
        Boolean(queryFilters?.search_phone)
        || Boolean(queryFilters?.seller_id)
        || Boolean(queryFilters?.resultado)
        || Boolean(queryFilters?.resultado_corregido)
        || Boolean(queryFilters?.estado)
        || Boolean(queryFilters?.from)
        || Boolean(queryFilters?.to)
      ), [queryFilters]);

      const normalizePhone = React.useCallback((value) => {
        if (!value) return '';
        return String(value).trim().replace(/[^\d+]/g, '');
      }, []);

      const formatDateTime = (value) => {
        if (!value) return '—';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '—';
        return parsed.toLocaleString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      };

      const formatPhone = (row) => {
        const raw = row?.telefono_display || row?.telefono || row?.celular || '';
        if (!raw) return '—';
        return String(raw).replace(/[\s-]/g, '');
      };
      const formatSeller = (row) => row?.vendedor_nombre_completo
        || [row?.vendedor_nombre, row?.vendedor_apellido].filter(Boolean).join(' ').trim()
        || '—';
      const formatSupervisor = (row) => row?.supervisor_nombre_completo || '—';

      const normalizeResultadoLabel = React.useCallback((value) => {
        if (!value) return '—';
        const raw = String(value).trim();
        if (!raw) return '—';
        const key = raw.toLowerCase();
        const labelMap = {
          no_contesta: 'No contesta',
          no_contesto: 'No contesta',
          volver_a_llamar: 'Rellamar',
          seguimiento: 'Seguimiento',
          interesado: 'Seguimiento',
          rechazo: 'Rechazo',
          venta: 'Venta',
          alta: 'Alta',
          recuperado: 'Recuperado'
        };
        if (labelMap[key]) return labelMap[key];
        const clean = raw.replace(/_/g, ' ').trim();
        if (!clean) return '—';
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }, []);

      const resultadoVariant = React.useCallback((value) => {
        const key = String(value || '').toLowerCase();
        if (['venta', 'alta', 'recuperado'].includes(key)) return 'success';
        if (['rechazo'].includes(key)) return 'danger';
        if (['no_contesta', 'no_contesto', 'volver_a_llamar'].includes(key)) return 'warning';
        return 'info';
      }, []);

      const statusMeta = (row) => {
        const estado = (row?.estado_auditoria || '').toLowerCase();
        const hasCorrection = Boolean(row?.resultado_corregido || row?.corrected_at);
        if (estado === 'corregida' || hasCorrection) {
          return { label: 'Corregida', variant: 'success' };
        }
        return { label: 'Pendiente', variant: 'warning' };
      };

      const loadSellers = React.useCallback(async () => {
        try {
          const response = await api.get('/api/supervisor/agents');
          const itemsList = response?.agents
            || response?.items
            || response?.data?.agents
            || response?.data?.items
            || response?.data
            || [];
          const normalized = (Array.isArray(itemsList) ? itemsList : []).map((seller) => ({
            id: String(seller?.id || seller?.agent_id || seller?.agente_id || seller?.user_id || ''),
            label: `${seller?.nombre || seller?.name || ''} ${seller?.apellido || seller?.last_name || ''}`.trim()
              || seller?.email
              || seller?.username
              || 'Vendedor'
          }));
          setSellers(normalized);
        } catch {
          setSellers([]);
        }
      }, [api]);

      const loadCatalogo = React.useCallback(async () => {
        setCatalogoLoading(true);
        setCatalogoError('');
        try {
          const response = await api.get('/api/codificaciones/catalogo');
          const itemsList = response?.items || response?.data?.items || response?.data || [];
          setCatalogo(Array.isArray(itemsList) ? itemsList : []);
        } catch {
          setCatalogo([]);
          setCatalogoError('No se pudo cargar el catálogo.');
        } finally {
          setCatalogoLoading(false);
        }
      }, [api]);

      const buildQuery = React.useCallback((filters) => {
        const params = new URLSearchParams();
        if (filters.search_phone) params.set('search_phone', filters.search_phone);
        if (filters.seller_id) params.set('seller_id', filters.seller_id);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        if (filters.resultado) params.set('resultado', filters.resultado);
        if (filters.resultado_corregido) params.set('resultado_corregido', filters.resultado_corregido);
        if (filters.estado) params.set('estado', filters.estado);
        return params;
      }, []);

      const loadCodificaciones = React.useCallback(async () => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        setLoading(true);
        setError('');
        try {
          const params = buildQuery(queryFilters);
          if (hasFilters) {
            params.set('page', String(page));
            params.set('limit', String(PAGE_SIZE));
            const response = await api.get(`/api/codificaciones?${params.toString()}`);
            const items = response?.items || response?.data?.items || [];
            const totalCount = Number(response?.total ?? response?.data?.total ?? items.length);
            if (requestIdRef.current === requestId) {
              setRows(Array.isArray(items) ? items : []);
              setTotal(Number.isFinite(totalCount) ? totalCount : 0);
            }
          } else {
            params.set('limit', String(PAGE_SIZE));
            const response = await api.get(`/api/codificaciones/ultimos?${params.toString()}`);
            const items = response?.items || response?.data?.items || [];
            if (requestIdRef.current === requestId) {
              setRows(Array.isArray(items) ? items : []);
              setTotal(Array.isArray(items) ? items.length : 0);
            }
          }
        } catch (err) {
          if (requestIdRef.current === requestId) {
            setError(err?.message || 'No pudimos cargar las codificaciones.');
            setRows([]);
            setTotal(0);
          }
        } finally {
          if (requestIdRef.current === requestId) {
            setLoading(false);
          }
        }
      }, [api, buildQuery, hasFilters, page, queryFilters]);

      React.useEffect(() => {
        loadSellers();
        loadCatalogo();
      }, [loadCatalogo, loadSellers]);

      React.useEffect(() => {
        loadCodificaciones();
      }, [loadCodificaciones]);

      React.useEffect(() => {
        if (auditOpen) {
          const handler = (event) => {
            if (event.key === 'Escape') closeAudit();
          };
          window.addEventListener('keydown', handler);
          return () => window.removeEventListener('keydown', handler);
        }
        return undefined;
      }, [auditOpen]);

      React.useEffect(() => {
        if (historyOpen) {
          const handler = (event) => {
            if (event.key === 'Escape') closeHistory();
          };
          window.addEventListener('keydown', handler);
          return () => window.removeEventListener('keydown', handler);
        }
        return undefined;
      }, [historyOpen]);

      React.useEffect(() => {
        if (!auditOpen) return;
        if (!auditSelectRef.current) return;
        auditSelectRef.current.focus();
      }, [auditOpen, auditLoading]);

      React.useEffect(() => {
        const normalized = normalizePhone(searchPhone);
        const handler = setTimeout(() => {
          setPage(1);
          setQueryFilters((prev) => {
            const next = { ...prev };
            if (normalized) {
              next.search_phone = normalized;
            } else {
              delete next.search_phone;
            }
            return next;
          });
        }, 400);
        return () => clearTimeout(handler);
      }, [normalizePhone, searchPhone]);

      const handleBuscar = () => {
        setPage(1);
        setQueryFilters({
          search_phone: normalizePhone(searchPhone),
          seller_id: sellerId,
          resultado: resultadoOriginal,
          resultado_corregido: resultadoCorregido,
          estado: estadoAuditoria,
          from: fromDate,
          to: toDate
        });
      };

      const handleLimpiar = () => {
        setSearchPhone('');
        setSellerId('');
        setResultadoOriginal('');
        setResultadoCorregido('');
        setEstadoAuditoria('');
        setFromDate('');
        setToDate('');
        setPage(1);
        setQueryFilters({});
      };

      const openAudit = async (row) => {
        setAuditOpen(true);
        setAuditItem(row);
        setAuditResultado('');
        setAuditComentario('');
        setAuditError('');
        setAuditLoading(true);
        try {
          const response = await api.get(`/api/codificaciones/${row.id}`);
          const detail = response?.item || response?.data || response;
          if (detail) setAuditItem((prev) => ({ ...prev, ...detail }));
        } catch {
          // fallback: keep row data
        } finally {
          setAuditLoading(false);
        }
      };

      const closeAudit = () => {
        setAuditOpen(false);
        setAuditItem(null);
        setAuditResultado('');
        setAuditComentario('');
        setAuditError('');
      };

      const saveAudit = async () => {
        if (!auditItem) return;
        const isValidUuid = (value) => (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
        );
        const managementId = auditItem?.management_id || auditItem?.id || '';
        if (!managementId || !isValidUuid(managementId)) {
          setAuditError('Seleccione una gestión válida.');
          return;
        }
        if (!auditResultado) {
          setAuditError('Seleccioná una codificación corregida.');
          return;
        }
        if (auditResultado && auditItem?.resultado_corregido && auditResultado === auditItem.resultado_corregido) {
          setAuditError('La codificación seleccionada ya está aplicada.');
          return;
        }
        setAuditSaving(true);
        setAuditError('');
        try {
          await api.post(`/api/codificaciones/${managementId}/correccion`, {
            resultado_corregido: auditResultado,
            comentario: auditComentario || ''
          });
          closeAudit();
          loadCodificaciones();
        } catch (err) {
          setAuditError(err?.message || 'No se pudo guardar la corrección.');
        } finally {
          setAuditSaving(false);
        }
      };

      const openHistory = async (row) => {
        const isValidUuid = (value) => (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
        );
        const managementId = row?.management_id || row?.id || '';
        if (!managementId || !isValidUuid(managementId)) {
          setError('Seleccione una gestión válida para ver el historial.');
          return;
        }
        setHistoryOpen(true);
        setHistoryLoading(true);
        setHistoryError('');
        setHistoryData(null);
        try {
          const response = await api.get(`/api/codificaciones/${managementId}/historial`);
          setHistoryData(response?.data || response || null);
        } catch (err) {
          setHistoryError(err?.message || 'No se pudo cargar el historial.');
        } finally {
          setHistoryLoading(false);
        }
      };

      const closeHistory = () => {
        setHistoryOpen(false);
        setHistoryError('');
        setHistoryData(null);
      };

      return (
        <div className="view">
          <section className="content-grid">
            <Panel
              className="span-12"
              title="Codificaciones"
              subtitle="Auditoría de resultados de gestión"
            >
              <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="ghost"
                    icon={<Filter size={16} />}
                    onClick={() => setShowFilters((prev) => !prev)}
                  >
                    {showFilters ? 'Ocultar filtros' : '+Filtros'}
                  </Button>
                </div>
                {showFilters ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <select className="input" style={{ minWidth: 200 }} value={sellerId} onChange={(event) => setSellerId(event.target.value)}>
                      <option value="">Vendedor</option>
                      {sellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>{seller.label}</option>
                      ))}
                    </select>
                    <select className="input" style={{ minWidth: 180 }} value={resultadoOriginal} onChange={(event) => setResultadoOriginal(event.target.value)}>
                      <option value="">Codificación original</option>
                      {catalogo.map((item) => (
                        <option key={item.id || item.nombre || item} value={item.nombre || item}>{item.nombre || item}</option>
                      ))}
                    </select>
                    <select className="input" style={{ minWidth: 180 }} value={resultadoCorregido} onChange={(event) => setResultadoCorregido(event.target.value)}>
                      <option value="">Codificación corregida</option>
                      {catalogo.map((item) => (
                        <option key={item.id || item.nombre || item} value={item.nombre || item}>{item.nombre || item}</option>
                      ))}
                    </select>
                    <select className="input" style={{ minWidth: 160 }} value={estadoAuditoria} onChange={(event) => setEstadoAuditoria(event.target.value)}>
                      <option value="">Estado</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="corregida">Corregida</option>
                    </select>
                    <input className="input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                    <input className="input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                    <Button icon={<Filter size={16} />} onClick={handleBuscar}>Buscar</Button>
                    <Button variant="ghost" onClick={handleLimpiar}>Limpiar</Button>
                  </div>
                ) : null}
                <div className="searchbox" style={{ width: '100%' }}>
                  <Search size={16} color="#69788d" />
                  <input
                    placeholder="Buscar por teléfono"
                    value={searchPhone}
                    onChange={(event) => setSearchPhone(event.target.value)}
                  />
                </div>
              </div>

              {error ? <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 600 }}>{error}</div> : null}
              {loading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando codificaciones...</div> : null}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha/Hora</th>
                      <th>Teléfono</th>
                      <th>Vendedor</th>
                      <th>Codificación original</th>
                      <th>Estado auditoría</th>
                      <th>Codificación corregida</th>
                      <th>Supervisor</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const badge = statusMeta(row);
                      const phoneValue = formatPhone(row);
                      const sellerValue = formatSeller(row);
                      const originalValueRaw = row.resultado_original || '';
                      const correctedValueRaw = row.resultado_corregido || '';
                      const originalValue = normalizeResultadoLabel(originalValueRaw);
                      const correctedValue = normalizeResultadoLabel(correctedValueRaw);
                      const supervisorValue = formatSupervisor(row);
                      return (
                        <tr key={row.id}>
                          <td>{formatDateTime(row.fecha_gestion)}</td>
                          <td title={phoneValue}>
                            <div style={{ ...cellEllipsisStyle, maxWidth: 140 }}>{phoneValue}</div>
                          </td>
                          <td title={sellerValue}>
                            <div style={{ ...cellEllipsisStyle, maxWidth: 180 }}>{sellerValue}</div>
                          </td>
                          <td title={originalValue}>
                            <Tag variant={resultadoVariant(originalValueRaw)}>{originalValue}</Tag>
                          </td>
                          <td>
                            <Tag variant={badge.variant}>{badge.label}</Tag>
                          </td>
                          <td title={correctedValue}>
                            {correctedValue === '—' ? '—' : <Tag variant={resultadoVariant(correctedValueRaw)}>{correctedValue}</Tag>}
                          </td>
                          <td title={supervisorValue}>
                            <div style={cellEllipsisStyle}>{supervisorValue}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Button variant="secondary" onClick={() => openAudit(row)}>{row.resultado_corregido ? 'Reauditar' : 'Auditar'}</Button>
                              <Button variant="ghost" onClick={() => openHistory(row)}>Historial</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!loading && !rows.length ? (
                  <div style={{ padding: 16, color: 'var(--muted)' }}>
                    {searchPhone ? 'No se encontraron resultados para ese teléfono.' : 'No hay codificaciones para mostrar.'}
                  </div>
                ) : null}
              </div>

              <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                <div style={{ color: 'var(--muted)' }}>
                  Mostrando {rows.length} de {total}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button variant="ghost" disabled={page <= 1 || !hasFilters} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Anterior</Button>
                  <div style={{ fontWeight: 600 }}>Página {page} de {totalPages}</div>
                  <Button variant="ghost" disabled={page >= totalPages || !hasFilters} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Siguiente</Button>
                </div>
              </div>
            </Panel>
          </section>

          {auditOpen && (
            <div className="lot-wizard-overlay" onClick={closeAudit}>
              <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="lot-wizard-header">
                  <div style={{ fontWeight: 700 }}>Auditar codificación</div>
                  <button className="close-btn" onClick={closeAudit}><X size={16} /></button>
                </div>
                <div className="lot-wizard-content">
                  {auditLoading ? (
                    <div style={{ color: 'var(--muted)' }}>Cargando detalle...</div>
                  ) : (
                    <>
                      <div className="list">
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>ID gestión</span><strong>{auditItem?.management_id || auditItem?.id || '—'}</strong></div>
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Fecha/Hora</span><strong>{formatDateTime(auditItem?.fecha_gestion)}</strong></div>
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Teléfono</span><strong>{formatPhone(auditItem)}</strong></div>
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Vendedor</span><strong>{formatSeller(auditItem)}</strong></div>
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Cliente</span><strong>{auditItem?.cliente || '—'}</strong></div>
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Lote/Campaña</span><strong>{auditItem?.batch_nombre || auditItem?.batch_id || '—'}</strong></div>
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Codificación original</span><strong>{normalizeResultadoLabel(auditItem?.resultado_original)}</strong></div>
                      </div>

                      <label style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Nueva codificación</span>
                        <select
                          className="input"
                          value={auditResultado}
                          onChange={(event) => setAuditResultado(event.target.value)}
                          ref={auditSelectRef}
                          disabled={catalogoLoading || !catalogo.length}
                        >
                          <option value="">Seleccionar</option>
                          {catalogo
                            .filter((item) => {
                              const nombre = item?.nombre || item;
                              return nombre && nombre !== auditItem?.resultado_original;
                            })
                            .map((item) => (
                              <option key={item.id || item.nombre || item} value={item.nombre || item}>{item.nombre || item}</option>
                            ))}
                        </select>
                        {catalogoError ? (
                          <div style={{ fontSize: 12, color: '#b91c1c' }}>{catalogoError}</div>
                        ) : null}
                      </label>
                      <label style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Comentario (opcional)</span>
                        <textarea
                          className="input"
                          rows={3}
                          value={auditComentario}
                          onChange={(event) => setAuditComentario(event.target.value)}
                        />
                      </label>
                      {auditError ? <div style={{ marginTop: 10, color: '#b91c1c' }}>{auditError}</div> : null}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                        <Button variant="ghost" onClick={closeAudit}>Cancelar</Button>
                        <Button disabled={auditSaving || !auditResultado} onClick={saveAudit}>{auditSaving ? 'Guardando...' : 'Guardar corrección'}</Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {historyOpen && (
            <div className="lot-wizard-overlay" onClick={closeHistory}>
              <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 600 }}>
                <div className="lot-wizard-header">
                  <div style={{ fontWeight: 700 }}>Historial de codificación</div>
                  <button className="close-btn" onClick={closeHistory}><X size={16} /></button>
                </div>
                <div className="lot-wizard-content">
                  {historyLoading ? (
                    <div style={{ color: 'var(--muted)' }}>Cargando historial...</div>
                  ) : historyError ? (
                    <div style={{ color: '#b91c1c' }}>{historyError}</div>
                  ) : (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Original</div>
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Fecha/Hora</span><strong>{formatDateTime(historyData?.management?.fecha_gestion)}</strong></div>
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Vendedor</span><strong>{historyData?.management?.vendedor_nombre_completo || '—'}</strong></div>
                        <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Codificación</span><strong>{normalizeResultadoLabel(historyData?.management?.resultado_original)}</strong></div>
                      </div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Correcciones</div>
                      {(historyData?.audits || []).length ? (
                        <div className="list">
                          {[...(historyData?.audits || [])].sort((a, b) => {
                            const aTime = new Date(a?.corrected_at || 0).getTime();
                            const bTime = new Date(b?.corrected_at || 0).getTime();
                            return bTime - aTime;
                          }).map((audit) => (
                            <div key={audit.id} className="alert">
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{normalizeResultadoLabel(audit.resultado_corregido)}</div>
                                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>{audit.supervisor_nombre_completo || audit.corrected_by || '—'}</div>
                                  {audit.motivo ? <div style={{ fontSize: 12, marginTop: 4 }}>{audit.motivo}</div> : null}
                                </div>
                                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{formatDateTime(audit.corrected_at)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--muted)' }}>Sin correcciones registradas.</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function SalesClientsView({ onOpenNewClient = null }) {
      const [ventas, setVentas] = React.useState([]);
      const [allSales, setAllSales] = React.useState([]);
      const [loadingVentas, setLoadingVentas] = React.useState(true);
      const [selectedSale, setSelectedSale] = React.useState(null);

      React.useEffect(() => {
        const cargar = async () => {
          setLoadingVentas(true);
          try {
            const api = getApiClient();
            const data = await api.get('/sales/mine');
            if (data?.success || data?.ok) {
              const items = data?.items || data?.data?.items || data?.data || [];
              const allItems = Array.isArray(items) ? items : [];
              setAllSales(allItems);
              const today = new Date().toLocaleDateString('en-CA');
              const ventasHoy = allItems.filter((item) => {
                const fecha = item?.fecha_venta || item?.created_at || '';
                return String(fecha).startsWith(today);
              });
              setVentas(ventasHoy);
            }
          } catch (err) {
            console.error('[my-sales] error:', err);
          } finally {
            setLoadingVentas(false);
          }
        };
        cargar();
      }, []);

      const formatFechaVenta = (raw) => {
        if (!raw) return '—';
        const value = String(raw).trim();
        if (!value) return '—';
        let date;
        const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
        const localDateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
        if (dateOnlyMatch) {
          const [, y, m, d] = dateOnlyMatch;
          date = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0);
        } else if (localDateTimeMatch && !hasTimezone) {
          const [, y, m, d, hh, mm, ss] = localDateTimeMatch;
          date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0));
        } else {
          date = new Date(value);
        }
        if (!date || Number.isNaN(date.getTime())) return value;
        try {
          return date.toLocaleString('es-UY', {
            day: 'numeric', month: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
        } catch {
          return value;
        }
      };
      const pickValue = (row, keys, fallback = '—') => {
        for (const key of keys) {
          const value = row?.[key];
          if (value !== undefined && value !== null && String(value).trim() !== '') return value;
        }
        return fallback;
      };
      const renderDetailField = (label, value) => (
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontWeight: 600 }}>{value || '—'}</div>
        </div>
      );
      const todayKey = new Date().toLocaleDateString('en-CA');
      const monthKey = todayKey.slice(0, 7);
      const pickDateKey = (row) => {
        const value = row?.fecha_venta || row?.created_at || '';
        return String(value).slice(0, 10);
      };
      const ventasHoy = allSales
        .filter((item) => {
          const fecha = item?.fecha_venta || item?.created_at || '';
          return String(fecha).startsWith(todayKey);
        })
        .reduce((total, item) => {
          const related = item?.related_sales?.length || 0;
          return total + 1 + related;
        }, 0);
      const ventasMes = allSales
        .filter((item) => pickDateKey(item).startsWith(monthKey))
        .reduce((total, item) => {
          const related = item?.related_sales?.length || 0;
          return total + 1 + related;
        }, 0);
      const bajasMes = allSales.filter((item) => {
        const status = String(item?.estado || item?.status || '').toLowerCase();
        return pickDateKey(item).startsWith(monthKey) && status === 'baja';
      });
      const getRelatedSales = (row) => {
        const items = row?.related_sales || row?.relatedSales || [];
        return Array.isArray(items) ? items : [];
      };
      const handleOpenSaleDetail = (row) => {
        setSelectedSale(row);
      };
      return (
        <div className="view">
          <section className="content-grid">
            <Panel
              className="span-12"
              title="Mis ventas"
              subtitle="Contactos que convertiste en clientes"
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ borderRadius: 14, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.08)', padding: 14 }}>
                  <div style={{ fontSize: 12, color: '#047857', textTransform: 'uppercase', letterSpacing: 1 }}>Ventas de hoy</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#047857' }}>{ventasHoy}</div>
                </div>
                <div style={{ borderRadius: 14, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.08)', padding: 14 }}>
                  <div style={{ fontSize: 12, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 1 }}>Ventas del mes</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1d4ed8' }}>{ventasMes}</div>
                </div>
                <div style={{ borderRadius: 14, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', padding: 14 }}>
                  <div style={{ fontSize: 12, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: 1 }}>Bajas del mes</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c' }}>{bajasMes.length}</div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Estado</th><th>Contacto</th><th>Ubicación</th><th>Origen del dato</th><th>Relacionadas</th><th>Fecha</th></tr></thead>
                  <tbody>
                    {ventas.map((row) => {
                      const statusRaw = row.estado || row.status || 'alta';
                      const status = String(statusRaw).toLowerCase();
                      const statusColor = status === 'alta'
                        ? { bg: 'rgba(16,185,129,0.15)', text: '#047857', border: 'rgba(16,185,129,0.35)' }
                        : status === 'baja'
                          ? { bg: 'rgba(239,68,68,0.15)', text: '#b91c1c', border: 'rgba(239,68,68,0.35)' }
                          : { bg: 'rgba(148,163,184,0.2)', text: '#64748b', border: 'rgba(148,163,184,0.4)' };
                      const nombre = [row.nombre, row.apellido].filter(Boolean).join(' ')
                        || [row.contact_nombre, row.contact_apellido].filter(Boolean).join(' ')
                        || '—';
                      const telefono = row.celular || row.telefono || row.phone || '—';
                      const ubicacion = row.ubicacion
                        || [row.departamento, row.localidad].filter(Boolean).join(', ')
                        || '—';
                      const origenDato = (row.origen_dato && String(row.origen_dato).trim()) ? row.origen_dato : '—';
                      const relatedCount = getRelatedSales(row).length;
                      return (
                        <tr
                          key={row.id || row.contacto_id || nombre + telefono}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleOpenSaleDetail(row)}
                        >
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
                              {status || 'alta'}
                            </span>
                          </td>
                          <td>
                            <div className="person">
                              <div className="person-badge">{initials(nombre)}</div>
                              <strong>{nombre}</strong>
                            </div>
                          </td>
                          <td>{ubicacion}</td>
                          <td><span style={{ color: '#666', fontSize: 12 }}>{origenDato}</span></td>
                          <td>
                            {relatedCount ? (
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e' }}>+{relatedCount}</span>
                            ) : (
                              <span style={{ color: '#aaa', fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td>{formatFechaVenta(row.fecha_venta)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!loadingVentas && !ventas.length ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: '#aaa' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#333', margin: '0 0 4px 0' }}>
                      Aún no tenés ventas registradas
                    </p>
                    <p style={{ fontSize: 12, margin: 0 }}>
                      Cuando cerrés una venta aparecerá acá
                    </p>
                  </div>
                ) : null}
              </div>
            </Panel>
          </section>
          {selectedSale ? (
            <div className="lot-wizard-overlay" onClick={() => setSelectedSale(null)}>
              <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 720 }}>
                <div className="lot-wizard-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="person-badge" style={{ width: 42, height: 42 }}>
                      {initials([selectedSale.nombre, selectedSale.apellido].filter(Boolean).join(' ') || '—')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Detalle de la venta</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                        {formatFechaVenta(selectedSale.fecha_venta)}
                      </div>
                    </div>
                  </div>
                  <button className="close-btn" onClick={() => setSelectedSale(null)}>×</button>
                </div>
                <div className="lot-wizard-content">
                  <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                    <div style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Datos del titular</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {renderDetailField('Nombre', [
                          selectedSale.nombre,
                          selectedSale.apellido
                        ].filter(Boolean).join(' ') || [
                          selectedSale.contact_nombre,
                          selectedSale.contact_apellido
                        ].filter(Boolean).join(' ') || '—')}
                        {renderDetailField('Documento', pickValue(selectedSale, ['documento', 'contact_documento', 'contacto_documento', 'dni', 'cedula']))}
                        {renderDetailField('Teléfono', pickValue(selectedSale, ['celular', 'telefono', 'phone']))}
                        {renderDetailField('Email', pickValue(selectedSale, ['email', 'correo']))}
                        {renderDetailField('Ubicación', [selectedSale.departamento, selectedSale.localidad].filter(Boolean).join(', ') || '—')}
                      </div>
                    </div>
                    <div style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Producto contratado</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {renderDetailField('Producto', pickValue(selectedSale, ['nombre_producto', 'producto', 'producto_nombre', 'servicio']))}
                        {renderDetailField('Plan', pickValue(selectedSale, ['plan', 'cuota']))}
                        {renderDetailField('Precio', pickValue(selectedSale, ['precio', 'monto']))}
                        {renderDetailField('Medio de pago', pickValue(selectedSale, ['medio_pago', 'metodo_pago', 'metodoDePago', 'payment_method', 'forma_pago']))}
                        {renderDetailField('Fecha alta', pickValue(selectedSale, ['fecha_alta', 'fechaAlta']))}
                        {renderDetailField('Estado', (
                          () => {
                            const prodStatus = String(pickValue(selectedSale, ['producto_estado', 'estado_producto', 'estado']) || '').toLowerCase();
                            const pill = prodStatus === 'alta'
                              ? { bg: 'rgba(16,185,129,0.15)', text: '#047857', border: 'rgba(16,185,129,0.35)' }
                              : prodStatus === 'baja'
                                ? { bg: 'rgba(239,68,68,0.15)', text: '#b91c1c', border: 'rgba(239,68,68,0.35)' }
                                : { bg: 'rgba(148,163,184,0.2)', text: '#64748b', border: 'rgba(148,163,184,0.4)' };
                            return (
                              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: pill.bg, color: pill.text, border: `1px solid ${pill.border}` }}>
                                {prodStatus || '—'}
                              </span>
                            );
                          }
                        )())}
                      </div>
                    </div>
                    <div style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Ventas relacionadas</div>
                      {getRelatedSales(selectedSale).length ? (
                        <div style={{ display: 'grid', gap: 10 }}>
                          {getRelatedSales(selectedSale).map((item, index) => {
                            const nombre = [item?.nombre, item?.apellido].filter(Boolean).join(' ')
                              || [item?.contact_nombre, item?.contact_apellido].filter(Boolean).join(' ')
                              || '—';
                            return (
                              <div key={item?.id || item?.sale_id || index} style={{ borderRadius: 10, padding: 10, border: '1px solid rgba(15,23,42,0.08)', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                                  <div style={{ fontWeight: 700 }}>{nombre}</div>
                                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{formatFechaVenta(item?.fecha_venta)}</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
                                  {renderDetailField('Producto', pickValue(item, ['nombre_producto', 'producto', 'producto_nombre', 'servicio']))}
                                  {renderDetailField('Precio', pickValue(item, ['precio', 'monto']))}
                                  {renderDetailField('Relación', pickValue(item, ['relacion', 'relacionConTitular', 'relacion_con_titular', 'relation']))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Sin ventas relacionadas</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    function SalesContactDetail({ contact, onRegister, onBack, salesRecords, products, onAssignFamilySale, onUpdateContact }) {
      const [activeTab, setActiveTab] = React.useState('datos');
      const [isEditing, setIsEditing] = React.useState(false);
      const [profileDraft, setProfileDraft] = React.useState({});
      const [status, setStatus] = React.useState(contact.status);
      const [note, setNote] = React.useState('');
      const [nextAction, setNextAction] = React.useState('');
      const [timeSlot, setTimeSlot] = React.useState('');
      const [error, setError] = React.useState('');
      const [showFamilyForm, setShowFamilyForm] = React.useState(false);
      const [familyForm, setFamilyForm] = React.useState({
        nombre: '',
        telefono: '',
        documento: '',
        relacionConTitular: 'hijo',
        productoId: '',
        cuota: '',
        observaciones: ''
      });
      const [familyError, setFamilyError] = React.useState('');

      React.useEffect(() => {
        setActiveTab('datos');
        setIsEditing(false);
        setProfileDraft({
          name: contact.name || '',
          phone: contact.phone || '',
          city: contact.city || '',
          documento: contact.documento || '',
          email: contact.email || '',
          direccion: contact.direccion || ''
        });
        setStatus(contact.status);
        setNote('');
        setNextAction('');
        setTimeSlot('');
        setError('');
        setShowFamilyForm(false);
        setFamilyError('');
        setFamilyForm({
          nombre: '',
          telefono: '',
          documento: '',
          relacionConTitular: 'hijo',
          productoId: '',
          cuota: '',
          observaciones: ''
        });
      }, [contact.id, contact.name, contact.phone, contact.city, contact.documento, contact.email, contact.direccion, contact.status]);

      const generatedSales = getSalesByContact(salesRecords, contact.id);
      const canAssignFamily = contact.estadoOperativo === 'finalizado_venta' && generatedSales.some((sale) => !sale.grupoFamiliar);

      const saveProfile = () => {
        if (!onUpdateContact) return;
        onUpdateContact(contact.id, {
          name: profileDraft.name.trim(),
          phone: profileDraft.phone.trim(),
          city: profileDraft.city.trim(),
          documento: profileDraft.documento.trim(),
          email: profileDraft.email.trim(),
          direccion: profileDraft.direccion.trim()
        });
        setIsEditing(false);
      };

      const submitFamily = () => {
        if (!familyForm.nombre.trim()) {
          setFamilyError('Ingresa el nombre del familiar.');
          return;
        }
        if (!familyForm.telefono.trim()) {
          setFamilyError('Ingresa el teléfono del familiar.');
          return;
        }
        if (!familyForm.productoId) {
          setFamilyError('Selecciona un producto.');
          return;
        }
        if (!familyForm.cuota) {
          setFamilyError('Ingresa la cuota.');
          return;
        }
        setFamilyError('');
        onAssignFamilySale(contact, familyForm);
        setShowFamilyForm(false);
        setFamilyForm({
          nombre: '',
          telefono: '',
          documento: '',
          relacionConTitular: 'hijo',
          productoId: '',
          cuota: '',
          observaciones: ''
        });
      };

      const submit = () => {
        if (status === 'seguimiento' && !nextAction) {
          setError('Seguimiento requiere fecha y hora de próxima acción.');
          return;
        }
        if (status === 'rellamar' && !nextAction && !timeSlot) {
          setError('Rellamar requiere fecha/hora o franja horaria.');
          return;
        }
        setError('');
        onRegister(contact.id, {
          status,
          note: note.trim(),
          nextAction: status === 'seguimiento' ? nextAction : status === 'rellamar' ? (nextAction || timeSlot) : ''
        });
        setNote('');
        setNextAction('');
        setTimeSlot('');
      };

      const submitQuickSale = () => {
        onRegister(contact.id, {
          status: 'venta',
          note: note.trim() || 'Venta registrada desde gestión',
          nextAction: ''
        });
        setStatus('venta');
        setNote('');
        setNextAction('');
        setTimeSlot('');
      };

      return (
        <div className="sales-detail-content">
          <button className="sales-back-btn" onClick={onBack}>
            <ArrowDownRight size={14} /> Volver a la lista
          </button>

          <div className="status-item">
            <div className="status-ring" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}><User size={18} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{contact.name}</div>
              <div style={{ color: 'var(--muted)' }}>{contact.phone} · {contact.city}</div>
            </div>
            <a className="sales-call-btn" href={'tel:' + contact.phone.replace(/\s/g, '')} title="Llamar contacto">
              <PhoneCall size={15} />
              Llamar
            </a>
          </div>

          <div className="toolbar" style={{ marginBottom: 10 }}>
            <Button variant={activeTab === 'datos' ? 'primary' : 'secondary'} onClick={() => setActiveTab('datos')}>Datos del contacto</Button>
            <Button variant={activeTab === 'gestion' ? 'primary' : 'secondary'} onClick={() => setActiveTab('gestion')}>Gestión</Button>
          </div>

          {activeTab === 'datos' ? (
            <div className="list">
              <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Documento</span><strong>{contact.documento || '-'}</strong></div>
              <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Email</span><strong>{contact.email || '-'}</strong></div>
              <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Dirección</span><strong>{contact.direccion || '-'}</strong></div>
              <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Fuente</span><strong>{contact.source || '-'}</strong></div>
              <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Lote</span><strong>{contact.lotId || '-'}</strong></div>
              <div className="toolbar" style={{ marginTop: 8 }}>
                {!isEditing ? (
                  <Button variant="secondary" icon={<Edit3 size={16} />} onClick={() => setIsEditing(true)}>Editar datos</Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    <Button icon={<CheckCircle2 size={16} />} onClick={saveProfile}>Guardar cambios</Button>
                  </>
                )}
              </div>
              {isEditing ? (
                <div className="list" style={{ marginTop: 8 }}>
                  <input className="input" value={profileDraft.name} onChange={(event) => setProfileDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nombre y apellido" />
                  <input className="input" value={profileDraft.phone} onChange={(event) => setProfileDraft((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Teléfono" />
                  <input className="input" value={profileDraft.documento} onChange={(event) => setProfileDraft((prev) => ({ ...prev, documento: event.target.value }))} placeholder="Documento" />
                  <input className="input" value={profileDraft.email} onChange={(event) => setProfileDraft((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" />
                  <input className="input" value={profileDraft.city} onChange={(event) => setProfileDraft((prev) => ({ ...prev, city: event.target.value }))} placeholder="Ubicación" />
                  <textarea className="input" rows="2" value={profileDraft.direccion} onChange={(event) => setProfileDraft((prev) => ({ ...prev, direccion: event.target.value }))} placeholder="Dirección" />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="list">
              <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Resultado de gestión</span><SalesStatusBadge status={contact.resultadoGestion || contact.status} small /></div>
              <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Estado operativo</span><strong>{(contact.estadoOperativo || '-').replace(/_/g, ' ')}</strong></div>
              <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Intentos</span><strong>{contact.attempts}</strong></div>
              <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Próxima acción</span><strong style={{ color: contact.nextAction ? '#0f766e' : 'var(--muted)' }}>{formatNextAction(contact.nextAction)}</strong></div>

              <div style={{ borderTop: '1px solid rgba(20,34,53,0.08)', paddingTop: 12 }}>
                <div style={{ fontFamily: 'inherit', fontWeight: 800, marginBottom: 10 }}>Registrar gestión</div>
                <div className="toolbar" style={{ marginBottom: 8 }}>
                  <select className="input" style={{ width: '100%' }} value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="venta">Venta</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="no_contesta">No contesta</option>
                    <option value="rechazo">Rechazo</option>
                    <option value="rellamar">Rellamar</option>
                    <option value="dato_erroneo">Dato erróneo</option>
                  </select>
                </div>
                {status === 'seguimiento' ? <input className="input" type="datetime-local" value={nextAction} onChange={(event) => setNextAction(event.target.value)} style={{ marginBottom: 8 }} /> : null}
                {status === 'rellamar' ? <div className="list" style={{ marginBottom: 8 }}><input className="input" type="datetime-local" value={nextAction} onChange={(event) => setNextAction(event.target.value)} /><input className="input" placeholder="o franja horaria (ej. 18:00 a 20:00)" value={timeSlot} onChange={(event) => setTimeSlot(event.target.value)} /></div> : null}
                <input className="input" placeholder="Nota de gestión" value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} />
                {error ? <div style={{ marginTop: 8, color: '#be123c', fontSize: '0.83rem', fontWeight: 700 }}>{error}</div> : null}
                <div className="toolbar" style={{ marginTop: 10 }}>
                  <Button icon={<Activity size={16} />} onClick={submit}>Registrar gestión</Button>
                  {contact.estadoOperativo !== 'finalizado_venta' ? <Button variant="secondary" icon={<CheckCircle2 size={16} />} onClick={submitQuickSale}>Registrar venta</Button> : null}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(20,34,53,0.08)', paddingTop: 12 }}>
                <div style={{ fontFamily: 'inherit', fontWeight: 800, marginBottom: 10 }}>Historial de gestiones</div>
                <div className="list">
                  {(contact.history || []).slice(0, 8).map((item) => (
                    <div key={item.at + item.status + item.note} className="alert">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{salesStatusMeta(item.status).label} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {item.at}</span></div>
                        <div style={{ color: 'var(--muted)' }}>{item.note || '-'}</div>
                      </div>
                    </div>
                  ))}
                  {!(contact.history || []).length ? <div style={{ color: 'var(--muted)' }}>Sin gestiones registradas.</div> : null}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(20,34,53,0.08)', paddingTop: 12 }}>
                <div style={{ fontFamily: 'inherit', fontWeight: 800, marginBottom: 10 }}>Ventas generadas</div>
                <div className="list" style={{ marginBottom: 10 }}>
                  {generatedSales.length ? generatedSales.map((sale) => (
                    <div key={sale.id} className="alert">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>
                          {sale.clienteNombre} — {products.find((p) => p.id === sale.productoId)?.nombre || 'Producto'}
                        </div>
                        <div style={{ color: 'var(--muted)' }}>
                          {sale.grupoFamiliar ? ('Familiar · ' + (sale.relacionConTitular || '-')) : 'Venta principal'}
                          {' · '}
                          {sale.cuota ? ('$ ' + Number(sale.cuota).toLocaleString('es-UY')) : 'Cuota pendiente'}
                        </div>
                      </div>
                    </div>
                  )) : <div style={{ color: 'var(--muted)' }}>No hay ventas registradas para este contacto.</div>}
                </div>

                {canAssignFamily ? (
                  <div>
                    <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowFamilyForm((value) => !value)}>
                      {showFamilyForm ? 'Ocultar formulario' : 'Asignar familiar'}
                    </Button>
                    {showFamilyForm ? (
                      <div className="list" style={{ marginTop: 10 }}>
                        <input className="input" placeholder="Nombre" value={familyForm.nombre} onChange={(event) => setFamilyForm((prev) => ({ ...prev, nombre: event.target.value }))} />
                        <input className="input" placeholder="Teléfono" value={familyForm.telefono} onChange={(event) => setFamilyForm((prev) => ({ ...prev, telefono: event.target.value }))} />
                        <input className="input" placeholder="Documento (opcional)" value={familyForm.documento} onChange={(event) => setFamilyForm((prev) => ({ ...prev, documento: event.target.value }))} />
                        <select className="input" value={familyForm.relacionConTitular} onChange={(event) => setFamilyForm((prev) => ({ ...prev, relacionConTitular: event.target.value }))}>
                          <option value="hijo">Hijo</option>
                          <option value="esposa">Esposa</option>
                          <option value="familiar">Familiar</option>
                          <option value="otro">Otro</option>
                        </select>
                        <select className="input" value={familyForm.productoId} onChange={(event) => setFamilyForm((prev) => ({ ...prev, productoId: event.target.value }))}>
                          <option value="">Seleccionar producto...</option>
                          {products.map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}
                        </select>
                        <input className="input" type="number" placeholder="Cuota" value={familyForm.cuota} onChange={(event) => setFamilyForm((prev) => ({ ...prev, cuota: event.target.value }))} />
                        <textarea className="input" rows="2" placeholder="Observaciones" value={familyForm.observaciones} onChange={(event) => setFamilyForm((prev) => ({ ...prev, observaciones: event.target.value }))}></textarea>
                        {familyError ? <div style={{ color: '#be123c', fontWeight: 700, fontSize: '0.84rem' }}>{familyError}</div> : null}
                        <div><Button icon={<CheckCircle2 size={16} />} onClick={submitFamily}>Guardar familiar</Button></div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      );
    }

    const lotStatusMeta = (status) => {
      const map = {
        activo: { label: 'Activo', variant: 'success' },
        borrador: { label: 'Borrador', variant: 'default' },
        cerrado: { label: 'Cerrado', variant: 'danger' },
        sin_asignar: { label: 'Sin asignar', variant: 'warning' },
        asignado: { label: 'Asignado', variant: 'info' },
        en_gestion: { label: 'En gestion', variant: 'success' },
        finalizado: { label: 'Finalizado', variant: 'danger' }
      };
      return map[status] || map.sin_asignar;
    };

    function SupervisorModule({ route, contacts, lots, onBulkAssignContacts, onCreateLot, onAssignLotSeller, onCloseLot, onReactivateError, onOpenRoute }) {
      const [search, setSearch] = React.useState('');
      const [sourceFilter, setSourceFilter] = React.useState('todos');
      const [cityFilter, setCityFilter] = React.useState('todos');
      const [statusFilter, setStatusFilter] = React.useState('todos');
      const [dateFilter, setDateFilter] = React.useState('todos');
      const [selectedIds, setSelectedIds] = React.useState([]);
      const [showImport, setShowImport] = React.useState(false);
      const [importFile, setImportFile] = React.useState('');
      const [lotNameDraft, setLotNameDraft] = React.useState('');
      const [selectedLotId, setSelectedLotId] = React.useState(lots[0]?.id || '');
      const [lotSellerDraft, setLotSellerDraft] = React.useState('');
      const [showLotWizard, setShowLotWizard] = React.useState(false);
      const [wizardLotName, setWizardLotName] = React.useState('');
      const [wizardDeadline, setWizardDeadline] = React.useState('');
      const [wizardPriority, setWizardPriority] = React.useState('normal');
      const [wizardAssignMode, setWizardAssignMode] = React.useState('individual');
      const [wizardSeller, setWizardSeller] = React.useState('');
      const [wizardGroupSellers, setWizardGroupSellers] = React.useState([]);

      const formatDateYmdLocal = React.useCallback((value) => {
        if (!value) return '';
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }, []);
      const [wizardError, setWizardError] = React.useState('');
      const [basePage, setBasePage] = React.useState(1);
      const basePageSize = 12;
      const [workDataRows, setWorkDataRows] = React.useState([]);
      const [workDataLoading, setWorkDataLoading] = React.useState(false);
      const [workDataError, setWorkDataError] = React.useState('');
      const [workDataSearch, setWorkDataSearch] = React.useState('');
      const [workDataSelected, setWorkDataSelected] = React.useState(null);
      const [workDataPage, setWorkDataPage] = React.useState(1);
      const [workDataPageSize, setWorkDataPageSize] = React.useState(10);
      const [workDataMeta, setWorkDataMeta] = React.useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
      const [workDataOriginFilter, setWorkDataOriginFilter] = React.useState('todos');
      const [workDataDeptFilter, setWorkDataDeptFilter] = React.useState('todos');
      const [workDataTab, setWorkDataTab] = React.useState('nuevo');

      const loadWorkData = React.useCallback(async () => {
        setWorkDataLoading(true);
        setWorkDataError('');
        try {
          const result = await listDatosParaTrabajar({
            page: workDataPage,
            pageSize: workDataPageSize,
            search: workDataSearch,
            estado: workDataTab
          });
          const rows = result?.items || [];
          setWorkDataRows(Array.isArray(rows) ? rows : []);
          setWorkDataMeta({
            page: result?.page || workDataPage,
            pageSize: result?.pageSize || workDataPageSize,
            total: result?.total || 0,
            totalPages: result?.totalPages || 1
          });
        } catch (err) {
          setWorkDataError(err?.message || 'No se pudo cargar la base de trabajo.');
          setWorkDataRows([]);
        } finally {
          setWorkDataLoading(false);
        }
      }, [workDataPage, workDataPageSize, workDataSearch, workDataTab]);

      React.useEffect(() => {
        if (route === 'base_general') {
          loadWorkData();
        }
      }, [route, loadWorkData]);

      React.useEffect(() => {
        if (route !== 'base_general') return;
        setWorkDataPage(1);
      }, [route, workDataTab]);

      const workDataOriginOptions = React.useMemo(() => {
        const values = workDataRows
          .map((item) => (item.origen_dato || '').toString().trim())
          .filter(Boolean);
        return ['todos', ...new Set(values)];
      }, [workDataRows]);

      const workDataDeptOptions = React.useMemo(() => {
        const values = workDataRows
          .map((item) => (item.departamento || '').toString().trim())
          .filter(Boolean);
        return ['todos', ...new Set(values)];
      }, [workDataRows]);

      const filteredWorkDataRows = React.useMemo(() => {
        return workDataRows.filter((item) => {
          const originMatch = workDataOriginFilter === 'todos' || (item.origen_dato || '').toString().trim() === workDataOriginFilter;
          const deptMatch = workDataDeptFilter === 'todos' || (item.departamento || '').toString().trim() === workDataDeptFilter;
          return originMatch && deptMatch;
        });
      }, [workDataRows, workDataOriginFilter, workDataDeptFilter]);

      const [apiSellers, setApiSellers] = React.useState([]);
      React.useEffect(() => {
        listSellersAsync().then(setApiSellers).catch(() => {});
      }, []);
      const sellers = apiSellers;

      const activeBase = React.useMemo(
        () => contacts.filter((contact) => !isErrorNumberContact(contact) && !isContactBlockedForNoCall(contact)),
        [contacts]
      );
      const errorNumbers = React.useMemo(() => contacts.filter((contact) => isErrorNumberContact(contact)), [contacts]);

      const filteredBase = React.useMemo(() => activeBase.filter((contact) => {
        const bySearch = (contact.name + ' ' + contact.phone + ' ' + (contact.assignedTo || '')).toLowerCase().includes(search.toLowerCase());
        const bySource = sourceFilter === 'todos' || contact.source === sourceFilter;
        const byCity = cityFilter === 'todos' || contact.city === cityFilter;
        const byStatus = statusFilter === 'todos' || contact.status === statusFilter;
        const byDate = dateFilter === 'todos' || contact.loadedAt === dateFilter;
        return bySearch && bySource && byCity && byStatus && byDate;
      }), [activeBase, search, sourceFilter, cityFilter, statusFilter, dateFilter]);

      const baseTotalPages = Math.max(1, Math.ceil(filteredBase.length / basePageSize));
      const safeBasePage = Math.min(basePage, baseTotalPages);
      const pagedFilteredBase = filteredBase.slice((safeBasePage - 1) * basePageSize, safeBasePage * basePageSize);

      React.useEffect(() => {
        setBasePage(1);
      }, [search, sourceFilter, cityFilter, statusFilter, dateFilter]);

      const sourceOptions = React.useMemo(() => ['todos', ...new Set(activeBase.map((contact) => contact.source))], [activeBase]);
      const cityOptions = React.useMemo(() => ['todos', ...new Set(activeBase.map((contact) => contact.city))], [activeBase]);
      const statusOptions = React.useMemo(() => ['todos', ...new Set(activeBase.map((contact) => contact.status))], [activeBase]);
      const dateOptions = React.useMemo(() => ['todos', ...new Set(activeBase.map((contact) => contact.loadedAt))], [activeBase]);

      const lotSummaries = React.useMemo(() => lots.map((lot) => {
        const lotContacts = contacts.filter((contact) => contact.lotId === lot.id);
        const closed = lotContacts.filter((contact) => !isCommercialContactActive(contact)).length;
        const progress = lotContacts.length ? Math.round((closed / lotContacts.length) * 100) : 0;
        const finalizable = isLotFinalizableFromContacts(lotContacts);
        return { ...lot, contacts: lotContacts, count: lotContacts.length || lot.count || 0, progress, finalizable };
      }), [lots, contacts]);

      const selectedLot = lotSummaries.find((lot) => lot.id === selectedLotId) || lotSummaries[0] || null;

      const sellerSummary = React.useMemo(() => sellers.map((seller) => {
        const sellerLabel = typeof seller === 'string'
          ? seller
          : (seller.label || `${seller.nombre || seller.name || ''} ${seller.apellido || ''}`.trim() || seller.email || '');
        const sellerId = typeof seller === 'object' ? (seller.id || seller.seller_id || seller.user_id || '') : '';
        const scoped = contacts.filter((contact) => {
          if (sellerId && contact.assignedToId && String(contact.assignedToId) === String(sellerId)) return true;
          return contact.assignedTo === sellerLabel;
        });
        const assigned = scoped.length;
        const ventas = scoped.filter((contact) => contact.status === 'venta').length;
        const seguimientos = scoped.filter((contact) => contact.status === 'seguimiento').length;
        const rellamadas = scoped.filter((contact) => contact.status === 'rellamar').length;
        const no_contesta = scoped.filter((contact) => contact.status === 'no_contesta').length;
        const rechazos = scoped.filter((contact) => contact.status === 'rechazo').length;
        const datos_erroneos = scoped.filter((contact) => contact.status === 'dato_erroneo').length;
        const total_gestionado = ventas + seguimientos + rellamadas + no_contesta + rechazos + datos_erroneos;
        const datos_utiles = ventas + seguimientos + rechazos;
        const contacto = total_gestionado > 0 ? Math.round((datos_utiles / total_gestionado) * 100) : 0;
        const efectividad = datos_utiles > 0 ? Math.round((ventas / datos_utiles) * 100) : 0;
        return {
          seller: sellerLabel,
          contact: contacto,
          assigned,
          total_gestionado,
          venta: ventas,
          seguimiento: seguimientos,
          rellamar: rellamadas,
          no_contesta,
          rechazo: rechazos,
          dato_erroneo: datos_erroneos,
          efectividad
        };
      }), [contacts, sellers]);


      const toggleSelection = (id) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((current) => current !== id) : [...prev, id]);
      };

      const resetWizard = () => {
        setWizardLotName('');
        setWizardDeadline('');
        setWizardPriority('normal');
        setWizardAssignMode('individual');
        setWizardSeller('');
        setWizardGroupSellers([]);
        setWizardError('');
      };

      const openWizard = () => {
        if (!selectedIds.length) return;
        resetWizard();
        setShowLotWizard(true);
      };

      const toggleWizardGroupSeller = (seller) => {
        setWizardGroupSellers((prev) => prev.includes(seller) ? prev.filter((item) => item !== seller) : [...prev, seller]);
      };

      const createLotFromSelection = async () => {
        if (!wizardLotName.trim()) {
          setWizardError('Ingresa un nombre para el lote.');
          return;
        }
        if (wizardAssignMode === 'individual' && !wizardSeller) {
          setWizardError('Selecciona un vendedor para asignación individual.');
          return;
        }
        if (wizardAssignMode === 'grupo' && wizardGroupSellers.length < 2) {
          setWizardError('Selecciona al menos dos vendedores para distribuir.');
          return;
        }

        const assignmentLabel = wizardAssignMode === 'individual' ? wizardSeller : ('Distribuido (' + wizardGroupSellers.length + ')');
        const createdLot = await onCreateLot({
          name: wizardLotName.trim(),
          status: 'asignado',
          priority: wizardPriority,
          deadline: wizardDeadline || '',
          sellerLabel: assignmentLabel
        });
        const lotId = createdLot.id;

        const selectedSet = new Set(selectedIds);
        const selectedContacts = contacts.filter((contact) => selectedSet.has(contact.id));
        const distributedById = {};
        if (wizardAssignMode === 'grupo') {
          selectedContacts.forEach((contact, index) => {
            distributedById[contact.id] = wizardGroupSellers[index % wizardGroupSellers.length];
          });
        }

        await onBulkAssignContacts(
          selectedIds,
          lotId,
          wizardAssignMode === 'individual' ? wizardSeller : '',
          distributedById
        );
        if (wizardAssignMode === 'individual' && wizardSeller) {
          await onAssignLotSeller(lotId, wizardSeller, 'asignado');
        }
        setSelectedLotId(lotId);
        setSelectedIds([]);
        setShowLotWizard(false);
        resetWizard();
      };

      const createLot = async () => {
        if (!lotNameDraft.trim()) return;
        const created = await onCreateLot({ name: lotNameDraft.trim(), status: 'sin_asignar' });
        setSelectedLotId(created.id);
        setLotNameDraft('');
      };

      const assignSellerToLot = async () => {
        if (!selectedLot || !lotSellerDraft) return;
        await onAssignLotSeller(selectedLot.id, lotSellerDraft, selectedLot.status);
      };

      const closeLot = async () => {
        if (!selectedLot) return;
        await onCloseLot(selectedLot.id);
      };

      const reactivateErrorNumber = async (id) => {
        await onReactivateError(id);
      };

      const exportErrors = () => {
        const rows = errorNumbers.map((contact) => `${contact.name},${contact.phone},${contact.assignedTo || '-'},${contact.last},${contact.history?.[0]?.note || '-'}`);
        const csv = ['Contacto,Telefono,Vendedor,Fecha,Motivo', ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'numeros_con_errores.csv';
        link.click();
        URL.revokeObjectURL(url);
      };

      if (route === 'lotes') {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-7" title="Gestion de lotes" subtitle="Crea, asigna y controla el avance por lote" action={<Button icon={<Plus size={16} />} onClick={() => onOpenRoute('lotes_crear')}>Crear lote</Button>}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Lote</th><th>Contactos</th><th>Estado</th><th>Vendedor</th><th>Creacion</th><th>Progreso</th></tr></thead>
                    <tbody>
                      {lotSummaries.map((lot) => (
                        <tr key={lot.id} className="support-row" onClick={() => setSelectedLotId(lot.id)} style={{ cursor: 'pointer', background: selectedLot?.id === lot.id ? 'rgba(15,118,110,0.08)' : 'transparent' }}>
                          <td><strong>{lot.name}</strong><div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{lot.id}</div></td>
                          <td>{lot.count}</td>
                          <td><Tag variant={lotStatusMeta(lot.status).variant}>{lotStatusMeta(lot.status).label}</Tag></td>
                          <td>{lot.vendedores?.length ? lot.vendedores.map((v) => `${v.nombre || ''} ${v.apellido || ''}`.trim()).join(', ') : lot.seller || '-'}</td>
                          <td>{lot.createdAt}</td>
                          <td><div style={{ minWidth: 120 }}><div className="progress"><span style={{ width: lot.progress + '%' }}></span></div><div style={{ marginTop: 6, color: 'var(--muted)', fontSize: '0.8rem' }}>{lot.progress}%</div></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel className="span-5" title="Detalle de lote" subtitle={selectedLot ? selectedLot.name : 'Selecciona un lote'}>
                {selectedLot ? (
                  <div className="list">
                    <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Nombre</span><strong>{selectedLot.name}</strong></div>
                    <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Vendedores</span><strong>{selectedLot.vendedores?.length ? selectedLot.vendedores.map((v) => `${v.nombre || ''} ${v.apellido || ''}`.trim()).join(', ') : selectedLot.seller || '-'}</strong></div>
                    <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Cantidad de contactos</span><strong>{selectedLot.count}</strong></div>
                    <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Estado</span><Tag variant={lotStatusMeta(selectedLot.status).variant}>{lotStatusMeta(selectedLot.status).label}</Tag></div>
                    <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Fecha de creacion</span><strong>{selectedLot.createdAt}</strong></div>
                    {selectedLot.status === 'borrador' ? (
                      <>
                        <div className="toolbar"><select className="input" style={{ width: '100%' }} value={lotSellerDraft} onChange={(event) => setLotSellerDraft(event.target.value)}><option value="">Asignar vendedor...</option>{sellers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
                        <div className="toolbar"><Button icon={<UserCheck size={16} />} onClick={assignSellerToLot}>Asignar vendedor</Button><Button variant="secondary" icon={<CheckCircle2 size={16} />} onClick={closeLot}>Cerrar lote</Button></div>
                      </>
                    ) : (
                      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Los vendedores se asignan al crear el lote. Para cambiar vendedores cerrá este lote y creá uno nuevo.</p>
                        <Button variant="secondary" icon={<CheckCircle2 size={16} />} onClick={closeLot}>Cerrar lote</Button>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid rgba(20,34,53,0.08)', paddingTop: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Contactos del lote</div>
                      <div className="list">{selectedLot.contacts.slice(0, 8).map((contact) => <div key={contact.id} className="alert"><div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{contact.name}</div><div style={{ color: 'var(--muted)' }}>{contact.phone} · {contact.city}</div></div><SalesStatusBadge status={contact.status} small /></div>)}</div>
                    </div>
                  </div>
                ) : <div style={{ color: 'var(--muted)' }}>No hay lote seleccionado.</div>}
              </Panel>
            </section>
          </div>
        );
      }

      if (route === 'numeros_error') {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-12" title="Numeros con errores" subtitle="Registros fuera de flujo comercial" action={<Button icon={<Download size={16} />} onClick={exportErrors}>Exportar</Button>}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Contacto</th><th>Telefono</th><th>Celular</th><th>Vendedor</th><th>Fecha</th><th>Motivo</th><th>Accion</th></tr></thead>
                    <tbody>
                      {errorNumbers.map((contact) => <tr key={contact.id}><td><strong>{contact.name}</strong></td><td>{contact.phone}</td><td>{pickCellular(contact) || '-'}</td><td>{contact.assignedTo || '-'}</td><td>{contact.last}</td><td>{contact.history?.[0]?.note || 'Dato incorrecto'}</td><td><div className="toolbar"><Button variant="ghost" icon={<Eye size={16} />}>Revisar</Button><Button variant="secondary" icon={<Edit3 size={16} />}>Corregir</Button><Button icon={<Activity size={16} />} onClick={() => reactivateErrorNumber(contact.id)}>Reactivar</Button></div></td></tr>)}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </section>
          </div>
        );
      }

      if (route === 'seguimiento_vendedores') {
        return <CodificacionesView />;
      }

      return (
        <div className="view">
          <section className="content-grid">
            <Panel className="span-12" title="Base general" subtitle="Listado completo de registros cargados">
              <div className="toolbar" style={{ marginBottom: 8 }}>
                <Button
                  variant={workDataTab === 'nuevo' ? 'secondary' : 'ghost'}
                  onClick={() => setWorkDataTab('nuevo')}
                >
                  Nuevos
                </Button>
                <Button
                  variant={workDataTab === 'trabajado' ? 'secondary' : 'ghost'}
                  onClick={() => setWorkDataTab('trabajado')}
                >
                  Trabajados
                </Button>
                <Button
                  variant={workDataTab === 'bloqueado' ? 'secondary' : 'ghost'}
                  onClick={() => setWorkDataTab('bloqueado')}
                >
                  Bloqueados
                </Button>
              </div>
            <div className="toolbar" style={{ marginBottom: 12 }}>
                <div className="searchbox" style={{ maxWidth: 360 }}>
                  <Search size={18} color="#69788d" />
                  <input
                    value={workDataSearch}
                    onChange={(event) => { setWorkDataPage(1); setWorkDataSearch(event.target.value); }}
                    placeholder="Buscar por nombre, teléfono o documento..."
                  />
                </div>
                <select
                  className="input"
                  style={{ width: 180 }}
                  value={workDataOriginFilter}
                  onChange={(event) => setWorkDataOriginFilter(event.target.value)}
                >
                  {workDataOriginOptions.map((origin) => (
                    <option key={origin} value={origin}>
                      {origin === 'todos' ? 'Todos los orígenes' : origin}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  style={{ width: 180 }}
                  value={workDataDeptFilter}
                  onChange={(event) => setWorkDataDeptFilter(event.target.value)}
                >
                  {workDataDeptOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === 'todos' ? 'Todos los departamentos' : dept}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  style={{ width: 120 }}
                  value={workDataPageSize}
                  onChange={(event) => { setWorkDataPage(1); setWorkDataPageSize(Number(event.target.value)); }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <Button variant="secondary" icon={<Filter size={16} />} onClick={loadWorkData}>Aplicar</Button>
                <span className="pill" style={{ marginLeft: 'auto' }}>
                  Total: {workDataMeta.total}
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Teléfono</th>
                      <th>Departamento</th>
                      <th>Origen del dato</th>
                      <th>Estado</th>
                      <th>Última gestión</th>
                      <th>Próxima acción</th>
                      <th style={{ minWidth: 140 }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkDataRows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{[item.nombre, item.apellido].filter(Boolean).join(' ') || item.nombre || '-'}</strong>
                          {item.bloqueado_no_llamar ? (
                            <span
                              style={{
                                marginLeft: 8,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#b91c1c',
                                border: '1px solid rgba(239, 68, 68, 0.3)'
                              }}
                            >
                              No llamar
                            </span>
                          ) : null}
                        </td>
                        <td>{item.telefono || item.celular || '-'}</td>
                        <td>{item.departamento || '-'}</td>
                        <td>{(item.origen_dato && String(item.origen_dato).trim()) ? item.origen_dato : '-'}</td>
                        <td>{item.estado_label || item.estado || '-'}</td>
                        <td>{item.ultima_gestion || '-'}</td>
                        <td>{item.proxima_accion || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <Button variant="ghost" icon={<Eye size={16} />} onClick={() => setWorkDataSelected(item)}>Ver detalles</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {workDataLoading ? <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando registros...</div> : null}
                {workDataError ? <div style={{ padding: 16, color: '#be123c', fontWeight: 700 }}>{workDataError}</div> : null}
                {!workDataLoading && !workDataError && !filteredWorkDataRows.length ? (
                  <div style={{ padding: 16, color: 'var(--muted)' }}>No hay datos cargados aún.</div>
                ) : null}
              </div>
              <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                <span className="pill">Página {workDataMeta.page} de {workDataMeta.totalPages}</span>
                <div className="toolbar">
                  <Button variant="ghost" onClick={() => setWorkDataPage((p) => Math.max(1, p - 1))} disabled={workDataMeta.page <= 1}>Anterior</Button>
                  <Button variant="ghost" onClick={() => setWorkDataPage((p) => Math.min(workDataMeta.totalPages, p + 1))} disabled={workDataMeta.page >= workDataMeta.totalPages}>Siguiente</Button>
                </div>
              </div>
              {workDataSelected ? <ContactDetailModal contact={workDataSelected} onClose={() => setWorkDataSelected(null)} /> : null}
            </Panel>
          </section>
        </div>
      );
    }

    const supportStatusMeta = (status) => {
      const map = {
        nuevo: { label: 'Nuevo', bg: 'rgba(6, 182, 212, 0.12)', color: '#0891b2', border: 'rgba(6, 182, 212, 0.25)' },
        gestion: { label: 'En gestión', bg: 'rgba(217, 119, 6, 0.12)', color: '#b45309', border: 'rgba(217, 119, 6, 0.28)' },
        derivado: { label: 'Derivado', bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.28)' },
        resuelto: { label: 'Resuelto', bg: 'rgba(22, 163, 74, 0.12)', color: '#15803d', border: 'rgba(22, 163, 74, 0.25)' },
        cerrado: { label: 'Cerrado', bg: 'rgba(100, 116, 139, 0.14)', color: '#475569', border: 'rgba(100, 116, 139, 0.3)' },
        servicio_iniciado: { label: 'Iniciado', bg: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8', border: 'rgba(37, 99, 235, 0.28)' },
        servicio_en_gestion: { label: 'En gestión', bg: 'rgba(217, 119, 6, 0.12)', color: '#b45309', border: 'rgba(217, 119, 6, 0.28)' },
        servicio_finalizado: { label: 'Finalizado', bg: 'rgba(22, 163, 74, 0.12)', color: '#15803d', border: 'rgba(22, 163, 74, 0.25)' }
      };
      return map[status] || map.nuevo;
    };

    function SupportStatusBadge({ status, pulse = false, small = false }) {
      const meta = supportStatusMeta(status);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: small ? '5px 9px' : '7px 12px', borderRadius: 999, fontWeight: 700, fontSize: small ? '0.73rem' : '0.8rem', background: meta.bg, color: meta.color, border: '1px solid ' + meta.border }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, boxShadow: pulse ? '0 0 0 6px rgba(14,116,144,0.08)' : 'none' }}></span>
          {meta.label}
        </span>
      );
    }

    const supportRequestTypeLabel = (ticket) => ticket.tipo === 'Otro' && ticket.tipoOtro ? 'Otro: ' + ticket.tipoOtro : ticket.tipo;
    const supportTicketDisplayStatus = (ticket) => ticket.estadoBandeja || ticket.estado;

    function SupportClientSearchView({ onCreateManualTicket, onAfterCreate }) {
      const { user: authUser } = useAuth();
      const [clientSearch, setClientSearch] = React.useState('');
      const [lookupLoading, setLookupLoading] = React.useState(false);
      const [lookupError, setLookupError] = React.useState('');
      const [lookupResults, setLookupResults] = React.useState([]);
      const [supportClients, setSupportClients] = React.useState([]);
      const [supportClientsLoading, setSupportClientsLoading] = React.useState(false);
      const [supportClientsError, setSupportClientsError] = React.useState('');
      const [supportFichaClient, setSupportFichaClient] = React.useState(null);
      const [supportDetailError, setSupportDetailError] = React.useState('');
      const [showManualForm, setShowManualForm] = React.useState(false);
      const [selectedClient, setSelectedClient] = React.useState(null);
      const [availableProducts, setAvailableProducts] = React.useState([]);
      const [manualError, setManualError] = React.useState('');
      const [creatingManual, setCreatingManual] = React.useState(false);
      const [manualDraft, setManualDraft] = React.useState({
        tipoSolicitud: 'info_servicio',
        tipoSolicitudManual: '',
        resumen: '',
        prioridad: 'media',
        productoContratoId: '',
        estadoGestion: 'nueva'
      });
      const calcAge = (value) => {
        if (!value) return '';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '';
        const now = new Date();
        let years = now.getFullYear() - parsed.getFullYear();
        const monthDelta = now.getMonth() - parsed.getMonth();
        if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < parsed.getDate())) {
          years -= 1;
        }
        return years >= 0 ? `${years} años` : '';
      };
      const formatDateShort = (value) => {
        if (!value) return '';
        const text = String(value).trim();
        if (!text) return '';
        const iso = text.includes('T') ? text.split('T')[0] : text;
        const parts = iso.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          if (year && month && day) return `${day}/${month}/${year}`;
        }
        return text;
      };
      const normalizeDetailProducts = (detail) => {
        if (!detail) return [];
        const source = Array.isArray(detail.products) && detail.products.length
          ? detail.products
          : (detail.product && typeof detail.product === 'object' ? [detail.product] : []);
        return source.map((product) => ({
          ...product,
          estadoProducto: product.estadoProducto || product.estado || product.estado_producto || ''
        }));
      };

      const productStatusBadge = (status) => {
        if (!status) return null;
        const text = String(status).trim();
        if (!text) return null;
        const normalized = text.toLowerCase();
        const isBaja = normalized.includes('baja');
        const label = isBaja ? 'Baja' : text;
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 700,
            background: isBaja ? 'rgba(248,113,113,0.18)' : 'rgba(34,197,94,0.18)',
            color: isBaja ? '#b91c1c' : '#15803d'
          }}>
            {label}
          </span>
        );
      };

      React.useEffect(() => {
        const term = clientSearch.trim();
        if (!term) {
          setLookupResults([]);
          setLookupError('');
          return;
        }
        let active = true;
        setLookupLoading(true);
        setLookupError('');
        searchPortfolioClients(term)
          .then((results) => {
            if (!active) return;
            setLookupResults(results);
          })
          .catch(() => {
            if (!active) return;
            setLookupError('No se pudo consultar la cartera de clientes.');
          })
          .finally(() => {
            if (!active) return;
            setLookupLoading(false);
          });
        return () => {
          active = false;
        };
      }, [clientSearch]);

      React.useEffect(() => {
        let active = true;
        setSupportClientsLoading(true);
        setSupportClientsError('');
        fetchClientsDirectory()
          .then(({ table }) => {
            if (!active) return;
            setSupportClients(table || []);
          })
          .catch(() => {
            if (!active) return;
            setSupportClientsError('No se pudo cargar la cartera de clientes.');
          })
          .finally(() => {
            if (!active) return;
            setSupportClientsLoading(false);
          });
        return () => {
          active = false;
        };
      }, []);

      const handleViewSupportFicha = React.useCallback(async (client) => {
        if (!client?.id) return;
        setSupportFichaClient(client);
        setSupportDetailError('');
        try {
          const detail = await fetchClientDetail(client.id);
          if (detail) setSupportFichaClient(detail);
        } catch (err) {
          const status = err?.status;
          const backendMessage = err?.details?.message || err?.details?.error || err?.message || '';
          const statusLabel = status ? ` (HTTP ${status})` : '';
          const detailLabel = backendMessage ? ` · ${backendMessage}` : '';
          setSupportDetailError(`No se pudo cargar el detalle del cliente${statusLabel}${detailLabel}.`);
        }
      }, []);

      const openManualForm = async (client, forcedType = null) => {
        let nextType = forcedType || 'info_servicio';
        setSelectedClient(client);
        setAvailableProducts([]);
        setShowManualForm(true);
        setManualError('');
        setManualDraft({
          tipoSolicitud: nextType,
          tipoSolicitudManual: '',
          resumen: '',
          prioridad: 'media',
          productoContratoId: '',
          estadoGestion: 'nueva',
          solicitanteNombre: '',
          solicitanteDocumento: '',
          solicitanteTelefono: '',
          solicitanteRelacion: '',
          cuerpoUbicacion: '',
          requiereTraslado: 'no',
          trasladoOrigen: '',
          trasladoDestino: '',
          servicioTipo: '',
          velatorioLugar: '',
          servicioFechaHora: '',
          crematorio: ''
        });
        try {
          const detail = await fetchClientDetail(client.id);
          if (detail) {
            const products = normalizeDetailProducts(detail);
            const hasBajaProduct = products.some((product) => String(product.estadoProducto || '').toLowerCase() === 'baja');
            if (hasBajaProduct && nextType === 'solicitud_baja') {
              nextType = 'info_servicio';
              setManualError('El producto ya está en baja. Solo se permite una solicitud informativa.');
            }
            const autoSelectedProductId = nextType === 'solicitud_baja' && products.length === 1
              ? products[0].id
              : '';
            setSelectedClient(detail);
            setAvailableProducts(products);
            setManualDraft((prev) => ({ ...prev, tipoSolicitud: nextType, productoContratoId: autoSelectedProductId }));
          }
        } catch {
          // Mantener datos básicos si falla el detalle.
        }
      };

      const buildServiceResumen = () => {
        return manualDraft.resumen.trim();
      };

      const buildServiceRequestPayload = () => {
        if (manualDraft.tipoSolicitud !== 'solicitud_servicio') return null;
        return {
          solicitanteNombre: manualDraft.solicitanteNombre,
          solicitanteDocumento: manualDraft.solicitanteDocumento,
          solicitanteTelefono: manualDraft.solicitanteTelefono,
          solicitanteRelacion: manualDraft.solicitanteRelacion,
          cuerpoUbicacion: manualDraft.cuerpoUbicacion,
          requiereTraslado: manualDraft.requiereTraslado === 'si',
          trasladoOrigen: manualDraft.requiereTraslado === 'si' ? manualDraft.trasladoOrigen : '',
          trasladoDestino: manualDraft.requiereTraslado === 'si' ? manualDraft.trasladoDestino : '',
          servicioTipo: manualDraft.servicioTipo,
          velatorioLugar: manualDraft.velatorioLugar,
          servicioFechaHora: manualDraft.servicioFechaHora,
          crematorio: manualDraft.crematorio
        };
      };

      const submitManualTicket = async () => {
        if (!selectedClient) return;
        const resumenFinal = buildServiceResumen();
        if (!resumenFinal.trim()) {
          setManualError('Debes agregar un detalle de la solicitud.');
          return;
        }
        if (manualDraft.tipoSolicitud === 'otro' && !manualDraft.tipoSolicitudManual.trim()) {
          setManualError('Debes completar el tipo manual para "Otro".');
          return;
        }
        if (manualDraft.tipoSolicitud === 'solicitud_baja') {
          if (!availableProducts.length) {
            setManualError('Este contacto no tiene productos activos para solicitar baja.');
            return;
          }
          if (availableProducts.length > 1 && !manualDraft.productoContratoId) {
            setManualError('Debes seleccionar el producto para la solicitud de baja.');
            return;
          }
        }
        setManualError('');
        setCreatingManual(true);
        try {
          const created = await onCreateManualTicket({
            clienteId: selectedClient.id,
            tipoSolicitud: manualDraft.tipoSolicitud,
            tipoSolicitudManual: manualDraft.tipoSolicitudManual.trim(),
            resumen: resumenFinal,
            prioridad: manualDraft.prioridad,
            productoContratoId: manualDraft.productoContratoId || '',
            estado: manualDraft.estadoGestion,
            serviceRequest: buildServiceRequestPayload()
          });
          setShowManualForm(false);
          setSelectedClient(null);
          setAvailableProducts([]);
          setClientSearch('');
          setLookupResults([]);
          onAfterCreate(created);
        } catch (err) {
          setManualError(err?.message || 'No se pudo crear la solicitud manual.');
        } finally {
          setCreatingManual(false);
        }
      };

      return (
        <div className="view">
          <section className="content-grid">
            <Panel className="span-12">
              <div style={{ position: 'relative' }}>
                {!showManualForm ? (
                  <div style={{ marginBottom: 14, borderRadius: 16, padding: 12, background: 'rgba(20,34,53,0.04)', border: '1px solid rgba(20,34,53,0.08)' }}>
                    <div className="toolbar" style={{ alignItems: 'stretch' }}>
                      <div className="searchbox" style={{ maxWidth: 460 }}>
                        <Search size={18} color="#69788d" />
                        <input
                          value={clientSearch}
                          onChange={(event) => setClientSearch(event.target.value)}
                          placeholder="Buscar por documento, nombre, telefono o numero de cliente..."
                        />
                      </div>
                    </div>
                    {lookupError ? <div style={{ marginTop: 8, color: '#be123c', fontWeight: 700 }}>{lookupError}</div> : null}
                    {lookupResults.length ? (
                      <div className="list" style={{ marginTop: 10 }}>
                        {lookupResults.slice(0, 6).map((client) => (
                          <div key={client.id} className="status-item" style={{ alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700 }}>{client.nombre}</div>
                              <div style={{ color: 'var(--muted)', fontSize: '0.86rem', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span>CI {client.documento} · {client.telefono} · {client.productoActualNombre}</span>
                                {productStatusBadge(client.status || client.estado || client.estadoProducto)}
                              </div>
                            </div>
                            <div className="toolbar">
                              <Button variant="ghost" icon={<Eye size={15} />} onClick={() => handleViewSupportFicha(client)}>Ver</Button>
                              <Button variant="secondary" icon={<Plus size={15} />} onClick={(event) => { event.stopPropagation(); openManualForm(client); }}>Nueva gestión</Button>
                              <Button
                                icon={<Briefcase size={15} />}
                                disabled={String(client.status || client.estado || client.estadoProducto || '').toLowerCase().includes('baja')}
                                onClick={(event) => { event.stopPropagation(); openManualForm(client, 'solicitud_servicio'); }}
                              >
                                Nueva solicitud de servicio
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {!clientSearch.trim() ? (
                      <div style={{ marginTop: 10 }}>
                        {supportClientsLoading ? (
                          <div style={{ color: 'var(--muted)' }}>Cargando clientes...</div>
                        ) : supportClientsError ? (
                          <div style={{ color: '#be123c', fontWeight: 700 }}>{supportClientsError}</div>
                        ) : (
                          <div className="list">
                            {supportClients.slice(0, 6).map((client) => (
                              <div key={client.id} className="status-item" style={{ alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700 }}>{client.name || 'Cliente'}</div>
                              <div style={{ color: 'var(--muted)', fontSize: '0.86rem', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span>CI {client.documento || '—'} · {client.phone || '—'} · {client.product || 'Sin producto'}</span>
                                {productStatusBadge(client.status || client.estado || client.estadoProducto)}
                              </div>
                                </div>
                                <div className="toolbar">
                                  <Button variant="ghost" icon={<Eye size={15} />} onClick={() => handleViewSupportFicha(client)}>Ver</Button>
                                  <Button variant="secondary" icon={<Plus size={15} />} onClick={(event) => { event.stopPropagation(); openManualForm(client); }}>Nueva gestión</Button>
                                  <Button
                                    icon={<Briefcase size={15} />}
                                    disabled={String(client.status || client.estado || client.estadoProducto || '').toLowerCase().includes('baja')}
                                    onClick={(event) => { event.stopPropagation(); openManualForm(client, 'solicitud_servicio'); }}
                                  >
                                    Nueva solicitud de servicio
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {!supportClients.length ? <div style={{ color: 'var(--muted)' }}>No hay clientes cargados.</div> : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {showManualForm && selectedClient ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b' }}>Formulario de gestión</div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>Crear solicitud para {selectedClient.nombre}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                      <div style={{ borderRadius: 16, border: '1px solid rgba(148,163,184,0.25)', padding: 14, background: '#f8fafc' }}>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Información del cliente</div>
                        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                          <div><strong>Nombre completo:</strong> {`${selectedClient.nombre || selectedClient.name || ''} ${selectedClient.apellido || ''}`.trim() || '—'}</div>
                          <div><strong>Numero de documento:</strong> {selectedClient.documento || '—'}</div>
                          <div><strong>Fecha de nacimiento:</strong> {formatDateShort(selectedClient.fechaNacimiento || selectedClient.fecha_nacimiento) || '—'}</div>
                          <div><strong>Edad:</strong> {calcAge(selectedClient.fechaNacimiento || selectedClient.fecha_nacimiento) || '—'}</div>
                          <div><strong>Telefono:</strong> {selectedClient.telefono || selectedClient.phone || '—'}</div>
                          <div><strong>Celular:</strong> {selectedClient.celular || selectedClient.cellphone || '—'}</div>
                          <div><strong>Dirección:</strong> {selectedClient.direccion || '—'}</div>
                          <div><strong>Departamento:</strong> {selectedClient.departamento || '—'}</div>
                        </div>
                      </div>

                      <div style={{ borderRadius: 16, border: '1px solid rgba(148,163,184,0.25)', padding: 14 }}>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Servicio</div>
                        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                          <div><strong>Fecha de alta:</strong> {formatDateShort((availableProducts[0]?.fechaAlta || selectedClient.fechaVenta || selectedClient.createdAt)) || '—'}</div>
                          <div><strong>Estado:</strong> {String(availableProducts[0]?.estadoProducto || availableProducts[0]?.estado || '—')}</div>
                          <div><strong>Nombre del producto:</strong> {String(availableProducts[0]?.productoNombre || availableProducts[0]?.nombreProducto || availableProducts[0]?.nombre_producto || selectedClient.productoActualNombre || selectedClient.product?.nombreProducto || selectedClient.product?.nombre || selectedClient.productoNombre || selectedClient.producto_nombre || selectedClient.product || '—')}</div>
                          <div><strong>Precio:</strong> {availableProducts[0]?.precio ? `$ ${Number(String(availableProducts[0].precio).replace(/[^0-9.-]/g, '')).toLocaleString('es-UY')}` : (selectedClient.fee || '—')}</div>
                          <div><strong>Carencia:</strong> {String(availableProducts[0]?.carenciaCuotas ?? availableProducts[0]?.carencia_cuotas ?? '—')}</div>
                        </div>
                      </div>

                      <div style={{ borderRadius: 16, border: '1px solid rgba(148,163,184,0.25)', padding: 14 }}>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Datos del producto</div>
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>Producto a gestionar</div>
                          <select
                            className="input"
                            value={manualDraft.productoContratoId}
                            onChange={(event) => setManualDraft((prev) => ({ ...prev, productoContratoId: event.target.value }))}
                          >
                            <option value="">Seleccionar producto</option>
                            {availableProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {(product.productoNombre || product.nombreProducto || product.nombre_producto || product.nombre || 'Producto')} · Alta {product.fechaAlta ? new Date(product.fechaAlta).toLocaleDateString('es-UY') : 's/f'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ borderRadius: 16, border: '1px solid rgba(148,163,184,0.25)', padding: 14, gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Motivo de la gestión</div>
                        <div className="toolbar" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                          {manualDraft.tipoSolicitud !== 'solicitud_servicio' ? (
                            <select
                              className="input"
                              style={{ width: 240 }}
                              value={manualDraft.tipoSolicitud}
                              onChange={(event) => {
                                const nextType = event.target.value;
                                setManualDraft((prev) => ({
                                  ...prev,
                                  tipoSolicitud: nextType,
                                  productoContratoId: nextType === 'solicitud_baja' && availableProducts.length === 1 ? availableProducts[0].id : ''
                                }));
                              }}
                            >
                              <option value="info_servicio">Consulta informativa</option>
                              {!availableProducts.some((product) => String(product.estadoProducto || '').toLowerCase() === 'baja') ? (
                                <option value="solicitud_baja">Solicitud de baja</option>
                              ) : null}
                              <option value="cambio_metodo_pago">Cambio de método de pago</option>
                              <option value="reclamo">Reclamo</option>
                              <option value="otro">Otro</option>
                            </select>
                          ) : (
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e', padding: '10px 12px', borderRadius: 12, background: 'rgba(15,118,110,0.08)', border: '1px solid rgba(15,118,110,0.2)' }}>
                              Solicitud de servicio
                            </div>
                          )}
                          <select className="input" style={{ width: 180 }} value={manualDraft.prioridad} onChange={(event) => setManualDraft((prev) => ({ ...prev, prioridad: event.target.value }))}>
                            <option value="baja">Prioridad baja</option>
                            <option value="media">Prioridad media</option>
                            <option value="alta">Prioridad alta</option>
                          </select>
                        </div>
                        {manualDraft.tipoSolicitud === 'otro' ? <input className="input" style={{ marginTop: 8 }} placeholder="Tipo de solicitud manual" value={manualDraft.tipoSolicitudManual} onChange={(event) => setManualDraft((prev) => ({ ...prev, tipoSolicitudManual: event.target.value }))} /> : null}
                        <textarea className="input" rows="4" style={{ marginTop: 8 }} placeholder="Detalle de la solicitud" value={manualDraft.resumen} onChange={(event) => setManualDraft((prev) => ({ ...prev, resumen: event.target.value }))}></textarea>
                      </div>

                      {manualDraft.tipoSolicitud === 'solicitud_servicio' ? (
                        <div style={{ borderRadius: 16, border: '1px solid rgba(148,163,184,0.25)', padding: 14, gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Datos del solicitante / responsable</div>
                          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                            <input className="input" placeholder="Nombre completo" value={manualDraft.solicitanteNombre} onChange={(event) => setManualDraft((prev) => ({ ...prev, solicitanteNombre: event.target.value }))} />
                            <input className="input" placeholder="Documento de identidad" value={manualDraft.solicitanteDocumento} onChange={(event) => setManualDraft((prev) => ({ ...prev, solicitanteDocumento: event.target.value }))} />
                            <input className="input" placeholder="Teléfono de contacto" value={manualDraft.solicitanteTelefono} onChange={(event) => setManualDraft((prev) => ({ ...prev, solicitanteTelefono: event.target.value }))} />
                            <input className="input" placeholder="Relación con el fallecido" value={manualDraft.solicitanteRelacion} onChange={(event) => setManualDraft((prev) => ({ ...prev, solicitanteRelacion: event.target.value }))} />
                          </div>

                          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                            <input className="input" placeholder="¿Dónde se encuentra el cuerpo actualmente? (hospital, domicilio, morgue)" value={manualDraft.cuerpoUbicacion} onChange={(event) => setManualDraft((prev) => ({ ...prev, cuerpoUbicacion: event.target.value }))} />
                            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
                              <select className="input" style={{ width: 220 }} value={manualDraft.requiereTraslado} onChange={(event) => setManualDraft((prev) => ({ ...prev, requiereTraslado: event.target.value }))}>
                                <option value="no">No requiere traslado</option>
                                <option value="si">Requiere traslado</option>
                              </select>
                              {manualDraft.requiereTraslado === 'si' ? (
                                <>
                                  <input className="input" style={{ minWidth: 220 }} placeholder="Origen" value={manualDraft.trasladoOrigen} onChange={(event) => setManualDraft((prev) => ({ ...prev, trasladoOrigen: event.target.value }))} />
                                  <input className="input" style={{ minWidth: 220 }} placeholder="Destino" value={manualDraft.trasladoDestino} onChange={(event) => setManualDraft((prev) => ({ ...prev, trasladoDestino: event.target.value }))} />
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                            <select className="input" value={manualDraft.servicioTipo} onChange={(event) => setManualDraft((prev) => ({ ...prev, servicioTipo: event.target.value }))}>
                              <option value="">Tipo de servicio</option>
                              <option value="Directo (sin velatorio)">Directo (sin velatorio)</option>
                              <option value="Con velatorio previo">Con velatorio previo</option>
                            </select>
                            <input className="input" placeholder="Lugar del velatorio (si aplica)" value={manualDraft.velatorioLugar} onChange={(event) => setManualDraft((prev) => ({ ...prev, velatorioLugar: event.target.value }))} />
                            <input className="input" type="datetime-local" value={manualDraft.servicioFechaHora} onChange={(event) => setManualDraft((prev) => ({ ...prev, servicioFechaHora: event.target.value }))} />
                            <input className="input" placeholder="Crematorio seleccionado" value={manualDraft.crematorio} onChange={(event) => setManualDraft((prev) => ({ ...prev, crematorio: event.target.value }))} />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {manualError ? <div style={{ marginTop: 8, color: '#be123c', fontWeight: 700 }}>{manualError}</div> : null}
                    <div className="toolbar" style={{ marginTop: 12 }}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowManualForm(false);
                          setAvailableProducts([]);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button icon={<CheckCircle2 size={15} />} onClick={submitManualTicket} disabled={creatingManual}>{creatingManual ? 'Guardando...' : 'Crear solicitud'}</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </Panel>
          </section>
          <ClienteFichaForm
            open={Boolean(supportFichaClient)}
            client={supportFichaClient}
            onClose={() => { setSupportFichaClient(null); setSupportDetailError(''); }}
            onUpdated={() => {}}
            detailError={supportDetailError}
          />
        </div>
      );
    }

    function SupportTicketsView({ title, subtitle, tickets, onSelect, selectedId, mode = 'general' }) {
      const [ticketSearch, setTicketSearch] = React.useState('');
      const [filter, setFilter] = React.useState('todos');
      const [page, setPage] = React.useState(1);
      const pageSize = 8;

      const filteredByMode = React.useMemo(() => tickets.filter((ticket) => {
        if (mode === 'service') return ticket.tipoRaw === 'solicitud_servicio';
        return ticket.tipoRaw !== 'solicitud_servicio';
      }), [tickets, mode]);

      const filtered = React.useMemo(() => filteredByMode.filter((ticket) => {
        const text = (ticket.cliente + ' ' + ticket.telefono).toLowerCase();
        const bySearch = text.includes(ticketSearch.toLowerCase());
        const byFilter = filter === 'todos' || supportTicketDisplayStatus(ticket) === filter;
        return bySearch && byFilter;
      }).sort((a, b) => b.id - a.id), [filteredByMode, ticketSearch, filter]);

      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      const safePage = Math.min(page, totalPages);
      const visibleTickets = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

      React.useEffect(() => {
        setPage(1);
      }, [ticketSearch, filter, mode]);

      const inProgress = filteredByMode.filter((ticket) => ['gestion', 'servicio_en_gestion'].includes(supportTicketDisplayStatus(ticket))).length;
      const derived = filteredByMode.filter((ticket) => supportTicketDisplayStatus(ticket) === 'derivado').length;

      return (
        <div className="view">
          <section className="content-grid">
            <Panel className="span-12" title={title} subtitle={subtitle} action={<Tag variant="info">{filteredByMode.length} registros</Tag>}>
              <div className="toolbar" style={{ marginBottom: 12 }}>
                <div className="searchbox" style={{ maxWidth: 420 }}><Search size={18} color="#69788d" /><input value={ticketSearch} onChange={(event) => setTicketSearch(event.target.value)} placeholder="Buscar ticket por cliente o telefono..." /></div>
                <Button variant="secondary" icon={<Filter size={18} />}>Filtrar</Button>
                <select className="input" style={{ width: 220, padding: '11px 12px' }} value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="todos">Todos</option>
                  {mode === 'service' ? (
                    <>
                      <option value="servicio_iniciado">Iniciado</option>
                      <option value="servicio_en_gestion">En gestión</option>
                      <option value="servicio_finalizado">Finalizado</option>
                    </>
                  ) : (
                    <>
                      <option value="nuevo">Nuevo</option>
                      <option value="gestion">En gestión</option>
                      <option value="derivado">Derivado</option>
                      <option value="resuelto">Resuelto</option>
                      <option value="cerrado">Cerrado</option>
                    </>
                  )}
                </select>
                <div className="pill">{inProgress} en gestión</div>
                {mode === 'general' ? <div className="pill">{derived} derivados</div> : null}
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Cliente</th><th>Telefono</th><th>Tipo de solicitud</th><th>Estado</th><th>Hora</th></tr></thead>
                  <tbody>
                    {visibleTickets.map((ticket) => (
                      <tr key={ticket.id} className="support-row" onClick={() => onSelect(ticket.id)} style={{ cursor: 'pointer', background: selectedId === ticket.id ? 'rgba(15,118,110,0.08)' : 'transparent' }}>
                        <td><div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Hash size={14} /><strong>{String(ticket.numero || ticket.id).padStart(6, '0')}</strong></div></td>
                        <td><div><div style={{ fontWeight: 700 }}>{ticket.cliente}</div><div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{ticket.agente}</div></div></td>
                        <td><a href={'tel:' + ticket.telefono.replace(/\s/g, '')} onClick={(event) => event.stopPropagation()} style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}>{ticket.telefono}</a></td>
                        <td><span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, background: 'rgba(20,34,53,0.06)', color: '#334155' }}>{supportRequestTypeLabel(ticket)}</span></td>
                        <td><SupportStatusBadge status={supportTicketDisplayStatus(ticket)} pulse={supportTicketDisplayStatus(ticket) === 'nuevo' || supportTicketDisplayStatus(ticket) === 'servicio_iniciado'} small /></td>
                        <td>{formatDateTimeShort(ticket.hora) || ticket.hora}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length ? <div style={{ padding: 18, color: 'var(--muted)' }}>No hay solicitudes para los filtros aplicados.</div> : null}
              </div>
              {filtered.length ? (
                <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                  <span className="pill">Página {safePage} de {totalPages} · {filtered.length} tickets</span>
                  <div className="toolbar">
                    <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>Anterior</Button>
                    <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Siguiente</Button>
                  </div>
                </div>
              ) : null}
            </Panel>
          </section>
        </div>
      );
    }
    function SupportDetail({ ticket, tickets, onBack, onStatusChange, onAddNote, onOpenTicket, onDerive, onCloseTicket }) {
      const [note, setNote] = React.useState('');
      const [showTranscript, setShowTranscript] = React.useState(false);
      const [statusDraft, setStatusDraft] = React.useState(ticket.esSolicitudServicio ? ticket.estadoServicio : ticket.estado);
      const [closeOutcome, setCloseOutcome] = React.useState(ticket.resultadoRetencion || '');
      const [closeError, setCloseError] = React.useState('');
      const [closingTicket, setClosingTicket] = React.useState(false);
      const [showClosePanel, setShowClosePanel] = React.useState(false);
      const [editingServiceRequest, setEditingServiceRequest] = React.useState(false);
      const [serviceRequestDraft, setServiceRequestDraft] = React.useState({
        solicitanteNombre: '',
        solicitanteDocumento: '',
        solicitanteTelefono: '',
        solicitanteRelacion: '',
        cuerpoUbicacion: '',
        requiereTraslado: false,
        trasladoOrigen: '',
        trasladoDestino: '',
        servicioTipo: '',
        velatorioLugar: '',
        servicioFechaHora: '',
        crematorio: ''
      });
      const [savingServiceRequest, setSavingServiceRequest] = React.useState(false);
      const [clientDetail, setClientDetail] = React.useState(null);
      const [clientDetailError, setClientDetailError] = React.useState('');

      React.useEffect(() => {
        setStatusDraft(ticket.esSolicitudServicio ? ticket.estadoServicio : ticket.estado);
        setNote('');
        setCloseOutcome(ticket.resultadoRetencion || '');
        setCloseError('');
        setShowClosePanel(false);
        setEditingServiceRequest(false);
        setServiceRequestDraft({
          solicitanteNombre: ticket.serviceRequest?.solicitanteNombre || '',
          solicitanteDocumento: ticket.serviceRequest?.solicitanteDocumento || '',
          solicitanteTelefono: ticket.serviceRequest?.solicitanteTelefono || '',
          solicitanteRelacion: ticket.serviceRequest?.solicitanteRelacion || '',
          cuerpoUbicacion: ticket.serviceRequest?.cuerpoUbicacion || '',
          requiereTraslado: Boolean(ticket.serviceRequest?.requiereTraslado),
          trasladoOrigen: ticket.serviceRequest?.trasladoOrigen || '',
          trasladoDestino: ticket.serviceRequest?.trasladoDestino || '',
          servicioTipo: ticket.serviceRequest?.servicioTipo || '',
          velatorioLugar: ticket.serviceRequest?.velatorioLugar || '',
          servicioFechaHora: ticket.serviceRequest?.servicioFechaHora || '',
          crematorio: ticket.serviceRequest?.crematorio || ''
        });
      }, [ticket.id, ticket.estado, ticket.estadoServicio, ticket.esSolicitudServicio, ticket.resultadoRetencion]);

      React.useEffect(() => {
        let canceled = false;
        setClientDetail(null);
        setClientDetailError('');
        if (!ticket.clienteId) return () => { canceled = true; };
        (async () => {
          try {
            const detail = await fetchClientDetail(ticket.clienteId);
            if (!canceled) setClientDetail(detail);
          } catch (err) {
            if (!canceled) {
              setClientDetailError(err?.message || 'No se pudo cargar el cliente.');
            }
          }
        })();
        return () => { canceled = true; };
      }, [ticket.clienteId]);

      const pushNote = () => {
        if (isClosedTicket) return;
        if (!note.trim()) return;
        onAddNote(note.trim());
        setNote('');
      };

      const clientHistory = React.useMemo(() => tickets
        .filter((item) => item.clienteId === ticket.clienteId && item.id !== ticket.id)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [tickets, ticket]);
      const lifecycle = React.useMemo(
        () => getContactLifecycle(ticket.clienteId, tickets.filter((item) => item.clienteId === ticket.clienteId)),
        [ticket.clienteId, tickets]
      );
      const formatLifecycleDate = (value) => {
        if (!value) return '-';
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('es-UY');
      };
      const isCancellationTicket = ticket.tipoRaw === 'solicitud_baja';
      const canCloseCancellation = [ 'retenido', 'baja_confirmada' ].includes(closeOutcome);
      const isClosedTicket = ticket.estado === 'cerrado' || ticket.estado === 'resuelto' || ticket.estadoServicio === 'finalizado';
      const hasServiceRequestData = ticket.serviceRequest && Object.values(ticket.serviceRequest).some((value) => {
        if (typeof value === 'boolean') return value;
        return value !== null && value !== undefined && String(value).trim() !== '';
      });

      const saveServiceRequest = async () => {
        if (!ticket.esSolicitudServicio) return;
        setSavingServiceRequest(true);
        try {
          const updated = await updateTicket(ticket.id, { serviceRequest: serviceRequestDraft });
          const fresh = await getTicketById(updated.id);
          setEditingServiceRequest(false);
          setServiceRequestDraft({
            solicitanteNombre: fresh.serviceRequest?.solicitanteNombre || '',
            solicitanteDocumento: fresh.serviceRequest?.solicitanteDocumento || '',
            solicitanteTelefono: fresh.serviceRequest?.solicitanteTelefono || '',
            solicitanteRelacion: fresh.serviceRequest?.solicitanteRelacion || '',
            cuerpoUbicacion: fresh.serviceRequest?.cuerpoUbicacion || '',
            requiereTraslado: Boolean(fresh.serviceRequest?.requiereTraslado),
            trasladoOrigen: fresh.serviceRequest?.trasladoOrigen || '',
            trasladoDestino: fresh.serviceRequest?.trasladoDestino || '',
            servicioTipo: fresh.serviceRequest?.servicioTipo || '',
            velatorioLugar: fresh.serviceRequest?.velatorioLugar || '',
            servicioFechaHora: fresh.serviceRequest?.servicioFechaHora || '',
            crematorio: fresh.serviceRequest?.crematorio || ''
          });
          onOpenTicket(fresh.id);
        } catch (err) {
          setCloseError(err?.message || 'No se pudo guardar la solicitud de servicio.');
        } finally {
          setSavingServiceRequest(false);
        }
      };

      const closeCurrentTicket = async () => {
        if (isClosedTicket) return;
        if (isCancellationTicket && !showClosePanel) {
          setShowClosePanel(true);
          return;
        }
        if (isCancellationTicket && !canCloseCancellation) {
          setCloseError('Debes elegir si el resultado fue retenido o baja confirmada.');
          return;
        }
        setCloseError('');
        setClosingTicket(true);
        try {
          await onCloseTicket({ outcome: closeOutcome });
          setShowClosePanel(false);
        } catch (err) {
          setCloseError(err?.message || 'No se pudo cerrar el ticket.');
        } finally {
          setClosingTicket(false);
        }
      };

      const timeline = ticket.timeline || [];
      const transcript = ticket.transcripcion
        ? ticket.transcripcion.split('\n').filter(Boolean)
        : [
            'IA: Hola, gracias por llamar a Rednacrem. ¿En qué puedo ayudarte hoy?',
            'Cliente: Necesito revisar un movimiento de mi cuenta.',
            'IA: Perfecto, verifico tus datos y genero solicitud para seguimiento.',
            'Cliente: Gracias, quedo a la espera de confirmación.'
          ];

      return (
        <div className="view">
          <section className="content-grid">
            <Panel
              className="span-8"
              title={'Solicitud #' + String(ticket.numero || ticket.id).padStart(6, '0')}
              subtitle={'Tipo: ' + supportRequestTypeLabel(ticket) + ' · Creado ' + (formatDateTimeShort(ticket.hora) || ticket.hora) + ' por ' + ticket.agente}
              action={<div className="toolbar"><button type="button" className="button ghost" onClick={(event) => { event.stopPropagation(); onBack(); }}><ArrowDownRight size={16} />Volver</button></div>}
            >
              <div className="toolbar" style={{ marginBottom: 14 }}>
                <div className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <SupportStatusBadge status={supportTicketDisplayStatus(ticket)} pulse={supportTicketDisplayStatus(ticket) === 'nuevo' || supportTicketDisplayStatus(ticket) === 'servicio_iniciado'} small />
                  <span>Estado</span>
                </div>
                <a className="button ghost" href={'tel:' + ticket.telefono.replace(/\s/g, '')}><PhoneCall size={16} />Llamar cliente</a>
                <Button icon={<CheckCircle2 size={16} />} onClick={closeCurrentTicket} disabled={closingTicket || isClosedTicket}>{isClosedTicket ? 'Ticket cerrado' : 'Cerrar ticket'}</Button>
              </div>
              {isCancellationTicket && showClosePanel && !isClosedTicket ? (
                <div style={{ marginTop: -4, marginBottom: 14, borderRadius: 14, padding: 10, border: '1px solid rgba(15,118,110,0.2)', background: 'rgba(15,118,110,0.06)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Resultado de cierre de solicitud de baja</div>
                  <div className="toolbar">
                    <select className="input" style={{ width: 240 }} value={closeOutcome} onChange={(event) => setCloseOutcome(event.target.value)}>
                      <option value="">Seleccionar resultado</option>
                      <option value="retenido">Retenido</option>
                      <option value="baja_confirmada">Baja confirmada</option>
                    </select>
                    <div className="pill">{ticket.productoNombre || 'Sin producto'}</div>
                    <Button icon={<CheckCircle2 size={16} />} onClick={closeCurrentTicket} disabled={closingTicket}>Confirmar cierre</Button>
                  </div>
                  {closeError ? <div style={{ marginTop: 8, color: '#be123c', fontWeight: 700 }}>{closeError}</div> : null}
                </div>
              ) : null}

              <div className="list">
                <div className="alert" style={{ border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(20,34,53,0.03)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div className="status-ring" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}><User size={18} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>Cliente</div>
                      {clientDetailError ? <div style={{ color: '#be123c', fontWeight: 700 }}>{clientDetailError}</div> : null}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                        <div><strong>Nombre:</strong> {clientDetail?.name || `${clientDetail?.nombre || ''} ${clientDetail?.apellido || ''}`.trim() || ticket.cliente || '—'}</div>
                        <div><strong>Documento:</strong> {clientDetail?.documento || '—'}</div>
                        <div><strong>Teléfono:</strong> {clientDetail?.telefono || clientDetail?.phone || ticket.telefono || '—'}</div>
                        <div><strong>Celular:</strong> {clientDetail?.celular || clientDetail?.cellphone || '—'}</div>
                        <div><strong>Email:</strong> {clientDetail?.email || '—'}</div>
                        <div><strong>Dirección:</strong> {clientDetail?.direccion || '—'}</div>
                        <div><strong>Departamento:</strong> {clientDetail?.departamento || '—'}</div>
                        <div><strong>País:</strong> {clientDetail?.pais || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert" style={{ border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(20,34,53,0.03)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div className="status-ring" style={{ background: 'rgba(15,118,110,0.12)', color: '#0f766e' }}><Briefcase size={18} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>Producto</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                        <div><strong>Nombre:</strong> {clientDetail?.product?.nombreProducto || clientDetail?.product?.nombre_producto || clientDetail?.product?.nombre || ticket.productoNombre || '—'}</div>
                        <div><strong>Estado:</strong> {clientDetail?.product?.estado || clientDetail?.product?.estadoProducto || '—'}</div>
                        <div><strong>Fecha de alta:</strong> {formatDateShort(clientDetail?.product?.fechaAlta || clientDetail?.product?.fecha_alta || '') || '—'}</div>
                        <div><strong>Precio:</strong> {clientDetail?.product?.precio ? `$ ${Number(String(clientDetail.product.precio).replace(/[^0-9.-]/g, '')).toLocaleString('es-UY')}` : '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {ticket.esSolicitudServicio ? (
                  <>
                    <div className="alert" style={{ border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(20,34,53,0.03)' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div className="status-ring" style={{ background: 'rgba(14,116,144,0.12)', color: '#0e7490' }}><FileText size={18} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 800 }}>Datos del solicitante</div>
                            {!hasServiceRequestData && !editingServiceRequest ? (
                              <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setEditingServiceRequest(true)}>Completar datos</Button>
                            ) : null}
                          </div>

                          {!editingServiceRequest ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 6 }}>
                              <div><strong>Nombre completo:</strong> {ticket.serviceRequest?.solicitanteNombre || '—'}</div>
                              <div><strong>Documento de identidad:</strong> {ticket.serviceRequest?.solicitanteDocumento || '—'}</div>
                              <div><strong>Teléfono de contacto:</strong> {ticket.serviceRequest?.solicitanteTelefono || '—'}</div>
                              <div><strong>Relación con el fallecido:</strong> {ticket.serviceRequest?.solicitanteRelacion || '—'}</div>
                            </div>
                          ) : (
                            <>
                              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                                <input className="input" placeholder="Nombre completo" value={serviceRequestDraft.solicitanteNombre} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, solicitanteNombre: event.target.value }))} />
                                <input className="input" placeholder="Documento de identidad" value={serviceRequestDraft.solicitanteDocumento} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, solicitanteDocumento: event.target.value }))} />
                                <input className="input" placeholder="Teléfono de contacto" value={serviceRequestDraft.solicitanteTelefono} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, solicitanteTelefono: event.target.value }))} />
                                <input className="input" placeholder="Relación con el fallecido" value={serviceRequestDraft.solicitanteRelacion} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, solicitanteRelacion: event.target.value }))} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="alert" style={{ border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(20,34,53,0.03)' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div className="status-ring" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}><Briefcase size={18} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800 }}>Datos del servicio</div>
                          {!editingServiceRequest ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 6 }}>
                              <div><strong>Ubicación del cuerpo:</strong> {ticket.serviceRequest?.cuerpoUbicacion || '—'}</div>
                              <div><strong>Traslado:</strong> {ticket.serviceRequest?.requiereTraslado ? 'Sí' : 'No'}</div>
                              {ticket.serviceRequest?.requiereTraslado ? (
                                <>
                                  <div><strong>Origen:</strong> {ticket.serviceRequest?.trasladoOrigen || '—'}</div>
                                  <div><strong>Destino:</strong> {ticket.serviceRequest?.trasladoDestino || '—'}</div>
                                </>
                              ) : null}
                              <div><strong>Tipo de servicio:</strong> {ticket.serviceRequest?.servicioTipo || '—'}</div>
                              <div><strong>Lugar del velatorio:</strong> {ticket.serviceRequest?.velatorioLugar || '—'}</div>
                              <div><strong>Fecha y hora estimada:</strong> {formatDateTimeShort(ticket.serviceRequest?.servicioFechaHora) || ticket.serviceRequest?.servicioFechaHora || '—'}</div>
                              <div><strong>Crematorio seleccionado:</strong> {ticket.serviceRequest?.crematorio || '—'}</div>
                            </div>
                          ) : (
                            <>
                              <div style={{ marginTop: 8, display: 'grid', gap: 10 }}>
                                <input className="input" placeholder="¿Dónde se encuentra el cuerpo actualmente?" value={serviceRequestDraft.cuerpoUbicacion} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, cuerpoUbicacion: event.target.value }))} />
                                <div className="toolbar" style={{ flexWrap: 'wrap' }}>
                                  <select className="input" style={{ width: 220 }} value={serviceRequestDraft.requiereTraslado ? 'si' : 'no'} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, requiereTraslado: event.target.value === 'si' }))}>
                                    <option value="no">No requiere traslado</option>
                                    <option value="si">Requiere traslado</option>
                                  </select>
                                  {serviceRequestDraft.requiereTraslado ? (
                                    <>
                                      <input className="input" style={{ minWidth: 220 }} placeholder="Origen" value={serviceRequestDraft.trasladoOrigen} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, trasladoOrigen: event.target.value }))} />
                                      <input className="input" style={{ minWidth: 220 }} placeholder="Destino" value={serviceRequestDraft.trasladoDestino} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, trasladoDestino: event.target.value }))} />
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                                <select className="input" value={serviceRequestDraft.servicioTipo} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, servicioTipo: event.target.value }))}>
                                  <option value="">Tipo de servicio</option>
                                  <option value="Directo (sin velatorio)">Directo (sin velatorio)</option>
                                  <option value="Con velatorio previo">Con velatorio previo</option>
                                </select>
                                <input className="input" placeholder="Lugar del velatorio (si aplica)" value={serviceRequestDraft.velatorioLugar} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, velatorioLugar: event.target.value }))} />
                                <input className="input" type="datetime-local" value={serviceRequestDraft.servicioFechaHora} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, servicioFechaHora: event.target.value }))} />
                                <input className="input" placeholder="Crematorio seleccionado" value={serviceRequestDraft.crematorio} onChange={(event) => setServiceRequestDraft((prev) => ({ ...prev, crematorio: event.target.value }))} />
                              </div>
                            </>
                          )}
                          {editingServiceRequest ? (
                            <div className="toolbar" style={{ marginTop: 10 }}>
                              <Button variant="ghost" onClick={() => setEditingServiceRequest(false)}>Cancelar</Button>
                              <Button icon={<CheckCircle2 size={16} />} onClick={saveServiceRequest} disabled={savingServiceRequest}>{savingServiceRequest ? 'Guardando...' : 'Guardar datos'}</Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="alert" style={{ border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(20,34,53,0.03)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div className="status-ring" style={{ background: 'rgba(14,116,144,0.12)', color: '#0e7490' }}><FileText size={18} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>Resumen</div>
                      <div style={{ color: 'var(--muted)' }}>{ticket.resumen || '—'}</div>
                    </div>
                  </div>
                </div>

              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontFamily: 'inherit', fontWeight: 800, marginBottom: 10 }}>Notas internas</div>
                <div className="list" style={{ marginBottom: 12 }}>
                  {(ticket.notas || []).map((item) => (
                    <div key={(item.autor || '') + (item.hora || item.createdAt || '') + item.texto} className="alert">
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {item.autor}
                          <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                            {' · '}
                            {item.hora || formatDateTimeShort(item.createdAt) || ''}
                          </span>
                        </div>
                        <div style={{ color: 'var(--muted)' }}>{item.texto}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="toolbar">
                  <input className="input" value={note} disabled={isClosedTicket} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') pushNote(); }} placeholder={isClosedTicket ? 'Ticket cerrado' : 'Agregar nota rápida...'} />
                  <Button icon={<Send size={16} />} onClick={pushNote} disabled={isClosedTicket}>Guardar</Button>
                </div>
              </div>

              {ticket.cierreHistory?.length ? (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontFamily: 'inherit', fontWeight: 800, marginBottom: 10 }}>Historial de cierre</div>
                  <div className="list">
                    {ticket.cierreHistory.map((entry, idx) => (
                      <div key={(entry.at || '') + (entry.resultado || '') + idx} className="alert">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                          <div><strong>Fecha y hora:</strong> {formatDateTimeShort(entry.at) || entry.at || '—'}</div>
                          <div><strong>Usuario:</strong> {entry.user || '—'}</div>
                          <div><strong>Resultado:</strong> {entry.resultado || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

            </Panel>

            <div className="span-4" style={{ display: 'grid', gap: 12, alignSelf: 'start' }}>
              <Panel title="Historial del cliente" subtitle="Solicitudes anteriores del mismo cliente">
                {clientHistory.length ? (
                  <div className="list" style={{ gap: 8, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', paddingRight: 4 }}>
                    {clientHistory.map((item) => (
                      <button key={item.id} className="alert" style={{ textAlign: 'left', border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(20,34,53,0.03)', padding: '10px 12px' }} onClick={() => onOpenTicket(item.id)}>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>Solicitud #{String(item.numero || item.id).padStart(6, '0')}</strong><SupportStatusBadge status={supportTicketDisplayStatus(item)} small /></div>
                          <div style={{ color: 'var(--muted)', marginTop: 4 }}>{supportRequestTypeLabel(item)}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>{item.resumen}</div>
                          <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 6 }}>{item.hora}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : <div style={{ color: 'var(--muted)', paddingTop: 8 }}>Este cliente no tiene solicitudes anteriores.</div>}
              </Panel>
            </div>
          </section>
        </div>
      );
    }

    function CustomerSupportModule() {
      const [tickets, setTickets] = React.useState([]);
      const [selectedId, setSelectedId] = React.useState(null);
      const [view, setView] = React.useState('listado');
      const [section, setSection] = React.useState('buscar_cliente');
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState('');

      const loadTickets = React.useCallback(() => {
        setLoading(true);
        setError('');
        listTicketsAsync()
          .then((data) => {
          setTickets(data);
          setSelectedId(data[0]?.id || null);
          })
          .catch(() => {
            setError('No se pudieron cargar las solicitudes.');
          })
          .finally(() => {
          setLoading(false);
          });
      }, []);

      React.useEffect(() => {
        loadTickets();
      }, [loadTickets]);

      const selectedTicket = React.useMemo(() => tickets.find((ticket) => ticket.id === selectedId) || null, [tickets, selectedId]);

      const openTicket = (id) => {
        setSelectedId(id);
        setView('detalle');
        getTicketById(id)
          .then((fresh) => {
            setTickets((prev) => prev.map((ticket) => ticket.id === fresh.id ? fresh : ticket));
          })
          .catch(() => {});
      };

      React.useEffect(() => {
        if (view !== 'detalle' || !selectedId) return undefined;
        const intervalId = setInterval(() => {
          getTicketById(selectedId)
            .then((fresh) => {
              if (!fresh) return;
              setTickets((prev) => prev.map((ticket) => ticket.id === fresh.id ? fresh : ticket));
            })
            .catch(() => {});
        }, 30000);
        return () => clearInterval(intervalId);
      }, [view, selectedId]);

      const backToInbox = () => {
        setView('listado');
        listTicketsAsync()
          .then((data) => {
            console.log('[manual-tickets] refresh', data?.length, data?.[0]);
            setTickets(data);
            setSelectedId(data[0]?.id || null);
          })
          .catch(() => {});
      };

      const updateStatus = async (status) => {
        if (!selectedTicket) return;
        const updated = selectedTicket.esSolicitudServicio
          ? await updateServiceRequestStatus(selectedTicket.id, status)
          : await updateTicketStatus(selectedTicket.id, status);
        setTickets((prev) => prev.map((ticket) => ticket.id === updated.id ? updated : ticket));
        setSelectedId(updated.id);
      };

      const appendNote = async (text) => {
        if (!selectedTicket) return;
        const updated = await addTicketNote(selectedTicket.id, text, { authorName: 'Agente' });
        let finalTicket = updated;
        try {
          const fresh = await getTicketById(updated.id);
          if (fresh) finalTicket = { ...fresh, notas: fresh.notas || updated.notas, timeline: fresh.timeline || updated.timeline };
        } catch {
          // keep local update
        }
        setTickets((prev) => prev.map((ticket) => ticket.id === finalTicket.id ? finalTicket : ticket));
        setSelectedId(finalTicket.id);
      };

      const deriveTicket = async () => {
        if (!selectedTicket) return;
        const updated = await deriveTicketToOperations(selectedTicket.id);
        setTickets((prev) => prev.map((ticket) => ticket.id === updated.id ? updated : ticket));
        setSelectedId(updated.id);
      };

      const closeTicket = async ({ outcome = '', note = '' } = {}) => {
        if (!selectedTicket) return;
        try {
          const updated = await closeTicketCase(selectedTicket.id, {
            outcome,
            note,
            actorName: 'Agente'
          });
          const outcomeLabel = outcome === 'baja_confirmada' ? 'Baja confirmada' : outcome === 'retenido' ? 'Retenido' : (updated.resultadoRetencion || outcome || '');
          const cierreEntry = {
            at: formatDateTimeShort(new Date().toISOString()) || new Date().toISOString(),
            user: 'Agente',
            resultado: outcomeLabel || '—'
          };
          const cierreHistory = Array.isArray(updated.cierreHistory)
            ? [cierreEntry, ...updated.cierreHistory]
            : [cierreEntry];
          const withHistory = { ...updated, cierreHistory };
          setTickets((prev) => prev.map((ticket) => {
            if (ticket.id !== withHistory.id) return ticket;
            return {
              ...ticket,
              ...withHistory,
              cliente: withHistory.cliente && withHistory.cliente !== 'Cliente' ? withHistory.cliente : ticket.cliente,
              telefono: withHistory.telefono || ticket.telefono,
              productoNombre: withHistory.productoNombre || ticket.productoNombre
            };
          }));
          setSelectedId(withHistory.id);
          // Refrescar lista para mantener nombre/telefono hidratados
          listTicketsAsync()
            .then((data) => {
              setTickets((prev) => {
                const byId = Object.fromEntries(prev.map((t) => [t.id, t]));
                return data.map((item) => ({
                  ...byId[item.id],
                  ...item,
                  cliente: item.cliente && item.cliente !== 'Cliente' ? item.cliente : (byId[item.id]?.cliente || item.cliente),
                  telefono: item.telefono || byId[item.id]?.telefono || '',
                  productoNombre: item.productoNombre || byId[item.id]?.productoNombre || ''
                }));
              });
            })
            .catch(() => {});
          return withHistory;
        } catch (err) {
          throw err;
        }
      };

      const createSupportTicket = React.useCallback(async (payload) => {
        const created = await createManualTicket(payload);
        setTickets((prev) => [created, ...prev]);
        return created;
      }, []);

      const handleAfterCreateFromClient = (created) => {
        setSelectedId(created.id);
        setView('listado');
        setSection(created.esSolicitudServicio ? 'solicitudes_servicio' : 'gestiones_clientes');
      };

      React.useEffect(() => {
        const handleKey = (event) => {
          if (view !== 'detalle') return;
          if (event.key === 'Escape') backToInbox();
          const map = selectedTicket?.esSolicitudServicio
            ? { '1': 'iniciado', '2': 'en_gestion', '3': 'finalizado' }
            : { '1': 'nuevo', '2': 'gestion', '3': 'derivado', '4': 'resuelto', '5': 'cerrado' };
          if (map[event.key]) updateStatus(map[event.key]);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
      }, [view, selectedTicket, updateStatus]);

      if (loading) {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-12" title="Atención al cliente" subtitle="Cargando solicitudes...">
                <div style={{ color: 'var(--muted)' }}>Obteniendo tickets telefónicos.</div>
              </Panel>
            </section>
          </div>
        );
      }

      if (view === 'detalle' && selectedTicket) {
        return <SupportDetail ticket={selectedTicket} tickets={tickets} onBack={backToInbox} onStatusChange={updateStatus} onAddNote={appendNote} onOpenTicket={openTicket} onDerive={deriveTicket} onCloseTicket={closeTicket} />;
      }
      return (
        <div className="view">
          <section className="content-grid">
            <Panel className="span-12" style={{ padding: '10px 14px' }}>
              <div className="toolbar" style={{ gap: 12 }}>
                <Button style={{ minWidth: 170 }} variant={section === 'buscar_cliente' ? 'primary' : 'secondary'} onClick={() => setSection('buscar_cliente')}>Buscar cliente</Button>
                <Button style={{ minWidth: 210 }} variant={section === 'gestiones_clientes' ? 'primary' : 'secondary'} onClick={() => setSection('gestiones_clientes')}>Gestiones con clientes</Button>
                <Button style={{ minWidth: 220 }} variant={section === 'solicitudes_servicio' ? 'primary' : 'secondary'} onClick={() => setSection('solicitudes_servicio')}>Solicitudes de servicio</Button>
              </div>
            </Panel>
          </section>
          {error ? (
            <section className="content-grid">
              <Panel className="span-12">
                <div className="toolbar">
                  <span style={{ color: '#be123c', fontWeight: 700 }}>{error}</span>
                  <Button variant="secondary" onClick={loadTickets}>Reintentar</Button>
                </div>
              </Panel>
            </section>
          ) : null}
          {section === 'buscar_cliente' ? <SupportClientSearchView onCreateManualTicket={createSupportTicket} onAfterCreate={handleAfterCreateFromClient} /> : null}
          {section === 'gestiones_clientes' ? (
            <SupportTicketsView
              mode="general"
              title="Gestiones con clientes"
              subtitle="Tickets generales de atención"
              tickets={tickets}
              onSelect={openTicket}
              selectedId={selectedId}
            />
          ) : null}
          {section === 'solicitudes_servicio' ? (
            <SupportTicketsView
              mode="service"
              title="Solicitudes de servicio"
              subtitle="Solicitudes operativas en seguimiento"
              tickets={tickets}
              onSelect={openTicket}
              selectedId={selectedId}
            />
          ) : null}
        </div>
      );
    }

    function OperationsDashboard() {
      const serviceRows = listOperationsRows();
      const metrics = [
        { title: 'Servicios abiertos', value: '12', change: -4, label: 'carga activa', trend: 'up', icon: Briefcase, bg: 'rgba(217,119,6,0.12)', color: '#d97706' },
        { title: 'SLA operativo', value: '93%', change: 1.8, label: 'sobre objetivo', trend: 'up', icon: Zap, bg: 'rgba(15,118,110,0.12)', color: '#0f766e' },
        { title: 'Proveedores críticos', value: '2', change: 0, label: 'sin cambios', trend: 'up', icon: Building2, bg: 'rgba(190,18,60,0.12)', color: '#be123c' },
        { title: 'Casos finalizados', value: '145', change: 9.3, label: 'acumulado', trend: 'up', icon: CheckCircle2, bg: 'rgba(37,99,235,0.12)', color: '#2563eb' }
      ];
      return (
        <div className="view">
          <section className="hero">
            <div className="hero-panel">
              <Tag variant="warning">Modo operaciones</Tag>
              <h1 className="hero-title">Circuito operativo con trazabilidad, prioridad y tiempos visibles.</h1>
              <p className="hero-copy">El tablero organiza solicitudes, proveedores y alertas de SLA para reducir fricción entre comercial, coordinación y ejecución final.</p>
              <div className="hero-kpis">
                <div className="hero-kpi"><div className="hero-kpi-label">Pendientes de hoy</div><div className="hero-kpi-value">5</div></div>
                <div className="hero-kpi"><div className="hero-kpi-label">Tiempo medio</div><div className="hero-kpi-value">2h 14m</div></div>
                <div className="hero-kpi"><div className="hero-kpi-label">Proveedor líder</div><div className="hero-kpi-value">Centro</div></div>
              </div>
              <div className="hero-grid"></div>
            </div>
            <Panel title="Acciones operativas" subtitle="Lo más usado por coordinación"><div className="toolbar"><Button icon={<Plus size={18} />}>Nueva solicitud</Button><Button variant="secondary" icon={<Building2 size={18} />}>Ver proveedores</Button></div></Panel>
          </section>
          <section className="metrics-grid">{metrics.map((item) => <MetricCard key={item.title} item={item} />)}</section>
          <section className="content-grid">
            <Panel className="span-12" title="Servicios recientes" subtitle="Seguimiento del circuito operativo">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Cliente</th><th>Tipo</th><th>Fecha</th><th>Proveedor</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>{serviceRows.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.client}</td><td>{row.type}</td><td>{row.date}</td><td>{row.provider}</td><td><Tag variant={statusVariant(row.status)}>{row.status}</Tag></td><td><Button variant="ghost" icon={<MoreHorizontal size={16} />}>Gestionar</Button></td></tr>)}</tbody>
                </table>
                {!serviceRows.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay servicios registrados.</div> : null}
              </div>
            </Panel>
          </section>
        </div>
      );
    }

      function ContactsView() {
        const [contactsRows, setContactsRows] = React.useState([]);
        const [contactsLoading, setContactsLoading] = React.useState(true);
        const [contactsError, setContactsError] = React.useState('');

        React.useEffect(() => {
          let canceled = false;
          setContactsLoading(true);
          setContactsError('');
          fetchContactsList()
            .then((rows) => {
              if (canceled) return;
              setContactsRows(rows);
            })
            .catch(() => {
              if (canceled) return;
              setContactsError('No se pudieron cargar los contactos.');
            })
            .finally(() => {
              if (canceled) return;
              setContactsLoading(false);
            });
          return () => { canceled = true; };
        }, []);

        const renderContactsBody = () => {
          if (contactsLoading) {
            return (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>Cargando contactos...</td>
              </tr>
            );
          }
          if (contactsError) {
            return (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#be123c' }}>{contactsError}</td>
              </tr>
            );
          }
          if (!contactsRows.length) {
            return (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No hay contactos disponibles.</td>
              </tr>
            );
          }
          return contactsRows.map((contact, index) => (
            <tr key={contact.id || `contact-${index}`}>
              <td>
                <div className="person">
                  <div className="person-badge">{initials(contact.name || 'Contacto')}</div>
                  <strong>{contact.name || 'Sin dato'}</strong>
                </div>
              </td>
              <td>{contact.phone || 'Sin dato'}</td><td>{pickCellular(contact) || 'Sin dato'}</td><td>{contact.city || 'Sin dato'}</td>
              <td><Tag variant={statusVariant(contact.status)}>{contact.status || 'Sin dato'}</Tag></td>
              <td>{contact.last || 'Sin registro'}</td>
              <td>
                <div className="toolbar">
                  <Button variant="ghost" icon={<Phone size={16} />} />
                  <Button variant="ghost" icon={<Eye size={16} />} />
                  <Button variant="ghost" icon={<Edit3 size={16} />} />
                </div>
              </td>
            </tr>
          ));
        };

        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-12" title="Base de contactos" subtitle="1.240 registros listos para gestión" action={<Button icon={<Plus size={18} />}>Nuevo contacto</Button>}>
                <div className="toolbar" style={{ marginBottom: 16 }}>
                  <div className="searchbox"><Search size={18} color="#69788d" /><input placeholder="Buscar por nombre, teléfono o documento..." /></div>
                  <Button variant="secondary" icon={<Filter size={18} />}>Filtros</Button>
                  <Button variant="ghost" icon={<Layers size={18} />}>Ver segmentos</Button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Contacto</th><th>Teléfono</th><th>Celular</th><th>Ubicación</th><th>Estado</th><th>Última gestión</th><th>Acción</th></tr></thead>
                    <tbody>{renderContactsBody()}</tbody>
                  </table>
                </div>
              </Panel>
            </section>
          </div>
        );
      }

    function ClientsView({ productsCatalog = [], prefillContact = null, onPrefillUsed = null }) {
        const { user: authUser } = useAuth();
        const [clientMetrics, setClientMetrics] = React.useState(() => buildClientMetricCards());
        const [clientRows, setClientRows] = React.useState([]);
        const [clientSearch, setClientSearch] = React.useState('');
        const [clientSearchDebounced, setClientSearchDebounced] = React.useState('');
        const [clientPage, setClientPage] = React.useState(1);
        const [clientPageSize] = React.useState(50);
        const [clientTotal, setClientTotal] = React.useState(0);
        const [clientsLoading, setClientsLoading] = React.useState(true);
        const [clientsError, setClientsError] = React.useState('');
        const [selectedClient, setSelectedClient] = React.useState(null);
        const [clientDetailError, setClientDetailError] = React.useState('');
        const [newClientOpen, setNewClientOpen] = React.useState(false);
        const [newClientError, setNewClientError] = React.useState('');
        const [newClientSaving, setNewClientSaving] = React.useState(false);
        const [newClientStep, setNewClientStep] = React.useState(0);
        const [newClientDraft, setNewClientDraft] = React.useState({
          contact: {
            nombre: '',
            apellido: '',
            documento: '',
            fecha_nacimiento: '',
            telefono: '',
            celular: '',
            email: '',
            direccion: '',
            departamento: '',
            pais: 'Uruguay',
            status: 'activo'
          },
          products: [],
          sale: {
            mode: 'logged',
            externalName: '',
            medioPago: 'debito'
          }
        });
        const [isCompactForm, setIsCompactForm] = React.useState(window.innerWidth < 768);

      React.useEffect(() => {
        let canceled = false;
        fetchClientsMetrics()
          .then((metrics) => {
            if (canceled) return;
            setClientMetrics(buildClientMetricCards(metrics));
          })
          .catch(() => {})
          .finally(() => {
            if (canceled) return;
          });
        return () => { canceled = true; };
      }, []);

      React.useEffect(() => {
        const onResize = () => setIsCompactForm(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      React.useEffect(() => {
        let canceled = false;
        setClientsLoading(true);
        setClientsError('');
        fetchClientsDirectory({ page: clientPage, limit: clientPageSize, search: clientSearchDebounced })
          .then(({ table, total }) => {
            if (canceled) return;
            setClientRows(table);
            setClientTotal(Number(total || 0));
          })
          .catch(() => {
            if (canceled) return;
            setClientsError('No se pudo cargar la cartera de clientes.');
          })
          .finally(() => {
            if (canceled) return;
            setClientsLoading(false);
          });
        return () => { canceled = true; };
      }, [clientPage, clientPageSize, clientSearchDebounced]);

      React.useEffect(() => {
        const timer = window.setTimeout(() => {
          setClientSearchDebounced(clientSearch.trim());
        }, 400);
        return () => window.clearTimeout(timer);
      }, [clientSearch]);

      React.useEffect(() => {
        setClientPage(1);
      }, [clientSearchDebounced]);

      const filteredClients = React.useMemo(() => {
        const term = String(clientSearch || '').trim().toLowerCase();
        if (!term) return clientRows;
        const termDigits = term.replace(/\D/g, '');
        return clientRows.filter((row) => {
          const values = [
            row.name,
            row.documento,
            row.email,
            row.product,
            row.plan
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());
          const phoneValues = [
            row.phone,
            row.telefono,
            row.celular,
            row.cellphone,
            row.mobile,
            row.telefono_celular,
            row.telefonoCelular
          ]
            .filter(Boolean)
            .map((value) => String(value));
          const matchesText = values.some((value) => value.includes(term));
          if (!termDigits) return matchesText;
          const matchesPhone = phoneValues.some((value) => String(value).replace(/\D/g, '').includes(termDigits));
          return matchesText || matchesPhone;
        });
      }, [clientRows, clientSearch]);

      const totalPages = Math.max(1, Math.ceil((clientTotal || 0) / clientPageSize));

      const handleViewFicha = React.useCallback(async (clientId) => {
        const found = clientRows.find((item) => item.id === clientId);
        if (found) {
          setSelectedClient(found);
        }
        setClientDetailError('');
        try {
          const detail = await fetchClientDetail(clientId);
          if (detail) {
            setSelectedClient(detail);
          }
          try {
            const tickets = await listTicketsByClientId(clientId);
            if (tickets?.length) {
              setSelectedClient((prev) => (prev && prev.id === clientId ? { ...prev, ticketsHistory: tickets } : prev));
            }
          } catch {
            // no-op: avoid blocking ficha
          }
        } catch (err) {
          console.error('No se pudo cargar el detalle del cliente.', err);
          const status = err?.status;
          const backendMessage =
            err?.details?.message || err?.details?.error || err?.message || '';
          const statusLabel = status ? ` (HTTP ${status})` : '';
          const detailLabel = backendMessage ? ` · ${backendMessage}` : '';
          setClientDetailError(`No se pudo cargar el detalle del cliente${statusLabel}${detailLabel}.`);
        }
      }, [clientRows]);

      const handleClientUpdated = React.useCallback((updated) => {
        if (!updated) return;
        const updatedId = updated.id;
        const productLabel = typeof updated.product === 'string'
          ? updated.product
          : (updated.product?.nombre || updated.product?.name || '');
        const planLabel = updated.plan || updated.product?.plan || '';
        const feeLabel = updated.fee || updated.product?.fee || updated.product?.precio || '';
        setSelectedClient((prev) => (prev && prev.id === updatedId ? { ...prev, ...updated } : updated));
        setClientRows((prev) => prev.map((row) => {
          if (row.id !== updatedId) return row;
          return {
            ...row,
            name: updated.name || `${updated.nombre || ''} ${updated.apellido || ''}`.trim() || row.name,
            product: productLabel || row.product,
            plan: planLabel || row.plan,
            fee: feeLabel || row.fee,
            status: updated.status || updated.contactoEstado || row.status,
            email: updated.email || row.email,
            phone: updated.phone || updated.telefono || row.phone,
            celular: updated.celular || updated.cellphone || row.celular,
            documento: updated.documento || row.documento
          };
        }));
        fetchClientDetail(updatedId)
          .then((detail) => {
            if (!detail) return;
            setSelectedClient((prev) => (prev && prev.id === updatedId ? { ...prev, ...detail } : detail));
          })
          .catch(() => {});
        fetchClientsDirectory({ page: clientPage, limit: clientPageSize, search: clientSearchDebounced })
          .then(({ table, total }) => {
            setClientRows(table);
            setClientTotal(Number(total || 0));
          })
          .catch(() => {});
      }, [clientPage, clientPageSize, clientSearchDebounced]);

      const handleDeleteClient = React.useCallback(async (clientId, clientName) => {
        if (!clientId) return;
        const label = clientName || 'este cliente';
        const confirmed = window.confirm(`¿Seguro que querés eliminar a ${label}? Esta acción es definitiva.`);
        if (!confirmed) return;
        try {
          await deleteClient(clientId);
          const [directory, metrics] = await Promise.all([
            fetchClientsDirectory({ page: clientPage, limit: clientPageSize, search: clientSearchDebounced }),
            fetchClientsMetrics()
          ]);
          setClientRows(directory.table);
          setClientTotal(Number(directory.total || 0));
          setClientMetrics(buildClientMetricCards(metrics));
          setSelectedClient((prev) => (prev && prev.id === clientId ? null : prev));
        } catch (err) {
          const message = err?.message || 'No se pudo eliminar el cliente.';
          setClientsError(message);
        }
      }, [clientPage, clientPageSize, clientSearchDebounced]);

        const handleCloseFicha = () => {
          setSelectedClient(null);
          setClientDetailError('');
        };
        const handleOpenNewClient = (prefill = null) => {
          setNewClientDraft({
            contact: {
              nombre: prefill?.nombre || prefill?.name?.split(' ')[0] || '',
              apellido: prefill?.apellido || (prefill?.name?.split(' ').slice(1).join(' ')) || '',
              documento: prefill?.documento || '',
              fecha_nacimiento: prefill?.fecha_nacimiento || '',
              telefono: prefill?.telefono || prefill?.phone || '',
              celular: prefill?.celular || '',
              email: prefill?.correo_electronico || prefill?.email || '',
              direccion: prefill?.direccion || '',
              departamento: prefill?.departamento || prefill?.city || '',
              pais: prefill?.pais || 'Uruguay',
              status: 'activo'
            },
            products: [],
            sale: {
              mode: 'logged',
              externalName: '',
              medioPago: 'debito'
            }
          });
          setNewClientError('');
          setNewClientStep(0);
          setNewClientOpen(true);
        };

        const handleCloseNewClient = () => {
          setNewClientOpen(false);
          if (onPrefillUsed) onPrefillUsed();
        };

        React.useEffect(() => {
          if (!prefillContact) return;
          handleOpenNewClient(prefillContact);
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        const handleSaveNewClient = async () => {
          const selectedProducts = productsCatalog.filter((product) => newClientDraft.products.includes(product.id));
          if (!selectedProducts.length) {
            setNewClientError('Selecciona al menos un producto para continuar.');
            return;
          }
          const loggedName = [authUser?.nombre, authUser?.apellido].filter(Boolean).join(' ') || authUser?.email || '';
          const saleMode = newClientDraft.sale?.mode || 'logged';
          const saleName = saleMode === 'external'
            ? String(newClientDraft.sale?.externalName || '').trim()
            : loggedName;
          if (saleMode === 'external' && !saleName) {
            setNewClientError('Ingresa el nombre del vendedor externo.');
            setNewClientStep(2);
            return;
          }
        const contactPayload = {
          ...newClientDraft.contact,
          fechaNacimiento: newClientDraft.contact.fechaNacimiento || newClientDraft.contact.fecha_nacimiento || '',
          fecha_nacimiento: newClientDraft.contact.fecha_nacimiento || newClientDraft.contact.fechaNacimiento || '',
          direccion: newClientDraft.contact.direccion || '',
          departamento: newClientDraft.contact.departamento || '',
          pais: newClientDraft.contact.pais || '',
          telefono: newClientDraft.contact.telefono || '',
          celular: newClientDraft.contact.celular || ''
        };
        const principalContactId = newClientDraft.contact.principal_contact_id
          || newClientDraft.contact.contact_id
          || newClientDraft.contact.contactId
          || newClientDraft.contact.contacto_id
          || newClientDraft.contact.contacto_principal_id
          || newClientDraft.contact.parent_contact_id
          || newClientDraft.contact.id
          || '';
        const payload = {
          principal_contact_id: principalContactId,
          contact: contactPayload,
          products: selectedProducts.map((product) => ({
            nombreProducto: product.nombre || product.nombreProducto || product.nombre_producto,
            nombre_producto: product.nombre || product.nombreProducto || product.nombre_producto,
              plan: product.plan || product.categoria || 'Plan estándar',
              precio: product.precio,
              medioPago: normalizePaymentMethod(newClientDraft.sale?.medioPago || product.medioPago || product.medio_pago || 'debito'),
              medio_pago: normalizePaymentMethod(newClientDraft.sale?.medioPago || product.medioPago || product.medio_pago || 'debito'),
              fechaAlta: new Date().toISOString().slice(0, 10),
              estado: 'alta',
              sellerName: saleName || loggedName || 'Usuario'
            }))
          };
          setNewClientSaving(true);
          setNewClientError('');
        try {
          console.log('[contacts payload]', payload);
          await createContactWithProducts(payload);
          const [directory, metrics] = await Promise.all([
            fetchClientsDirectory({ page: clientPage, limit: clientPageSize, search: clientSearchDebounced }),
            fetchClientsMetrics()
          ]);
            setClientRows(directory.table);
            setClientTotal(Number(directory.total || 0));
            setClientMetrics(buildClientMetricCards(metrics));
            handleCloseNewClient();
            try { localStorage.removeItem('cliente_pendiente_alta'); } catch {}
          } catch (err) {
            const status = err?.status;
            if (status === 409) {
              setNewClientError('Ya existe un contacto con ese documento o email.');
            } else if (status === 422) {
              try {
                const directory = await fetchClientsDirectory({ page: clientPage, limit: clientPageSize, search: clientSearchDebounced });
                const match = directory?.table?.find((row) => {
                  const doc = newClientDraft.contact.documento || '';
                  const email = newClientDraft.contact.email || '';
                  return (doc && row.documento === doc) || (email && row.email === email);
                });
                if (match) {
                  const metrics = await fetchClientsMetrics().catch(() => null);
                  setClientRows(directory.table);
                  setClientTotal(Number(directory.total || 0));
                  if (metrics) setClientMetrics(buildClientMetricCards(metrics));
                  handleCloseNewClient();
                  return;
                }
              } catch {}
              setNewClientError(err?.details?.message || 'Hay errores de validación en el formulario.');
            } else {
              try {
                const directory = await fetchClientsDirectory({ page: clientPage, limit: clientPageSize, search: clientSearchDebounced });
                const match = directory?.table?.find((row) => {
                  const doc = newClientDraft.contact.documento || '';
                  const email = newClientDraft.contact.email || '';
                  return (doc && row.documento === doc) || (email && row.email === email);
                });
                if (match) {
                  const metrics = await fetchClientsMetrics().catch(() => null);
                  setClientRows(directory.table);
                  setClientTotal(Number(directory.total || 0));
                  if (metrics) setClientMetrics(buildClientMetricCards(metrics));
                  handleCloseNewClient();
                  return;
                }
              } catch {}
              setNewClientError(err?.message || 'No se pudo guardar el cliente.');
            }
          } finally {
            setNewClientSaving(false);
          }
        };

        const handleNewClientContactChange = (field, value) => {
          setNewClientDraft((prev) => ({
            ...prev,
            contact: {
              ...prev.contact,
              [field]: value
            }
          }));
        };
        const handleToggleProduct = (productId) => {
          setNewClientDraft((prev) => {
            const selected = new Set(prev.products);
            if (selected.has(productId)) {
              selected.delete(productId);
            } else {
              selected.add(productId);
            }
            return { ...prev, products: Array.from(selected) };
          });
          setNewClientError('');
        };

        const handleSaleModeChange = (mode) => {
          setNewClientDraft((prev) => ({
            ...prev,
            sale: {
              ...prev.sale,
              mode
            }
          }));
          setNewClientError('');
        };

        const handleSaleExternalNameChange = (value) => {
          setNewClientDraft((prev) => ({
            ...prev,
            sale: {
              ...prev.sale,
              externalName: value
            }
          }));
          setNewClientError('');
        };

        const handleSalePaymentChange = (value) => {
          setNewClientDraft((prev) => ({
            ...prev,
            sale: {
              ...prev.sale,
              medioPago: normalizePaymentMethod(value)
            }
          }));
          setNewClientError('');
        };

      const renderClientRows = () => {
        if (clientsLoading) {
          return (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>Cargando clientes...</td>
            </tr>
          );
        }
        if (clientsError) {
          return (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#be123c' }}>{clientsError}</td>
            </tr>
          );
        }
        if (!filteredClients.length) {
          return (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No hay clientes en cartera.</td>
            </tr>
          );
        }
        return filteredClients.map((row, index) => (
          <tr key={row.id || `client-${index}`}>
            <td>
              <div className="person">
                <div className="person-badge">{initials(row.name || 'Cliente')}</div>
                <strong>{row.name || 'Sin dato'}</strong>
              </div>
            </td>
            <td>{formatDateShort(row.fechaAlta || row.fechaVenta || row.createdAt) || 'Sin dato'}</td>
            <td>{row.product || 'Sin dato'}</td>
            <td>{row.fee || 'Sin dato'}</td>
            <td><Tag variant={statusVariant(row.status)}>{row.status || 'Sin dato'}</Tag></td>
            <td>
              <div className="toolbar">
                <Button variant="ghost" icon={<Eye size={16} />} onClick={() => handleViewFicha(row.id)}>Ver ficha</Button>
                <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => handleDeleteClient(row.id, row.name)}>Eliminar</Button>
              </div>
            </td>
          </tr>
        ));
      };

      return (
        <div className="view">
          <section className="metrics-grid">
            {clientMetrics.map((item) => <MetricCard key={item.title} item={item} />)}
          </section>
          <section className="content-grid">
            <Panel className="span-12" title="Clientes" subtitle="Gestión de cartera activa">
              <div className="toolbar" style={{ marginBottom: 16 }}>
                <input
                  className="input"
                  style={{ maxWidth: 360 }}
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                />
                <Button icon={<Plus size={18} />} onClick={() => handleOpenNewClient()}>Nuevo cliente</Button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Cliente</th><th>Fecha de alta</th><th>Producto</th><th>Cuota</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>{renderClientRows()}</tbody>
                </table>
              </div>
              <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Mostrando {filteredClients.length} de {clientTotal || 0}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button variant="ghost" disabled={clientPage <= 1} onClick={() => setClientPage((prev) => Math.max(1, prev - 1))}>Anterior</Button>
                  <div style={{ fontWeight: 600 }}>Página {clientPage} de {totalPages}</div>
                  <Button variant="ghost" disabled={clientPage >= totalPages} onClick={() => setClientPage((prev) => Math.min(totalPages, prev + 1))}>Siguiente</Button>
                </div>
              </div>
            </Panel>
          </section>
          <ClienteFichaForm
            open={Boolean(selectedClient)}
            client={selectedClient}
            onClose={handleCloseFicha}
            onUpdated={handleClientUpdated}
            detailError={clientDetailError}
          />
          {newClientOpen && (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  zIndex: 45
                }}
                onClick={() => handleCloseNewClient()}
              />
              <div
                style={{
                  position: 'fixed',
                  right: 24,
                  top: 32,
                  bottom: 32,
                  width: 'min(520px, calc(100% - 48px))',
                  backgroundColor: '#fff',
                  borderRadius: 24,
                  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
                  padding: 24,
                  zIndex: 46,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  maxHeight: 'calc(100vh - 64px)',
                  overflow: 'hidden'
                }}
                className="new-client-modal"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>Datos del contacto</p>
                    <h3 style={{ margin: '6px 0', fontSize: 20, fontWeight: 600 }}>Nuevo cliente</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCloseNewClient()}
                    style={{
                      border: 'none',
                      background: '#f3f4f6',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      cursor: 'pointer'
                    }}
                  >
                    <X size={16} color="#475569" />
                  </button>
                </div>
                <div className="new-client-steps">
                  <button
                    type="button"
                    className={`new-client-step ${newClientStep === 0 ? 'active' : ''}`}
                    onClick={() => setNewClientStep(0)}
                  >
                    Datos
                  </button>
                  <button
                    type="button"
                    className={`new-client-step ${newClientStep === 1 ? 'active' : ''}`}
                    onClick={() => setNewClientStep(1)}
                  >
                    Productos
                  </button>
                  <button
                    type="button"
                    className={`new-client-step ${newClientStep === 2 ? 'active' : ''}`}
                    onClick={() => setNewClientStep(2)}
                  >
                    Venta
                  </button>
                </div>

                <div className="new-client-body">
                  {newClientStep === 0 ? (
                    <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Datos del contacto</h4>
                    <div className="new-client-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                      {[
                        { label: 'Nombre', field: 'nombre' },
                        { label: 'Apellido', field: 'apellido' },
                        { label: 'Documento', field: 'documento' },
                        { label: 'Fecha de nacimiento', field: 'fecha_nacimiento', type: 'date' },
                        { label: 'Teléfono', field: 'telefono' },
                        { label: 'Celular', field: 'celular' },
                        { label: 'Email', field: 'email' },
                        { label: 'Dirección', field: 'direccion', full: true },
                        { label: 'Departamento', field: 'departamento' },
                        { label: 'País', field: 'pais' }
                      ].map(({ label, field, type, full }) => (
                        <label key={field} style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, gridColumn: full ? '1 / -1' : 'auto' }}>
                          {label}
                          <input
                            type={type || 'text'}
                            value={newClientDraft.contact[field] || ''}
                            onChange={(event) => handleNewClientContactChange(field, event.target.value)}
                            style={{
                              marginTop: 6,
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 12,
                              border: '1px solid #e5e7eb'
                            }}
                          />
                        </label>
                      ))}
                      <label style={{ gridColumn: '1 / -1', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Estado del contacto
                        <select
                          value={newClientDraft.contact.status}
                          onChange={(event) => handleNewClientContactChange('status', event.target.value)}
                          style={{
                            marginTop: 6,
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          <option value="activo">Activo</option>
                          <option value="bloqueado">Bloqueado</option>
                        </select>
                      </label>
                    </div>
                    </div>
                  ) : newClientStep === 1 ? (
                    <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Productos asociados</h4>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {newClientDraft.products.length} seleccionados
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {productsCatalog.map((product) => {
                        const checked = newClientDraft.products.includes(product.id);
                        return (
                          <label
                            key={product.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 12,
                              padding: '12px 14px',
                              borderRadius: 16,
                              border: checked ? '1px solid rgba(15, 118, 110, 0.65)' : '1px solid #e5e7eb',
                              background: checked ? 'rgba(15, 118, 110, 0.08)' : '#fff',
                              cursor: 'pointer',
                              boxShadow: checked ? '0 10px 24px rgba(15, 118, 110, 0.12)' : 'none'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleProduct(product.id)}
                              style={{ marginTop: 4 }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <strong style={{ fontSize: 14 }}>{product.nombre}</strong>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: product.activo ? '#047857' : '#b91c1c',
                                    background: product.activo ? '#ecfdf5' : '#fee2e2',
                                    borderRadius: 999,
                                    padding: '3px 8px'
                                  }}
                                >
                                  {product.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                              <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                                {product.categoria || 'General'} · {formatCurrency(product.precio || 0)} {product.moneda || 'UYU'}
                              </div>
                              {product.descripcion ? (
                                <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>{product.descripcion}</div>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {newClientError ? (
                      <p style={{ marginTop: 10, color: '#b91c1c', fontSize: 12 }}>{newClientError}</p>
                    ) : null}
                    </div>
                  ) : (
                    <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Registro de venta</h4>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Asignar vendedor</span>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: newClientDraft.sale.mode === 'logged' ? '1px solid rgba(15, 118, 110, 0.65)' : '1px solid #e5e7eb',
                        background: newClientDraft.sale.mode === 'logged' ? 'rgba(15, 118, 110, 0.08)' : '#fff',
                        cursor: 'pointer'
                      }}>
                        <div>
                          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Usuario logueado</div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{[authUser?.nombre, authUser?.apellido].filter(Boolean).join(' ') || authUser?.email || 'Usuario'}</div>
                          {authUser?.email ? <div style={{ fontSize: 12, color: '#94a3b8' }}>{authUser.email}</div> : null}
                        </div>
                        <input
                          type="radio"
                          name="sale-mode"
                          checked={newClientDraft.sale.mode === 'logged'}
                          onChange={() => handleSaleModeChange('logged')}
                        />
                      </label>

                      <label style={{
                        display: 'grid',
                        gap: 8,
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: newClientDraft.sale.mode === 'external' ? '1px solid rgba(15, 118, 110, 0.65)' : '1px solid #e5e7eb',
                        background: newClientDraft.sale.mode === 'external' ? 'rgba(15, 118, 110, 0.08)' : '#fff',
                        cursor: 'pointer'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Vendedor externo</div>
                          <input
                            type="radio"
                            name="sale-mode"
                            checked={newClientDraft.sale.mode === 'external'}
                            onChange={() => handleSaleModeChange('external')}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Escribe el nombre del vendedor"
                          value={newClientDraft.sale.externalName}
                          onChange={(event) => handleSaleExternalNameChange(event.target.value)}
                          disabled={newClientDraft.sale.mode !== 'external'}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid #e5e7eb'
                          }}
                        />
                      </label>

                      <div style={{
                        display: 'grid',
                        gap: 8,
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: '1px solid #e5e7eb',
                        background: '#fff'
                      }}>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Medio de pago</div>
                        <select
                          value={newClientDraft.sale.medioPago}
                          onChange={(event) => handleSalePaymentChange(event.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid #e5e7eb',
                            background: '#fff'
                          }}
                        >
                          {[
                            { value: 'abitab', label: 'ABITAB' },
                            { value: 'ajupen', label: 'AJUPEN' },
                            { value: 'ajupen_anp', label: 'AJUPEN ANP' },
                            { value: 'anjuped', label: 'ANJUPED' },
                            { value: 'antel', label: 'ANTEL' },
                            { value: 'cabal', label: 'Cabal' },
                            { value: 'creditel', label: 'Creditel' },
                            { value: 'credito', label: 'Crédito' },
                            { value: 'debito', label: 'Débito' },
                            { value: 'efectivo', label: 'Efectivo' },
                            { value: 'master', label: 'MASTER' },
                            { value: 'mastercard', label: 'MASTERCARD' },
                            { value: 'mercado_pago', label: 'Mercado Pago' },
                            { value: 'mi_dinero', label: 'Mi dinero' },
                            { value: 'oca', label: 'OCA' },
                            { value: 'pass_card', label: 'PASS CARD' },
                            { value: 'transferencia', label: 'Transferencia' },
                            { value: 'visa', label: 'VISA' }
                          ].map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {newClientError ? (
                      <p style={{ marginTop: 10, color: '#b91c1c', fontSize: 12 }}>{newClientError}</p>
                    ) : null}
                    </div>
                  )}
                </div>

                <div className="new-client-actions new-client-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  {newClientStep > 0 ? (
                    <button
                      type="button"
                      onClick={() => setNewClientStep((prev) => Math.max(0, prev - 1))}
                      className="new-client-action"
                      style={{
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        padding: '10px 18px',
                        borderRadius: 999,
                        cursor: 'pointer'
                      }}
                    >
                      Atrás
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleCloseNewClient()}
                    className="new-client-action"
                    style={{
                      border: '1px solid #cbd5f5',
                      background: '#fff',
                      padding: '10px 18px',
                      borderRadius: 999,
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newClientStep < 2) {
                        setNewClientStep((prev) => Math.min(2, prev + 1));
                        return;
                      }
                      handleSaveNewClient();
                    }}
                    disabled={newClientSaving || (newClientStep === 1 && !newClientDraft.products.length)}
                    className="new-client-action"
                    style={{
                      border: 'none',
                      backgroundColor: '#059669',
                      color: '#fff',
                      padding: '10px 22px',
                      borderRadius: 999,
                      cursor: newClientSaving || (newClientStep === 1 && !newClientDraft.products.length) ? 'not-allowed' : 'pointer',
                      opacity: newClientSaving || (newClientStep === 1 && !newClientDraft.products.length) ? 0.65 : 1
                    }}
                  >
                    {newClientStep < 2 ? 'Siguiente' : (newClientSaving ? 'Guardando...' : 'Guardar contacto')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    function NuevoClienteVendedor({ draft = null, onClose, onSuccess, productsCatalog = [], gestion_id = null, mode = 'nuevo_cliente' }) {
      const { user: authUser } = useAuth();
      const [newClientError, setNewClientError] = React.useState('');
      const [newClientSaving, setNewClientSaving] = React.useState(false);
      const [newClientStep, setNewClientStep] = React.useState(0);
      const [familiarSuggestions, setFamiliarSuggestions] = React.useState([]);
      const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
      const fetchFamiliarSuggestions = React.useCallback(async () => {
        const leadId = draft?.lead_id || draft?.id;
        if (!leadId) return;
        setLoadingSuggestions(true);
        try {
          const res = await api.get(`/leads/${leadId}/familiares`);
          setFamiliarSuggestions(res?.data?.data?.items || []);
        } catch {
          setFamiliarSuggestions([]);
        } finally {
          setLoadingSuggestions(false);
        }
      }, [draft]);
      React.useEffect(() => {
        if (newClientStep === 1) {
          fetchFamiliarSuggestions();
        }
      }, [newClientStep, fetchFamiliarSuggestions]);
      const toDateInput = React.useCallback((value) => {
        if (!value) return '';
        const raw = String(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        const asDate = new Date(raw);
        if (Number.isNaN(asDate.getTime())) return '';
        return asDate.toISOString().slice(0, 10);
      }, []);
      const relationOptions = ['Hijo', 'Hija', 'Nieto', 'Nieta', 'Esposo', 'Esposa', 'Amigo', 'Primo', 'Prima', 'Otro'];
      const [newClientDraft, setNewClientDraft] = React.useState({
        contact: {
          nombre: draft?.nombre || '',
          apellido: draft?.apellido || '',
          documento: draft?.documento || '',
          fecha_nacimiento: toDateInput(draft?.fecha_nacimiento || draft?.fechaNacimiento),
          telefono: draft?.telefono || '',
          celular: draft?.celular || '',
          email: draft?.correo_electronico || draft?.email || '',
          direccion: draft?.direccion || '',
          departamento: draft?.departamento || draft?.departamento_residencia || draft?.city || '',
          localidad: draft?.localidad || draft?.ciudad || draft?.localidad_residencia || '',
          pais: draft?.pais || 'Uruguay',
          status: 'activo'
        },
        familiares: [],
        productsByContact: {},
        sale: {
          medioPago: 'debito',
          cobranzaDocumento: ''
        }
      });

      React.useEffect(() => {
        if (!draft) return;
        setNewClientDraft((prev) => ({
          ...prev,
          contact: {
            ...prev.contact,
            nombre: draft?.nombre || '',
            apellido: draft?.apellido || '',
            documento: draft?.documento || '',
            fecha_nacimiento: toDateInput(draft?.fecha_nacimiento || draft?.fechaNacimiento),
            telefono: draft?.telefono || '',
            celular: draft?.celular || '',
            email: draft?.correo_electronico || draft?.email || '',
            direccion: draft?.direccion || '',
            departamento: draft?.departamento || draft?.departamento_residencia || draft?.city || '',
            localidad: draft?.localidad || draft?.ciudad || draft?.localidad_residencia || ''
          }
        }));
      }, [draft, toDateInput]);

      const handleNewClientContactChange = (field, value) => {
        setNewClientDraft((prev) => ({
          ...prev,
          contact: {
            ...prev.contact,
            [field]: value
          }
        }));
        setNewClientError('');
      };

      const handleAddFamiliar = () => {
        setNewClientDraft((prev) => ({
          ...prev,
          familiares: [
            ...prev.familiares,
            {
              id: `fam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              nombre: '',
              apellido: '',
              documento: '',
              telefono: prev.contact?.telefono || '',
              celular: '',
              fecha_nacimiento: '',
              direccion: prev.contact?.direccion || '',
              relacion: ''
            }
          ]
        }));
      };
      const handleAddSuggestedFamiliar = (suggestion) => {
        const relationValue = suggestion?.relation || suggestion?.relacion || 'familiar';
        const suggestionId = suggestion?.id || `fam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setNewClientDraft((prev) => ({
          ...prev,
          familiares: [
            ...prev.familiares,
            {
              id: suggestionId,
              contact_id: suggestion?.id,
              nombre: suggestion?.nombre || '',
              apellido: suggestion?.apellido || '',
              documento: suggestion?.documento || '',
              telefono: suggestion?.telefono || '',
              celular: suggestion?.celular || '',
              fecha_nacimiento: suggestion?.fecha_nacimiento || suggestion?.fechaNacimiento || '',
              direccion: suggestion?.direccion || '',
              relacion: relationValue
            }
          ]
        }));
        setFamiliarSuggestions((prev) => prev.filter((item) => item?.id !== suggestion?.id));
      };

      const handleRemoveFamiliar = (id) => {
        setNewClientDraft((prev) => ({
          ...prev,
          familiares: prev.familiares.filter((f) => f.id !== id),
          productsByContact: Object.fromEntries(
            Object.entries(prev.productsByContact).filter(([key]) => key !== id)
          )
        }));
      };

      const handleFamiliarChange = (id, field, value) => {
        setNewClientDraft((prev) => ({
          ...prev,
          familiares: prev.familiares.map((f) => (f.id === id ? { ...f, [field]: value } : f))
        }));
        setNewClientError('');
      };

      const handleProductSelection = (key, productId) => {
        setNewClientDraft((prev) => ({
          ...prev,
          productsByContact: {
            ...prev.productsByContact,
            [key]: productId
          }
        }));
        setNewClientError('');
      };

      const handleSalePaymentChange = (value) => {
        setNewClientDraft((prev) => ({
          ...prev,
          sale: {
            ...prev.sale,
            medioPago: normalizePaymentMethod(value)
          }
        }));
        setNewClientError('');
      };

      const handleCobranzaDocumentoChange = (value) => {
        setNewClientDraft((prev) => ({
          ...prev,
          sale: {
            ...prev.sale,
            cobranzaDocumento: value
          }
        }));
        setNewClientError('');
      };

      const handleSaveNewClient = async () => {
        const loggedName = [authUser?.nombre, authUser?.apellido].filter(Boolean).join(' ') || authUser?.email || '';
        const saleName = loggedName || 'Usuario';
        const ventaContactos = [
          { key: 'principal', contact: newClientDraft.contact },
          ...newClientDraft.familiares.map((f) => ({ key: f.id, contact: f }))
        ];
        const missingProduct = ventaContactos.find((item) => !newClientDraft.productsByContact[item.key]);
        if (missingProduct) {
          setNewClientError('Selecciona un producto para cada contacto.');
          setNewClientStep(2);
          return;
        }
        const contactPayload = {
          ...newClientDraft.contact,
          fechaNacimiento: newClientDraft.contact.fechaNacimiento || newClientDraft.contact.fecha_nacimiento || '',
          fecha_nacimiento: newClientDraft.contact.fecha_nacimiento || newClientDraft.contact.fechaNacimiento || ''
        };
        const buildProductPayload = (productId) => {
          const product = productsCatalog.find((p) => p.id === productId);
          if (!product) return null;
          return {
            nombreProducto: product.nombre || product.nombreProducto || product.nombre_producto,
            nombre_producto: product.nombre || product.nombreProducto || product.nombre_producto,
            plan: product.plan || product.categoria || 'Plan estándar',
            precio: product.precio,
            medioPago: normalizePaymentMethod(newClientDraft.sale?.medioPago || product.medioPago || product.medio_pago || 'debito'),
            medio_pago: normalizePaymentMethod(newClientDraft.sale?.medioPago || product.medioPago || product.medio_pago || 'debito'),
            fechaAlta: new Date().toISOString().slice(0, 10),
            estado: 'alta',
            sellerName: saleName
          };
        };
        const principalProduct = buildProductPayload(newClientDraft.productsByContact.principal);
        const familySales = newClientDraft.familiares.map((fam) => ({
          relation: fam.relacion || '',
          contact: {
            ...fam,
            telefono: fam.telefono || newClientDraft.contact.telefono || '',
            direccion: fam.direccion || newClientDraft.contact.direccion || '',
            fecha_nacimiento: fam.fecha_nacimiento || newClientDraft.contact.fecha_nacimiento || '',
            fechaNacimiento: fam.fechaNacimiento || fam.fecha_nacimiento || newClientDraft.contact.fecha_nacimiento || ''
          },
          products: [buildProductPayload(newClientDraft.productsByContact[fam.id])].filter(Boolean),
          medioPago: normalizePaymentMethod(newClientDraft.sale?.medioPago || 'debito')
        }));
        const principalContactId = newClientDraft.contact.principal_contact_id
          || newClientDraft.contact.contact_id
          || newClientDraft.contact.contactId
          || newClientDraft.contact.contacto_id
          || newClientDraft.contact.contacto_principal_id
          || newClientDraft.contact.parent_contact_id
          || newClientDraft.contact.id
          || '';
        const payload = {
          principal_contact_id: principalContactId,
          contact: contactPayload,
          products: principalProduct ? [principalProduct] : [],
          medioPago: normalizePaymentMethod(newClientDraft.sale?.medioPago || 'debito'),
          cobranza_documento: String(newClientDraft.sale?.cobranzaDocumento || '').trim() || undefined,
          familySales,
          gestion_id: gestion_id ?? null
        };
        setNewClientSaving(true);
        setNewClientError('');
        try {
          console.log('[contacts payload]', payload);
          const result = await createContactWithProducts(payload);

          console.log('[contacts response] id:', result?.id);
          console.log('[contacts response] management:', JSON.stringify(result?.management, null, 2));

          const failed = result?.management?.filter((m) => !m.ok || !m.created) || [];
          if (failed.length > 0) {
            console.warn('[contacts response] gestiones NO creadas:', JSON.stringify(failed, null, 2));
          }
          if (onSuccess) onSuccess();
        } catch (err) {
          const status = err?.status;
          if (status === 409) {
            setNewClientError('Ya existe un contacto con ese documento o email.');
          } else if (status === 422) {
            setNewClientError(err?.details?.message || 'Hay errores de validación en el formulario.');
          } else {
            setNewClientError(err?.message || 'No se pudo guardar el cliente.');
          }
        } finally {
          setNewClientSaving(false);
        }
      };

      const modalTitle = mode === 'registrar_venta' ? 'Registrar venta' : 'Nuevo cliente';
      return (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              zIndex: 45
            }}
            onClick={() => onClose && onClose()}
          />
          <div
            style={{
              position: 'fixed',
              right: 24,
              top: 32,
              bottom: 32,
              width: 'min(520px, calc(100% - 48px))',
              backgroundColor: '#fff',
              borderRadius: 24,
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
              padding: 24,
              zIndex: 46,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxHeight: 'calc(100vh - 64px)',
              overflow: 'hidden'
            }}
            className="new-client-modal"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>Datos del contacto</p>
                <h3 style={{ margin: '6px 0', fontSize: 20, fontWeight: 600 }}>{modalTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => onClose && onClose()}
                style={{
                  border: 'none',
                  background: '#f3f4f6',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer'
                }}
              >
                <X size={16} color="#475569" />
              </button>
            </div>
            <div className="new-client-steps">
              <button
                type="button"
                className={`new-client-step ${newClientStep === 0 ? 'active' : ''}`}
                onClick={() => setNewClientStep(0)}
              >
                Datos
              </button>
              <button
                type="button"
                className={`new-client-step ${newClientStep === 1 ? 'active' : ''}`}
                onClick={() => setNewClientStep(1)}
              >
                Familiar
              </button>
              <button
                type="button"
                className={`new-client-step ${newClientStep === 2 ? 'active' : ''}`}
                onClick={() => setNewClientStep(2)}
              >
                Productos
              </button>
              <button
                type="button"
                className={`new-client-step ${newClientStep === 3 ? 'active' : ''}`}
                onClick={() => setNewClientStep(3)}
              >
                Venta
              </button>
            </div>

            <div className="new-client-body">
              {newClientStep === 0 ? (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Datos del contacto</h4>
                  <div className="new-client-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Nombre', field: 'nombre' },
                      { label: 'Apellido', field: 'apellido' },
                      { label: 'Documento', field: 'documento' },
                      { label: 'Fecha de nacimiento', field: 'fecha_nacimiento', type: 'date' },
                      { label: 'Teléfono', field: 'telefono' },
                      { label: 'Celular', field: 'celular' },
                      { label: 'Email', field: 'email' },
                      { label: 'Dirección', field: 'direccion', full: true },
                      { label: 'Departamento', field: 'departamento' },
                      { label: 'País', field: 'pais' }
                    ].map(({ label, field, type, full }) => (
                      <label key={field} style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, gridColumn: full ? '1 / -1' : 'auto' }}>
                        {label}
                        <input
                          type={type || 'text'}
                          value={newClientDraft.contact[field] || ''}
                          onChange={(event) => handleNewClientContactChange(field, event.target.value)}
                          style={{
                            marginTop: 6,
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid #e5e7eb'
                          }}
                        />
                      </label>
                    ))}
                    <label style={{ gridColumn: '1 / -1', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Estado del contacto
                      <select
                        value={newClientDraft.contact.status}
                        onChange={(event) => handleNewClientContactChange('status', event.target.value)}
                        style={{
                          marginTop: 6,
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <option value="activo">Activo</option>
                        <option value="bloqueado">Bloqueado</option>
                      </select>
                    </label>
                  </div>
                </div>
              ) : newClientStep === 1 ? (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Familiares</h4>
                  {loadingSuggestions ? (
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Buscando familiares...</div>
                  ) : familiarSuggestions.length > 0 ? (
                    <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                      {familiarSuggestions.map((suggestion) => (
                        <div key={suggestion.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                              {[suggestion.nombre, suggestion.apellido].filter(Boolean).join(' ') || 'Sin nombre'}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              {suggestion.telefono || suggestion.celular || '-'}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
                              {suggestion.relation || suggestion.relacion || 'familiar'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSuggestedFamiliar(suggestion)}
                            style={{ border: 'none', background: '#1A5C4A', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            + Agregar
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleAddFamiliar}
                    style={{ border: 'none', background: '#1A5C4A', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}
                  >
                    + Agregar familiar
                  </button>
                  {!newClientDraft.familiares.length ? (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Sin familiares agregados.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {newClientDraft.familiares.map((fam, idx) => (
                        <div key={fam.id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Familiar {idx + 1}</div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFamiliar(fam.id)}
                              style={{ border: 'none', background: 'transparent', color: '#b91c1c', fontSize: 12, cursor: 'pointer' }}
                            >
                              Quitar
                            </button>
                          </div>
                          <div className="new-client-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                            {[
                              { label: 'Nombre', field: 'nombre' },
                              { label: 'Apellido', field: 'apellido' },
                              { label: 'Documento', field: 'documento' },
                              { label: 'Teléfono', field: 'telefono' },
                              { label: 'Celular', field: 'celular' },
                              { label: 'Fecha de nacimiento', field: 'fecha_nacimiento', type: 'date' },
                              { label: 'Dirección', field: 'direccion', full: true }
                            ].map(({ label, field }) => (
                              <label key={field} style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, gridColumn: field === 'direccion' ? '1 / -1' : 'auto' }}>
                                {label}
                                <input
                                  type={field === 'fecha_nacimiento' ? 'date' : 'text'}
                                  value={field === 'fecha_nacimiento' ? toDateInput(fam[field]) : (fam[field] || '')}
                                  onChange={(event) => handleFamiliarChange(fam.id, field, event.target.value)}
                                  style={{ marginTop: 6, width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #e5e7eb' }}
                                />
                              </label>
                            ))}
                            <label style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                              Relación
                              <select
                                value={fam.relacion || ''}
                                onChange={(event) => handleFamiliarChange(fam.id, 'relacion', event.target.value)}
                                style={{ marginTop: 6, width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff' }}
                              >
                                <option value="">Seleccionar...</option>
                                {relationOptions.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : newClientStep === 2 ? (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Productos por contacto</h4>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[{ key: 'principal', label: [newClientDraft.contact.nombre, newClientDraft.contact.apellido].filter(Boolean).join(' ') || 'Contacto principal' }, ...newClientDraft.familiares.map((fam) => ({
                      key: fam.id,
                      label: [fam.nombre, fam.apellido].filter(Boolean).join(' ') || 'Familiar'
                    }))].map((item) => (
                      <div key={item.key} style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{item.label}</div>
                        <select
                          value={newClientDraft.productsByContact[item.key] || ''}
                          onChange={(event) => handleProductSelection(item.key, event.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff' }}
                        >
                          <option value="">Seleccionar producto...</option>
                          {productsCatalog.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.nombre} · {formatCurrency(product.precio || 0)} {product.moneda || 'UYU'}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {newClientError ? (
                    <p style={{ marginTop: 10, color: '#b91c1c', fontSize: 12 }}>{newClientError}</p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Resumen de venta</h4>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Se van a gestionar {1 + newClientDraft.familiares.length} ventas
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1px solid rgba(15, 118, 110, 0.65)',
                      background: 'rgba(15, 118, 110, 0.08)'
                    }}>
                      <div>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Usuario logueado</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{[authUser?.nombre, authUser?.apellido].filter(Boolean).join(' ') || authUser?.email || 'Usuario'}</div>
                        {authUser?.email ? <div style={{ fontSize: 12, color: '#94a3b8' }}>{authUser.email}</div> : null}
                      </div>
                    </label>

                    <div style={{
                      display: 'grid',
                      gap: 8,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1px solid #e5e7eb',
                      background: '#fff'
                    }}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Medio de pago</div>
                      <select
                        value={newClientDraft.sale.medioPago}
                        onChange={(event) => handleSalePaymentChange(event.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          background: '#fff'
                        }}
                      >
                        {[
                          { value: 'abitab', label: 'ABITAB' },
                          { value: 'ajupen', label: 'AJUPEN' },
                          { value: 'ajupen_anp', label: 'AJUPEN ANP' },
                          { value: 'anjuped', label: 'ANJUPED' },
                          { value: 'antel', label: 'ANTEL' },
                          { value: 'cabal', label: 'Cabal' },
                          { value: 'creditel', label: 'Creditel' },
                          { value: 'credito', label: 'Crédito' },
                          { value: 'debito', label: 'Débito' },
                          { value: 'efectivo', label: 'Efectivo' },
                          { value: 'master', label: 'MASTER' },
                          { value: 'mastercard', label: 'MASTERCARD' },
                          { value: 'mercado_pago', label: 'Mercado Pago' },
                          { value: 'mi_dinero', label: 'Mi dinero' },
                          { value: 'oca', label: 'OCA' },
                          { value: 'pass_card', label: 'PASS CARD' },
                          { value: 'transferencia', label: 'Transferencia' },
                          { value: 'visa', label: 'VISA' }
                        ].map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <label style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Cédula de identidad de cobranza
                      <input
                        type="text"
                        placeholder="Ingresar cédula"
                        value={newClientDraft.sale.cobranzaDocumento}
                        onChange={(event) => handleCobranzaDocumentoChange(event.target.value)}
                        style={{ marginTop: 6, width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #e5e7eb' }}
                      />
                    </label>
                  </div>
                  {newClientError ? (
                    <p style={{ marginTop: 10, color: '#b91c1c', fontSize: 12 }}>{newClientError}</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="new-client-actions new-client-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              {newClientStep > 0 ? (
                <button
                  type="button"
                  onClick={() => setNewClientStep((prev) => Math.max(0, prev - 1))}
                  className="new-client-action"
                  style={{
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    padding: '10px 18px',
                    borderRadius: 999,
                    cursor: 'pointer'
                  }}
                >
                  Atrás
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onClose && onClose()}
                className="new-client-action"
                style={{
                  border: '1px solid #cbd5f5',
                  background: '#fff',
                  padding: '10px 18px',
                  borderRadius: 999,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newClientStep < 3) {
                    setNewClientStep((prev) => Math.min(3, prev + 1));
                    return;
                  }
                  handleSaveNewClient();
                }}
                disabled={newClientSaving || (newClientStep === 2 && (!newClientDraft.productsByContact.principal || Object.keys(newClientDraft.productsByContact).length < (1 + newClientDraft.familiares.length)))}
                className="new-client-action"
                style={{
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#fff',
                  padding: '10px 22px',
                  borderRadius: 999,
                  cursor: newClientSaving || (newClientStep === 2 && (!newClientDraft.productsByContact.principal || Object.keys(newClientDraft.productsByContact).length < (1 + newClientDraft.familiares.length))) ? 'not-allowed' : 'pointer',
                  opacity: newClientSaving || (newClientStep === 2 && (!newClientDraft.productsByContact.principal || Object.keys(newClientDraft.productsByContact).length < (1 + newClientDraft.familiares.length))) ? 0.65 : 1
                }}
                >
                  {newClientStep < 3 ? 'Siguiente' : (newClientSaving ? 'Guardando...' : 'Finalizar venta')}
                </button>
            </div>
          </div>
        </>
      );
    }

      function SuperadminModule({ route }) {
        const [imports, setImports] = React.useState([]);
        const [importsPage, setImportsPage] = React.useState(1);
        const [importsType, setImportsType] = React.useState('todos');
        const [importsSearch, setImportsSearch] = React.useState('');
        const [importsMeta, setImportsMeta] = React.useState({ page: 1, totalPages: 1, total: 0, pageSize: 8 });
        const [importsLoading, setImportsLoading] = React.useState(false);
        const [importsError, setImportsError] = React.useState('');
        const [importSuccess, setImportSuccess] = React.useState('');
        const [importReport, setImportReport] = React.useState(null);
        const [showImportRows, setShowImportRows] = React.useState(false);
        const [importRows, setImportRows] = React.useState([]);
        const [importRowsLoading, setImportRowsLoading] = React.useState(false);
        const [importRowsError, setImportRowsError] = React.useState('');
        const [importDeleteTarget, setImportDeleteTarget] = React.useState(null);
        const [importDeleteLoading, setImportDeleteLoading] = React.useState(false);
        const [importDeleteToast, setImportDeleteToast] = React.useState('');
        const importDeleteToastRef = React.useRef(null);
      const [importRowsBatchId, setImportRowsBatchId] = React.useState(null);
      const [noCallJob, setNoCallJob] = React.useState(null);
        const [products, setProducts] = React.useState([]);
        const [productsLoading, setProductsLoading] = React.useState(false);
        const [productsError, setProductsError] = React.useState('');
        const [productDraft, setProductDraft] = React.useState({
          nombre: '',
          categoria: '',
          descripcion: '',
          observaciones: '',
          precio: '',
          activo: true
        });
        const [users, setUsers] = React.useState(SUPERADMIN_USERS_SEED);
        const [showImportFlow, setShowImportFlow] = React.useState(false);
      const [importDraft, setImportDraft] = React.useState({ fileName: '', csvText: '' });
      const [preview, setPreview] = React.useState(null);
      const [previewLoading, setPreviewLoading] = React.useState(false);
      const [previewBatchId, setPreviewBatchId] = React.useState(null);
      const [createProductsOnImport, setCreateProductsOnImport] = React.useState(false);
      const [importSubmitting, setImportSubmitting] = React.useState(false);
      const [importDebug, setImportDebug] = React.useState({
        endpoint: '',
        payload: null,
        batchId: null,
        response: null,
        error: null
      });
      const isDevEnv = Boolean(import.meta?.env?.DEV);

      const resolvedBatchId = previewBatchId || preview?.batchId || preview?.batch_id || null;
      const importPollRef = React.useRef(null);

      const IMPORT_STATUS_LABELS = {
        queued: 'En cola',
        processing: 'Procesando',
        completed: 'Completada',
        failed: 'Fallida'
      };
      const IMPORT_STATUS_VARIANTS = {
        queued: 'info',
        processing: 'warning',
        completed: 'success',
        failed: 'danger'
      };
      const isActiveImportStatus = (statusKey) => statusKey === 'queued' || statusKey === 'processing';
      const normalizeImportStatus = (raw) => {
        const key = String(raw || '').toLowerCase();
        if (IMPORT_STATUS_LABELS[key]) return key;
        if (key.includes('process')) return 'processing';
        if (key.includes('queue')) return 'queued';
        if (key.includes('fail') || key.includes('error')) return 'failed';
        if (key.includes('complete') || key.includes('ok')) return 'completed';
        return 'queued';
      };
      const formatImportRow = (row = {}) => {
        const statusKey = normalizeImportStatus(row.status || row.estado);
        const totalRows = Number(row.total_rows ?? row.totalRegistros ?? row.total ?? 0);
        const insertedRows = Number(row.inserted_rows ?? row.importados ?? 0);
        const skippedRows = Number(row.skipped_rows ?? row.rechazados ?? 0);
        const processedRows = Number(row.processed_rows ?? row.procesados ?? insertedRows ?? 0);
        const progressPercent = row.progress_percent ?? row.progressPercent ?? row.pct_progress ?? null;
        return {
          id: row.id || row.job_id || row.jobId || row.batchId || row.batch_id || row.nombreArchivo || row.file_name,
          fileName: row.file_name || row.nombreArchivo || row.archivo || '—',
          importType: row.import_type || row.tipo || row.importType || '',
          importTypeLabel: row.import_type_label || row.importTypeLabel || row.tipo_label || row.tipo || '—',
          createdAt: row.created_at || row.fecha || '',
          totalRows,
          insertedRows,
          skippedRows,
          processedRows,
          progressPercent: progressPercent !== null && progressPercent !== undefined ? Number(progressPercent) : null,
          statusKey,
          statusLabel: IMPORT_STATUS_LABELS[statusKey] || row.estado || row.status || 'En cola',
          statusVariant: IMPORT_STATUS_VARIANTS[statusKey] || 'info',
          createdBy: row.created_by_name || row.usuario || row.usuarioId || '—',
          errorMessage: row.error_message || row.error || row.mensaje_error || ''
        };
      };
      const formatImportDate = (value) => {
        if (!value) return '—';
        try {
          return new Date(value).toLocaleString('es-UY', {
            day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'
          });
        } catch {
          return value;
        }
      };

      const showImportDeleteToast = React.useCallback((message) => {
        setImportDeleteToast(message);
        if (importDeleteToastRef.current) {
          clearTimeout(importDeleteToastRef.current);
        }
        importDeleteToastRef.current = setTimeout(() => {
          setImportDeleteToast('');
        }, 4200);
      }, []);

      React.useEffect(() => () => {
        if (importDeleteToastRef.current) {
          clearTimeout(importDeleteToastRef.current);
          importDeleteToastRef.current = null;
        }
      }, []);

      const resolveImportId = React.useCallback((row = {}) => (
        row.id || row.batchId || row.batch_id || row.jobId || row.job_id || null
      ), []);

      const resolveImportTypeKey = React.useCallback((row = {}) => {
        const rawType = row.importType || row.tipo || row.import_type || row.tipoImportacion || row.tipo_key || '';
        const normalized = String(rawType || '').toLowerCase();
        if (IMPORT_TYPES[normalized]) return normalized;
        if (normalized.includes('no') && normalized.includes('llamar')) return 'no_llamar';
        if (normalized.includes('dato') && normalized.includes('trabajar')) return 'datos_para_trabajar';
        if (normalized.includes('result')) return 'resultados';
        if (normalized.includes('cliente')) return 'clientes';
        const label = row.importTypeLabel || row.tipoLabel || row.tipo_label || '';
        const normalizedLabel = String(label || '').toLowerCase();
        if (normalizedLabel.includes('no llamar')) return 'no_llamar';
        if (normalizedLabel.includes('datos')) return 'datos_para_trabajar';
        if (normalizedLabel.includes('result')) return 'resultados';
        if (normalizedLabel.includes('cliente')) return 'clientes';
        return '';
      }, []);

      const resolveImportStatusLabel = React.useCallback((row = {}) => (
        row.estado || row.statusLabel || row.status || row.estadoLabel || ''
      ), []);

      const canDeleteImport = React.useCallback((row = {}) => {
        const id = resolveImportId(row);
        if (!id) return false;
        const statusLabel = String(resolveImportStatusLabel(row) || '').toLowerCase();
        const allowedStatuses = ['validada', 'con observaciones', 'completada', 'fallida'];
        if (!allowedStatuses.includes(statusLabel)) return false;
        if (statusLabel === 'en proceso' || statusLabel === 'en cola') return false;
        const typeKey = resolveImportTypeKey(row);
        return ['clientes', 'datos_para_trabajar', 'no_llamar'].includes(typeKey);
      }, [resolveImportId, resolveImportStatusLabel, resolveImportTypeKey]);

      const openImportDeleteModal = React.useCallback((row) => {
        if (!row) return;
        const id = resolveImportId(row);
        const typeKey = resolveImportTypeKey(row);
        setImportDeleteTarget({ row, id, typeKey });
      }, [resolveImportId, resolveImportTypeKey]);

      const closeImportDeleteModal = React.useCallback(() => {
        if (importDeleteLoading) return;
        setImportDeleteTarget(null);
      }, [importDeleteLoading]);

      const confirmImportDelete = React.useCallback(async () => {
        if (!importDeleteTarget?.id || !importDeleteTarget?.typeKey) {
          closeImportDeleteModal();
          return;
        }
        setImportDeleteLoading(true);
        try {
          const result = await deleteImportById({ id: importDeleteTarget.id, importType: importDeleteTarget.typeKey });
          if (result?.ok) {
            setImports((prev) => prev.filter((item) => String(resolveImportId(item)) !== String(importDeleteTarget.id)));
            setImportsMeta((prev) => ({
              ...prev,
              total: Math.max(0, Number(prev.total || 0) - 1)
            }));
            setImportDeleteTarget(null);
          }
        } catch (error) {
          showImportDeleteToast(error?.message || 'No se pudo eliminar la importación.');
        } finally {
          setImportDeleteLoading(false);
        }
      }, [importDeleteTarget, resolveImportId, closeImportDeleteModal, showImportDeleteToast]);

      React.useEffect(() => {
        const nextBatchId = preview?.batchId || preview?.batch_id || null;
        if (nextBatchId) setPreviewBatchId(nextBatchId);
      }, [preview]);

      const loadImports = React.useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
          setImportsLoading(true);
          setImportsError('');
        }
        try {
          const result = await listImports({ page: importsPage, pageSize: 8, search: importsSearch, importType: importsType, status: '' });
          const items = Array.isArray(result?.items)
            ? result.items
            : Array.isArray(result?.data?.items)
              ? result.data.items
              : Array.isArray(result?.data?.imports)
                ? result.data.imports
                : Array.isArray(result?.imports)
                  ? result.imports
                  : Array.isArray(result?.data)
                    ? result.data
                    : [];
          const nextRows = items.map(formatImportRow);
          setImports((prev) => {
            const prevActive = prev.filter((row) => isActiveImportStatus(row.statusKey));
            const nextIds = new Set(nextRows.map((row) => String(row.id)));
            const merged = [
              ...prevActive.filter((row) => !nextIds.has(String(row.id))),
              ...nextRows
            ];
            return merged;
          });
          setImportsMeta({
            page: result?.data?.page || result.page || 1,
            pageSize: result?.data?.pageSize || result.pageSize || 8,
            total: result?.data?.total || result.total || Math.max(items.length, 1),
            totalPages: result?.data?.totalPages || result.totalPages || 1
          });
        } catch (err) {
          if (!silent) {
            setImportsError(err.message || 'No se pudo cargar el historial de importaciones.');
          }
        } finally {
          if (!silent) {
            setImportsLoading(false);
          }
        }
      }, [importsPage, importsSearch, importsType]);

      React.useEffect(() => {
        const hasActiveJobs = imports.some((row) => isActiveImportStatus(row.statusKey));
        if (!hasActiveJobs) {
          if (importPollRef.current) {
            clearInterval(importPollRef.current);
            importPollRef.current = null;
          }
          return;
        }
        if (importPollRef.current) return;
        importPollRef.current = setInterval(() => {
          loadImports({ silent: true });
        }, 4000);
        return () => {
          if (importPollRef.current) {
            clearInterval(importPollRef.current);
            importPollRef.current = null;
          }
        };
      }, [imports, loadImports]);

      React.useEffect(() => {
        if (route !== 'sa_importaciones') return;
        loadImports();
      }, [route, loadImports]);

      React.useEffect(() => {
        if (!importReport) return undefined;
        const timer = window.setTimeout(() => {
          setImportReport(null);
        }, 9000);
        return () => window.clearTimeout(timer);
      }, [importReport]);

      React.useEffect(() => {
        if (!noCallJob?.jobId) return undefined;
        let cancelled = false;
        const poll = async () => {
          try {
            const job = await getNoCallImportJob(noCallJob.jobId);
            if (!job || cancelled) return;
            setNoCallJob((prev) => ({ ...prev, ...job }));
            if (job.status === 'completed' || job.status === 'failed') {
              setNoCallJob(null);
              setImportSuccess(job.status === 'completed' ? 'Importación No llamar completada.' : 'Importación No llamar fallida.');
              setImportReport({
                productosDetectados: 0,
                productosCreados: 0,
                vendedoresDetectados: 0,
                mediosPagoDetectados: 0,
                clientesNuevos: 0,
                noCall: {
                  total: job.total,
                  inserted: job.inserted,
                  skipped: job.skipped
                }
              });
              await loadImports();
            }
          } catch (err) {
            console.error('NO_CALL_JOB_POLL_ERROR', err);
          }
        };

        const timer = window.setInterval(poll, 1500);
        poll();
        return () => {
          cancelled = true;
          window.clearInterval(timer);
        };
      }, [noCallJob?.jobId, loadImports]);

      const openImportRows = async (batchId) => {
        if (!batchId) return;
        setShowImportRows(true);
        setImportRowsBatchId(batchId);
        setImportRows([]);
        setImportRowsError('');
        setImportRowsLoading(true);
        try {
          const items = await getImportRows(batchId);
          setImportRows(items);
        } catch (err) {
          setImportRowsError(err?.message || 'No se pudo cargar el detalle del batch.');
        } finally {
          setImportRowsLoading(false);
        }
      };

      const loadProducts = React.useCallback(async () => {
        setProductsLoading(true);
        setProductsError('');
        try {
          const items = await listProductsAsync();
          setProducts(items);
        } catch (err) {
          setProductsError(err.message || 'No se pudo cargar el catálogo de productos.');
        } finally {
          setProductsLoading(false);
        }
      }, []);

      React.useEffect(() => {
        if (route !== 'sa_productos') return;
        loadProducts();
      }, [route, loadProducts]);

      const handleProductDraftChange = (field, value) => {
        setProductDraft((prev) => ({ ...prev, [field]: value }));
      };

      const handleSaveProduct = async () => {
        if (!productDraft.nombre.trim()) {
          setProductsError('El nombre del producto es obligatorio.');
          return;
        }
        setProductsError('');
        try {
          const payload = {
            nombre: productDraft.nombre.trim(),
            categoria: productDraft.categoria.trim(),
            descripcion: productDraft.descripcion.trim(),
            observaciones: productDraft.observaciones.trim(),
            precio: Number(productDraft.precio || 0),
            activo: productDraft.activo
          };
          const created = await createProduct(payload);
          setProducts((prev) => [created, ...prev]);
          setProductDraft({ nombre: '', categoria: '', descripcion: '', observaciones: '', precio: '', activo: true });
        } catch (err) {
          setProductsError(err.message || 'No se pudo guardar el producto.');
        }
      };

      const toggleProductState = async (id) => {
        const current = products.find((item) => item.id === id);
        if (!current) return;
        try {
          const updated = await updateProduct(id, { activo: !current.activo });
          setProducts((prev) => prev.map((item) => (item.id === id ? updated : item)));
        } catch (err) {
          setProductsError(err.message || 'No se pudo actualizar el producto.');
        }
      };

      const resetImportFlow = () => {
        setImportDraft({ fileName: '', csvText: '' });
        setPreview(null);
        setPreviewLoading(false);
        setPreviewBatchId(null);
        setCreateProductsOnImport(false);
      };

      const handleCsvFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const csvText = await file.text();
          setImportDraft({ fileName: file.name, csvText });
          setPreview(null);
          setPreviewBatchId(null);
          setCreateProductsOnImport(false);
        } catch (err) {
          // No-op: evitar mensajes pegados en UI; revisar consola si falla lectura.
          console.error('CSV_READ_ERROR', err);
        }
      };

      const downloadImportExampleCsv = React.useCallback(() => {
        setImportsError('');
        getApiClient()
          .get('/imports/sample?type=clientes')
          .then((csvText) => {
            if (!csvText || typeof csvText !== 'string') {
              throw new Error('Respuesta inválida del servidor.');
            }
            downloadCsvFile(csvText, 'importacion-clientes-ejemplo.csv');
          })
          .catch((err) => {
            setImportsError(err?.message || 'No se pudo descargar el CSV de ejemplo.');
          });
      }, []);

      const validatePreview = async () => {
        setPreview(null);
        setPreviewLoading(true);
        try {
          const result = await previewCsvText(importDraft.csvText, { fileName: importDraft.fileName });
          setPreview(result);
          setPreviewBatchId(result?.batchId || result?.batch_id || null);
          setCreateProductsOnImport(false);
          console.log('[import-preview]', {
            batchId: result?.batchId,
            usesBackend: result?.usesBackend,
            summary: result?.summary
          });
        } catch (err) {
          console.error('CSV_VALIDATE_ERROR', err);
        } finally {
          setPreviewLoading(false);
        }
      };

      const confirmImport = async () => {
        if (importSubmitting) return;
        setImportSubmitting(true);
        setImportSuccess('');
        try {
          let batchIdToUse = resolvedBatchId;
          const payload = {
            fileName: importDraft.fileName,
            csvText: importDraft.csvText,
            userId: 'usr-001',
            batchId: batchIdToUse,
            createProducts: createProductsOnImport,
            importType: importDraft.importType
          };
          setImportDebug((prev) => ({
            ...prev,
            endpoint: importDraft.importType === 'no_llamar'
              ? '/imports/no-llamar/jobs'
              : importDraft.importType === 'resultados'
              ? '/imports/phone-results'
              : importDraft.importType === 'datos_para_trabajar'
              ? '/imports/datos-para-trabajar'
              : '/imports/clients',
            payload,
            error: null
          }));
          if (preview?.usesBackend && !batchIdToUse) {
            const fresh = await previewCsvText(importDraft.csvText, { fileName: importDraft.fileName });
            setPreview(fresh);
            batchIdToUse = fresh?.batchId || fresh?.batch_id || null;
            if (batchIdToUse) setPreviewBatchId(batchIdToUse);
          }
          const result = await createImportFromCsv({ ...payload, batchId: batchIdToUse });
          setImportDebug((prev) => ({
            ...prev,
            response: result,
            batchId: result?.job?.id || result?.jobId || result?.job_id || result?.id || batchIdToUse || null
          }));
          if (result?.asyncJob && result?.jobId) {
            setNoCallJob({ jobId: result.jobId, status: 'queued' });
            setImportSuccess('Importación registrada correctamente.');
            const optimisticRow = formatImportRow(result?.job || {
              id: result.jobId,
              file_name: result?.nombreArchivo || importDraft.fileName,
              import_type: result?.importType || preview?.importType || 'no_llamar',
              import_type_label: result?.importTypeLabel || preview?.importTypeLabel || 'No llamar',
              created_at: new Date().toISOString(),
              total_rows: preview?.summary?.total || 0,
              inserted_rows: 0,
              skipped_rows: 0,
              processed_rows: 0,
              status: 'queued',
              created_by_name: result?.createdByName || '—'
            });
            setImports((prev) => [optimisticRow, ...prev.filter((row) => row.id !== optimisticRow.id)]);
            setShowImportFlow(false);
            resetImportFlow();
            await loadImports({ silent: true });
            return;
          }
          if (result?.report) setImportReport(result.report);
          setImportSuccess('Importación registrada correctamente.');
          setShowImportFlow(false);
          resetImportFlow();
          await loadImports({ silent: true });
        } catch (err) {
          console.error('CSV_IMPORT_ERROR', err);
          setImportDebug((prev) => ({ ...prev, error: err?.message || String(err || 'Error') }));
          setImportsError('No se pudo crear la importación. Revisa el archivo e intenta nuevamente.');
        } finally {
          setImportSubmitting(false);
        }
      };

      const globalMetrics = [
        { title: 'Ventas del día', value: '26', change: 8.1, label: 'últimas 24h', trend: 'up', icon: TrendingUp, bg: 'rgba(22,163,74,0.12)', color: '#15803d' },
        { title: 'Tickets abiertos', value: '17', change: -4.0, label: 'mesa de ayuda', trend: 'up', icon: Headphones, bg: 'rgba(37,99,235,0.12)', color: '#2563eb' },
        { title: 'Casos en operaciones', value: '12', change: 2.2, label: 'en curso', trend: 'up', icon: Briefcase, bg: 'rgba(217,119,6,0.12)', color: '#d97706' },
        { title: 'Seguimientos pendientes', value: '41', change: -3.2, label: 'comercial', trend: 'up', icon: Calendar, bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' },
        { title: 'Usuarios activos', value: '23', change: 4.4, label: 'sesiones abiertas', trend: 'up', icon: Users, bg: 'rgba(15,118,110,0.12)', color: '#0f766e' },
        { title: 'Lotes activos', value: '6', change: 0.0, label: 'en gestión', trend: 'up', icon: Layers, bg: 'rgba(20,34,53,0.12)', color: '#1f2937' }
      ];

      const toggleUserState = (email) => {
        setUsers((prev) => prev.map((item) => item.email === email ? { ...item, estado: item.estado === 'Activo' ? 'Inactivo' : 'Activo' } : item));
      };

      if (route === 'sa_importaciones') {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel
                className="span-12"
                title="Importaciones"
                subtitle="Carga masiva de clientes por CSV"
                action={
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button variant="ghost" icon={<Download size={16} />} onClick={downloadImportExampleCsv}>
                      Descargar ejemplo CSV
                    </Button>
                    <Button icon={<Upload size={16} />} onClick={() => { setShowImportFlow(true); setImportSuccess(''); resetImportFlow(); }}>
                      Importar CSV
                    </Button>
                  </div>
                }
              >
                  <div className="toolbar" style={{ marginBottom: 12 }}>
                    <div className="searchbox" style={{ maxWidth: 360 }}>
                      <Search size={18} color="#69788d" />
                      <input
                        value={importsSearch}
                        onChange={(event) => { setImportsPage(1); setImportsSearch(event.target.value); }}
                        placeholder="Buscar por archivo..."
                      />
                    </div>
                    <select
                      className="input"
                      style={{ width: 220 }}
                      value={importsType}
                      onChange={(event) => { setImportsPage(1); setImportsType(event.target.value); }}
                    >
                      <option value="todos">Todos los tipos</option>
                      {Object.values(IMPORT_TYPES).map((item) => (
                        <option key={item.key} value={item.key}>{item.label}</option>
                      ))}
                    </select>
                    <Button variant="secondary" icon={<Filter size={16} />} onClick={loadImports}>Aplicar</Button>
                    {importSuccess ? <span className="pill" style={{ color: '#15803d' }}>{importSuccess}</span> : null}
            </div>
            {importDeleteToast ? (
              <div style={{
                position: 'fixed',
                right: 24,
                bottom: 24,
                zIndex: 40,
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid rgba(239,68,68,0.4)',
                padding: '12px 16px',
                borderRadius: 12,
                boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
                fontWeight: 600
              }}>
                {importDeleteToast}
              </div>
            ) : null}
            {importReport ? (
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)', background: 'rgba(248,250,252,0.9)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Informe final</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: '0.9rem' }}>
                      <div>Productos detectados: <strong>{importReport.productosDetectados ?? 0}</strong></div>
                      <div>Productos creados: <strong>{importReport.productosCreados ?? 0}</strong></div>
                      <div>Vendedores detectados: <strong>{importReport.vendedoresDetectados ?? 0}</strong></div>
                      <div>Medios de pago detectados: <strong>{importReport.mediosPagoDetectados ?? 0}</strong></div>
                      <div>Clientes nuevos: <strong>{importReport.clientesNuevos ?? 0}</strong></div>
                    </div>
                  </div>
                ) : null}
                {importsLoading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando historial de importaciones...</div> : null}
                {importsError ? (
                  <div className="toolbar" style={{ marginBottom: 12 }}>
                    <span style={{ color: '#be123c', fontWeight: 700 }}>{importsError}</span>
                    <Button variant="secondary" onClick={loadImports}>Reintentar</Button>
                  </div>
                ) : null}
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Archivo</th><th>Tipo</th><th>Fecha</th><th>Total</th><th>Importados</th><th>Rechazados</th><th>Estado</th><th>Usuario</th><th>Detalle</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {imports.map((row) => (
                        <tr key={row.id}>
                          <td><strong>{row.fileName}</strong><div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{row.id}</div></td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span>{row.importTypeLabel}</span>
                              {isDevEnv && row.importType ? (
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>{row.importType}</span>
                              ) : null}
                            </div>
                          </td>
                          <td>{formatImportDate(row.createdAt)}</td>
                          <td>{row.totalRows}</td>
                          <td style={{ color: '#15803d', fontWeight: 700 }}>{row.insertedRows}</td>
                          <td style={{ color: row.skippedRows ? '#b45309' : 'var(--muted)', fontWeight: 700 }}>{row.skippedRows}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <Tag variant={row.statusVariant}>{row.statusLabel}</Tag>
                              {row.statusKey === 'processing' && (
                                <div style={{ fontSize: 11, color: '#666' }}>
                                  {row.totalRows
                                    ? `${row.processedRows} / ${row.totalRows} (${Math.round((row.processedRows / Math.max(row.totalRows, 1)) * 100)}%)`
                                    : (row.progressPercent !== null && row.progressPercent !== undefined
                                      ? `${Math.round(row.progressPercent)}%`
                                      : (row.processedRows ? `${row.processedRows} procesadas` : 'Procesando...'))}
                                  {row.totalRows || row.progressPercent !== null ? (
                                    <div style={{ marginTop: 4, height: 4, background: '#F1F5F9', borderRadius: 999 }}>
                                      <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, Math.round(row.totalRows
                                          ? (row.processedRows / Math.max(row.totalRows, 1)) * 100
                                          : (row.progressPercent || 0)))}%`,
                                        background: '#60A5FA',
                                        borderRadius: 999
                                      }} />
                                    </div>
                                  ) : null}
                                </div>
                              )}
                              {row.statusKey === 'failed' ? (
                                <div style={{ fontSize: 11, color: '#b91c1c' }}>
                                  <div>La importación se creó, pero falló el procesamiento.</div>
                                  {row.errorMessage ? (
                                    <div style={{ marginTop: 4 }}>
                                      <span style={{ color: '#7f1d1d' }}>Detalle:</span> {row.errorMessage}
                                    </div>
                                  ) : null}
                                  {row.id ? (
                                    <div style={{ marginTop: 4, color: '#991b1b' }}>BatchId: {row.id}</div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td>{row.createdBy}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <Button variant="ghost" onClick={() => openImportRows(row.id)}>Ver detalles</Button>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  const payload = [
                                    `fileName: ${row.fileName}`,
                                    `importType: ${row.importType || row.importTypeLabel}`,
                                    `endpoint: /imports`,
                                    `batchId: ${row.id || '—'}`,
                                    `status: ${row.statusKey}`,
                                    `error: ${row.errorMessage || '—'}`
                                  ].join('\n');
                                  if (navigator?.clipboard?.writeText) {
                                    navigator.clipboard.writeText(payload);
                                  }
                                }}
                              >
                                Copiar diagnóstico
                              </Button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {canDeleteImport(row) ? (
                              <button
                                type="button"
                                onClick={() => openImportDeleteModal(row)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 12px',
                                  borderRadius: 999,
                                  border: '1px solid rgba(248,113,113,0.4)',
                                  background: 'rgba(248,113,113,0.15)',
                                  color: '#b91c1c',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={14} />
                                Eliminar
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!importsLoading && !imports.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay importaciones para los filtros aplicados.</div> : null}
                </div>
                <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                  <span className="pill">Página {importsMeta.page} de {importsMeta.totalPages} · {importsMeta.total} registros</span>
                  <div className="toolbar">
                    <Button variant="ghost" onClick={() => setImportsPage((p) => Math.max(1, p - 1))} disabled={importsMeta.page <= 1}>Anterior</Button>
                    <Button variant="ghost" onClick={() => setImportsPage((p) => Math.min(importsMeta.totalPages, p + 1))} disabled={importsMeta.page >= importsMeta.totalPages}>Siguiente</Button>
                  </div>
                </div>

                {showImportFlow ? (
                  <div className="lot-wizard-overlay" onClick={() => setShowImportFlow(false)}>
                    <div className="lot-wizard" onClick={(event) => event.stopPropagation()}>
                      <div className="lot-wizard-header">
                        <div><h3>Importar clientes</h3><p>Carga, validación previa y confirmación.</p></div>
                        <button className="icon-button" style={{ width: 36, height: 36 }} onClick={() => setShowImportFlow(false)}><X size={16} color="#152235" /></button>
                      </div>
                      <div className="lot-step">
                        <span className="lot-step-index">1</span>
                        <div style={{ flex: 1 }}>
                          <h4>Subir archivo CSV</h4>
                          <input className="input" type="file" accept=".csv" onChange={handleCsvFile} style={{ marginTop: 8 }} />
                          <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: '0.85rem' }}>{importDraft.fileName || 'Sin archivo seleccionado'}</div>
                        </div>
                      </div>
                      <div className="lot-step">
                        <span className="lot-step-index">2</span>
                        <div style={{ flex: 1 }}>
                          <h4>Validación previa</h4>
                          <p>Columnas obligatorias: <strong>documento</strong>.</p>
                          <div className="toolbar" style={{ marginTop: 8 }}>
                            <Button variant="secondary" onClick={validatePreview} disabled={!importDraft.csvText || previewLoading}>
                              {previewLoading ? 'Validando...' : 'Validar archivo'}
                            </Button>
                          </div>
                          {preview ? (
                            <div style={{ marginTop: 10, padding: 10, border: '1px solid rgba(20,34,53,0.08)', borderRadius: 12, background: 'rgba(20,34,53,0.03)' }}>
                              <div style={{ fontWeight: 700 }}>Preview</div>
                              <div style={{ color: 'var(--muted)' }}>
                                Total: {preview.summary.total} · Importables: {preview.summary.importados} · Rechazados: {preview.summary.rechazados}
                              </div>
                              {preview.skippedEmptyRows ? (
                                <div style={{ marginTop: 6, color: '#64748b', fontSize: '0.85rem' }}>
                                  Filas vacías ignoradas: {preview.skippedEmptyRows}
                                </div>
                              ) : null}
                              {preview.rejectedMissingDocumento ? (
                                <div style={{ marginTop: 6, color: '#b45309', fontSize: '0.85rem' }}>
                                  Rechazados por documento vacío: {preview.rejectedMissingDocumento}
                                </div>
                              ) : null}
                              {preview.newProductsCount ? (
                                <div style={{ marginTop: 8, padding: 10, borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)', background: '#fff7ed' }}>
                                  <div style={{ fontWeight: 700, color: '#9a3412' }}>
                                    Productos nuevos detectados: {preview.newProductsCount}
                                  </div>
                                  <div style={{ marginTop: 6, color: '#7c2d12', fontSize: '0.85rem' }}>
                                    {preview.newProducts.slice(0, 6).join(', ')}{preview.newProducts.length > 6 ? '…' : ''}
                                  </div>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: '0.85rem', color: '#7c2d12' }}>
                                    <input
                                      type="checkbox"
                                      checked={createProductsOnImport}
                                      onChange={(event) => setCreateProductsOnImport(event.target.checked)}
                                    />
                                    Crear productos faltantes al importar
                                  </label>
                                </div>
                              ) : null}
                              {preview.usesBackend && !(previewBatchId || preview?.batchId || preview?.batch_id) ? (
                                <div style={{ marginTop: 8, color: '#b91c1c', fontWeight: 700 }}>
                                  La validación no devolvió `batchId`. Revisá que el backend sea el correcto y esté actualizado.
                                </div>
                              ) : null}
                              {preview.rowErrors.length ? (
                                <div style={{ marginTop: 8, maxHeight: 120, overflow: 'auto' }}>
                                  {preview.rowErrors.slice(0, 5).map((err) => (
                                    <div key={err.rowNumber} style={{ fontSize: '0.84rem', color: '#b45309', marginBottom: 4 }}>
                                      Fila {err.rowNumber}: {err.errors.join(', ')}
                                    </div>
                                  ))}
                                </div>
                              ) : preview.summary.rechazados ? (
                                <div style={{ marginTop: 8, color: '#b45309', fontWeight: 700 }}>
                                  Hay filas rechazadas. Revisa el detalle en el backend.
                                </div>
                              ) : (
                                <div style={{ marginTop: 8, color: '#15803d', fontWeight: 700 }}>Sin errores de validación.</div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="lot-step"><span className="lot-step-index">3</span><div><h4>Confirmar importación</h4><p>Se registrará en el historial con resultado final.</p></div></div>
                      <div style={{ marginTop: 8, padding: 10, borderRadius: 12, border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(248,250,252,0.9)' }}>
                        <div style={{ fontSize: 12, color: '#475569' }}><strong>Archivo:</strong> {importDraft.fileName || '—'}</div>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          <strong>Tipo:</strong> {IMPORT_TYPES[importDraft.importType]?.label || '—'}
                        </div>
                        {isDevEnv ? (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            Valor interno: {importDraft.importType}
                          </div>
                        ) : null}
                      </div>
                      <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
                        <Button variant="ghost" onClick={() => setShowImportFlow(false)}>Cancelar</Button>
                        <Button
                          icon={<CheckCircle2 size={16} />}
                          onClick={confirmImport}
                          disabled={!importDraft.fileName || !importDraft.csvText || importSubmitting}
                        >
                          {importSubmitting ? 'Importando...' : 'Confirmar importación'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {showImportRows ? (
                  <div className="lot-wizard-overlay" onClick={() => setShowImportRows(false)}>
                    <div className="lot-wizard" onClick={(event) => event.stopPropagation()}>
                      <div className="lot-wizard-header">
                        <div><h3>Detalle de importación</h3><p>Batch: {importRowsBatchId}</p></div>
                        <button className="icon-button" style={{ width: 36, height: 36 }} onClick={() => setShowImportRows(false)}><X size={16} color="#152235" /></button>
                      </div>
                      {importRowsLoading ? <div style={{ color: 'var(--muted)' }}>Cargando filas...</div> : null}
                      {importRowsError ? <div style={{ color: '#be123c', fontWeight: 700 }}>{importRowsError}</div> : null}
                      {!importRowsLoading && !importRowsError ? (
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>Fila</th><th>Estado</th><th>Error</th></tr></thead>
                            <tbody>
                              {importRows.map((row) => (
                                <tr key={row.id || row.row_number}>
                                  <td>{row.row_number}</td>
                                  <td>{row.import_status}</td>
                                  <td style={{ color: row.error_detail ? '#b45309' : 'var(--muted)' }}>{row.error_detail || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {!importRows.length ? <div style={{ padding: 12, color: 'var(--muted)' }}>No hay filas para este batch.</div> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {importDeleteTarget ? (
                  <div className="lot-wizard-overlay" onClick={closeImportDeleteModal}>
                    <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 420 }}>
                      <div className="lot-wizard-header">
                        <div>
                          <h3>¿Eliminar importación?</h3>
                          <p>Esta acción no se puede deshacer.</p>
                        </div>
                        <button className="icon-button" style={{ width: 36, height: 36 }} onClick={closeImportDeleteModal}><X size={16} color="#152235" /></button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                        <Button variant="secondary" onClick={closeImportDeleteModal} disabled={importDeleteLoading}>Cancelar</Button>
                        <Button
                          onClick={confirmImportDelete}
                          disabled={importDeleteLoading}
                          style={{
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff'
                          }}
                        >
                          {importDeleteLoading ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {isDevEnv ? (
                  <div style={{ marginTop: 16, padding: 12, borderRadius: 10, border: '1px dashed rgba(148,163,184,0.6)', background: 'rgba(248,250,252,0.7)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Debug import</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      <div>importType: {importDraft.importType}</div>
                      <div>endpoint: {importDebug.endpoint || '—'}</div>
                      <div>batchId: {importDebug.batchId || '—'}</div>
                      <div>payload: {importDebug.payload ? JSON.stringify(importDebug.payload) : '—'}</div>
                      <div>response: {importDebug.response ? JSON.stringify(importDebug.response) : '—'}</div>
                      <div>error: {importDebug.error || '—'}</div>
                    </div>
                  </div>
                ) : null}
              </Panel>
            </section>
          </div>
        );
      }

      if (route === 'sa_productos') {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-8" title="Productos" subtitle="Administración de catálogo comercial" action={<Button icon={<Plus size={16} />}>Crear producto</Button>}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Estado</th><th>Actualización</th><th>Acción</th></tr></thead>
                    <tbody>
                      {products.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.nombre}</strong></td>
                          <td>{item.categoria || 'General'}</td>
                          <td>{formatCurrency(item.precio || 0)}</td>
                          <td><Tag variant={item.activo ? 'success' : 'warning'}>{item.activo ? 'Activo' : 'Inactivo'}</Tag></td>
                          <td>{formatShortDate(item.updatedAt || item.createdAt)}</td>
                          <td><div className="toolbar"><Button variant="ghost" icon={<Edit3 size={15} />}>Editar</Button><Button variant="secondary" onClick={() => toggleProductState(item.id)}>{item.activo ? 'Desactivar' : 'Activar'}</Button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {productsLoading ? <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando productos...</div> : null}
                  {!productsLoading && !products.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay productos cargados.</div> : null}
                  {productsError ? <div style={{ padding: 16, color: '#be123c' }}>{productsError}</div> : null}
                </div>
              </Panel>
              <Panel className="span-4" title="Formulario de producto" subtitle="Estructura lista para backend">
                <div className="list">
                  <input className="input" placeholder="Nombre" value={productDraft.nombre} onChange={(event) => handleProductDraftChange('nombre', event.target.value)} />
                  <input className="input" placeholder="Categoría" value={productDraft.categoria} onChange={(event) => handleProductDraftChange('categoria', event.target.value)} />
                  <textarea className="input" rows="3" placeholder="Descripción" value={productDraft.descripcion} onChange={(event) => handleProductDraftChange('descripcion', event.target.value)}></textarea>
                  <input className="input" placeholder="Precio" value={productDraft.precio} onChange={(event) => handleProductDraftChange('precio', event.target.value)} />
                  <select className="input" value={productDraft.activo ? 'activo' : 'inactivo'} onChange={(event) => handleProductDraftChange('activo', event.target.value === 'activo')}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                  <textarea className="input" rows="3" placeholder="Observaciones" value={productDraft.observaciones} onChange={(event) => handleProductDraftChange('observaciones', event.target.value)}></textarea>
                  <Button icon={<CheckCircle2 size={16} />} onClick={handleSaveProduct}>Guardar producto</Button>
                </div>
              </Panel>
            </section>
          </div>
        );
      }

      if (route === 'sa_usuarios') {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-12" title="Usuarios y roles" subtitle="Gestión de accesos y alcance" action={<Button icon={<Plus size={16} />}>Crear usuario</Button>}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Módulos / alcance</th><th>Acción</th></tr></thead>
                    <tbody>
                      {users.map((userRow) => (
                        <tr key={userRow.email}>
                          <td><strong>{userRow.nombre}</strong></td>
                          <td>{userRow.email}</td>
                          <td>{userRow.rol}</td>
                          <td><Tag variant={userRow.estado === 'Activo' ? 'success' : 'warning'}>{userRow.estado}</Tag></td>
                          <td>{userRow.ultimoAcceso}</td>
                          <td>{userRow.alcance}</td>
                          <td><div className="toolbar"><Button variant="ghost" icon={<Edit3 size={15} />}>Editar</Button><Button variant="secondary" onClick={() => toggleUserState(userRow.email)}>{userRow.estado === 'Activo' ? 'Desactivar' : 'Activar'}</Button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!users.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay usuarios registrados.</div> : null}
                </div>
              </Panel>
            </section>
          </div>
        );
      }

      if (route === 'sa_tiempo_real') {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-7" title="Actividad en tiempo real" subtitle="Monitoreo transversal del sistema">
                <div className="list">
                  {SUPERADMIN_REALTIME_FEED.map((item) => (
                    <div key={item.at + item.tipo} className="alert">
                      <div className="status-ring" style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(15,118,110,0.12)', color: '#0f766e' }}><Activity size={16} /></div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{item.tipo} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {item.at}</span></div>
                        <div style={{ color: 'var(--muted)' }}>{item.detalle}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel className="span-5" title="Módulos en vivo" subtitle="Estado rápido por área">
                <div className="mini-stats">
                  <div className="mini-stat"><span>Ventas recientes</span><Tag variant="success">8 en la última hora</Tag></div>
                  <div className="mini-stat"><span>Tickets recientes</span><Tag variant="info">5 nuevos</Tag></div>
                  <div className="mini-stat"><span>Casos operaciones</span><Tag variant="warning">3 en seguimiento</Tag></div>
                  <div className="mini-stat"><span>Lotes supervisión</span><Tag variant="info">2 asignados hoy</Tag></div>
                  <div className="mini-stat"><span>Usuarios activos</span><Tag variant="success">23 conectados</Tag></div>
                </div>
              </Panel>
            </section>
          </div>
        );
      }

      if (route === 'sa_configuracion') {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-12" title="Configuración general" subtitle="Parámetros globales del sistema">
                <div className="content-grid" style={{ marginBottom: 0 }}>
                  <Panel className="span-4" title="Tipos de solicitud" subtitle="Atención al cliente"><div className="list"><div className="alert"><div>Reclamo</div></div><div className="alert"><div>Solicitud de baja</div></div><div className="alert"><div>Información sobre servicio</div></div></div></Panel>
                  <Panel className="span-4" title="Estados comerciales" subtitle="Ventas"><div className="list"><div className="alert"><div>Venta</div></div><div className="alert"><div>Seguimiento</div></div><div className="alert"><div>Rellamar</div></div></div></Panel>
                  <Panel className="span-4" title="Parámetros generales" subtitle="Sistema"><div className="list"><div className="alert"><div>Orígenes de leads</div></div><div className="alert"><div>Categorías de producto</div></div><div className="alert"><div>Estados de tickets</div></div></div></Panel>
                </div>
              </Panel>
            </section>
          </div>
        );
      }

      return (
        <div className="view">
          <section className="metrics-grid">{globalMetrics.map((item) => <MetricCard key={item.title} item={item} />)}</section>
          <section className="content-grid">
            <Panel className="span-7" title="Actividad reciente del sistema" subtitle="Últimos eventos globales">
              <div className="list">
                {SUPERADMIN_REALTIME_FEED.slice(0, 4).map((item) => (
                  <div key={item.at + item.tipo} className="status-item">
                    <div className="status-ring" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}><Activity size={16} /></div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{item.tipo}</div><div style={{ color: 'var(--muted)' }}>{item.detalle}</div></div>
                    <span style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{item.at}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel className="span-5" title="Comandos globales" subtitle="Acceso rápido del superadministrador">
              <div className="toolbar">
                <Button icon={<Upload size={16} />}>Importar CSV</Button>
                <Button variant="secondary" icon={<Briefcase size={16} />}>Gestionar productos</Button>
                <Button variant="secondary" icon={<UserCheck size={16} />}>Gestionar usuarios</Button>
                <Button variant="ghost" icon={<Settings size={16} />}>Parámetros globales</Button>
              </div>
              <div style={{ marginTop: 12 }} className="mini-stats">
                <div className="mini-stat"><span>Última venta registrada</span><strong>Hoy 09:21</strong></div>
                <div className="mini-stat"><span>Último ticket creado</span><strong>#2044</strong></div>
                <div className="mini-stat"><span>Último lote asignado</span><strong>Lote Marzo Litoral</strong></div>
              </div>
            </Panel>
          </section>
        </div>
      );
    }

    function PlaceholderView({ title, subtitle, cta }) {
      return (
        <div className="view">
          <section className="content-grid">
            <Panel className="span-12" title={title} subtitle={subtitle}>
              <div style={{ minHeight: 320, display: 'grid', placeItems: 'center', borderRadius: 24, border: '1px dashed rgba(20,34,53,0.16)', background: 'rgba(20,34,53,0.03)', textAlign: 'center', padding: 24 }}>
                <div>
                  <div className="status-ring" style={{ margin: '0 auto 14px', width: 64, height: 64, background: 'rgba(15,118,110,0.12)', color: '#0f766e' }}><Building2 size={28} /></div>
                  <h2 className="panel-title" style={{ fontSize: '1.5rem' }}>Módulo listo para extender</h2>
                  <p className="panel-subtitle" style={{ maxWidth: 540 }}>{subtitle}</p>
                  <div style={{ marginTop: 18 }}><Button icon={<Activity size={18} />} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{cta}</Button></div>
                </div>
              </div>
            </Panel>
          </section>
        </div>
      );
    }

    function App() {
      const today = new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const oidcAuth = useOidcAuth();
      const { user, logout, refreshSession } = useAuth();
      const authUser = user;
      const { rolReal, rolEfectivo, esSuperadmin } = useRolEfectivo();
      const role = rolEfectivo;
      const [route, setRoute] = React.useState('dashboard_global');
      const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);
      const [menuOpen, setMenuOpen] = React.useState(window.innerWidth >= 1024);
      const [estadoUsuario, setEstadoUsuario] = React.useState('disponible');
      const [pausaInicio, setPausaInicio] = React.useState('');
      const [mostrarPausa, setMostrarPausa] = React.useState(false);
      const [estadoActualLoading, setEstadoActualLoading] = React.useState(false);
      const [estadoActualError, setEstadoActualError] = React.useState('');
      const [lastActivityAt, setLastActivityAt] = React.useState(Date.now());
      const [inactivityWarning, setInactivityWarning] = React.useState(false);
      const [showProfileModal, setShowProfileModal] = React.useState(false);
      const [supportNewTickets, setSupportNewTickets] = React.useState(0);
      const [brandLogo, setBrandLogo] = React.useState(() => {
        try {
          return localStorage.getItem('rednacrem_logo') || '';
        } catch {
          return '';
        }
      });
      const [vendedorNewClientOpen, setVendedorNewClientOpen] = React.useState(false);
      const [vendedorNewClientDraft, setVendedorNewClientDraft] = React.useState(null);
      const [vendedorNewClientOnSuccess, setVendedorNewClientOnSuccess] = React.useState(null);
      const [vendedorNewClientGestionId, setVendedorNewClientGestionId] = React.useState(null);
      const [vendedorNewClientMode, setVendedorNewClientMode] = React.useState('nuevo_cliente');
      const [salesContacts, setSalesContacts] = React.useState(SALES_CONTACTS_SEED);
      const [supervisorLots, setSupervisorLots] = React.useState(SUPERVISOR_LOTS_SEED);
      const [salesSelectedId, setSalesSelectedId] = React.useState(SALES_CONTACTS_SEED.find(isSalesActiveContact)?.id || null);
      const [recuperoContacts] = React.useState([]);
      const [recuperoSelectedId, setRecuperoSelectedId] = React.useState(null);
      const [salesRecords, setSalesRecords] = React.useState(() => seedSalesFromContacts(SALES_CONTACTS_SEED));
      const [moduleStates, setModuleStates] = React.useState(() =>
        createInitialModuleStates({ roleNav: ROLE_NAV, roles: Object.keys(ROLE_META) })
      );
      const topbarRef = React.useRef(null);
      const agendaNotifiedRef = React.useRef(new Set());
      const [productsCatalog, setProductsCatalog] = React.useState([]);
      const productsById = React.useMemo(
        () => Object.fromEntries(productsCatalog.map((product) => [product.id, product])),
        [productsCatalog]
      );
      const handleOpenVendedorNewClient = (prefill = null, gestion_id = null, onSuccessCb = null, mode = 'nuevo_cliente') => {
        setVendedorNewClientDraft(prefill);
        setVendedorNewClientGestionId(gestion_id ?? null);
        setVendedorNewClientOnSuccess(() => onSuccessCb);
        setVendedorNewClientMode(mode ?? 'nuevo_cliente');
        setVendedorNewClientOpen(true);
      };
      const hasRealSuperadminAccess = hasRealRole({ rolReal, allowedRoles: ['superadministrador'] }) && esSuperadmin;
      const roleNavWithBadges = React.useMemo(
        () => ROLE_NAV.map((item) => {
          if (item.path !== 'soporte') return item;
          return {
            ...item,
            badge: supportNewTickets > 0 ? supportNewTickets : null
          };
        }),
        [supportNewTickets]
      );

      React.useEffect(() => {
        const onResize = () => {
          const desktop = window.innerWidth >= 1024;
          setIsDesktop(desktop);
          setMenuOpen(desktop);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      React.useEffect(() => {
        const visible = roleNavWithBadges
          .filter((item) => item.roles.includes(role) && isModuleVisible(moduleStates, role, item.path))
          .map((item) => item.path);
        if (route === 'lotes_crear') return;
        if (!visible.includes(route)) setRoute(visible[0] || 'dashboard');
      }, [role, route, moduleStates, roleNavWithBadges]);

      React.useEffect(() => {
        persistModuleStates(moduleStates);
      }, [moduleStates]);

      React.useEffect(() => {
        let active = true;
        listProductsAsync()
          .then((items) => {
            if (!active) return;
            setProductsCatalog(items);
          })
          .catch(() => {
            if (!active) return;
            setProductsCatalog([]);
          });
        return () => { active = false; };
      }, []);

      React.useEffect(() => {
        if (role !== 'atencion_cliente') return;
        let active = true;
        const refreshSupportBadge = async () => {
          try {
            const items = await listTicketsAsync();
            if (!active) return;
            const count = items.filter((ticket) => ticket.estado === 'nuevo').length;
            setSupportNewTickets(count);
          } catch {
            if (!active) return;
            setSupportNewTickets(0);
          }
        };
        refreshSupportBadge();
        const intervalId = window.setInterval(refreshSupportBadge, 30000);
        return () => {
          active = false;
          window.clearInterval(intervalId);
        };
      }, [role]);

      React.useEffect(() => {
        if (!topbarRef.current) return;
        const root = document.documentElement;
        const update = () => {
          if (!topbarRef.current) return;
          const rect = topbarRef.current.getBoundingClientRect();
          const offset = Math.round(Math.min(Math.max(rect.bottom + 12, 72), 180));
          root.style.setProperty('--topbar-offset', `${offset}px`);
        };
        update();
        let observer = null;
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(update);
          observer.observe(topbarRef.current);
        }
        window.addEventListener('resize', update);
        return () => {
          window.removeEventListener('resize', update);
          if (observer) observer.disconnect();
        };
      }, []);

      React.useEffect(() => {
        try {
          if (brandLogo) {
            localStorage.setItem('rednacrem_logo', brandLogo);
          } else {
            localStorage.removeItem('rednacrem_logo');
          }
        } catch {}
      }, [brandLogo]);

      const refreshContactsFromService = React.useCallback(async () => {
        const next = await listCommercialContactsAsync();
        setSalesContacts(next);
        return next;
      }, []);

      const refreshSalesFromService = React.useCallback(async () => {
        const nextSales = await listSalesBySellerAsync();
        if (Array.isArray(nextSales)) {
          setSalesRecords(nextSales);
        }
        return nextSales;
      }, []);

      const refreshLotsFromService = React.useCallback(async () => {
        const nextLots = await listLotsAsync();
        setSupervisorLots(nextLots);
        return nextLots;
      }, []);

      const registerActivity = React.useCallback(() => {
        const now = Date.now();
        setLastActivityAt(now);
        setInactivityWarning(false);
      }, []);

      const fetchEstadoActual = React.useCallback(async () => {
        setEstadoActualLoading(true);
        setEstadoActualError('');
        try {
          const api = getApiClient();
          const response = await api.get('/api/agente/estado-actual');
          const estado = response?.estado || response?.data?.estado || null;
          if (!estado) {
            setEstadoUsuario('disponible');
            setMostrarPausa(false);
            setPausaInicio('');
            return;
          }
          const tipo = String(estado?.tipo || '').toUpperCase();
          const tipoMap = {
            BAÑO: 'bano',
            BANO: 'bano',
            DESCANSO: 'descanso',
            SUPERVISOR: 'supervisor',
            TRABAJO: 'disponible',
            INACTIVO: 'inactivo'
          };
          const mapped = tipoMap[tipo] || 'disponible';
          const requiereBloqueo = Boolean(estado?.requiere_bloqueo);
          setEstadoUsuario(mapped);
          if (requiereBloqueo && ['bano', 'descanso', 'supervisor'].includes(mapped)) {
            setPausaInicio(estado?.inicio || estado?.inicio_local || new Date().toISOString());
            setMostrarPausa(true);
          } else {
            setPausaInicio('');
            setMostrarPausa(false);
          }
        } catch (err) {
          setEstadoActualError(err?.message || 'No se pudo obtener el estado actual.');
        } finally {
          setEstadoActualLoading(false);
        }
      }, []);

      React.useEffect(() => {
        Promise.all([refreshContactsFromService(), refreshLotsFromService()]).catch(() => {});
      }, [refreshContactsFromService, refreshLotsFromService]);

      React.useEffect(() => {
        if (!authUser?.id) return;
        fetchEstadoActual();
      }, [authUser?.id, fetchEstadoActual]);

      React.useEffect(() => {
        const events = ['mousemove', 'keydown', 'click', 'focus'];
        const handler = () => registerActivity();
        events.forEach((evt) => window.addEventListener(evt, handler));
        return () => {
          events.forEach((evt) => window.removeEventListener(evt, handler));
        };
      }, [registerActivity]);

      React.useEffect(() => {
        if (!authUser?.id) return;
        const api = getApiClient();
        const intervalId = window.setInterval(() => {
          const isWorking = estadoUsuario === 'disponible';
          const inactiveFor = Date.now() - lastActivityAt;
          if (isWorking && inactiveFor < 2 * 60 * 1000) {
            api.post('/api/agente/heartbeat').catch(() => {});
          }
          if (isWorking && !mostrarPausa) {
            if (inactiveFor >= 10 * 60 * 1000) {
              setInactivityWarning(true);
            } else {
              setInactivityWarning(false);
            }
          }
        }, 30000);
        return () => window.clearInterval(intervalId);
      }, [authUser?.id, estadoUsuario, lastActivityAt, mostrarPausa]);

      React.useEffect(() => {
        if (role !== 'vendedor') return;
        refreshSalesFromService().catch(() => {});
      }, [role, refreshSalesFromService]);

      const registerSalesManagement = async (contactId, payload) => {
        const { contact: updated } = await registerCommercialManagement(contactId, payload, { sellerName: 'Laura Techera' });
        const nextContacts = await refreshContactsFromService();
        setSalesRecords((prevSales) => {
          if (updated.estadoOperativo === 'finalizado_venta') {
            return upsertPrimarySale(prevSales, updated, { productId: updated.productId });
          }
          return removeSalesByContact(prevSales, contactId);
        });
        if (!nextContacts.some((item) => item.id === salesSelectedId)) {
          setSalesSelectedId(nextContacts.find(isSalesActiveContact)?.id || null);
        }
      };

      const updateSalesContactProfile = async (contactId, patch) => {
        await updateCommercialContactProfile(contactId, patch);
        await refreshContactsFromService();
      };

      const assignFamilySale = (contact, payload) => {
        setSalesRecords((prev) => addFamilySale(prev, contact, payload));
      };

      const createSupervisorLot = async ({ name, status = 'sin_asignar' }) => {
        const created = await createLot({ nombre: name, estado: status });
        await refreshLotsFromService();
        return created;
      };

      const assignSupervisorLotSeller = async (lotId, sellerName, currentStatus) => {
        await updateLot(lotId, { estado: currentStatus === 'sin_asignar' ? 'asignado' : currentStatus });
        await assignSellerByLot(lotId, sellerName);
        await Promise.all([refreshContactsFromService(), refreshLotsFromService()]);
      };

      const closeSupervisorLot = async (lotId) => {
        await updateLot(lotId, { estado: 'finalizado' });
        await refreshLotsFromService();
      };

      const bulkAssignSupervisorContacts = async (selectedIds, lotId, sellerName, distributedById = {}) => {
        if (!selectedIds.length) return;
        if (sellerName) {
          await bulkAssignCommercialContacts(selectedIds, { lotId, sellerName });
        } else {
          await Promise.all(selectedIds.map((contactId) =>
            bulkAssignCommercialContacts([contactId], { lotId, sellerName: distributedById[contactId] || '' })
          ));
        }
        await refreshContactsFromService();
      };

      const reactivateSupervisorError = async (contactId) => {
        await reactivateErrorContact(contactId, { sellerName: 'Supervisor' });
        await refreshContactsFromService();
      };

      // Acción crítica: depende del rol real (no de rolEfectivo).
      const updateModuleVisibility = (targetRole, modulePath, estado) => {
        if (!hasRealSuperadminAccess) return;
        setModuleStates((prev) => setModuleState(prev, { role: targetRole, path: modulePath, estado }));
      };

      // Acción crítica: branding global solo con rol real superadmin.
      const saveBrandLogoSecure = (nextLogo) => {
        if (!hasRealSuperadminAccess) return;
        setBrandLogo(nextLogo);
      };

      const handleEstadoUsuario = (estadoId) => {
        const next = resolveEstadoUsuario(estadoId);
        if (next.id === 'disponible') {
          volverAlTrabajo();
          return;
        }
        setEstadoUsuario(next.id);
        if (next.bloqueaPantalla) {
          setPausaInicio(new Date().toISOString());
          setMostrarPausa(true);
        } else {
          setPausaInicio('');
          setMostrarPausa(false);
        }
        const tipoMap = {
          bano: 'BANO',
          descanso: 'DESCANSO',
          supervisor: 'SUPERVISOR'
        };
        const tipo = tipoMap[next.id];
        if (tipo) {
          try {
            const api = getApiClient();
            api.post('/api/agente/estado', { tipo })
              .then(() => fetchEstadoActual())
              .catch(() => {
                setEstadoActualError('No se pudo actualizar el estado.');
                setMostrarPausa(false);
                setPausaInicio('');
                setEstadoUsuario('disponible');
              });
          } catch (e) {
            setEstadoActualError('No se pudo actualizar el estado.');
            setMostrarPausa(false);
            setPausaInicio('');
            setEstadoUsuario('disponible');
          }
        }
      };

      const volverAlTrabajo = () => {
        try {
          const api = getApiClient();
          api.post('/api/agente/volver-al-trabajo')
            .then(() => {
              setMostrarPausa(false);
              setPausaInicio('');
              setEstadoUsuario('disponible');
              fetchEstadoActual();
            })
            .catch(() => {
              setEstadoActualError('No se pudo volver al trabajo.');
            });
        } catch (e) {
          setEstadoActualError('No se pudo volver al trabajo.');
        }
      };

      const handleLogout = async () => {
        const api = getApiClient();
        const agenteId = authUser?.id || '';
        if (agenteId) {
          api.post('/api/agent/event', { agente_id: agenteId, tipo: 'LOGOUT' }).catch(() => {});
        }
        // 1) Cerrar sesion OIDC local para evitar estado stale en el frontend.
        if (oidcAuth?.removeUser) {
          try {
            await oidcAuth.removeUser();
          } catch {
            // no-op
          }
        }
        // 2) Limpiar sesion interna de la app.
        await logout();
        setMenuOpen(isDesktop);
        volverAlTrabajo();
        // 3) Cerrar sesion en Hosted UI de Cognito y volver a logout_uri.
        window.location.assign(buildCognitoHostedUiLogoutUrl());
      };

      const handleOpenProfile = () => {
        setShowProfileModal(true);
      };

      const handleCloseProfile = () => {
        setShowProfileModal(false);
      };

      const handleSaveProfile = React.useCallback(async (form) => {
        const api = getApiClient();
        const payload = {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          extension: form.extension || '',
          department: form.department
        };
        const response = await api.put('/api/users/me', payload);
        if (!response?.ok) {
          const message = response?.message || 'No se pudo guardar el perfil.';
          throw new Error(message);
        }
        if (refreshSession) {
          await refreshSession();
        }
        return response;
      }, [refreshSession]);

      const effectiveRoleForUi = getEffectiveRoleForUi({ rolEfectivo: role, rolReal, fallback: 'atencion_cliente' });
      const navItems = getVisibleNavItemsForRole({
        roleNav: roleNavWithBadges,
        role: effectiveRoleForUi,
        moduleStates,
        isModuleVisible
      });
      const currentMeta = ROLE_META[effectiveRoleForUi] || ROLE_META.atencion_cliente;
      const sessionUser = user ? {
        name: user.nombre || user.name || 'Usuario',
        email: user.email || user?.username || ''
      } : null;
      const fallbackRoleUser = USERS[rolReal] || { name: 'Usuario', email: '' };
      const currentUser = sessionUser || {
        name: fallbackRoleUser.name,
        email: fallbackRoleUser.email || ''
      };
      const notificationUserId = user?.id || rolReal || 'anon';
      const estadoConfig = resolveEstadoUsuario(estadoUsuario);
      const currentRouteItem = navItems.find((item) => item.path === route);
      const isSupportRoute = route === 'soporte';
      const breadcrumbCurrent = isSupportRoute ? 'Atención al cliente' : (currentRouteItem?.label || 'Dashboard');
      const roleLabel = effectiveRoleForUi === rolReal ? currentMeta.label : ('Modo vista: ' + currentMeta.label);
      const openNotificationsModule = React.useCallback((requestedRoute) => {
        const fallbackRoute = navItems.some((item) => item.path === 'sa_logs_actividad')
          ? 'sa_logs_actividad'
          : navItems.some((item) => item.path === 'reportes')
            ? 'reportes'
            : 'dashboard';
        const normalized = typeof requestedRoute === 'string'
          ? { route: requestedRoute }
          : (requestedRoute || {});
        const targetRoute = normalized.route;
        const canOpenRequested = targetRoute && navItems.some((item) => item.path === targetRoute);
        setRoute(canOpenRequested ? targetRoute : fallbackRoute);
        if (targetRoute === 'contactos' && normalized.contactId) {
          setSalesSelectedId(normalized.contactId);
        }
        if (!isDesktop) setMenuOpen(false);
      }, [navItems, isDesktop]);

      React.useEffect(() => {
        if (!authUser?.id) return;
        const api = getApiClient();
        const agendaCheckInterval = window.setInterval(async () => {
          try {
            const res = await api.get('/agenda');
            const items = res?.data?.items || res?.data?.data?.items || [];
            const now = new Date();
            const pending = items.filter((item) => {
              if (!item.fecha_agenda) return false;
              const agendaDate = new Date(item.fecha_agenda);
              return agendaDate <= now && !item.cumplida;
            });
            pending.forEach((item) => {
              const key = item.id
                || item.agenda_id
                || item.lead_id
                || item.contact_id
                || item.management_id
                || item.gestion_id
                || item.fecha_agenda
                || `${item.nombre || ''}-${item.apellido || ''}-${item.fecha_agenda || ''}`;
              if (agendaNotifiedRef.current.has(key)) return;
              agendaNotifiedRef.current.add(key);
              const tipo = item.tipo_agenda || item.ultimo_resultado || 'seguimiento';
              const nombre = [item.nombre, item.apellido].filter(Boolean).join(' ') || 'un contacto';
              const mensaje = String(tipo).toLowerCase() === 'rellamar'
                ? `Hay un rellamar pendiente con ${nombre}`
                : `Hay un seguimiento que necesita su atención con ${nombre}`;
              const contactId = item.contact_id || item.contactId || item.lead_id || item.leadId || item.id || '';
              logActivityEvent({
                entidad: 'agenda',
                entidadId: contactId,
                tipo,
                descripcion: `${AGENDA_NOTIFICATION_PREFIX}${contactId}::${mensaje}`,
                usuarioId: notificationUserId
              });
            });
          } catch {}
        }, 60000);
        return () => window.clearInterval(agendaCheckInterval);
      }, [authUser?.id, notificationUserId]);

      const renderRoute = () => {
        if (SUPERADMIN_ROUTES.includes(route)) {
          return (
            <RealRoleGate
              allowRoles={['superadministrador']}
              fallback={<PlaceholderView title="Acceso restringido" subtitle="Este módulo requiere permisos reales de Superadministrador validados por backend." cta="Volver al foco" />}
            >
              <SuperadminWorkbench
                route={route}
                onOpenRoute={setRoute}
                logoUrl={brandLogo}
                onSaveLogo={saveBrandLogoSecure}
                roleMeta={ROLE_META}
                roleNav={ROLE_NAV}
                moduleStates={moduleStates}
                estadoModuloOptions={ESTADO_MODULO_OPTIONS}
                onChangeModuleState={updateModuleVisibility}
                Button={Button}
                Panel={Panel}
                Tag={Tag}
                MetricCard={MetricCard}
              />
            </RealRoleGate>
          );
        }
        if (route === 'dashboard') {
          if (role === 'director') return <DirectorDashboard />;
          if (role === 'supervisor') return <SupervisorDashboard />;
          if (role === 'vendedor') return (
            <SalesDashboard
              contacts={salesContacts}
              salesRecords={salesRecords}
              onGoRoute={setRoute}
              onVentaCerrada={(contactData, gestion_id = null) => handleOpenVendedorNewClient(contactData, gestion_id)}
            />
          );
          return <OperationsDashboard />;
        }
        if (role === 'supervisor' && ['base_general', 'lotes', 'numeros_error', 'seguimiento_vendedores'].includes(route)) {
          return (
            <SupervisorModule
              route={route}
              contacts={salesContacts}
              lots={supervisorLots}
              onBulkAssignContacts={bulkAssignSupervisorContacts}
              onCreateLot={createSupervisorLot}
              onAssignLotSeller={assignSupervisorLotSeller}
              onCloseLot={closeSupervisorLot}
              onReactivateError={reactivateSupervisorError}
              onOpenRoute={setRoute}
            />
          );
        }
        if (role === 'supervisor' && route === 'lotes_crear') {
          return (
            <SupervisorLotWizard
              Panel={Panel}
              Button={Button}
              onExit={() => setRoute('lotes')}
              onCreated={async () => {
                await refreshLotsFromService();
                setRoute('lotes');
              }}
            />
          );
        }
        if (role === 'supervisor' && route === 'solicitudes_registro') {
          return (
            <RequireRole
              roles={['supervisor']}
              fallback={<PlaceholderView title="Solicitudes de registro" subtitle="No tienes permisos para este módulo." cta="Volver al foco" />}
            >
              <SupervisorRegistrationRequestsModule Panel={Panel} Button={Button} Tag={Tag} />
            </RequireRole>
          );
        }
        if (route === 'recupero') {
          if (role === 'vendedor') {
            return (
              <RecuperoContactsView
                contacts={recuperoContacts}
                selectedId={recuperoSelectedId}
                onSelect={setRecuperoSelectedId}
                onRegister={registerSalesManagement}
                salesRecords={salesRecords}
                products={productsCatalog}
                onAssignFamilySale={assignFamilySale}
                onUpdateContact={updateSalesContactProfile}
                onVentaCerrada={(contactData, gestion_id = null) => handleOpenVendedorNewClient(contactData, gestion_id)}
                onOpenNewClient={(prefill, gestion_id, cb, mode) => handleOpenVendedorNewClient(prefill, gestion_id, cb, mode)}
                vendedorNewClientOpen={vendedorNewClientOpen}
              />
            );
          }
          return <PlaceholderView title="Recupero" subtitle="Sin visibilidad para este rol en la vista actual." cta="Volver al foco" />;
        }
        if (route === 'contactos') {
          if (role === 'vendedor') {
            return (
              <SalesContactsView
                contacts={salesContacts}
                selectedId={salesSelectedId}
                onSelect={setSalesSelectedId}
                onRegister={registerSalesManagement}
                salesRecords={salesRecords}
                products={productsCatalog}
                onAssignFamilySale={assignFamilySale}
                onUpdateContact={updateSalesContactProfile}
                onVentaCerrada={(contactData, gestion_id = null) => handleOpenVendedorNewClient(contactData, gestion_id)}
                onOpenNewClient={handleOpenVendedorNewClient}
                vendedorNewClientOpen={vendedorNewClientOpen}
              />
            );
          }
          return <ContactsView />;
        }
        if (route === 'agenda') {
          if (role === 'vendedor') return <SalesAgendaView onVentaCerrada={(contactData, gestion_id = null) => handleOpenVendedorNewClient(contactData, gestion_id)} />;
        }
        if (route === 'clientes') {
          if (role === 'vendedor') return (
            <SalesClientsView
              salesRecords={salesRecords}
              productsById={productsById}
              onOpenNewClient={handleOpenVendedorNewClient}
            />
          );
          return <ClientsView productsCatalog={productsCatalog} />;
        }
        if (route === 'contratos') {
          return (
            <UiRoleGate
              allowRoles={['supervisor']}
              fallback={<PlaceholderView title="Recupero" subtitle="Sin visibilidad para este rol en la vista actual." cta="Volver al foco" />}
            >
              <SupervisorContractsModule Panel={Panel} Button={Button} Tag={Tag} />
            </UiRoleGate>
          );
        }
        if (route === 'equipo') {
          const teamSinceLabel = formatTeamSinceDateLabel(user?.last_login_at || user?.created_at || user?.createdAt);
          const teamStatusMeta = resolveEstadoUsuario(estadoUsuario);
          const displayUserName = currentUser.name || 'Usuario';
          const displayUserEmail = currentUser.email ? ` · ${currentUser.email}` : '';

          return (
            <div className="view">
              <section className="hero">
                <div className="hero-panel">
                  <Tag variant="info">Equipo de venta</Tag>
                  <h1 className="hero-title">Equipo de venta</h1>
                  <p className="hero-copy">Control rápido del equipo activo, su último ingreso y el estado operativo actual.</p>
                  <div
                    style={{
                      marginTop: 20,
                      padding: 18,
                      borderRadius: 18,
                      border: '1px solid rgba(15,23,42,0.08)',
                      background: 'rgba(255,255,255,0.9)',
                      display: 'grid',
                      gap: 12,
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
                    }}
                  >
                    <div>
                      <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 4 }}>Usuario activo</div>
                      <div style={{ fontWeight: 700 }}>{displayUserName}{displayUserEmail}</div>
                    </div>
                    <div>
                      <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 4 }}>Desde</div>
                      <div style={{ fontWeight: 700 }}>{teamSinceLabel}</div>
                    </div>
                    <div>
                      <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 4 }}>Estado</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: teamStatusMeta.color, border: '1px solid rgba(15,23,42,0.15)' }}></span>
                        <strong>{teamStatusMeta.label}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          );
        }
        if (route === 'soporte' && role === 'atencion_cliente') return <CustomerSupportModule />;
        if (route === 'servicios') return <OperationsDashboard />;
        return <PlaceholderView title={navItems.find((item) => item.path === route)?.label || 'Módulo'} subtitle="La estructura ya está integrada al sistema. Se puede profundizar con formularios, reglas de negocio, estados y persistencia cuando lo definas." cta="Volver al foco" />;
      };

      return (
        <>
          <div className="noise"></div>
          <div className="app-shell">
            {!isDesktop && menuOpen ? <div className="mobile-overlay" onClick={() => setMenuOpen(false)}></div> : null}
            <aside className={'sidebar ' + (menuOpen ? 'open' : 'closed')}>
              <div className="sidebar-brand">
                <div className="brand-row">
                  <div className="brand-logo-box">
                    {brandLogo ? (
                      <img src={brandLogo} alt="Logo Rednacrem" className="brand-logo-image" />
                    ) : (
                      <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 28, fontWeight: 800, color: '#0f766e' }}>R</span>
                    )}
                  </div>
                  {!isDesktop ? <button className="icon-button" onClick={() => setMenuOpen(false)} style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.08)', boxShadow: 'none', marginLeft: 'auto' }}><X size={18} color="white" /></button> : null}
                </div>
              </div>
              <div className="sidebar-nav-region">
                <div className="sidebar-section-label">Navegación</div>
                <div className="nav-list">
                  {navItems.map((item) => {
                    const NavIcon = item.icon;
                    return (
                      <button
                        key={item.path}
                        className={'nav-item ' + (route === item.path ? 'active' : '')}
                        onClick={() => { setRoute(item.path); if (!isDesktop) setMenuOpen(false); }}
                        title=""
                      >
                        <div className="nav-icon"><NavIcon size={18} /></div>
                        <div className="nav-meta"><div className="nav-title">{item.label}</div><div className="nav-caption">{item.caption}</div></div>
                        {item.badge ? <div className="nav-badge">{item.badge}</div> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <UserProfileMenu
                user={currentUser}
                roleLabel={roleLabel}
                estadoActual={estadoUsuario}
                onEstadoChange={handleEstadoUsuario}
                onLogout={handleLogout}
                onOpenProfile={handleOpenProfile}
                notificationUserId={notificationUserId}
                onNotificationsNavigate={openNotificationsModule}
                userRole={role}
              />
            </aside>

            <main className="main">
              <header className="topbar" ref={topbarRef}>
                <div className="topbar-card glass">
                  <button className="icon-button mobile-toggle" onClick={() => setMenuOpen(true)}><Menu size={20} color="#152235" /></button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="breadcrumb">
                      <span>Inicio</span>
                      {isSupportRoute ? (
                        <>
                          <span> / </span>
                          <strong style={{ color: 'var(--text)' }}>Atención al cliente</strong>
                        </>
                      ) : (
                        <>
                          <span> / </span>
                          <span>{currentMeta.label}</span>
                          <span> / </span>
                          <strong style={{ color: 'var(--text)' }}>{breadcrumbCurrent}</strong>
                        </>
                      )}
                    </div>
                <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: '0.9rem' }}>{today}</div>
                {role !== rolReal ? (
                  <div className="toolbar" style={{ marginTop: 8 }}>
                    <Tag variant="warning">Modo vista: {ROLE_META[role]?.label || role}</Tag>
                    <Tag variant="info">Usuario real: {ROLE_META[rolReal]?.label || rolReal}</Tag>
                  </div>
                ) : null}
                {estadoUsuario === 'inactivo' ? (
                  <div className="toolbar" style={{ marginTop: 8 }}>
                    <Tag variant="warning">Inactivo (sin actividad)</Tag>
                  </div>
                ) : null}
              </div>
              {effectiveRoleForUi !== 'vendedor' && (
                <div className="searchbox"><Search size={18} color="#69788d" /><input placeholder="Buscar clientes, gestiones o servicios..." /><div className="pill">Demo</div></div>
              )}
            </div>
          </header>
          {inactivityWarning && estadoUsuario === 'disponible' && !mostrarPausa ? (
            <div style={{ margin: '0 24px 12px', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(251,191,36,0.6)', background: 'rgba(251,191,36,0.15)', color: '#92400e', fontWeight: 600 }}>
              Estás inactivo, tu sesión pasará a inactiva
            </div>
          ) : null}
          {renderRoute()}
        </main>
          </div>

          {mostrarPausa ? <PauseOverlay status={estadoConfig} startedAt={pausaInicio} onResume={volverAlTrabajo} /> : null}
          <ProfileModal isOpen={showProfileModal} onClose={handleCloseProfile} user={currentUser} roleMeta={ROLE_META} onSave={handleSaveProfile} />
          {vendedorNewClientOpen && (
            <NuevoClienteVendedor
              draft={vendedorNewClientDraft}
              productsCatalog={productsCatalog}
              onClose={() => {
                setVendedorNewClientOpen(false);
                setVendedorNewClientDraft(null);
                setVendedorNewClientOnSuccess(null);
                setVendedorNewClientGestionId(null);
                setVendedorNewClientMode('nuevo_cliente');
                try { localStorage.removeItem('cliente_pendiente_alta'); } catch {}
              }}
              onSuccess={async () => {
                if (vendedorNewClientOnSuccess) {
                  await vendedorNewClientOnSuccess();
                }
                setVendedorNewClientOpen(false);
                setVendedorNewClientDraft(null);
                setVendedorNewClientOnSuccess(null);
                setVendedorNewClientGestionId(null);
                setVendedorNewClientMode('nuevo_cliente');
                try { localStorage.removeItem('cliente_pendiente_alta'); } catch {}
              }}
              gestion_id={vendedorNewClientGestionId}
              mode={vendedorNewClientMode}
            />
          )}
        </>
      );
    }

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OidcAuthProvider {...cognitoAuthConfig}>
      <AppAuthProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </AppAuthProvider>
    </OidcAuthProvider>
  </React.StrictMode>
);
  










