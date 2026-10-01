import React from 'react';
import PersonalList from './PersonalList.jsx';
import PersonalForm from './PersonalForm.jsx';
import PersonalDetail from './PersonalDetail.jsx';
import EmpresasContratistasList from './EmpresasContratistasList.jsx';
import EmpresaContratistaForm from './EmpresaContratistaForm.jsx';
import {
  RRHH_ROLE_OPTIONS,
  su_empresas_contratistas as initialEmpresas
} from './rrhhMockData.js';
import {
  listPersonal,
  getPersonalDetail,
  createPersonal,
  updatePersonal,
  listPersonalVencimientos,
  listPersonalConDocumentosPendientes,
  addPersonalRole,
  deletePersonalRole,
  updatePersonalBases,
  addHabilitacion,
  addCapacitacion,
  addCarnetSalud,
  addLicencia,
  updateLicencia,
  generateFichaLink,
  listFichaLinks,
  revokeFichaLink,
  uploadPersonalFoto,
  deletePersonalFoto,
  getCambiosPublicos
} from '../../../services/rrhhService.js';
import { listBases, listVehiculos } from '../../../services/flotasService.js';
import { getMissingFields } from './PersonalDetail.jsx';
import { buildPersonalHierarchy } from './personalHierarchy.js';
import './rrhhStyles.css';

// bases y personal ahora salen del backend real (rrhhService.js /
// flotasService.js, mismo patron que ya usa Flotas). RRHH_ROLE_OPTIONS sigue
// siendo un enum estatico del lado del frontend -- no hay una tabla catalogo
// de roles en el backend (rol es texto libre en su_personal_roles), asi que
// no hay nada que "fetchear" ahi, es analogo a los enums de estado que
// FlotasScreen mantiene localmente.
//
// su_empresas_contratistas sigue siendo mock (ver Tarea 0): no existe ningun
// endpoint de backend para esa tabla todavia. EmpresasContratistasList /
// EmpresaContratistaForm quedan fuera de alcance, sin conectar.

const emptyPersonalDraft = {
  id: '',
  nombre: '',
  nombre_uso: '',
  apellido: '',
  documento: '',
  fecha_nacimiento: '',
  telefono: '',
  email: '',
  domicilio: '',
  foto_url: '',
  base_id: '',
  // Bases (migracion 081): array de { base_id, es_principal }. Unica via de
  // escritura desde el form -- se guarda con PUT /operaciones/personal/:id/bases
  // DESPUES del POST/PATCH de la persona, nunca dentro de ese payload (ver
  // savePersonal). base_id de arriba queda solo como reflejo de lectura del
  // valor que ya trae la persona (GET), no se manda mas en el payload.
  bases: [],
  estado: 'activo',
  fecha_ingreso: '',
  fecha_egreso: '',
  tipo_personal: 'interno',
  empresa_contratista_id: '',
  // `rol` no es una columna de su_personal -- es el rol inicial que se le
  // va a asignar a la persona recien creada (o a una que todavia no tiene
  // ninguno) via un POST aparte a /operaciones/personal/:id/roles despues
  // de guardarla. regimen_turno, vehiculo_id, franja_turno y
  // fecha_ref_descanso si son columnas reales de su_personal (migracion 069,
  // regimen fijo de enfermeria).
  rol: '',
  regimen_turno: null,
  vehiculo_id: null,
  franja_turno: null,
  fecha_ref_descanso: null
};

const emptyEmpresaDraft = {
  id: '',
  razon_social: '',
  rut: '',
  contacto_nombre: '',
  contacto_telefono: '',
  contacto_email: '',
  activa: true
};

const statusToVariant = {
  activo: 'success',
  licencia: 'warning',
  suspendido: 'danger',
  baja: 'info'
};

const docStatusToVariant = {
  vigente: 'success',
  vencida: 'danger',
  en_tramite: 'warning'
};

// Las columnas de fecha de su_personal_* se confirmaron por nombre contra
// produccion, no por tipo de dato exacto. Segun como esten tipadas
// (date vs. timestamptz/text), el backend puede devolver "2026-01-10" o
// "2026-01-10T03:00:00.000Z" -- se normaliza a solo fecha antes de operar,
// para no romper el calculo de dias ni mostrar la hora en la UI.
export const toDateOnly = (value) => {
  if (!value) return '';
  const str = String(value);
  return str.length > 10 && str.includes('T') ? str.slice(0, 10) : str;
};

