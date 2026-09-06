import React from 'react';
import { AlertTriangle, Ambulance, Building2, Gauge, Wrench } from 'lucide-react';
import VehiculoList from './VehiculoList.jsx';
import VehiculoForm from './VehiculoForm.jsx';
import VehiculoDetail from './VehiculoDetail.jsx';
import {
  listVehiculos,
  listBases,
  listVehiculoDocumentosVencimientos,
  createVehiculo,
  updateVehiculo,
  getVehiculoDetail,
  addVehiculoDocumento,
  addVehiculoMantenimiento,
  addVehiculoChecklist
} from '../../../services/flotasService.js';
import './flotasStyles.css';

// El backend descubre las columnas de vencimiento por nombre en runtime (ver
// getVencimientoColumn en index.mjs): fecha_vencimiento, vencimiento, vence_el,
// fecha_vence, fecha_expiracion o fecha_vigencia_hasta. Reflejamos la misma lista
// aca para no asumir un unico nombre de columna.
const VENCIMIENTO_FIELD_CANDIDATES = [
  'fecha_vencimiento',
  'vencimiento',
  'vence_el',
  'fecha_vence',
  'fecha_expiracion',
  'fecha_vigencia_hasta'
];

const pickVencimientoValue = (doc) => {
  for (const key of VENCIMIENTO_FIELD_CANDIDATES) {
    if (doc && doc[key] !== undefined && doc[key] !== null) return doc[key];
  }
  return null;
};

const emptyVehiculoDraft = {
  id: '',
  numero_interno: '',
  matricula: '',
  marca: '',
  modelo: '',
  anio: 2026,
  categoria: 'AVA',
  modalidad: '',
  es_backup: false,
  base_id: '',
  altura_cm: '',
  capacidad_camilla_articulada: false,
  estado_operativo: 'disponible',
  kilometraje: '',
  proximo_service_km: ''
};

const statusToVariant = {
  disponible: 'success',
  en_servicio: 'info',
  en_base: 'warning',
  mantenimiento: 'danger',
  fuera_de_servicio: 'ghost'
};

const statusOptions = ['disponible', 'en_servicio', 'en_base', 'mantenimiento', 'fuera_de_servicio'];

const diffDays = (dateValue) => {
  if (!dateValue) return null;
  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isNaN(numeric) ? '—' : numeric.toLocaleString('es-UY');
};

