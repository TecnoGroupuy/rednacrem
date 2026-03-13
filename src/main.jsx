
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider as OidcAuthProvider, useAuth as useOidcAuth } from 'react-oidc-context';
import { buildCognitoHostedUiLogoutUrl, cognitoAuthConfig } from './auth/cognitoConfig';
import {
  Menu, X, Bell, Search, ChevronDown, Briefcase, Users, UserCheck, Building2, Phone,
  Activity, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, AlertTriangle,
  DollarSign, Target, Download, Layers, Eye, Calendar, PhoneCall, CreditCard, FileText,
  Filter, Plus, CheckCircle2, Clock, Settings, Zap, BarChart3, Edit3, MoreHorizontal,
  MessageSquare, Send, Headphones, Bot, User, Hash, Upload, LogOut, Coffee, Bath, PersonStanding
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart as RePieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { ROLE_META as ROLE_META_BASE } from './domain/roles.js';
import { getRoleUsersDictionary } from './services/usersService.js';
import { listProducts } from './services/productsService.js';
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
  reactivateErrorContact
} from './services/leadsService.js';
import {
  seedSalesFromContacts,
  getSalesByContact,
  countSales,
  upsertPrimarySale,
  addFamilySale,
  removeSalesByContact
} from './services/salesService.js';
import { listLots, listLotsAsync, createLot, updateLot } from './services/lotsService.js';
import {
  listTicketsAsync,
  createManualTicket,
  updateTicketStatus,
  updateServiceRequestStatus,
  addTicketNote,
  deriveTicketToOperations,
  closeTicketCase
} from './services/ticketsService.js';
import { listOperationsRows } from './services/operationsService.js';
import { listImports, previewCsvText, createImportFromCsv } from './services/importsService.js';
import {
  listRecentActivity,
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} from './services/activityService.js';
import {
  listClients,
  searchPortfolioClients,
  listActiveContactProducts,
  getContactLifecycle
} from './services/clientsService.js';
import {
  getAlerts,
  getDirectorMetrics,
  getPortfolioTrend,
  getProductSplit,
  getTeamRows,
  getContactsDirectory
} from './services/dashboardService.js';
import SuperadminWorkbench from './components/SuperadminWorkbench.jsx';
import SupervisorContractsModule from './components/SupervisorContractsModule.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import BotonVistaRol from './components/BotonVistaRol.jsx';
import UiRoleGate from './components/UiRoleGate.jsx';
import RealRoleGate from './components/RealRoleGate.jsx';
import { AuthProvider as AppAuthProvider, useAuth } from './auth/AuthProvider.jsx';
import { useRolEfectivo } from './hooks/useRolEfectivo.js';
import AuthGate from './components/auth/AuthGate.jsx';
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
const SUPERADMIN_ROUTES = ['dashboard_global', 'sa_importaciones', 'sa_no_llamar', 'sa_resultados', 'sa_productos', 'sa_usuarios', 'sa_logs_actividad', 'sa_estado_modulos', 'sa_configuracion'];

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
const CONTACTS = getContactsDirectory();
const CLIENTS = listClients();
const SALES_CONTACTS_SEED = listCommercialContacts();
const SUPERVISOR_LOTS_SEED = listLots();

    const ROLE_NAV = [
      { path: 'dashboard_global', label: 'Vista general', caption: 'Control transversal', roles: ['superadministrador'], icon: Activity },
      { path: 'sa_importaciones', label: 'Importaciones', caption: 'CSV por tipo de carga', roles: ['superadministrador'], icon: Upload },
      { path: 'sa_no_llamar', label: 'Base No llamar', caption: 'Bloqueos de contacto', roles: ['superadministrador'], icon: Phone },
      { path: 'sa_resultados', label: 'Resultados telefónicos', caption: 'Historial de gestiones', roles: ['superadministrador'], icon: PhoneCall },
      { path: 'sa_productos', label: 'Productos', caption: 'Catálogo comercial', roles: ['superadministrador'], icon: Briefcase },
      { path: 'sa_usuarios', label: 'Usuarios y roles', caption: 'Accesos del sistema', roles: ['superadministrador'], icon: UserCheck },
      { path: 'sa_logs_actividad', label: 'Logs y actividad', caption: 'Monitoreo e inactividad', roles: ['superadministrador'], icon: Zap },
      { path: 'sa_estado_modulos', label: 'Estado de módulos', caption: 'Visibilidad por rol', roles: ['superadministrador'], icon: Layers },
      { path: 'sa_configuracion', label: 'Configuración', caption: 'Identidad y parámetros', roles: ['superadministrador'], icon: Settings },
      { path: 'dashboard', label: 'Dashboard', caption: 'Resumen principal', roles: ['director', 'supervisor', 'vendedor', 'operaciones'], icon: Activity },
      { path: 'contactos', label: 'Contactos', caption: 'Base comercial', roles: ['director', 'vendedor'], icon: Users, badge: 1240 },
      { path: 'clientes', label: 'Clientes', caption: 'Cartera activa', roles: ['director', 'vendedor', 'operaciones'], icon: UserCheck },
      { path: 'base_general', label: 'Base general', caption: 'Carga y preparacion', roles: ['supervisor'], icon: Users, badge: 1240 },
      { path: 'lotes', label: 'Lotes', caption: 'Asignacion comercial', roles: ['supervisor'], icon: Layers },
      { path: 'numeros_error', label: 'Numeros con errores', caption: 'Fuera de flujo comercial', roles: ['supervisor'], icon: AlertTriangle },
      { path: 'seguimiento_vendedores', label: 'Seguimiento vendedores', caption: 'Resumen operativo', roles: ['supervisor'], icon: BarChart3 },
      { path: 'agenda', label: 'Agenda', caption: 'Compromisos del día', roles: ['vendedor'], icon: Calendar, badge: 5 },
      { path: 'soporte', label: 'Atención al cliente', caption: 'Tickets y llamadas', roles: ['atencion_cliente'], icon: Headphones, badge: 12 },
      { path: 'contratos', label: 'Contrataciones', caption: 'Altas y renovaciones', roles: ['director', 'supervisor', 'operaciones'], icon: FileText },
      { path: 'pagos', label: 'Pagos', caption: 'Cobranza y convenios', roles: ['director', 'operaciones'], icon: CreditCard },
      { path: 'servicios', label: 'Servicios', caption: 'Circuito operativo', roles: ['director', 'operaciones'], icon: Briefcase, badge: 12 },
      { path: 'proveedores', label: 'Proveedores', caption: 'Red de soporte', roles: ['director', 'operaciones'], icon: Building2 },
      { path: 'equipo', label: 'Equipo', caption: 'Rendimiento comercial', roles: ['director', 'supervisor'], icon: Layers },
      { path: 'reportes', label: 'Reportes', caption: 'Exportables', roles: ['director', 'supervisor'], icon: BarChart3 },
      { path: 'config', label: 'Configuración', caption: 'Parámetros del sistema', roles: ['director'], icon: Settings }
    ];

    const statusVariant = (label) => {
      if (['Al día', 'Al dia', 'Gestionado', 'Finalizado', 'Excelente'].includes(label)) return 'success';
      if (['Pendiente', 'En gestión', 'En gestion', 'Control', 'Atención', 'Atencion'].includes(label)) return 'warning';
      return 'info';
    };

    const initials = (name) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    const toStatusColor = (hex, alpha = 1) => {
      const clean = String(hex || '').replace('#', '');
      if (clean.length !== 6) return 'rgba(15, 23, 42, 0.4)';
      const r = Number.parseInt(clean.slice(0, 2), 16);
      const g = Number.parseInt(clean.slice(2, 4), 16);
      const b = Number.parseInt(clean.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const ESTADOS_USUARIO = {
      disponible: {
        id: 'disponible',
        label: 'Disponible',
        icon: CheckCircle2,
        color: '#22c55e',
        bloqueaPantalla: false,
        mensaje: 'Listo para atender gestiones'
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

    function UserProfileMenu({ user, roleLabel, estadoActual, onEstadoChange, onLogout, onOpenProfile }) {
      const [menuOpen, setMenuOpen] = React.useState(false);
      const menuRef = React.useRef(null);
      const status = resolveEstadoUsuario(estadoActual);
      const StatusIcon = status.icon;

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
          <button className="user-card user-card-button" onClick={() => setMenuOpen((prev) => !prev)}>
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
              </div>
              <div className="user-menu-separator"></div>
              <div className="user-menu-section-title">Cambiar estado</div>
              <div className="user-menu-actions" style={{ paddingTop: 2 }}>
                {Object.values(ESTADOS_USUARIO).map((item) => {
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
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.7rem', fontWeight: 800, color: toStatusColor(status.color, 1) }}>{status.label}</div>
              <div style={{ color: 'rgba(226,232,240,0.78)', marginTop: 4 }}>{status.mensaje}</div>
            </div>
            <div style={{ padding: 22, textAlign: 'center' }}>
              <div style={{ color: 'rgba(148,163,184,0.95)', fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Tiempo transcurrido</div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '3.1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.03em' }}>{minutes}:{secs}</div>
              <div style={{ marginTop: 12, borderRadius: 14, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(2,6,23,0.5)', padding: '10px 12px', color: 'rgba(203,213,225,0.86)' }}>
                Iniciado a las {startedLabel}
              </div>
              <button className="button primary" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={onResume}>
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

    function NotificationsDropdown({ userId, onNavigate }) {
      const [open, setOpen] = React.useState(false);
      const [items, setItems] = React.useState(() => listNotifications({ userId, limit: 15 }));
      const panelRef = React.useRef(null);
      const triggerRef = React.useRef(null);

      const refreshNotifications = React.useCallback(() => {
        setItems(listNotifications({ userId, limit: 15 }));
      }, [userId]);

      React.useEffect(() => {
        refreshNotifications();
      }, [refreshNotifications]);

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

      const handleMarkAllRead = () => {
        markAllAsRead({ userId, limit: 15 });
        refreshNotifications();
      };

      const handleNotificationClick = (notification) => {
        if (!notification.read) {
          markAsRead({ userId, notificationId: notification.id });
        }
        refreshNotifications();
        if (notification.link) {
          onNavigate(notification.link);
          setOpen(false);
        }
      };

      return (
        <div className="notifications-wrap">
          <button
            ref={triggerRef}
            className="icon-button"
            title="Notificaciones"
            onClick={() => setOpen((prev) => !prev)}
          >
            <Bell size={20} color="#152235" />
            {unreadCount > 0 ? <span className="notification-dot">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
          </button>

          {open ? (
            <div ref={panelRef} className="notifications-panel">
              <div className="notifications-header">
                <h4>Notificaciones</h4>
                <button className="notifications-mark-all" onClick={handleMarkAllRead} disabled={items.length === 0}>
                  Marcar todo leído
                </button>
              </div>
              <div className="notifications-list">
                {items.length === 0 ? (
                  <div className="notifications-empty">Sin notificaciones recientes.</div>
                ) : (
                  items.map((notification) => {
                    const typeMeta = notificationTypeMeta[notification.type] || notificationTypeMeta.info;
                    const TypeIcon = typeMeta.icon;
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
                          <p className="notification-description">{notification.description}</p>
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
      const metrics = [
        { title: 'Equipo activo', value: '8 agentes', change: 2.1, label: 'asistencia', trend: 'up', icon: Users, bg: 'rgba(37,99,235,0.12)', color: '#2563eb' },
        { title: 'Ventas del día', value: '24', change: 15, label: 'vs. ayer', trend: 'up', icon: TrendingUp, bg: 'rgba(21,128,61,0.12)', color: '#15803d' },
        { title: 'Conversión', value: '28%', change: 3.0, label: 'sobre promedio', trend: 'up', icon: Target, bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' },
        { title: 'Lotes activos', value: '3', change: -8, label: 'en cola', trend: 'up', icon: Layers, bg: 'rgba(217,119,6,0.12)', color: '#d97706' }
      ];
      return (
        <div className="view">
          <section className="hero">
            <div className="hero-panel">
              <Tag variant="info">Supervisión en tiempo real</Tag>
              <h1 className="hero-title">Equipo comercial alineado, medido y accionable.</h1>
              <p className="hero-copy">La jornada muestra buen volumen de llamadas y mejor calidad de seguimiento. El foco está en sostener cierres y redistribuir contactos con mayor prioridad.</p>
              <div className="hero-kpis">
                <div className="hero-kpi"><div className="hero-kpi-label">Contactos calientes</div><div className="hero-kpi-value">63</div></div>
                <div className="hero-kpi"><div className="hero-kpi-label">Seguimientos vencidos</div><div className="hero-kpi-value">5</div></div>
                <div className="hero-kpi"><div className="hero-kpi-label">Tiempo medio</div><div className="hero-kpi-value">6m 12s</div></div>
              </div>
              <div className="hero-grid"></div>
            </div>
            <Panel title="Comandos del día" subtitle="Gestión táctica del supervisor"><div className="toolbar"><Button icon={<Layers size={18} />}>Crear lote</Button><Button variant="secondary" icon={<Filter size={18} />}>Filtrar equipo</Button><Button variant="ghost" icon={<Download size={18} />}>Exportar corte</Button></div></Panel>
          </section>
          <section className="metrics-grid">{metrics.map((item) => <MetricCard key={item.title} item={item} />)}</section>
          <section className="content-grid">
            <Panel className="span-8" title="Rendimiento del equipo" subtitle="Actividad consolidada del día">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Agente</th><th>Llamadas</th><th>Ventas</th><th>Conversión</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>{[{ name: 'Juan Pérez', calls: 45, sales: 8, conversion: '18%', status: 'Excelente' }, { name: 'Laura Fernández', calls: 39, sales: 6, conversion: '15%', status: 'Activo' }, { name: 'Pedro González', calls: 34, sales: 5, conversion: '14%', status: 'Activo' }, { name: 'Sofía Martínez', calls: 29, sales: 2, conversion: '7%', status: 'Atención' }].map((row) => <tr key={row.name}><td><div className="person"><div className="person-badge">{initials(row.name)}</div><strong>{row.name}</strong></div></td><td>{row.calls}</td><td>{row.sales}</td><td>{row.conversion}</td><td><Tag variant={statusVariant(row.status)}>{row.status}</Tag></td><td><Button variant="ghost" icon={<Eye size={16} />}>Ver</Button></td></tr>)}</tbody>
                </table>
              </div>
            </Panel>
            <Panel className="span-4" title="Calidad de seguimiento" subtitle="Distribución de gestiones">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={[{ day: 'Lun', score: 62 }, { day: 'Mar', score: 70 }, { day: 'Mié', score: 66 }, { day: 'Jue', score: 74 }, { day: 'Vie', score: 79 }]}>
                    <CartesianGrid stroke="rgba(20,34,53,0.08)" vertical={false} />
                    <XAxis dataKey="day" stroke="#69788d" />
                    <YAxis stroke="#69788d" />
                    <Tooltip contentStyle={{ borderRadius: 18, border: '1px solid rgba(20,34,53,0.08)' }} />
                    <Area type="monotone" dataKey="score" stroke="#2563eb" fill="rgba(37,99,235,0.18)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </section>
        </div>
      );
    }
    const salesStatusMeta = (status) => {
      const map = {
        venta: { label: 'Venta', bg: 'rgba(22,163,74,0.12)', color: '#15803d', border: 'rgba(22,163,74,0.3)' },
        seguimiento: { label: 'Seguimiento', bg: 'rgba(245,158,11,0.14)', color: '#b45309', border: 'rgba(245,158,11,0.3)' },
        no_contesta: { label: 'No contesta', bg: 'rgba(37,99,235,0.12)', color: '#1d4ed8', border: 'rgba(37,99,235,0.3)' },
        rechazo: { label: 'Rechazo', bg: 'rgba(100,116,139,0.16)', color: '#475569', border: 'rgba(100,116,139,0.3)' },
        rellamar: { label: 'Rellamar', bg: 'rgba(124,58,237,0.12)', color: '#7c3aed', border: 'rgba(124,58,237,0.3)' },
        dato_erroneo: { label: 'Dato erroneo', bg: 'rgba(190,24,93,0.12)', color: '#be185d', border: 'rgba(190,24,93,0.32)' }
      };
      return map[status] || map.seguimiento;
    };

    function SalesStatusBadge({ status, small = false }) {
      const meta = salesStatusMeta(status);
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: small ? '4px 8px' : '7px 11px', borderRadius: 999, border: '1px solid ' + meta.border, background: meta.bg, color: meta.color, fontWeight: 700, fontSize: small ? '0.73rem' : '0.8rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }}></span>{meta.label}</span>;
    }

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

    function SalesDashboard({ contacts, salesRecords, onGoRoute }) {
      const activeContacts = contacts.filter(isSalesActiveContact);
      const pendingAgenda = contacts.filter((contact) => shouldAppearInSalesAgenda(contact));
      const totalSales = countSales(salesRecords);
      const metrics = [
        { title: 'Contactos asignados', value: String(activeContacts.length), change: 0, label: 'lote recibido', trend: 'up', icon: Users, bg: 'rgba(37,99,235,0.12)', color: '#2563eb' },
        { title: 'Ventas cerradas', value: String(totalSales), change: 0, label: 'incluye familiares', trend: 'up', icon: CheckCircle2, bg: 'rgba(22,163,74,0.12)', color: '#15803d' },
        { title: 'Seguimientos pendientes', value: String(pendingAgenda.length), change: 0, label: 'agenda comercial', trend: 'up', icon: Calendar, bg: 'rgba(245,158,11,0.12)', color: '#b45309' }
      ];

      return (
        <div className="view">
          <section className="metrics-grid">{metrics.map((item) => <MetricCard key={item.title} item={item} />)}</section>
          <section className="content-grid">
            <Panel className="span-8" title="Operacion del dia" subtitle="Trabaja solo tus contactos asignados">
              <div className="list">
                {pendingAgenda.slice(0, 4).map((contact) => (
                  <div key={contact.id} className="status-item">
                    <div className="status-ring" style={{ background: 'rgba(15,118,110,0.12)', color: '#0f766e' }}><PhoneCall size={16} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{contact.name}</div>
                      <div style={{ color: 'var(--muted)' }}>Proxima accion: {formatNextAction(contact.nextAction)}</div>
                    </div>
                    <SalesStatusBadge status={contact.status} small />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel className="span-4" title="Flujo vendedor" subtitle="Supervisor asigna · vendedor gestiona">
              <div className="list">
                <div className="alert"><div><div style={{ fontWeight: 700 }}>1. Lote recibido</div><div style={{ color: 'var(--muted)' }}>No preparas base ni repartes leads.</div></div></div>
                <div className="alert"><div><div style={{ fontWeight: 700 }}>2. Gestion diaria</div><div style={{ color: 'var(--muted)' }}>Registra estado y accion siguiente.</div></div></div>
                <div className="alert"><div><div style={{ fontWeight: 700 }}>3. Cierre</div><div style={{ color: 'var(--muted)' }}>Venta pasa directo a clientes.</div></div></div>
              </div>
              <div className="toolbar" style={{ marginTop: 14 }}>
                <Button icon={<Users size={16} />} onClick={() => onGoRoute('contactos')}>Ir a contactos</Button>
                <Button variant="secondary" icon={<Calendar size={16} />} onClick={() => onGoRoute('agenda')}>Ver agenda</Button>
              </div>
            </Panel>
          </section>
        </div>
      );
    }

    function SalesContactsView({ contacts, selectedId, onSelect, onRegister, salesRecords, products, onAssignFamilySale, onUpdateContact }) {
      const activeContacts = contacts.filter(isSalesActiveContact);
      const selected = selectedId == null ? null : (contacts.find((contact) => contact.id === selectedId) || null);
      const [searchTerm, setSearchTerm] = React.useState('');

      const filteredContacts = React.useMemo(() => activeContacts.filter((contact) => {
        const haystack = [
          contact.name,
          contact.phone,
          contact.city,
          contact.documento || '',
          contact.email || ''
        ].join(' ').toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      }), [activeContacts, searchTerm]);

      return (
        <div className="view sales-contacts-view">
          <div className="sales-workspace">
            <section className="sales-list-card">
              <div className="sales-block-header">
                <h2>Contactos asignados</h2>
                <p>Gestiona solo tu lote operativo</p>
              </div>
              <div style={{ padding: '0 20px 12px' }}>
                <div className="searchbox" style={{ maxWidth: '100%' }}>
                  <Search size={18} color="#69788d" />
                  <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nombre, teléfono o documento..." />
                </div>
              </div>
              <div className="table-wrap sales-table-wrap">
                <table className="sales-contacts-table">
                  <thead>
                    <tr>
                      <th>Contacto</th>
                      <th>Teléfono</th>
                      <th>Ubicación</th>
                      <th>Estado de gestión</th>
                      <th>Última gestión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className={'support-row ' + (selected?.id === contact.id ? 'active' : '')}
                        onClick={() => onSelect(contact.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="person">
                            <div className="person-badge">{initials(contact.name)}</div>
                            <strong>{contact.name}</strong>
                          </div>
                        </td>
                        <td>
                          <a
                            href={'tel:' + contact.phone.replace(/\s/g, '')}
                            onClick={(event) => event.stopPropagation()}
                            style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}
                          >
                            {contact.phone}
                          </a>
                        </td>
                        <td>{contact.city}</td>
                        <td><SalesStatusBadge status={contact.status} small /></td>
                        <td>{contact.last}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredContacts.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay contactos activos para la búsqueda aplicada.</div> : null}
              </div>
            </section>

            <aside className={'sales-detail-card' + (selected ? ' open' : '')}>
              <div className="sales-block-header">
                <h2>Detalle del contacto</h2>
                <p>{selected ? selected.name : 'Sin contacto seleccionado'}</p>
              </div>
              {selected ? (
                <SalesContactDetail
                  contact={selected}
                  onRegister={onRegister}
                  onBack={() => onSelect(null)}
                  salesRecords={salesRecords}
                  products={products}
                  onAssignFamilySale={onAssignFamilySale}
                  onUpdateContact={onUpdateContact}
                />
              ) : (
                <div style={{ color: 'var(--muted)', padding: '0 20px 20px' }}>Selecciona un contacto para registrar gestión.</div>
              )}
            </aside>
          </div>
        </div>
      );
    }

    function SalesAgendaView({ contacts }) {
      const agendaRows = contacts
        .filter((contact) => shouldAppearInSalesAgenda(contact))
        .sort((a, b) => (a.nextAction > b.nextAction ? 1 : -1));

      return (
        <div className="view">
          <section className="content-grid">
            <Panel className="span-12" title="Agenda del vendedor" subtitle="Seguimientos y rellamadas pendientes">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Fecha</th><th>Hora</th><th>Contacto</th><th>Tipo de accion</th><th>Nota</th><th>Estado</th></tr></thead>
                  <tbody>
                    {agendaRows.map((contact) => {
                      const parsed = contact.nextAction.includes('T') ? new Date(contact.nextAction) : null;
                      const dateText = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString('es-UY') : contact.nextAction;
                      const timeText = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : '-';
                      return <tr key={contact.id}><td>{dateText}</td><td>{timeText}</td><td><strong>{contact.name}</strong></td><td>{salesStatusMeta(contact.status).label}</td><td>{contact.notes?.[0] || '-'}</td><td><SalesStatusBadge status={contact.status} small /></td></tr>;
                    })}
                  </tbody>
                </table>
                {!agendaRows.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay seguimientos ni rellamadas pendientes.</div> : null}
              </div>
            </Panel>
          </section>
        </div>
      );
    }

    function SalesClientsView({ salesRecords, productsById }) {
      const soldRows = salesRecords.slice().sort((a, b) => b.fechaVenta.localeCompare(a.fechaVenta));
      return (
        <div className="view">
          <section className="content-grid">
            <Panel className="span-12" title="Clientes cerrados en venta" subtitle="Incluye titular y familiares asignados">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Cliente</th><th>Telefono</th><th>Producto</th><th>Cuota</th><th>Tipo</th><th>Estado</th></tr></thead>
                  <tbody>
                    {soldRows.map((sale) => (
                      <tr key={sale.id}>
                        <td><div className="person"><div className="person-badge">{initials(sale.clienteNombre)}</div><strong>{sale.clienteNombre}</strong></div></td>
                        <td>{sale.clienteTelefono}</td>
                        <td>{productsById[sale.productoId]?.nombre || '-'}</td>
                        <td>{sale.cuota ? ('$ ' + Number(sale.cuota).toLocaleString('es-UY')) : '-'}</td>
                        <td>{sale.grupoFamiliar ? ('Familiar · ' + (sale.relacionConTitular || '-')) : 'Venta principal'}</td>
                        <td><SalesStatusBadge status="venta" small /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!soldRows.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>Aún no hay clientes cerrados en venta.</div> : null}
              </div>
            </Panel>
          </section>
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
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, marginBottom: 10 }}>Registrar gestión</div>
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
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, marginBottom: 10 }}>Historial de gestiones</div>
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
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, marginBottom: 10 }}>Ventas generadas</div>
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
        sin_asignar: { label: 'Sin asignar', variant: 'warning' },
        asignado: { label: 'Asignado', variant: 'info' },
        en_gestion: { label: 'En gestion', variant: 'success' },
        finalizado: { label: 'Finalizado', variant: 'danger' }
      };
      return map[status] || map.sin_asignar;
    };

    function SupervisorModule({ route, contacts, lots, onBulkAssignContacts, onCreateLot, onAssignLotSeller, onCloseLot, onReactivateError }) {
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
      const [wizardError, setWizardError] = React.useState('');
      const [basePage, setBasePage] = React.useState(1);
      const basePageSize = 12;

      const sellers = React.useMemo(() => {
        const base = contacts.map((contact) => contact.assignedTo).filter(Boolean);
        return [...new Set([...base, 'Laura Techera', 'Sofia Rojas'])];
      }, [contacts]);

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
        return { ...lot, contacts: lotContacts, count: lotContacts.length, progress, finalizable };
      }), [lots, contacts]);

      const selectedLot = lotSummaries.find((lot) => lot.id === selectedLotId) || lotSummaries[0] || null;

      const sellerSummary = React.useMemo(() => sellers.map((seller) => {
        const scoped = contacts.filter((contact) => contact.assignedTo === seller);
        return {
          seller,
          assigned: scoped.length,
          venta: scoped.filter((contact) => contact.status === 'venta').length,
          seguimiento: scoped.filter((contact) => contact.status === 'seguimiento').length,
          rellamar: scoped.filter((contact) => contact.status === 'rellamar').length,
          no_contesta: scoped.filter((contact) => contact.status === 'no_contesta').length,
          rechazo: scoped.filter((contact) => contact.status === 'rechazo').length,
          dato_erroneo: scoped.filter((contact) => contact.status === 'dato_erroneo').length
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
              <Panel className="span-7" title="Gestion de lotes" subtitle="Crea, asigna y controla el avance por lote" action={<Button icon={<Plus size={16} />} onClick={createLot}>Crear lote</Button>}>
                <div className="toolbar" style={{ marginBottom: 12 }}>
                  <input className="input" style={{ maxWidth: 280 }} placeholder="Nombre de lote" value={lotNameDraft} onChange={(event) => setLotNameDraft(event.target.value)} />
                  <Button variant="secondary" icon={<Layers size={16} />} onClick={createLot}>Guardar lote</Button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Lote</th><th>Contactos</th><th>Estado</th><th>Vendedor</th><th>Creacion</th><th>Progreso</th></tr></thead>
                    <tbody>
                      {lotSummaries.map((lot) => (
                        <tr key={lot.id} className="support-row" onClick={() => setSelectedLotId(lot.id)} style={{ cursor: 'pointer', background: selectedLot?.id === lot.id ? 'rgba(15,118,110,0.08)' : 'transparent' }}>
                          <td><strong>{lot.name}</strong><div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{lot.id}</div></td>
                          <td>{lot.count}</td>
                          <td><Tag variant={lotStatusMeta(lot.status).variant}>{lotStatusMeta(lot.status).label}</Tag></td>
                          <td>{lot.seller || '-'}</td>
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
                    <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Vendedor asignado</span><strong>{selectedLot.seller || '-'}</strong></div>
                    <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Cantidad de contactos</span><strong>{selectedLot.count}</strong></div>
                    <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Estado</span><Tag variant={lotStatusMeta(selectedLot.status).variant}>{lotStatusMeta(selectedLot.status).label}</Tag></div>
                    <div className="mini-stat"><span style={{ color: 'var(--muted)' }}>Fecha de creacion</span><strong>{selectedLot.createdAt}</strong></div>
                    <div className="toolbar"><select className="input" style={{ width: '100%' }} value={lotSellerDraft} onChange={(event) => setLotSellerDraft(event.target.value)}><option value="">Asignar vendedor...</option>{sellers.map((seller) => <option key={seller} value={seller}>{seller}</option>)}</select></div>
                    <div className="toolbar"><Button icon={<UserCheck size={16} />} onClick={assignSellerToLot}>Asignar vendedor</Button><Button variant="secondary" icon={<CheckCircle2 size={16} />} onClick={closeLot}>Cerrar lote</Button></div>
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
                    <thead><tr><th>Contacto</th><th>Telefono</th><th>Vendedor</th><th>Fecha</th><th>Motivo</th><th>Accion</th></tr></thead>
                    <tbody>
                      {errorNumbers.map((contact) => <tr key={contact.id}><td><strong>{contact.name}</strong></td><td>{contact.phone}</td><td>{contact.assignedTo || '-'}</td><td>{contact.last}</td><td>{contact.history?.[0]?.note || 'Dato incorrecto'}</td><td><div className="toolbar"><Button variant="ghost" icon={<Eye size={16} />}>Revisar</Button><Button variant="secondary" icon={<Edit3 size={16} />}>Corregir</Button><Button icon={<Activity size={16} />} onClick={() => reactivateErrorNumber(contact.id)}>Reactivar</Button></div></td></tr>)}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </section>
          </div>
        );
      }

      if (route === 'seguimiento_vendedores') {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-12" title="Seguimiento de vendedores" subtitle="Vista resumida operativa">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Vendedor</th><th>Asignados</th><th>Ventas</th><th>Seguimientos</th><th>Rellamadas</th><th>No contesta</th><th>Rechazos</th><th>Datos erroneos</th></tr></thead>
                    <tbody>
                      {sellerSummary.map((row) => <tr key={row.seller}><td><strong>{row.seller}</strong></td><td>{row.assigned}</td><td>{row.venta}</td><td>{row.seguimiento}</td><td>{row.rellamar}</td><td>{row.no_contesta}</td><td>{row.rechazo}</td><td>{row.dato_erroneo}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </section>
          </div>
        );
      }

      return (
        <div className="view">
          <section className="content-grid">
            <Panel className="span-12" title="Base general" subtitle="Importa, revisa y asigna contactos">
              <div className="toolbar" style={{ marginBottom: 12 }}>
                <div className="searchbox" style={{ maxWidth: 360 }}><Search size={18} color="#69788d" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar contacto, telefono o vendedor..." /></div>
                <select className="input" style={{ width: 180 }} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>{sourceOptions.map((source) => <option key={source} value={source}>{source === 'todos' ? 'Todas las fuentes' : source}</option>)}</select>
                <select className="input" style={{ width: 160 }} value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>{cityOptions.map((city) => <option key={city} value={city}>{city === 'todos' ? 'Todas las zonas' : city}</option>)}</select>
                <select className="input" style={{ width: 180 }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  {statusOptions.map((status) => <option key={status} value={status}>{status === 'todos' ? 'Todos los estados' : salesStatusMeta(status).label}</option>)}
                </select>
                <select className="input" style={{ width: 155 }} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>{dateOptions.map((date) => <option key={date} value={date}>{date === 'todos' ? 'Todas las fechas' : date}</option>)}</select>
                <Button variant="secondary" icon={<Filter size={16} />}>Filtrar</Button>
                <Button icon={<Upload size={16} />} onClick={() => setShowImport((value) => !value)}>Importar base</Button>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={openWizard} disabled={!selectedIds.length}>Crear lote</Button>
                <div className="pill">{selectedIds.length} seleccionados</div>
              </div>

              {showImport ? (
                <div style={{ marginBottom: 12, borderRadius: 16, padding: 12, background: 'rgba(20,34,53,0.04)', border: '1px solid rgba(20,34,53,0.08)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Importacion de base</div>
                  <div className="toolbar">
                    <input className="input" style={{ maxWidth: 260 }} placeholder="Archivo CSV o XLSX" value={importFile} onChange={(event) => setImportFile(event.target.value)} />
                    <select className="input" style={{ maxWidth: 220 }}><option>Mapeo: Nombre / Telefono / Ciudad</option></select>
                    <Button icon={<CheckCircle2 size={16} />} onClick={() => setShowImport(false)}>Confirmar importacion</Button>
                  </div>
                </div>
              ) : null}

              <div className="table-wrap">
                <table>
                  <thead><tr><th></th><th>Contacto</th><th>Telefono</th><th>Ubicacion</th><th>Fuente</th><th>Estado general</th><th>Asignado a</th><th>Fecha de carga</th><th>Accion</th></tr></thead>
                  <tbody>
                    {pagedFilteredBase.map((contact) => (
                      <tr key={contact.id}>
                        <td><input type="checkbox" checked={selectedIds.includes(contact.id)} onChange={() => toggleSelection(contact.id)} /></td>
                        <td><strong>{contact.name}</strong></td>
                        <td>{contact.phone}</td>
                        <td>{contact.city}</td>
                        <td>{contact.source}</td>
                        <td><SalesStatusBadge status={contact.status} small /></td>
                        <td>{contact.assignedTo || '-'}</td>
                        <td>{contact.loadedAt}</td>
                        <td><div className="toolbar"><Button variant="ghost" icon={<Edit3 size={15} />}>Reasignar</Button><Button variant="ghost" icon={<Layers size={15} />}>Mover lote</Button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredBase.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay contactos para los filtros aplicados.</div> : null}
              </div>
              {filteredBase.length ? (
                <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                  <span className="pill">Página {safeBasePage} de {baseTotalPages} · {filteredBase.length} contactos</span>
                  <div className="toolbar">
                    <Button variant="ghost" onClick={() => setBasePage((p) => Math.max(1, p - 1))} disabled={safeBasePage <= 1}>Anterior</Button>
                    <Button variant="ghost" onClick={() => setBasePage((p) => Math.min(baseTotalPages, p + 1))} disabled={safeBasePage >= baseTotalPages}>Siguiente</Button>
                  </div>
                </div>
              ) : null}

              {showLotWizard ? (
                <div className="lot-wizard-overlay" onClick={() => setShowLotWizard(false)}>
                  <div className="lot-wizard" onClick={(event) => event.stopPropagation()}>
                    <div className="lot-wizard-header">
                      <div>
                        <h3>Crear y asignar lote</h3>
                        <p>Proceso en 3 pasos con {selectedIds.length} contactos seleccionados.</p>
                      </div>
                      <button className="icon-button" style={{ width: 36, height: 36 }} onClick={() => setShowLotWizard(false)}><X size={16} color="#152235" /></button>
                    </div>

                    <div className="lot-step">
                      <span className="lot-step-index">1</span>
                      <div>
                        <h4>Contactos seleccionados</h4>
                        <p>Ya tienes la selección lista desde la base general.</p>
                      </div>
                    </div>

                    <div className="lot-step">
                      <span className="lot-step-index">2</span>
                      <div style={{ flex: 1 }}>
                        <h4>Datos del lote</h4>
                        <div className="list" style={{ gap: 8, marginTop: 8 }}>
                          <input className="input" placeholder="Nombre del lote (ej. Campaña Marzo - Litoral)" value={wizardLotName} onChange={(event) => setWizardLotName(event.target.value)} />
                          <div className="toolbar">
                            <input className="input" type="date" value={wizardDeadline} onChange={(event) => setWizardDeadline(event.target.value)} style={{ maxWidth: 200 }} />
                            <select className="input" value={wizardPriority} onChange={(event) => setWizardPriority(event.target.value)} style={{ maxWidth: 180 }}>
                              <option value="normal">Prioridad normal</option>
                              <option value="urgente">Prioridad urgente</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lot-step">
                      <span className="lot-step-index">3</span>
                      <div style={{ flex: 1 }}>
                        <h4>Asignación</h4>
                        <div className="toolbar" style={{ marginTop: 8 }}>
                          <button className={'button ' + (wizardAssignMode === 'individual' ? 'primary' : 'secondary')} onClick={() => setWizardAssignMode('individual')}>Individual</button>
                          <button className={'button ' + (wizardAssignMode === 'grupo' ? 'primary' : 'secondary')} onClick={() => setWizardAssignMode('grupo')}>Distribuir entre grupo</button>
                        </div>
                        {wizardAssignMode === 'individual' ? (
                          <select className="input" style={{ marginTop: 8 }} value={wizardSeller} onChange={(event) => setWizardSeller(event.target.value)}>
                            <option value="">Selecciona vendedor...</option>
                            {sellers.map((seller) => <option key={seller} value={seller}>{seller}</option>)}
                          </select>
                        ) : (
                          <div className="lot-seller-grid">
                            {sellers.map((seller) => (
                              <label key={seller} className="lot-seller-item">
                                <input type="checkbox" checked={wizardGroupSellers.includes(seller)} onChange={() => toggleWizardGroupSeller(seller)} />
                                <span>{seller}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {wizardError ? <div style={{ color: '#be123c', fontWeight: 700, fontSize: '0.85rem' }}>{wizardError}</div> : null}

                    <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                      <Button variant="ghost" onClick={() => setShowLotWizard(false)}>Cancelar</Button>
                      <Button icon={<CheckCircle2 size={16} />} onClick={createLotFromSelection}>Confirmar lote</Button>
                    </div>
                  </div>
                </div>
              ) : null}
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
      const [clientSearch, setClientSearch] = React.useState('');
      const [lookupLoading, setLookupLoading] = React.useState(false);
      const [lookupError, setLookupError] = React.useState('');
      const [lookupResults, setLookupResults] = React.useState([]);
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
        productoContratoId: ''
      });

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

      const openManualForm = (client, forcedType = null) => {
        const nextType = forcedType || 'info_servicio';
        const activeProducts = listActiveContactProducts(client.id);
        const autoSelectedProductId = nextType === 'solicitud_baja' && activeProducts.length === 1
          ? activeProducts[0].id
          : '';
        setSelectedClient(client);
        setAvailableProducts(activeProducts);
        setShowManualForm(true);
        setManualError('');
        setManualDraft({
          tipoSolicitud: nextType,
          tipoSolicitudManual: '',
          resumen: '',
          prioridad: 'media',
          productoContratoId: autoSelectedProductId
        });
      };

      const submitManualTicket = async () => {
        if (!selectedClient) return;
        if (!manualDraft.resumen.trim()) {
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
            resumen: manualDraft.resumen.trim(),
            prioridad: manualDraft.prioridad,
            productoContratoId: manualDraft.productoContratoId || ''
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
            <Panel className="span-12" title="Buscar cliente" subtitle="Busca en cartera y genera nuevas solicitudes manuales">
              <div style={{ marginBottom: 14, borderRadius: 16, padding: 12, background: 'rgba(20,34,53,0.04)', border: '1px solid rgba(20,34,53,0.08)' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Busqueda de clientes en cartera</div>
                <div className="toolbar" style={{ alignItems: 'stretch' }}>
                  <div className="searchbox" style={{ maxWidth: 460 }}><Search size={18} color="#69788d" /><input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Buscar por documento, nombre, telefono o numero de cliente..." /></div>
                  <div className="pill">{lookupLoading ? 'Buscando...' : `${lookupResults.length} encontrados`}</div>
                </div>
                {lookupError ? <div style={{ marginTop: 8, color: '#be123c', fontWeight: 700 }}>{lookupError}</div> : null}
                {lookupResults.length ? (
                  <div className="list" style={{ marginTop: 10 }}>
                    {lookupResults.slice(0, 6).map((client) => (
                      <div key={client.id} className="status-item" style={{ alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{client.nombre}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '0.86rem' }}>{client.numeroCliente} · CI {client.documento} · {client.telefono} · {client.productoActualNombre}</div>
                        </div>
                        <div className="toolbar">
                          <Button variant="secondary" icon={<Plus size={15} />} onClick={() => openManualForm(client)}>Nueva gestión</Button>
                          <Button icon={<Briefcase size={15} />} onClick={() => openManualForm(client, 'solicitud_servicio')}>Nueva solicitud de servicio</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {showManualForm && selectedClient ? (
                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(20,34,53,0.08)', paddingTop: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Crear solicitud para {selectedClient.nombre}</div>
                    <div className="toolbar">
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
                        <option value="solicitud_baja">Solicitud de baja</option>
                        <option value="cambio_metodo_pago">Cambio de método de pago</option>
                        <option value="reclamo">Reclamo</option>
                        <option value="solicitud_servicio">Solicitud de servicio</option>
                        <option value="otro">Otro</option>
                      </select>
                      <select className="input" style={{ width: 180 }} value={manualDraft.prioridad} onChange={(event) => setManualDraft((prev) => ({ ...prev, prioridad: event.target.value }))}>
                        <option value="baja">Prioridad baja</option>
                        <option value="media">Prioridad media</option>
                        <option value="alta">Prioridad alta</option>
                      </select>
                    </div>
                    {manualDraft.tipoSolicitud === 'solicitud_baja' ? (
                      <div style={{ marginTop: 8 }}>
                        {availableProducts.length > 1 ? (
                          <>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>¿Sobre qué producto quiere dar la baja?</div>
                            <select
                              className="input"
                              value={manualDraft.productoContratoId}
                              onChange={(event) => setManualDraft((prev) => ({ ...prev, productoContratoId: event.target.value }))}
                            >
                              <option value="">Seleccionar producto</option>
                              {availableProducts.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.productoNombre} · Alta {product.fechaAlta ? new Date(product.fechaAlta).toLocaleDateString('es-UY') : 's/f'}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : null}
                        {availableProducts.length === 1 ? (
                          <div className="pill">
                            Producto seleccionado: {availableProducts[0].productoNombre}
                          </div>
                        ) : null}
                        {!availableProducts.length ? (
                          <div style={{ color: '#be123c', fontWeight: 700 }}>
                            Este contacto no tiene productos activos para solicitar baja.
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {manualDraft.tipoSolicitud === 'otro' ? <input className="input" style={{ marginTop: 8 }} placeholder="Tipo de solicitud manual" value={manualDraft.tipoSolicitudManual} onChange={(event) => setManualDraft((prev) => ({ ...prev, tipoSolicitudManual: event.target.value }))} /> : null}
                    <textarea className="input" rows="3" style={{ marginTop: 8 }} placeholder="Detalle de la solicitud" value={manualDraft.resumen} onChange={(event) => setManualDraft((prev) => ({ ...prev, resumen: event.target.value }))}></textarea>
                    {manualError ? <div style={{ marginTop: 8, color: '#be123c', fontWeight: 700 }}>{manualError}</div> : null}
                    <div className="toolbar" style={{ marginTop: 10 }}>
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
                  <thead><tr><th>ID</th><th>Cliente</th><th>Telefono</th><th>Tipo de solicitud</th><th>Resumen</th><th>Estado</th><th>Hora</th></tr></thead>
                  <tbody>
                    {visibleTickets.map((ticket) => (
                      <tr key={ticket.id} className="support-row" onClick={() => onSelect(ticket.id)} style={{ cursor: 'pointer', background: selectedId === ticket.id ? 'rgba(15,118,110,0.08)' : 'transparent' }}>
                        <td><div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Hash size={14} /><strong>{ticket.id}</strong></div></td>
                        <td><div><div style={{ fontWeight: 700 }}>{ticket.cliente}</div><div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{ticket.agente}</div></div></td>
                        <td><a href={'tel:' + ticket.telefono.replace(/\s/g, '')} onClick={(event) => event.stopPropagation()} style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}>{ticket.telefono}</a></td>
                        <td><span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, background: 'rgba(20,34,53,0.06)', color: '#334155' }}>{supportRequestTypeLabel(ticket)}</span></td>
                        <td style={{ maxWidth: 330, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.resumen}</td>
                        <td><SupportStatusBadge status={supportTicketDisplayStatus(ticket)} pulse={supportTicketDisplayStatus(ticket) === 'nuevo' || supportTicketDisplayStatus(ticket) === 'servicio_iniciado'} small /></td>
                        <td>{ticket.hora}</td>
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

      React.useEffect(() => {
        setStatusDraft(ticket.esSolicitudServicio ? ticket.estadoServicio : ticket.estado);
        setNote('');
        setCloseOutcome(ticket.resultadoRetencion || '');
        setCloseError('');
      }, [ticket.id, ticket.estado, ticket.estadoServicio, ticket.esSolicitudServicio, ticket.resultadoRetencion]);

      const pushNote = () => {
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

      const closeCurrentTicket = () => {
        if (isCancellationTicket && !canCloseCancellation) {
          setCloseError('Debes elegir si el resultado fue retenido o baja confirmada.');
          return;
        }
        setCloseError('');
        onCloseTicket({ outcome: closeOutcome });
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
              title={'Solicitud #' + ticket.id}
              subtitle={'Tipo: ' + supportRequestTypeLabel(ticket) + ' · Creado ' + ticket.hora + ' por ' + ticket.agente}
              action={<div className="toolbar"><Button variant="ghost" icon={<ArrowDownRight size={16} />} onClick={onBack}>Volver</Button></div>}
            >
              <div className="toolbar" style={{ marginBottom: 14 }}>
                <select className="input" style={{ width: 190 }} value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                  {ticket.esSolicitudServicio ? (
                    <>
                      <option value="iniciado">Iniciado</option>
                      <option value="en_gestion">En gestión</option>
                      <option value="finalizado">Finalizado</option>
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
                <Button variant="secondary" icon={<Activity size={16} />} onClick={() => onStatusChange(statusDraft)}>Cambiar estado</Button>
                <a className="button ghost" href={'tel:' + ticket.telefono.replace(/\s/g, '')}><PhoneCall size={16} />Llamar cliente</a>
                {!ticket.esSolicitudServicio ? <Button variant="ghost" icon={<Briefcase size={16} />} onClick={onDerive}>Derivar a operaciones</Button> : null}
                <Button icon={<CheckCircle2 size={16} />} onClick={closeCurrentTicket}>Cerrar ticket</Button>
              </div>
              {isCancellationTicket ? (
                <div style={{ marginTop: -4, marginBottom: 14, borderRadius: 14, padding: 10, border: '1px solid rgba(15,118,110,0.2)', background: 'rgba(15,118,110,0.06)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Resultado de cierre de solicitud de baja</div>
                  <div className="toolbar">
                    <select className="input" style={{ width: 240 }} value={closeOutcome} onChange={(event) => setCloseOutcome(event.target.value)}>
                      <option value="">Seleccionar resultado</option>
                      <option value="retenido">Retenido</option>
                      <option value="baja_confirmada">Baja confirmada</option>
                    </select>
                    <div className="pill">{ticket.productoNombre || 'Sin producto'}</div>
                  </div>
                  {closeError ? <div style={{ marginTop: 8, color: '#be123c', fontWeight: 700 }}>{closeError}</div> : null}
                </div>
              ) : null}

              <div className="list">
                <div className="status-item"><div className="status-ring" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}><User size={18} /></div><div><div style={{ fontWeight: 700 }}>{ticket.cliente}</div><a href={'tel:' + ticket.telefono.replace(/\s/g, '')} style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}>{ticket.telefono}</a></div></div>
                <div className="status-item"><div className="status-ring" style={{ background: 'rgba(15,118,110,0.12)', color: '#0f766e' }}><Bot size={18} /></div><div><div style={{ fontWeight: 700, marginBottom: 4 }}>{ticket.esSolicitudServicio ? 'Detalle de solicitud' : 'Resumen IA'}</div><div style={{ color: 'var(--muted)' }}>{ticket.resumen}</div></div></div>
              </div>

              <div style={{ marginTop: 16 }}>
                <button className="button secondary" onClick={() => setShowTranscript((value) => !value)}><FileText size={16} />{showTranscript ? 'Ocultar transcripción' : 'Ver transcripción'}</button>
                {showTranscript ? <div style={{ marginTop: 12, borderRadius: 16, padding: 14, background: 'rgba(20,34,53,0.04)', border: '1px solid rgba(20,34,53,0.08)' }}>{transcript.map((line) => <div key={line} style={{ marginBottom: 8, color: line.startsWith('IA:') ? '#0f766e' : 'var(--muted)', fontSize: '0.9rem' }}>{line}</div>)}</div> : null}
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, marginBottom: 10 }}>Notas internas</div>
                <div className="list" style={{ marginBottom: 12 }}>
                  {(ticket.notas || []).map((item) => <div key={item.autor + item.hora + item.texto} className="alert"><div><div style={{ fontWeight: 700 }}>{item.autor} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {item.hora}</span></div><div style={{ color: 'var(--muted)' }}>{item.texto}</div></div></div>)}
                </div>
                <div className="toolbar"><input className="input" value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') pushNote(); }} placeholder="Agregar nota rápida..." /><Button icon={<Send size={16} />} onClick={pushNote}>Guardar</Button></div>
              </div>

              <div style={{ marginTop: 18, borderTop: '1px solid rgba(20,34,53,0.08)', paddingTop: 14 }}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, marginBottom: 10 }}>Historial del ticket</div>
                <div className="list">
                  {timeline.length ? timeline.map((event) => <div key={event.at + event.event} className="alert"><div><div style={{ fontWeight: 700 }}>{event.event}</div><div style={{ color: 'var(--muted)' }}>{event.at}</div></div></div>) : <div style={{ color: 'var(--muted)' }}>Sin eventos para este ticket.</div>}
                </div>
              </div>
            </Panel>

            <div className="span-4" style={{ display: 'grid', gap: 14 }}>
              <Panel title="Historial real del contacto" subtitle="Productos asociados y su ciclo de vida">
                {lifecycle?.productos?.length ? (
                  <div className="list">
                    {lifecycle.productos.map((product) => {
                      const statusStyles = product.estadoProducto === 'baja'
                        ? { bg: 'rgba(190,24,93,0.12)', color: '#be185d', border: 'rgba(190,24,93,0.25)' }
                        : { bg: 'rgba(22,163,74,0.12)', color: '#15803d', border: 'rgba(22,163,74,0.25)' };
                      return (
                        <div key={product.id} className="alert" style={{ border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(20,34,53,0.03)' }}>
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                              <strong>{product.productoNombre}</strong>
                              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 999, fontSize: '0.76rem', fontWeight: 700, background: statusStyles.bg, color: statusStyles.color, border: '1px solid ' + statusStyles.border }}>
                                {product.estadoProducto}
                              </span>
                            </div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.84rem', marginTop: 6 }}>
                              Alta: {formatLifecycleDate(product.fechaAlta)} · Baja: {formatLifecycleDate(product.fechaBaja)}
                            </div>
                            {product.tickets?.length ? (
                              <div style={{ marginTop: 8 }}>
                                {product.tickets.slice(0, 3).map((relatedTicket) => (
                                  <div key={relatedTicket.id} style={{ fontSize: '0.82rem', color: '#475569', marginTop: 3 }}>
                                    #{relatedTicket.id} · {supportRequestTypeLabel(relatedTicket)} · {relatedTicket.resultadoRetencion || supportTicketDisplayStatus(relatedTicket)}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: 'var(--muted)' }}>Sin productos asociados en historial.</div>
                )}
              </Panel>

              <Panel title="Historial del cliente" subtitle="Solicitudes anteriores del mismo cliente">
                {clientHistory.length ? (
                  <div className="list">
                    {clientHistory.map((item) => (
                      <button key={item.id} className="alert" style={{ textAlign: 'left', border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(20,34,53,0.03)' }} onClick={() => onOpenTicket(item.id)}>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>Solicitud #{item.id}</strong><SupportStatusBadge status={supportTicketDisplayStatus(item)} small /></div>
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
      };

      const backToInbox = () => setView('listado');

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
        setTickets((prev) => prev.map((ticket) => ticket.id === updated.id ? updated : ticket));
        setSelectedId(updated.id);
      };

      const deriveTicket = async () => {
        if (!selectedTicket) return;
        const updated = await deriveTicketToOperations(selectedTicket.id);
        setTickets((prev) => prev.map((ticket) => ticket.id === updated.id ? updated : ticket));
        setSelectedId(updated.id);
      };

      const closeTicket = async ({ outcome = '', note = '' } = {}) => {
        if (!selectedTicket) return;
        const updated = await closeTicketCase(selectedTicket.id, {
          outcome,
          note,
          actorName: 'Agente'
        });
        setTickets((prev) => prev.map((ticket) => ticket.id === updated.id ? updated : ticket));
        setSelectedId(updated.id);
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

      if (error) {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-12" title="Atención al cliente" subtitle="Error de carga">
                <div className="toolbar">
                  <span style={{ color: '#be123c', fontWeight: 700 }}>{error}</span>
                  <Button variant="secondary" onClick={loadTickets}>Reintentar</Button>
                </div>
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
            <Panel
              className="span-12"
              title="Atención al cliente"
              subtitle="Mesa de ayuda telefónica"
              action={<Tag variant="info">{tickets.filter((ticket) => ['nuevo', 'servicio_iniciado'].includes(supportTicketDisplayStatus(ticket))).length} nuevos</Tag>}
            >
              <div className="toolbar">
                <Button variant={section === 'buscar_cliente' ? 'primary' : 'secondary'} onClick={() => setSection('buscar_cliente')}>Buscar cliente</Button>
                <Button variant={section === 'gestiones_clientes' ? 'primary' : 'secondary'} onClick={() => setSection('gestiones_clientes')}>Gestiones con clientes</Button>
                <Button variant={section === 'solicitudes_servicio' ? 'primary' : 'secondary'} onClick={() => setSection('solicitudes_servicio')}>Solicitudes de servicio</Button>
              </div>
            </Panel>
          </section>
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
                  <thead><tr><th>Contacto</th><th>Teléfono</th><th>Ubicación</th><th>Estado</th><th>Última gestión</th><th>Acción</th></tr></thead>
                  <tbody>{CONTACTS.map((contact) => <tr key={contact.name}><td><div className="person"><div className="person-badge">{initials(contact.name)}</div><strong>{contact.name}</strong></div></td><td>{contact.phone}</td><td>{contact.city}</td><td><Tag variant={statusVariant(contact.status)}>{contact.status}</Tag></td><td>{contact.last}</td><td><div className="toolbar"><Button variant="ghost" icon={<Phone size={16} />}></Button><Button variant="ghost" icon={<Eye size={16} />}></Button><Button variant="ghost" icon={<Edit3 size={16} />}></Button></div></td></tr>)}</tbody>
                </table>
              </div>
            </Panel>
          </section>
        </div>
      );
    }

    function ClientsView() {
      return (
        <div className="view">
          <section className="metrics-grid">
            {[
              { title: 'Activos', value: '11.203', change: 2.8, label: 'base viva', trend: 'up', icon: UserCheck, bg: 'rgba(21,128,61,0.12)', color: '#15803d' },
              { title: 'En proceso', value: '342', change: 5.6, label: 'flujo abierto', trend: 'up', icon: Activity, bg: 'rgba(37,99,235,0.12)', color: '#2563eb' },
              { title: 'En baja', value: '28', change: -12.2, label: 'contención', trend: 'up', icon: TrendingDown, bg: 'rgba(190,18,60,0.12)', color: '#be123c' },
              { title: 'Cuota promedio', value: '$ 4.250', change: 1.4, label: 'ticket medio', trend: 'up', icon: DollarSign, bg: 'rgba(217,119,6,0.12)', color: '#d97706' }
            ].map((item) => <MetricCard key={item.title} item={item} />)}
          </section>
          <section className="content-grid">
            <Panel className="span-12" title="Clientes" subtitle="Gestión de cartera activa">
              <div className="toolbar" style={{ marginBottom: 16 }}><input className="input" style={{ maxWidth: 360 }} placeholder="Buscar cliente..." /><Button icon={<Plus size={18} />}>Nuevo cliente</Button></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Cliente</th><th>Producto</th><th>Plan</th><th>Cuota</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>{CLIENTS.map((row) => <tr key={row.name}><td><div className="person"><div className="person-badge">{initials(row.name)}</div><strong>{row.name}</strong></div></td><td>{row.product}</td><td>{row.plan}</td><td>{row.fee}</td><td><Tag variant={statusVariant(row.status)}>{row.status}</Tag></td><td><Button variant="ghost" icon={<Eye size={16} />}>Ver ficha</Button></td></tr>)}</tbody>
                </table>
              </div>
            </Panel>
          </section>
        </div>
      );
    }

    function SuperadminModule({ route }) {
      const [imports, setImports] = React.useState([]);
      const [importsPage, setImportsPage] = React.useState(1);
      const [importsSearch, setImportsSearch] = React.useState('');
      const [importsMeta, setImportsMeta] = React.useState({ page: 1, totalPages: 1, total: 0, pageSize: 8 });
      const [importsLoading, setImportsLoading] = React.useState(false);
      const [importsError, setImportsError] = React.useState('');
      const [importSuccess, setImportSuccess] = React.useState('');
      const [products, setProducts] = React.useState(SUPERADMIN_PRODUCTS_SEED);
      const [users, setUsers] = React.useState(SUPERADMIN_USERS_SEED);
      const [showImportFlow, setShowImportFlow] = React.useState(false);
      const [importDraft, setImportDraft] = React.useState({ fileName: '', csvText: '' });
      const [preview, setPreview] = React.useState(null);
      const [previewLoading, setPreviewLoading] = React.useState(false);
      const [previewError, setPreviewError] = React.useState('');

      const loadImports = React.useCallback(async () => {
        setImportsLoading(true);
        setImportsError('');
        try {
          const result = await listImports({ page: importsPage, pageSize: 8, search: importsSearch });
          setImports(result.items);
          setImportsMeta({ page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages });
        } catch (err) {
          setImportsError(err.message || 'No se pudo cargar el historial de importaciones.');
        } finally {
          setImportsLoading(false);
        }
      }, [importsPage, importsSearch]);

      React.useEffect(() => {
        if (route !== 'sa_importaciones') return;
        loadImports();
      }, [route, loadImports]);

      const resetImportFlow = () => {
        setImportDraft({ fileName: '', csvText: '' });
        setPreview(null);
        setPreviewError('');
        setPreviewLoading(false);
      };

      const handleCsvFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const csvText = await file.text();
          setImportDraft({ fileName: file.name, csvText });
          setPreview(null);
          setPreviewError('');
        } catch (err) {
          setPreviewError('No se pudo leer el archivo seleccionado.');
        }
      };

      const validatePreview = async () => {
        setPreviewError('');
        setPreview(null);
        setPreviewLoading(true);
        try {
          const result = await previewCsvText(importDraft.csvText);
          setPreview(result);
        } catch (err) {
          setPreviewError(err.message || 'Error validando el CSV.');
        } finally {
          setPreviewLoading(false);
        }
      };

      const confirmImport = async () => {
        setPreviewError('');
        try {
          await createImportFromCsv({
            fileName: importDraft.fileName,
            csvText: importDraft.csvText,
            userId: 'usr-001'
          });
          setImportSuccess('Importación registrada correctamente.');
          setShowImportFlow(false);
          resetImportFlow();
          setImportsPage(1);
          await loadImports();
        } catch (err) {
          setPreviewError(err.message || 'No se pudo completar la importación.');
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

      const toggleProductState = (id) => {
        setProducts((prev) => prev.map((item) => item.id === id ? { ...item, estado: item.estado === 'Activo' ? 'Inactivo' : 'Activo' } : item));
      };

      const toggleUserState = (email) => {
        setUsers((prev) => prev.map((item) => item.email === email ? { ...item, estado: item.estado === 'Activo' ? 'Inactivo' : 'Activo' } : item));
      };

      if (route === 'sa_importaciones') {
        return (
          <div className="view">
            <section className="content-grid">
              <Panel className="span-12" title="Importaciones" subtitle="Carga masiva de clientes por CSV" action={<Button icon={<Upload size={16} />} onClick={() => { setShowImportFlow(true); setImportSuccess(''); resetImportFlow(); }}>Importar CSV</Button>}>
                <div className="toolbar" style={{ marginBottom: 12 }}>
                  <div className="searchbox" style={{ maxWidth: 360 }}>
                    <Search size={18} color="#69788d" />
                    <input
                      value={importsSearch}
                      onChange={(event) => { setImportsPage(1); setImportsSearch(event.target.value); }}
                      placeholder="Buscar por archivo..."
                    />
                  </div>
                  <Button variant="secondary" icon={<Filter size={16} />} onClick={loadImports}>Aplicar</Button>
                  {importSuccess ? <span className="pill" style={{ color: '#15803d' }}>{importSuccess}</span> : null}
                </div>
                {importsLoading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando historial de importaciones...</div> : null}
                {importsError ? (
                  <div className="toolbar" style={{ marginBottom: 12 }}>
                    <span style={{ color: '#be123c', fontWeight: 700 }}>{importsError}</span>
                    <Button variant="secondary" onClick={loadImports}>Reintentar</Button>
                  </div>
                ) : null}
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Archivo</th><th>Fecha</th><th>Total registros</th><th>Importados</th><th>Rechazados</th><th>Estado</th><th>Usuario</th></tr></thead>
                    <tbody>
                      {imports.map((row) => (
                        <tr key={row.id}>
                          <td><strong>{row.archivo}</strong><div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{row.id}</div></td>
                          <td>{row.fecha}</td>
                          <td>{row.total}</td>
                          <td style={{ color: '#15803d', fontWeight: 700 }}>{row.importados}</td>
                          <td style={{ color: row.rechazados ? '#b45309' : 'var(--muted)', fontWeight: 700 }}>{row.rechazados}</td>
                          <td><Tag variant={row.estado === 'Completada' ? 'success' : row.estado === 'Fallida' ? 'danger' : 'warning'}>{row.estado}</Tag></td>
                          <td>{row.usuario}</td>
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
                          <p>Columnas obligatorias: <strong>nombre, telefono, ubicacion, fuente</strong>.</p>
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
                              {preview.rowErrors.length ? (
                                <div style={{ marginTop: 8, maxHeight: 120, overflow: 'auto' }}>
                                  {preview.rowErrors.slice(0, 5).map((err) => (
                                    <div key={err.rowNumber} style={{ fontSize: '0.84rem', color: '#b45309', marginBottom: 4 }}>
                                      Fila {err.rowNumber}: {err.errors.join(', ')}
                                    </div>
                                  ))}
                                </div>
                              ) : <div style={{ marginTop: 8, color: '#15803d', fontWeight: 700 }}>Sin errores de validación.</div>}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="lot-step"><span className="lot-step-index">3</span><div><h4>Confirmar importación</h4><p>Se registrará en el historial con resultado final.</p></div></div>
                      {previewError ? <div style={{ color: '#be123c', fontWeight: 700 }}>{previewError}</div> : null}
                      <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
                        <Button variant="ghost" onClick={() => setShowImportFlow(false)}>Cancelar</Button>
                        <Button icon={<CheckCircle2 size={16} />} onClick={confirmImport} disabled={!preview || !importDraft.fileName}>Confirmar importación</Button>
                      </div>
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
                          <td>{item.categoria}</td>
                          <td>{item.precio}</td>
                          <td><Tag variant={item.estado === 'Activo' ? 'success' : 'warning'}>{item.estado}</Tag></td>
                          <td>{item.actualizacion}</td>
                          <td><div className="toolbar"><Button variant="ghost" icon={<Edit3 size={15} />}>Editar</Button><Button variant="secondary" onClick={() => toggleProductState(item.id)}>{item.estado === 'Activo' ? 'Desactivar' : 'Activar'}</Button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!products.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay productos cargados.</div> : null}
                </div>
              </Panel>
              <Panel className="span-4" title="Formulario de producto" subtitle="Estructura lista para backend">
                <div className="list">
                  <input className="input" placeholder="Nombre" />
                  <input className="input" placeholder="Categoría" />
                  <textarea className="input" rows="3" placeholder="Descripción"></textarea>
                  <input className="input" placeholder="Precio" />
                  <select className="input"><option>Activo</option><option>Inactivo</option></select>
                  <textarea className="input" rows="3" placeholder="Observaciones"></textarea>
                  <Button icon={<CheckCircle2 size={16} />}>Guardar producto</Button>
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
      const { user, logout } = useAuth();
      const { rolReal, rolEfectivo, esSuperadmin } = useRolEfectivo();
      const role = rolEfectivo;
      const [route, setRoute] = React.useState('dashboard_global');
      const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);
      const [menuOpen, setMenuOpen] = React.useState(window.innerWidth >= 1024);
      const [estadoUsuario, setEstadoUsuario] = React.useState('disponible');
      const [pausaInicio, setPausaInicio] = React.useState('');
      const [mostrarPausa, setMostrarPausa] = React.useState(false);
      const [showProfileModal, setShowProfileModal] = React.useState(false);
      const [brandLogo, setBrandLogo] = React.useState(() => {
        try {
          return localStorage.getItem('rednacrem_logo') || '';
        } catch {
          return '';
        }
      });
      const [salesContacts, setSalesContacts] = React.useState(SALES_CONTACTS_SEED);
      const [supervisorLots, setSupervisorLots] = React.useState(SUPERVISOR_LOTS_SEED);
      const [salesSelectedId, setSalesSelectedId] = React.useState(SALES_CONTACTS_SEED.find(isSalesActiveContact)?.id || null);
      const [salesRecords, setSalesRecords] = React.useState(() => seedSalesFromContacts(SALES_CONTACTS_SEED));
      const [moduleStates, setModuleStates] = React.useState(() =>
        createInitialModuleStates({ roleNav: ROLE_NAV, roles: Object.keys(ROLE_META) })
      );
      const productsCatalog = React.useMemo(() => listProducts(), []);
      const productsById = React.useMemo(
        () => Object.fromEntries(productsCatalog.map((product) => [product.id, product])),
        [productsCatalog]
      );
      const hasRealSuperadminAccess = esSuperadmin;

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
        const visible = ROLE_NAV
          .filter((item) => item.roles.includes(role) && isModuleVisible(moduleStates, role, item.path))
          .map((item) => item.path);
        if (!visible.includes(route)) setRoute(visible[0] || 'dashboard');
      }, [role, route, moduleStates]);

      React.useEffect(() => {
        persistModuleStates(moduleStates);
      }, [moduleStates]);

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

      const refreshLotsFromService = React.useCallback(async () => {
        const nextLots = await listLotsAsync();
        setSupervisorLots(nextLots);
        return nextLots;
      }, []);

      React.useEffect(() => {
        Promise.all([refreshContactsFromService(), refreshLotsFromService()]).catch(() => {});
      }, [refreshContactsFromService, refreshLotsFromService]);

      const registerSalesManagement = async (contactId, payload) => {
        const updated = await registerCommercialManagement(contactId, payload, { sellerName: 'Laura Techera' });
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
        setEstadoUsuario(next.id);
        if (next.bloqueaPantalla) {
          setPausaInicio(new Date().toISOString());
          setMostrarPausa(true);
        } else {
          setPausaInicio('');
          setMostrarPausa(false);
        }
      };

      const volverAlTrabajo = () => {
        setMostrarPausa(false);
        setPausaInicio('');
        setEstadoUsuario('disponible');
      };

      const handleLogout = async () => {
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

      const effectiveRoleForUi = role || rolReal || 'atencion_cliente';
      const navItems = ROLE_NAV.filter((item) => item.roles.includes(effectiveRoleForUi) && isModuleVisible(moduleStates, effectiveRoleForUi, item.path));
      const currentMeta = ROLE_META[effectiveRoleForUi] || ROLE_META.atencion_cliente;
      const currentUser = USERS[rolReal] || { name: 'Usuario', email: '' };
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
        const canOpenRequested = requestedRoute && navItems.some((item) => item.path === requestedRoute);
        setRoute(canOpenRequested ? requestedRoute : fallbackRoute);
        if (!isDesktop) setMenuOpen(false);
      }, [navItems, isDesktop]);

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
          if (role === 'vendedor') return <SalesDashboard contacts={salesContacts} salesRecords={salesRecords} onGoRoute={setRoute} />;
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
            />
          );
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
              />
            );
          }
          return <ContactsView />;
        }
        if (route === 'agenda') {
          if (role === 'vendedor') return <SalesAgendaView contacts={salesContacts} />;
        }
        if (route === 'clientes') {
          if (role === 'vendedor') return <SalesClientsView salesRecords={salesRecords} productsById={productsById} />;
          return <ClientsView />;
        }
        if (route === 'contratos') {
          return (
            <UiRoleGate
              allowRoles={['supervisor']}
              fallback={<PlaceholderView title="Contrataciones" subtitle="Sin visibilidad para este rol en la vista actual." cta="Volver al foco" />}
            >
              <SupervisorContractsModule Panel={Panel} Button={Button} Tag={Tag} />
            </UiRoleGate>
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
              />
            </aside>

            <main className="main">
              <header className="topbar">
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
                  </div>
                  <div className="searchbox"><Search size={18} color="#69788d" /><input placeholder="Buscar clientes, gestiones o servicios..." /><div className="pill">Demo</div></div>
                </div>
                <div className="topbar-actions">
                  <NotificationsDropdown userId={notificationUserId} onNavigate={openNotificationsModule} />
                </div>
              </header>
              {renderRoute()}
            </main>
          </div>

          {mostrarPausa ? <PauseOverlay status={estadoConfig} startedAt={pausaInicio} onResume={volverAlTrabajo} /> : null}
          <ProfileModal isOpen={showProfileModal} onClose={handleCloseProfile} user={currentUser} />
          <BotonVistaRol roleMeta={ROLE_META} />
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
  