// Puramente por string, sin pasar por ningun objeto Date -- mismo criterio
// (y misma duplicacion a proposito) que su gemela en PersonalDetail.jsx/
// PersonalList.jsx.
const formatDateOnlyDisplay = (value) => {
  const dateOnly = toDateOnly(value);
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return dateOnly;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

// A diferencia de formatDateOnlyDisplay (fechas sin hora, ej.
// fecha_nacimiento -- ahi reinterpretar en hora local corre el dia), esto
// es un timestamptz real (expires_at de un link) -- mostrar en hora local
// del navegador es exactamente lo que corresponde, no hay corrimiento que
// evitar.
const formatFichaLinkVencimiento = (isoString) => {
  try {
    return new Date(isoString).toLocaleString('es-UY', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return isoString;
  }
};

const diffDays = (dateValue) => {
  const dateOnly = toDateOnly(dateValue);
  if (!dateOnly) return null;
  const target = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getVencimientoMeta = (dateValue) => {
  const days = diffDays(dateValue);
  const dateDisplay = formatDateOnlyDisplay(dateValue);
  if (days === null) return { variant: 'info', label: 'Sin fecha' };
  if (days < 0) return { variant: 'danger', label: `Vencida ${dateDisplay}` };
  if (days <= 30) return { variant: 'warning', label: `Vence ${dateDisplay}` };
  return { variant: 'success', label: `Vigente ${dateDisplay}` };
};

// Mapa explicito de los 13 roles del CHECK de su_personal_roles.rol, con
// tildes correctas en la UI -- los values de los selects siguen siendo los
// del CHECK (sin tocar), esto solo cambia la etiqueta mostrada. Cualquier
// valor no mapeado cae al replaceAll de siempre (mismo comportamiento que
// antes para roles futuros que todavia no se agreguen aca).
const ROL_LABELS = {
  Chofer: 'Chofer',
  Enfermero: 'Auxiliar de enfermería',
  Medico: 'Médico',
  Administrativo: 'Administrativo',
  Backoffice: 'Backoffice',
  Auxiliar_de_servicio: 'Auxiliar de servicio',
  Jefe_medico: 'Jefe médico',
  Jefe_de_enfermeria: 'Jefe de enfermería',
  Quimica: 'Química',
  Mantenimiento: 'Mantenimiento',
  Direccion_tecnica: 'Dirección técnica',
  Jefe_de_choferes: 'Jefe de choferes',
  Economato: 'Economato'
};
const formatRol = (value) => ROL_LABELS[value] || String(value || '').replaceAll('_', ' ');

const getDocumentAlertLevel = (items = []) => {
  const levels = items.map((item) => diffDays(item?.fecha_vencimiento));
  if (levels.some((days) => days !== null && days < 0)) return 'danger';
  if (levels.some((days) => days !== null && days <= 30)) return 'warning';
  return 'success';
};

export default function RrhhScreen({ Button, Panel, Tag }) {
  const [personal, setPersonal] = React.useState([]);
  const [bases, setBases] = React.useState([]);
  const [vehiculos, setVehiculos] = React.useState([]);
  const [vencimientos, setVencimientos] = React.useState([]);
  // Set de personal_id con al menos un documento pendiente de revision --
  // alimenta el mismo icono/lugar que las alertas de vencimiento en la
  // tarjeta de la jerarquia (ver getAlertMeta mas abajo).
  const [personalConDocumentosPendientes, setPersonalConDocumentosPendientes] = React.useState(() => new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [suEmpresasContratistas, setSuEmpresasContratistas] = React.useState(initialEmpresas);
  // El filtro de rol se saca: la agrupacion jerarquica ya lo reemplaza (cada
  // persona aparece en la seccion de su rol). tipo_personal tambien se saca
  // como filtro global -- ahora es el criterio de sub-agrupacion de
  // Medicina (Internos/Contratados); un filtro global de tipo_personal
  // interactuaria raro con esa subseccion (ej. filtrar "solo externos"
  // vaciaria "Internos" en todos lados sin razon relacionada a Medicina).
  const [filters, setFilters] = React.useState({
    base_id: '',
    estado: ''
  });
  const [personalFormOpen, setPersonalFormOpen] = React.useState(false);
  const [personalFormMode, setPersonalFormMode] = React.useState('create');
  const [personalDraft, setPersonalDraft] = React.useState(emptyPersonalDraft);
  // Cuantos roles tiene YA la persona que se esta editando (0 en modo
  // crear). Determina si PersonalForm muestra el selector de "rol inicial"
  // o el mensaje de "se gestiona desde la ficha" -- ver PersonalForm.jsx.
  const [personalExistingRolesCount, setPersonalExistingRolesCount] = React.useState(0);
  // Los roles ya asignados (no solo la cantidad): PersonalForm los necesita
  // para decidir si muestra el selector de Franja (solo si esta 'Enfermero'
  // entre ellos, ver PersonalForm.jsx).
  const [personalExistingRoles, setPersonalExistingRoles] = React.useState([]);
  const [personalErrors, setPersonalErrors] = React.useState({});
  const [formSaving, setFormSaving] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  const [selectedPersonalId, setSelectedPersonalId] = React.useState(null);
  const [selectedPersonalDetail, setSelectedPersonalDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState('');
  const [actionError, setActionError] = React.useState('');
  const [detailRefreshToken, setDetailRefreshToken] = React.useState(0);
  const [detailTab, setDetailTab] = React.useState('datos_generales');

  const [empresasOpen, setEmpresasOpen] = React.useState(false);
  const [empresaFormOpen, setEmpresaFormOpen] = React.useState(false);
  const [empresaFormMode, setEmpresaFormMode] = React.useState('create');
  const [empresaDraft, setEmpresaDraft] = React.useState(emptyEmpresaDraft);

  // Link de autocompletado (POST /operaciones/personal/link-autocompletado):
  // modal chico con el link corto recien generado (copiar/compartir por
  // WhatsApp) + el listado de links vigentes de la organizacion con boton
  // Desactivar.
  const [fichaLinkOpen, setFichaLinkOpen] = React.useState(false);
  const [fichaLinkUrl, setFichaLinkUrl] = React.useState('');
  const [fichaLinkLoading, setFichaLinkLoading] = React.useState(false);
  const [fichaLinkError, setFichaLinkError] = React.useState('');
  const [fichaLinkCopied, setFichaLinkCopied] = React.useState(false);
  const [fichaLinksList, setFichaLinksList] = React.useState([]);
  const [fichaLinksListLoading, setFichaLinksListLoading] = React.useState(false);
  const [fichaLinksListError, setFichaLinksListError] = React.useState('');
  const [revokingLinkId, setRevokingLinkId] = React.useState(null);

  // Foto de personal (POST/DELETE /operaciones/personal/:id/foto, autenticado).
  const [fotoUploading, setFotoUploading] = React.useState(false);

  // Historial de cambios hechos por el propio funcionario via el link
  // publico (GET /operaciones/personal/:id/cambios-publicos) -- se carga
  // bajo demanda, solo cuando se entra a la pestaña "Cambios" de la ficha,
  // no en cada apertura de ficha (es un endpoint aparte del detalle).
  const [cambiosPublicos, setCambiosPublicos] = React.useState([]);
  const [cambiosLoading, setCambiosLoading] = React.useState(false);
  const [cambiosError, setCambiosError] = React.useState('');

  const loadRrhh = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [personalItems, basesItems, vehiculosItems, vencimientosItems, pendientesIds] = await Promise.all([
        listPersonal(),
        listBases(),
        listVehiculos(),
        listPersonalVencimientos({ days: 30 }),
        listPersonalConDocumentosPendientes()
      ]);
      setPersonal(personalItems);
      setBases(basesItems);
      setVehiculos(vehiculosItems);
      setVencimientos(vencimientosItems);
      setPersonalConDocumentosPendientes(new Set(pendientesIds));
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el personal.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRrhh();
  }, [loadRrhh]);

  React.useEffect(() => {
    if (!selectedPersonalId) {
      setSelectedPersonalDetail(null);
      setDetailError('');
      setActionError('');
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    setActionError('');
    getPersonalDetail(selectedPersonalId)
      .then((detail) => {
        if (cancelled) return;
        if (!detail) {
          setDetailError('Funcionario no encontrado.');
          setSelectedPersonalDetail(null);
          return;
        }
        setSelectedPersonalDetail(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailError(err?.message || 'No se pudo cargar la ficha del funcionario.');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPersonalId, detailRefreshToken]);

  const refreshSelectedDetail = () => setDetailRefreshToken((token) => token + 1);

  React.useEffect(() => {
    if (!selectedPersonalId || detailTab !== 'cambios') return undefined;
    let cancelled = false;
    setCambiosLoading(true);
    setCambiosError('');
    getCambiosPublicos(selectedPersonalId)
      .then((items) => {
        if (!cancelled) setCambiosPublicos(items);
      })
      .catch((err) => {
        if (!cancelled) setCambiosError(err?.message || 'No se pudo cargar el historial de cambios.');
      })
      .finally(() => {
        if (!cancelled) setCambiosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPersonalId, detailTab]);

  const baseById = React.useMemo(
    () => Object.fromEntries(bases.map((base) => [base.id, base])),
    [bases]
  );

  const vencimientosByPersonalId = React.useMemo(() => {
    const grouped = {};
    vencimientos.forEach((item) => {
      const personalId = item.personal_id;
      if (!personalId) return;
      if (!grouped[personalId]) grouped[personalId] = [];
      grouped[personalId].push(item);
    });
    return grouped;
  }, [vencimientos]);

  // GET /operaciones/personal no trae los roles de cada persona (serian N+1
  // consultas para mostrar "rol principal" en cada tarjeta de la lista), asi
  // que la lista muestra en su lugar cuantos campos opcionales le faltan
  // completar -- dato que ya viene en la misma fila y es mas util dado que
  // la carga va a ser parcial a proposito. Los roles reales se ven en la
  // ficha (PersonalDetail), que si trae `roles` en el detalle.
  const personalRows = React.useMemo(() => (
    personal.map((item) => ({
      ...item,
      nombreCompleto: `${item.nombre} ${item.apellido}`.trim(),
      missingCount: getMissingFields(item).length
    }))
  ), [personal]);

  const filteredRows = React.useMemo(() => personalRows.filter((row) => {
    // Matchea si la persona tiene esa base en CUALQUIERA de sus bases
    // (migracion 081), no solo en la principal -- antes esto comparaba
    // contra el unico row.base_id.
    if (filters.base_id && !(row.bases || []).some((b) => b.base_id === filters.base_id)) return false;
    if (filters.estado && row.estado !== filters.estado) return false;
    return true;
  }), [personalRows, filters]);

  // roles y regimen_turno ya vienen en cada fila desde GET
  // /operaciones/personal (fix de N+1) -- buildPersonalHierarchy es pura,
  // solo agrupa lo que ya tenemos, sin fetches adicionales.
  const personalHierarchy = React.useMemo(
    () => buildPersonalHierarchy(filteredRows),
    [filteredRows]
  );

  const getBaseLabel = React.useCallback((baseId) => baseById[baseId]?.nombre || 'Sin base', [baseById]);
  const getStatusVariant = React.useCallback((status) => statusToVariant[status] || 'info', []);
  const getDocumentStatusVariant = React.useCallback((status) => docStatusToVariant[status] || 'info', []);

  // Mismo icono/lugar para dos señales distintas: vencimientos (rojo si ya
  // venció, nunca se opaca por nada menos urgente) y documentos nuevos
  // pendientes de revisión (ambar, igual que "próximo a vencer" -- si las
  // dos aplican a la vez, se combinan en un solo label sin perder ninguna).
  const getAlertMeta = React.useCallback((row) => {
    const items = vencimientosByPersonalId[row.id] || [];
    const level = getDocumentAlertLevel(items);
    const tienePendientes = personalConDocumentosPendientes.has(row.id);
    if (level === 'danger') return { hasAlert: true, variant: 'danger', label: 'Documentación vencida' };
    if (level === 'warning' && tienePendientes) {
      return { hasAlert: true, variant: 'warning', label: 'Próximo a vencer y con documentación pendiente de revisión' };
    }
    if (level === 'warning') return { hasAlert: true, variant: 'warning', label: 'Próximo a vencer' };
    if (tienePendientes) return { hasAlert: true, variant: 'warning', label: 'Documentación pendiente de revisión' };
    return { hasAlert: false, variant: 'success', label: 'Sin alertas' };
  }, [vencimientosByPersonalId, personalConDocumentosPendientes]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const openCreatePersonal = () => {
    setPersonalFormMode('create');
    setPersonalDraft({ ...emptyPersonalDraft });
    setPersonalExistingRolesCount(0);
    setPersonalExistingRoles([]);
    setPersonalErrors({});
    setFormError('');
    setPersonalFormOpen(true);
  };

  const openEditPersonal = (personalId) => {
    const item = personal.find((row) => row.id === personalId);
    if (!item) return;
    setPersonalFormMode('edit');
    // `rol` se resetea siempre a '' aca: es el selector de "rol inicial a
    // asignar", no un reflejo de los roles ya existentes de la persona (esos
    // se gestionan desde la ficha, ver personalExistingRolesCount).
    // Los 4 campos date se normalizan con toDateOnly antes de entrar al
    // draft: el backend puede devolver "2026-09-27T03:00:00.000Z" en vez de
    // "2026-09-27" (columna date, corrimiento de zona horaria al serializar)
    // -- un <input type="date"> no lo muestra, y reenviarlo tal cual en el
    // PATCH da 400 en fecha_ref_descanso (unico campo con validacion
    // estricta de formato en el backend, ver Fase 1).
    setPersonalDraft({
      ...emptyPersonalDraft,
      ...item,
      rol: '',
      // Se normaliza a { base_id, es_principal } -- item.bases trae ademas
      // `nombre` (para mostrar en la tarjeta/ficha), que el form no necesita
      // mandar de vuelta y que quedaria stale si la base se renombra entre
      // medio.
      bases: (item.bases || []).map((b) => ({ base_id: b.base_id, es_principal: Boolean(b.es_principal) })),
      fecha_nacimiento: toDateOnly(item.fecha_nacimiento),
      fecha_ingreso: toDateOnly(item.fecha_ingreso),
      fecha_egreso: toDateOnly(item.fecha_egreso),
      fecha_ref_descanso: toDateOnly(item.fecha_ref_descanso)
    });
    setPersonalExistingRolesCount((item.roles || []).length);
    setPersonalExistingRoles(item.roles || []);
    setPersonalErrors({});
    setFormError('');
    setPersonalFormOpen(true);
  };

  const validatePersonalDraft = () => {
    const nextErrors = {};
    if (!personalDraft.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.';
    if (!personalDraft.apellido.trim()) nextErrors.apellido = 'El apellido es obligatorio.';
    setPersonalErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const savePersonal = async () => {
    if (!validatePersonalDraft()) return;

    const payload = {
      nombre: personalDraft.nombre,
      nombre_uso: personalDraft.nombre_uso || null,
      apellido: personalDraft.apellido,
      documento: personalDraft.documento || null,
      // Red de seguridad ademas de la normalizacion que ya hace
      // openEditPersonal al armar el draft: si por el motivo que sea el
      // draft todavia trajera una fecha con hora/zona (ej. "...T03:00:00.000Z"),
      // esto evita reenviarla asi al backend en vez de descubrirlo recien
      // con el 400 de fecha_ref_descanso.
      fecha_nacimiento: toDateOnly(personalDraft.fecha_nacimiento) || null,
      telefono: personalDraft.telefono || null,
      email: personalDraft.email || null,
      domicilio: personalDraft.domicilio || null,
      // base_id ya NO se manda aca (unica via de escritura: PUT .../bases
      // despues de guardar la persona, ver mas abajo). El backend igual
      // sincroniza su_personal_bases si algun otro camino llegara a mandar
      // base_id en el POST/PATCH -- ver syncPersonalBaseIdToBasesTable.
      estado: personalDraft.estado,
      fecha_ingreso: toDateOnly(personalDraft.fecha_ingreso) || null,
      fecha_egreso: toDateOnly(personalDraft.fecha_egreso) || null,
      tipo_personal: personalDraft.tipo_personal,
      empresa_contratista_id: null,
      regimen_turno: personalDraft.regimen_turno || null,
      vehiculo_id: personalDraft.vehiculo_id || null,
      franja_turno: personalDraft.franja_turno || null,
      fecha_ref_descanso: toDateOnly(personalDraft.fecha_ref_descanso) || null
    };

    // Mergea la respuesta del backend sobre el item que ya tenia en estado
    // local, en vez de reemplazarlo tal cual. Hace falta porque PATCH
    // /operaciones/personal/:id no devuelve `roles` en su respuesta (a
    // diferencia de POST y de GET /operaciones/personal) -- reemplazar el
    // item directo con la respuesta del PATCH le borraria los roles ya
    // cargados del estado local (no de la base) hasta el proximo reload,
    // haciendolo aparecer como "Sin rol asignado" en la jerarquia despues
    // de guardar cualquier edicion, aunque nunca haya perdido el rol de
    // verdad.
    const mergePersonalItem = (previous, updated) => ({
      ...previous,
      ...updated,
      roles: updated.roles ?? previous?.roles ?? []
    });

    setFormSaving(true);
    setFormError('');
    try {
      const saved = personalFormMode === 'create'
        ? await createPersonal(payload)
        : await updatePersonal(personalDraft.id, payload);
      if (!saved) throw new Error('El backend no devolvió el funcionario guardado.');

      const previousItem = personal.find((item) => item.id === saved.id) || null;
      let savedMerged = mergePersonalItem(previousItem, saved);

      // Solo se ofrece elegir un rol inicial cuando la persona todavia no
      // tenia ninguno (personalExistingRolesCount === 0 -- ver
      // PersonalForm.jsx). Si se eligio uno, se encadena el POST del rol
      // DESPUES de guardar la persona: si este segundo paso falla, la
      // persona ya quedo guardada -- no se revierte nada ni se borra, se
      // muestra un error claro para completarlo despues desde la ficha, y
      // el formulario queda abierto (no se pierde de vista el aviso).
      if (!personalExistingRolesCount && personalDraft.rol) {
        try {
          const roleItem = await addPersonalRole(saved.id, { rol: personalDraft.rol, rol_principal: true });
          savedMerged = { ...savedMerged, roles: [...(savedMerged.roles || []), roleItem].filter(Boolean) };
        } catch (roleErr) {
          setPersonal((prev) => {
            const exists = prev.some((item) => item.id === savedMerged.id);
            if (exists) return prev.map((item) => item.id === savedMerged.id ? savedMerged : item);
            return [savedMerged, ...prev];
          });
          setFormError(
            `El funcionario se guardó correctamente, pero no se pudo asignar el rol "${formatRol(personalDraft.rol)}": ${roleErr?.message || 'error desconocido'}. Completalo después desde la ficha ("Ver").`
          );
          setFormSaving(false);
          return;
        }
      }

      // Unica via de escritura de bases (ajuste D): se guardan aca, DESPUES
      // de la persona, nunca dentro del payload de POST/PATCH. Mismo manejo
      // de error parcial que el rol inicial arriba -- si esto falla, la
      // persona ya quedo guardada, no se revierte nada.
      try {
        const savedBases = await updatePersonalBases(
          saved.id,
          personalDraft.bases.map((b) => ({ base_id: b.base_id, es_principal: b.es_principal }))
        );
        savedMerged = { ...savedMerged, bases: savedBases };
      } catch (basesErr) {
        setPersonal((prev) => {
          const exists = prev.some((item) => item.id === savedMerged.id);
          if (exists) return prev.map((item) => item.id === savedMerged.id ? savedMerged : item);
          return [savedMerged, ...prev];
        });
        setFormError(
          `El funcionario se guardó correctamente, pero no se pudieron guardar las bases: ${basesErr?.message || 'error desconocido'}. Completalo después desde la ficha ("Ver").`
        );
        setFormSaving(false);
        return;
      }

      setPersonal((prev) => {
        const exists = prev.some((item) => item.id === savedMerged.id);
        if (exists) return prev.map((item) => item.id === savedMerged.id ? savedMerged : item);
        return [savedMerged, ...prev];
      });

      const wasAlreadySelected = selectedPersonalId === savedMerged.id;
      setSelectedPersonalId(savedMerged.id);
      if (wasAlreadySelected) refreshSelectedDetail();
      setDetailTab('datos_generales');
      setPersonalFormOpen(false);

      // POST y PATCH /operaciones/personal devuelven la fila cruda de
      // su_personal, sin el JOIN a su_vehiculos que solo arma el listado
      // (GET) -- sin este refresco, la tarjeta en la jerarquia se veria sin
      // el numero de movil (badge de Enfermeria) hasta el proximo reload
      // manual. Mismo criterio que refreshPersonalList ya usa para
      // licencia_vigente en el flujo de licencias/baja.
      refreshPersonalList();
    } catch (err) {
      setFormError(err?.message || 'No se pudo guardar el funcionario.');
    } finally {
      setFormSaving(false);
    }
  };

  const openDetail = (personalId) => {
    setSelectedPersonalId(personalId);
    setDetailTab('datos_generales');
  };

  // Refresca el icono de "documentos pendientes" de la jerarquia al cerrar
  // la ficha -- la pestaña Documentación (PersonalDocumentosTab.jsx) maneja
  // su propio estado y no avisa a este componente en cada validar/rechazar/
  // subir, asi que el momento natural de refrescar es cuando RRHH termina
  // de revisar y vuelve a la vista de jerarquia.
  const closeDetail = () => {
    setSelectedPersonalId(null);
    listPersonalConDocumentosPendientes()
      .then((ids) => setPersonalConDocumentosPendientes(new Set(ids)))
      .catch(() => {});
  };

  const refreshVencimientos = async () => {
    try {
      const items = await listPersonalVencimientos({ days: 30 });
      setVencimientos(items);
    } catch {
      // No bloquea el flujo principal si falla solo el refresco de alertas.
    }
  };

  const handleAddRole = async (rol, { rol_principal } = {}) => {
    if (!selectedPersonalId) return;
    try {
      await addPersonalRole(selectedPersonalId, { rol, rol_principal: Boolean(rol_principal) });
      refreshSelectedDetail();
    } catch (err) {
      setActionError(err?.message || 'No se pudo agregar el rol.');
    }
  };

  const handleRemoveRole = async (roleId) => {
    if (!selectedPersonalId) return;
    try {
      await deletePersonalRole(selectedPersonalId, roleId);
      refreshSelectedDetail();
    } catch (err) {
      setActionError(err?.message || 'No se pudo quitar el rol.');
    }
  };

  const handleAddHabilitacion = async (draft) => {
    if (!selectedPersonalId) return;
    try {
      await addHabilitacion(selectedPersonalId, draft);
      refreshSelectedDetail();
      refreshVencimientos();
    } catch (err) {
      setActionError(err?.message || 'No se pudo guardar la habilitación.');
    }
  };

  const handleAddCapacitacion = async (draft) => {
    if (!selectedPersonalId) return;
    try {
      await addCapacitacion(selectedPersonalId, draft);
      refreshSelectedDetail();
      refreshVencimientos();
    } catch (err) {
      setActionError(err?.message || 'No se pudo guardar la capacitación.');
    }
  };

  const handleAddCarnetSalud = async (draft) => {
    if (!selectedPersonalId) return;
    try {
      await addCarnetSalud(selectedPersonalId, draft);
      refreshSelectedDetail();
      refreshVencimientos();
    } catch (err) {
      setActionError(err?.message || 'No se pudo guardar el carné de salud.');
    }
  };

  // Igual que refreshVencimientos: refresco liviano sin el loading global de
  // loadRrhh -- hace falta ademas de refreshSelectedDetail (que solo
  // actualiza la ficha abierta) porque licencia_vigente tambien se muestra
  // en la tarjeta de la grilla, detras del modal, y ese dato sale de esta
  // misma lista, no de la ficha.
  const refreshPersonalList = async () => {
    try {
      const items = await listPersonal();
      setPersonal(items);
    } catch {
      // No bloquea el flujo principal si falla solo este refresco.
    }
  };

  const handleAddLicencia = async (draft) => {
    if (!selectedPersonalId) return;
    try {
      await addLicencia(selectedPersonalId, draft);
      refreshSelectedDetail();
      refreshPersonalList();
    } catch (err) {
      setActionError(err?.message || 'No se pudo guardar la licencia.');
    }
  };

  const handleUpdateLicencia = async (licenciaId, draft) => {
    if (!selectedPersonalId) return;
    try {
      await updateLicencia(selectedPersonalId, licenciaId, draft);
      refreshSelectedDetail();
      refreshPersonalList();
    } catch (err) {
      setActionError(err?.message || 'No se pudo actualizar la licencia.');
    }
  };

  // Dar de baja (egreso): usa el mismo PATCH generico de siempre (no el
  // DELETE, que solo setea estado sin fecha) -- fecha_egreso es una columna
  // real de su_personal, el sanitizador del backend ya la acepta sin que
  // haga falta ningun endpoint nuevo. Cierra la ficha al terminar: la
  // persona pasa a "Egresados" y ya no tiene sentido seguir viendo su ficha
  // de activo abierta.
  const handleDarDeBaja = async (fechaEgreso) => {
    if (!selectedPersonalId) return;
    try {
      await updatePersonal(selectedPersonalId, { estado: 'baja', fecha_egreso: fechaEgreso });
      await refreshPersonalList();
      closeDetail();
    } catch (err) {
      setActionError(err?.message || 'No se pudo registrar la baja.');
    }
  };

  const cargarFichaLinksList = async () => {
    setFichaLinksListLoading(true);
    setFichaLinksListError('');
    try {
      const items = await listFichaLinks();
      setFichaLinksList(items);
    } catch (err) {
      setFichaLinksListError(err?.message || 'No se pudo cargar el listado de links.');
    } finally {
      setFichaLinksListLoading(false);
    }
  };

  const handleGenerateFichaLink = async () => {
    setFichaLinkOpen(true);
    setFichaLinkLoading(true);
    setFichaLinkError('');
    setFichaLinkCopied(false);
    try {
      const result = await generateFichaLink();
      setFichaLinkUrl(result?.url || '');
      await cargarFichaLinksList();
    } catch (err) {
      setFichaLinkError(err?.message || 'No se pudo generar el link.');
    } finally {
      setFichaLinkLoading(false);
    }
  };

  const handleRevokeFichaLink = async (linkId) => {
    setRevokingLinkId(linkId);
    setFichaLinksListError('');
    try {
      await revokeFichaLink(linkId);
      await cargarFichaLinksList();
    } catch (err) {
      setFichaLinksListError(err?.message || 'No se pudo desactivar el link.');
    } finally {
      setRevokingLinkId(null);
    }
  };

  const handleCopyFichaLink = async () => {
    try {
      await navigator.clipboard.writeText(fichaLinkUrl);
      setFichaLinkCopied(true);
    } catch {
      setFichaLinkError('No se pudo copiar el link. Copialo manualmente.');
    }
  };

  // Mismo refresco doble que ya usan licencias/baja: refreshSelectedDetail
  // actualiza la ficha abierta, refreshPersonalList actualiza la foto que se
  // ve detras en la tarjeta de la jerarquia.
  const handleUploadFoto = async (blob) => {
    if (!selectedPersonalId) return;
    setFotoUploading(true);
    setActionError('');
    try {
      await uploadPersonalFoto(selectedPersonalId, blob);
      refreshSelectedDetail();
      refreshPersonalList();
    } catch (err) {
      setActionError(err?.message || 'No se pudo subir la foto.');
    } finally {
      setFotoUploading(false);
    }
  };

  const handleDeleteFoto = async () => {
    if (!selectedPersonalId) return;
    setFotoUploading(true);
    setActionError('');
    try {
      await deletePersonalFoto(selectedPersonalId);
      refreshSelectedDetail();
      refreshPersonalList();
    } catch (err) {
      setActionError(err?.message || 'No se pudo quitar la foto.');
    } finally {
      setFotoUploading(false);
    }
  };

  const openCreateEmpresa = () => {
    setEmpresaFormMode('create');
    setEmpresaDraft({ ...emptyEmpresaDraft, id: `ec-${Date.now()}` });
    setEmpresaFormOpen(true);
  };

  const openEditEmpresa = (empresaId) => {
    const empresa = suEmpresasContratistas.find((item) => item.id === empresaId);
    if (!empresa) return;
    setEmpresaFormMode('edit');
    setEmpresaDraft({ ...empresa });
    setEmpresaFormOpen(true);
  };

  const saveEmpresa = () => {
    setSuEmpresasContratistas((prev) => {
      const exists = prev.some((item) => item.id === empresaDraft.id);
      if (exists) return prev.map((item) => item.id === empresaDraft.id ? empresaDraft : item);
      return [empresaDraft, ...prev];
    });
    setEmpresaFormOpen(false);
  };

  return (
    <div className="view rrhh-screen rrhh-screen-full">
      <section className="content-grid rrhh-content-grid">
        <Panel
          className="span-12 rrhh-main-panel"
          title="Personal"
          subtitle="Listado conectado al backend real, con filtros y alertas documentales."
        >
          {loading ? (
            <div className="rrhh-empty rrhh-empty-surface">Cargando personal...</div>
          ) : error ? (
            <div className="rrhh-empty rrhh-empty-surface" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#b91c1c' }}>
              <span>{error}</span>
              <Button variant="ghost" onClick={loadRrhh}>Reintentar</Button>
            </div>
          ) : (
            <PersonalList
              Button={Button}
              hierarchy={personalHierarchy}
              filters={filters}
              bases={bases}
              onFilterChange={handleFilterChange}
              onCreate={openCreatePersonal}
              onView={openDetail}
              onGenerateLink={handleGenerateFichaLink}
              formatRol={formatRol}
              getAlertMeta={getAlertMeta}
            />
          )}
        </Panel>
      </section>

      {selectedPersonalId ? (
        <PersonalDetail
          Button={Button}
          Tag={Tag}
          personal={selectedPersonalDetail}
          loading={detailLoading}
          error={detailError}
          actionError={actionError}
          activeTab={detailTab}
          onTabChange={setDetailTab}
          onClose={closeDetail}
          onEdit={openEditPersonal}
          roleOptions={RRHH_ROLE_OPTIONS}
          formatRol={formatRol}
          getBaseLabel={getBaseLabel}
          getStatusVariant={getStatusVariant}
          getDocumentStatusVariant={getDocumentStatusVariant}
          getVencimientoMeta={getVencimientoMeta}
          onAddRole={handleAddRole}
          onRemoveRole={handleRemoveRole}
          onAddHabilitacion={handleAddHabilitacion}
          onAddCapacitacion={handleAddCapacitacion}
          onAddCarnetSalud={handleAddCarnetSalud}
          onAddLicencia={handleAddLicencia}
          onUpdateLicencia={handleUpdateLicencia}
          onDarDeBaja={handleDarDeBaja}
          onUploadFoto={handleUploadFoto}
          onDeleteFoto={handleDeleteFoto}
          fotoUploading={fotoUploading}
          cambiosPublicos={cambiosPublicos}
          cambiosLoading={cambiosLoading}
          cambiosError={cambiosError}
        />
      ) : null}

      {fichaLinkOpen ? (
        <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Link para completar fichas">
          <div className="lot-wizard-overlay" onClick={() => setFichaLinkOpen(false)} />
          <div className="rrhh-modal-panel rrhh-modal-panel-narrow">
            <div className="rrhh-modal-header" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <div>
                <h3>Link para completar fichas</h3>
                <p>Compartilo con el funcionario para que cargue sus datos y su foto. Válido por 24 horas.</p>
              </div>
              <Button variant="ghost" onClick={() => setFichaLinkOpen(false)}>Cerrar</Button>
            </div>

            {fichaLinkLoading ? (
              <div className="rrhh-empty-inline">Generando link...</div>
            ) : fichaLinkError ? (
              <div className="rrhh-form-error">{fichaLinkError}</div>
            ) : (
              <>
                <div className="rrhh-ficha-link-box">
                  <input type="text" readOnly value={fichaLinkUrl} onFocus={(event) => event.target.select()} />
                </div>
                <div className="rrhh-inline-actions" style={{ marginTop: 14 }}>
                  <Button variant="secondary" onClick={handleCopyFichaLink}>
                    {fichaLinkCopied ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(fichaLinkUrl)}`, '_blank', 'noopener,noreferrer')}
                  >
                    Compartir por WhatsApp
                  </Button>
                </div>

                <div className="rrhh-ficha-links-list">
                  <div className="rrhh-section-title" style={{ marginTop: 20 }}>
                    <span>Links vigentes</span>
                  </div>
                  {fichaLinksListLoading ? (
                    <div className="rrhh-empty-inline">Cargando...</div>
                  ) : fichaLinksListError ? (
                    <div className="rrhh-form-error">{fichaLinksListError}</div>
                  ) : fichaLinksList.length ? (
                    fichaLinksList.map((link) => (
                      <div key={link.id} className="rrhh-ficha-links-list-item">
                        <div className="rrhh-ficha-links-list-item-info">
                          <span className="rrhh-ficha-links-list-item-url">{link.url}</span>
                          <span className="rrhh-subtle">Vence {formatFichaLinkVencimiento(link.expires_at)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => handleRevokeFichaLink(link.id)}
                          disabled={revokingLinkId === link.id}
                        >
                          {revokingLinkId === link.id ? 'Desactivando...' : 'Desactivar'}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rrhh-empty-inline">No hay otros links vigentes.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {personalFormOpen ? (
        <PersonalForm
          Button={Button}
          draft={personalDraft}
          setDraft={setPersonalDraft}
          formMode={personalFormMode}
          bases={bases}
          vehiculos={vehiculos}
          roleOptions={RRHH_ROLE_OPTIONS}
          formatRol={formatRol}
          existingRolesCount={personalExistingRolesCount}
          existingRoles={personalExistingRoles}
          errors={personalErrors}
          saving={formSaving}
          formError={formError}
          onClose={() => setPersonalFormOpen(false)}
          onSubmit={savePersonal}
          onOpenEmpresas={() => setEmpresasOpen(true)}
          onManageRoles={() => {
            setPersonalFormOpen(false);
            openDetail(personalDraft.id);
          }}
        />
      ) : null}

      {empresasOpen ? (
        <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Empresas contratistas">
          <div className="lot-wizard-overlay" onClick={() => setEmpresasOpen(false)} />
          <div className="rrhh-modal-panel rrhh-modal-panel-wide">
            <div className="rrhh-modal-header">
              <div>
                <h3>Empresas contratistas</h3>
                <p>Catálogo de referencia (mock) -- todavía no hay endpoint de backend para esta tabla.</p>
              </div>
              <Button variant="ghost" onClick={() => setEmpresasOpen(false)}>Cerrar</Button>
            </div>
            <EmpresasContratistasList
              Button={Button}
              Tag={Tag}
              empresas={suEmpresasContratistas}
              onCreate={openCreateEmpresa}
              onEdit={openEditEmpresa}
            />
          </div>
        </div>
      ) : null}

      {empresaFormOpen ? (
        <EmpresaContratistaForm
          Button={Button}
          draft={empresaDraft}
          setDraft={setEmpresaDraft}
          onClose={() => setEmpresaFormOpen(false)}
          onSubmit={saveEmpresa}
          formMode={empresaFormMode}
        />
      ) : null}
    </div>
  );
}
