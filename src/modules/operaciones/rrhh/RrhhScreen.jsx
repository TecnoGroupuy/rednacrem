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
  addPersonalRole,
  deletePersonalRole,
  addHabilitacion,
  addCapacitacion,
  addCarnetSalud
} from '../../../services/rrhhService.js';
import { listBases } from '../../../services/flotasService.js';
import { getMissingFields } from './PersonalDetail.jsx';
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
  apellido: '',
  documento: '',
  fecha_nacimiento: '',
  telefono: '',
  email: '',
  domicilio: '',
  foto_url: '',
  base_id: '',
  estado: 'activo',
  fecha_ingreso: '',
  fecha_egreso: '',
  tipo_personal: 'interno',
  empresa_contratista_id: ''
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
  const dateOnly = toDateOnly(dateValue);
  if (days === null) return { variant: 'info', label: 'Sin fecha' };
  if (days < 0) return { variant: 'danger', label: `Vencida ${dateOnly}` };
  if (days <= 30) return { variant: 'warning', label: `Vence ${dateOnly}` };
  return { variant: 'success', label: `Vigente ${dateOnly}` };
};

const formatRol = (value) => String(value || '').replaceAll('_', ' ');

const getDocumentAlertLevel = (items = []) => {
  const levels = items.map((item) => diffDays(item?.fecha_vencimiento));
  if (levels.some((days) => days !== null && days < 0)) return 'danger';
  if (levels.some((days) => days !== null && days <= 30)) return 'warning';
  return 'success';
};

export default function RrhhScreen({ Button, Panel, Tag }) {
  const [personal, setPersonal] = React.useState([]);
  const [bases, setBases] = React.useState([]);
  const [vencimientos, setVencimientos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [suEmpresasContratistas, setSuEmpresasContratistas] = React.useState(initialEmpresas);
  const [filters, setFilters] = React.useState({
    base_id: '',
    rol: '',
    estado: '',
    tipo_personal: ''
  });
  const [personalFormOpen, setPersonalFormOpen] = React.useState(false);
  const [personalFormMode, setPersonalFormMode] = React.useState('create');
  const [personalDraft, setPersonalDraft] = React.useState(emptyPersonalDraft);
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

  const loadRrhh = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [personalItems, basesItems, vencimientosItems] = await Promise.all([
        listPersonal(),
        listBases(),
        listPersonalVencimientos({ days: 30 })
      ]);
      setPersonal(personalItems);
      setBases(basesItems);
      setVencimientos(vencimientosItems);
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
    if (filters.base_id && row.base_id !== filters.base_id) return false;
    if (filters.estado && row.estado !== filters.estado) return false;
    if (filters.tipo_personal && row.tipo_personal !== filters.tipo_personal) return false;
    return true;
  }), [personalRows, filters]);

  const getBaseLabel = React.useCallback((baseId) => baseById[baseId]?.nombre || 'Sin base', [baseById]);
  const getStatusVariant = React.useCallback((status) => statusToVariant[status] || 'info', []);
  const getDocumentStatusVariant = React.useCallback((status) => docStatusToVariant[status] || 'info', []);

  const getAlertMeta = React.useCallback((row) => {
    const items = vencimientosByPersonalId[row.id] || [];
    const level = getDocumentAlertLevel(items);
    if (level === 'danger') return { hasAlert: true, variant: 'danger', label: 'Documentación vencida' };
    if (level === 'warning') return { hasAlert: true, variant: 'warning', label: 'Próximo a vencer' };
    return { hasAlert: false, variant: 'success', label: 'Sin alertas' };
  }, [vencimientosByPersonalId]);

  // El filtro por rol es el unico que no se puede resolver client-side: a
  // diferencia de base_id/estado/tipo_personal (columnas de su_personal, ya
  // presentes en cada fila), el rol vive en su_personal_roles y GET
  // /operaciones/personal no lo trae (evita N+1 al listar). El backend si
  // soporta filtrar por rol via query param (EXISTS contra
  // su_personal_roles), asi que ese filtro puntual dispara un refetch en vez
  // de filtrar sobre datos que no tenemos.
  const applyRoleFilter = React.useCallback(async (rol) => {
    setLoading(true);
    setError('');
    try {
      const items = await listPersonal(rol ? { rol } : {});
      setPersonal(items);
    } catch (err) {
      setError(err?.message || 'No se pudo filtrar por rol.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (field === 'rol') {
      applyRoleFilter(value);
    }
  };

  const openCreatePersonal = () => {
    setPersonalFormMode('create');
    setPersonalDraft({ ...emptyPersonalDraft });
    setPersonalErrors({});
    setFormError('');
    setPersonalFormOpen(true);
  };

  const openEditPersonal = (personalId) => {
    const item = personal.find((row) => row.id === personalId);
    if (!item) return;
    setPersonalFormMode('edit');
    setPersonalDraft({ ...emptyPersonalDraft, ...item });
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
      apellido: personalDraft.apellido,
      documento: personalDraft.documento || null,
      fecha_nacimiento: personalDraft.fecha_nacimiento || null,
      telefono: personalDraft.telefono || null,
      email: personalDraft.email || null,
      domicilio: personalDraft.domicilio || null,
      base_id: personalDraft.base_id || null,
      estado: personalDraft.estado,
      fecha_ingreso: personalDraft.fecha_ingreso || null,
      fecha_egreso: personalDraft.fecha_egreso || null,
      tipo_personal: personalDraft.tipo_personal,
      empresa_contratista_id: null
    };

    setFormSaving(true);
    setFormError('');
    try {
      const saved = personalFormMode === 'create'
        ? await createPersonal(payload)
        : await updatePersonal(personalDraft.id, payload);
      if (!saved) throw new Error('El backend no devolvió el funcionario guardado.');

      setPersonal((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        if (exists) return prev.map((item) => item.id === saved.id ? saved : item);
        return [saved, ...prev];
      });

      const wasAlreadySelected = selectedPersonalId === saved.id;
      setSelectedPersonalId(saved.id);
      if (wasAlreadySelected) refreshSelectedDetail();
      setDetailTab('datos_generales');
      setPersonalFormOpen(false);
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

  const closeDetail = () => {
    setSelectedPersonalId(null);
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
              Tag={Tag}
              rows={filteredRows}
              filters={filters}
              bases={bases}
              roleOptions={RRHH_ROLE_OPTIONS}
              onFilterChange={handleFilterChange}
              onCreate={openCreatePersonal}
              onView={openDetail}
              onEdit={openEditPersonal}
              formatRol={formatRol}
              getBaseLabel={getBaseLabel}
              getStatusVariant={getStatusVariant}
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
        />
      ) : null}

      {personalFormOpen ? (
        <PersonalForm
          Button={Button}
          draft={personalDraft}
          setDraft={setPersonalDraft}
          formMode={personalFormMode}
          bases={bases}
          errors={personalErrors}
          saving={formSaving}
          formError={formError}
          onClose={() => setPersonalFormOpen(false)}
          onSubmit={savePersonal}
          onOpenEmpresas={() => setEmpresasOpen(true)}
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