export default function FlotasScreen({ Button, Panel, Tag }) {
  const [vehiculos, setVehiculos] = React.useState([]);
  const [bases, setBases] = React.useState([]);
  const [vencimientos, setVencimientos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [filters, setFilters] = React.useState({ base_id: '', categoria: '', estado_operativo: '' });
  const [vehiculoFormOpen, setVehiculoFormOpen] = React.useState(false);
  const [vehiculoFormMode, setVehiculoFormMode] = React.useState('create');
  const [vehiculoDraft, setVehiculoDraft] = React.useState(emptyVehiculoDraft);
  const [vehiculoErrors, setVehiculoErrors] = React.useState({});
  const [formSaving, setFormSaving] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  const [selectedVehiculoId, setSelectedVehiculoId] = React.useState(null);
  const [selectedVehiculoDetail, setSelectedVehiculoDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState('');
  const [actionError, setActionError] = React.useState('');
  const [detailRefreshToken, setDetailRefreshToken] = React.useState(0);
  const [detailTab, setDetailTab] = React.useState('datos_generales');

  const loadFlotas = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [vehiculosItems, basesItems, vencimientosItems] = await Promise.all([
        listVehiculos(),
        listBases(),
        listVehiculoDocumentosVencimientos({ days: 30 })
      ]);
      setVehiculos(vehiculosItems);
      setBases(basesItems);
      setVencimientos(vencimientosItems);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar los vehiculos.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadFlotas();
  }, [loadFlotas]);

  React.useEffect(() => {
    if (!selectedVehiculoId) {
      setSelectedVehiculoDetail(null);
      setDetailError('');
      setActionError('');
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    setActionError('');
    getVehiculoDetail(selectedVehiculoId)
      .then((detail) => {
        if (cancelled) return;
        if (!detail) {
          setDetailError('Vehiculo no encontrado.');
          setSelectedVehiculoDetail(null);
          return;
        }
        setSelectedVehiculoDetail(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailError(err?.message || 'No se pudo cargar el detalle del vehiculo.');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedVehiculoId, detailRefreshToken]);

  const refreshSelectedDetail = () => setDetailRefreshToken((token) => token + 1);

  const baseById = React.useMemo(() => Object.fromEntries(bases.map((base) => [base.id, base])), [bases]);

  const vencimientosByVehiculoId = React.useMemo(() => {
    const grouped = {};
    vencimientos.forEach((doc) => {
      const vehiculoId = doc.vehiculo_id;
      if (!vehiculoId) return;
      if (!grouped[vehiculoId]) grouped[vehiculoId] = [];
      grouped[vehiculoId].push({ ...doc, fecha_vencimiento: pickVencimientoValue(doc) });
    });
    return grouped;
  }, [vencimientos]);

  const getDocumentMeta = React.useCallback((dateValue) => {
    const days = diffDays(dateValue);
    if (days === null) return { variant: 'info', label: 'Sin fecha' };
    if (days < 0) return { variant: 'danger', label: `Vencido ${dateValue}` };
    if (days <= 30) return { variant: 'warning', label: `Vence ${dateValue}` };
    return { variant: 'success', label: `Vigente ${dateValue}` };
  }, []);

  const getDocumentAlertMeta = React.useCallback((items = []) => {
    const levels = items.map((item) => diffDays(item.fecha_vencimiento));
    if (levels.some((days) => days !== null && days < 0)) return { hasAlert: true, variant: 'danger', label: 'Documentacion vencida' };
    if (levels.some((days) => days !== null && days <= 30)) return { hasAlert: true, variant: 'warning', label: 'Documentos por vencer en 30 dias' };
    return { hasAlert: false, variant: 'success', label: 'Documentacion al dia' };
  }, []);

  const getServiceAlertMeta = React.useCallback((vehiculo) => {
    const km = Number(vehiculo.kilometraje);
    const proximoServiceKm = Number(vehiculo.proximo_service_km);
    if (Number.isNaN(km) || Number.isNaN(proximoServiceKm)) return { hasAlert: false, variant: 'info', label: 'Sin datos de service' };
    if (km >= proximoServiceKm) return { hasAlert: true, variant: 'danger', label: 'Service vencido por kilometraje' };
    if (km >= proximoServiceKm - 5000) return { hasAlert: true, variant: 'warning', label: 'Service proximo por kilometraje' };
    return { hasAlert: false, variant: 'success', label: 'Service dentro de rango' };
  }, []);

  const rows = React.useMemo(() => vehiculos.map((vehiculo) => ({
    ...vehiculo,
    documentAlert: getDocumentAlertMeta(vencimientosByVehiculoId[vehiculo.id] || []),
    serviceAlert: getServiceAlertMeta(vehiculo)
  })), [vehiculos, vencimientosByVehiculoId, getDocumentAlertMeta, getServiceAlertMeta]);

  const filteredRows = React.useMemo(() => rows.filter((row) => {
    if (filters.base_id && row.base_id !== filters.base_id) return false;
    if (filters.categoria && row.categoria !== filters.categoria) return false;
    if (filters.estado_operativo && row.estado_operativo !== filters.estado_operativo) return false;
    return true;
  }), [rows, filters]);

  const summary = React.useMemo(() => {
    const alerts = rows.filter((row) => row.documentAlert.hasAlert || row.serviceAlert.hasAlert).length;
    const serviceDue = rows.filter((row) => row.serviceAlert.hasAlert).length;
    const activeBases = new Set(vehiculos.map((item) => item.base_id).filter(Boolean)).size;
    return {
      total: vehiculos.length,
      disponibles: vehiculos.filter((item) => item.estado_operativo === 'disponible').length,
      alertas: alerts,
      serviceDue,
      activeBases
    };
  }, [rows, vehiculos]);

  const formatCategoria = React.useCallback((categoria) => {
    if (categoria === 'AVA') return 'AVA';
    if (categoria === 'basico') return 'Basico';
    if (categoria === 'pediatrico') return 'Pediatrico';
    return categoria || 'Sin categoria';
  }, []);

  const getBaseLabel = React.useCallback((baseId) => baseById[baseId]?.nombre || 'Sin base', [baseById]);
  const getStatusVariant = React.useCallback((status) => statusToVariant[status] || 'info', []);

  const openCreate = () => {
    setVehiculoFormMode('create');
    setVehiculoDraft({ ...emptyVehiculoDraft });
    setVehiculoErrors({});
    setFormError('');
    setVehiculoFormOpen(true);
  };

  const openEdit = (vehiculoId) => {
    const vehiculo = vehiculos.find((item) => item.id === vehiculoId);
    if (!vehiculo) return;
    setVehiculoFormMode('edit');
    setVehiculoDraft({ ...emptyVehiculoDraft, ...vehiculo });
    setVehiculoErrors({});
    setFormError('');
    setVehiculoFormOpen(true);
  };

  const validateVehiculoDraft = () => {
    const nextErrors = {};
    if (!vehiculoDraft.numero_interno.trim()) nextErrors.numero_interno = 'El numero interno es obligatorio.';
    if (!vehiculoDraft.matricula.trim()) nextErrors.matricula = 'La matricula es obligatoria.';
    if (!vehiculoDraft.marca.trim()) nextErrors.marca = 'La marca es obligatoria.';
    if (!vehiculoDraft.modelo.trim()) nextErrors.modelo = 'El modelo es obligatorio.';
    if (!vehiculoDraft.base_id) nextErrors.base_id = 'Selecciona una base.';
    setVehiculoErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveVehiculo = async () => {
    if (!validateVehiculoDraft()) return;

    const payload = {
      numero_interno: vehiculoDraft.numero_interno,
      matricula: vehiculoDraft.matricula,
      marca: vehiculoDraft.marca,
      modelo: vehiculoDraft.modelo,
      anio: vehiculoDraft.anio === '' ? null : Number(vehiculoDraft.anio),
      categoria: vehiculoDraft.categoria,
      modalidad: vehiculoDraft.modalidad,
      es_backup: Boolean(vehiculoDraft.es_backup),
      base_id: vehiculoDraft.base_id,
      altura_cm: vehiculoDraft.altura_cm === '' ? null : Number(vehiculoDraft.altura_cm),
      capacidad_camilla_articulada: Boolean(vehiculoDraft.capacidad_camilla_articulada),
      estado_operativo: vehiculoDraft.estado_operativo,
      kilometraje: vehiculoDraft.kilometraje === '' ? null : Number(vehiculoDraft.kilometraje),
      proximo_service_km: vehiculoDraft.proximo_service_km === '' ? null : Number(vehiculoDraft.proximo_service_km)
    };

    setFormSaving(true);
    setFormError('');
    try {
      const saved = vehiculoFormMode === 'create'
        ? await createVehiculo(payload)
        : await updateVehiculo(vehiculoDraft.id, payload);
      if (!saved) throw new Error('El backend no devolvio el vehiculo guardado.');

      setVehiculos((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        if (exists) return prev.map((item) => item.id === saved.id ? saved : item);
        return [saved, ...prev];
      });

      const wasAlreadySelected = selectedVehiculoId === saved.id;
      setSelectedVehiculoId(saved.id);
      if (wasAlreadySelected) refreshSelectedDetail();
      setDetailTab('datos_generales');
      setVehiculoFormOpen(false);
    } catch (err) {
      setFormError(err?.message || 'No se pudo guardar el vehiculo.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleStatusChange = async (vehiculoId, nextStatus) => {
    if (!statusOptions.includes(nextStatus)) return;
    try {
      const updated = await updateVehiculo(vehiculoId, { estado_operativo: nextStatus });
      if (!updated) return;
      setVehiculos((prev) => prev.map((item) => item.id === vehiculoId ? updated : item));
      setSelectedVehiculoDetail((prev) => (prev && prev.id === vehiculoId ? { ...prev, ...updated } : prev));
    } catch (err) {
      setActionError(err?.message || 'No se pudo actualizar el estado operativo.');
    }
  };

  const addDocumento = async (vehiculoId, draft) => {
    try {
      await addVehiculoDocumento(vehiculoId, {
        tipo: draft.tipo,
        numero: draft.numero,
        fecha_emision: draft.fecha_emision || null,
        fecha_vencimiento: draft.fecha_vencimiento || null,
        documento_url: draft.documento_url || null
      });
      refreshSelectedDetail();
      const items = await listVehiculoDocumentosVencimientos({ days: 30 });
      setVencimientos(items);
    } catch (err) {
      setActionError(err?.message || 'No se pudo guardar el documento.');
    }
  };

  const addMantenimiento = async (vehiculoId, draft) => {
    try {
      await addVehiculoMantenimiento(vehiculoId, {
        tipo: draft.tipo,
        descripcion: draft.descripcion,
        fecha: draft.fecha || null,
        kilometraje_al_momento: draft.kilometraje_al_momento === '' ? null : Number(draft.kilometraje_al_momento),
        costo: draft.costo === '' ? null : Number(draft.costo),
        proveedor: draft.proveedor || null
      });
      refreshSelectedDetail();
    } catch (err) {
      setActionError(err?.message || 'No se pudo registrar el mantenimiento.');
    }
  };

  const addChecklistItem = async (vehiculoId, draft) => {
    try {
      await addVehiculoChecklist(vehiculoId, {
        item: draft.item,
        obligatorio: Boolean(draft.obligatorio),
        presente: Boolean(draft.presente),
        verificado_por: draft.verificado_por || null,
        fecha_verificacion: new Date().toISOString().slice(0, 10)
      });
      refreshSelectedDetail();
    } catch (err) {
      setActionError(err?.message || 'No se pudo agregar el item de checklist.');
    }
  };

  return (
    <div className="view flotas-screen flotas-screen-full">
      <section className="content-grid flotas-content-grid">
        <Panel className="span-12 flotas-hero-panel" title="Flotas" subtitle="Vehiculos, documentos, mantenimiento y checklist de SU Emergencia.">
          <div className="flotas-hero-kpis">
            <div className="flotas-kpi-card">
              <span className="flotas-kpi-label">Vehiculos totales</span>
              <strong className="flotas-kpi-value"><Ambulance size={18} /> {summary.total}</strong>
            </div>
            <div className="flotas-kpi-card">
              <span className="flotas-kpi-label">Disponibles</span>
              <strong className="flotas-kpi-value"><Building2 size={18} /> {summary.disponibles}</strong>
            </div>
            <div className="flotas-kpi-card">
              <span className="flotas-kpi-label">Con alertas</span>
              <strong className="flotas-kpi-value"><AlertTriangle size={18} /> {summary.alertas}</strong>
            </div>
            <div className="flotas-kpi-card">
              <span className="flotas-kpi-label">Service vencido/proximo</span>
              <strong className="flotas-kpi-value"><Wrench size={18} /> {summary.serviceDue}</strong>
            </div>
            <div className="flotas-kpi-card">
              <span className="flotas-kpi-label">Bases activas</span>
              <strong className="flotas-kpi-value"><Gauge size={18} /> {summary.activeBases}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="span-12" title="Vehiculos" subtitle="Listado en tarjetas con filtros por base, categoria y estado operativo.">
          {loading ? (
            <div className="flotas-empty">Cargando vehiculos...</div>
          ) : error ? (
            <div className="flotas-empty" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#b91c1c' }}>
              <span>{error}</span>
              <Button variant="ghost" onClick={loadFlotas}>Reintentar</Button>
            </div>
          ) : (
            <VehiculoList
              Button={Button}
              Tag={Tag}
              rows={filteredRows}
              filters={filters}
              bases={bases}
              formatNumber={formatNumber}
              onFilterChange={(field, value) => setFilters((prev) => ({ ...prev, [field]: value }))}
              onCreate={openCreate}
              onView={(vehiculoId) => {
                setSelectedVehiculoId(vehiculoId);
                setDetailTab('datos_generales');
              }}
              onEdit={openEdit}
              formatCategoria={formatCategoria}
              getBaseLabel={getBaseLabel}
              getStatusVariant={getStatusVariant}
            />
          )}
        </Panel>
      </section>

      {selectedVehiculoId ? (
        <VehiculoDetail
          Button={Button}
          Tag={Tag}
          vehicle={selectedVehiculoDetail}
          base={baseById[selectedVehiculoDetail?.base_id] || null}
          documentos={selectedVehiculoDetail?.documentos || []}
          mantenimiento={selectedVehiculoDetail?.mantenimiento || []}
          checklist={selectedVehiculoDetail?.checklist || []}
          loading={detailLoading}
          error={detailError}
          actionError={actionError}
          activeTab={detailTab}
          onTabChange={setDetailTab}
          onClose={() => setSelectedVehiculoId(null)}
          onEdit={openEdit}
          onStatusChange={handleStatusChange}
          onAddDocumento={addDocumento}
          onAddMantenimiento={addMantenimiento}
          onAddChecklistItem={addChecklistItem}
          getStatusVariant={getStatusVariant}
          getDocumentMeta={getDocumentMeta}
          getDocumentAlertMeta={getDocumentAlertMeta}
          getServiceAlertMeta={getServiceAlertMeta}
          formatCategoria={formatCategoria}
          formatNumber={formatNumber}
        />
      ) : null}

      {vehiculoFormOpen ? (
        <VehiculoForm
          Button={Button}
          draft={vehiculoDraft}
          setDraft={setVehiculoDraft}
          formMode={vehiculoFormMode}
          bases={bases}
          errors={vehiculoErrors}
          saving={formSaving}
          formError={formError}
          onClose={() => setVehiculoFormOpen(false)}
          onSubmit={saveVehiculo}
        />
      ) : null}
    </div>
  );
}
