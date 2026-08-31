import React from 'react';
import { AlertTriangle, Ambulance, Building2, Gauge, Wrench } from 'lucide-react';
import VehiculoList from './VehiculoList.jsx';
import VehiculoForm from './VehiculoForm.jsx';
import VehiculoDetail from './VehiculoDetail.jsx';
import {
  FLOTAS_BASES,
  su_vehiculos as initialVehiculos,
  su_vehiculos_documentos as initialDocumentos,
  su_vehiculos_mantenimiento as initialMantenimiento,
  su_vehiculos_equipamiento_checklist as initialChecklist
} from './flotasMockData.js';
import './flotasStyles.css';

const TODAY = new Date('2026-08-30T00:00:00');

const emptyVehiculoDraft = {
  id: '',
  organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd',
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
  return Math.ceil((target.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
};

const buildId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export default function FlotasScreen({ Button, Panel, Tag }) {
  const [vehiculos, setVehiculos] = React.useState(initialVehiculos);
  const [vehiculosDocumentos, setVehiculosDocumentos] = React.useState(initialDocumentos);
  const [vehiculosMantenimiento, setVehiculosMantenimiento] = React.useState(initialMantenimiento);
  const [vehiculosChecklist, setVehiculosChecklist] = React.useState(initialChecklist);
  const [filters, setFilters] = React.useState({ base_id: '', categoria: '', estado_operativo: '' });
  const [vehiculoFormOpen, setVehiculoFormOpen] = React.useState(false);
  const [vehiculoFormMode, setVehiculoFormMode] = React.useState('create');
  const [vehiculoDraft, setVehiculoDraft] = React.useState(emptyVehiculoDraft);
  const [vehiculoErrors, setVehiculoErrors] = React.useState({});
  const [selectedVehiculoId, setSelectedVehiculoId] = React.useState(null);
  const [detailTab, setDetailTab] = React.useState('datos_generales');

  const baseById = React.useMemo(() => Object.fromEntries(FLOTAS_BASES.map((base) => [base.id, base])), []);

  const documentosByVehiculoId = React.useMemo(() => {
    const grouped = {};
    vehiculosDocumentos.forEach((item) => {
      if (!grouped[item.vehiculo_id]) grouped[item.vehiculo_id] = [];
      grouped[item.vehiculo_id].push(item);
    });
    return grouped;
  }, [vehiculosDocumentos]);

  const mantenimientoByVehiculoId = React.useMemo(() => {
    const grouped = {};
    vehiculosMantenimiento.forEach((item) => {
      if (!grouped[item.vehiculo_id]) grouped[item.vehiculo_id] = [];
      grouped[item.vehiculo_id].push(item);
    });
    return grouped;
  }, [vehiculosMantenimiento]);

  const checklistByVehiculoId = React.useMemo(() => {
    const grouped = {};
    vehiculosChecklist.forEach((item) => {
      if (!grouped[item.vehiculo_id]) grouped[item.vehiculo_id] = [];
      grouped[item.vehiculo_id].push(item);
    });
    return grouped;
  }, [vehiculosChecklist]);

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
    if (Number(vehiculo.kilometraje) >= Number(vehiculo.proximo_service_km)) return { hasAlert: true, variant: 'danger', label: 'Service vencido por kilometraje' };
    if (Number(vehiculo.kilometraje) >= Number(vehiculo.proximo_service_km) - 5000) return { hasAlert: true, variant: 'warning', label: 'Service proximo por kilometraje' };
    return { hasAlert: false, variant: 'success', label: 'Service dentro de rango' };
  }, []);

  const rows = React.useMemo(() => vehiculos.map((vehiculo) => ({
    ...vehiculo,
    documentAlert: getDocumentAlertMeta(documentosByVehiculoId[vehiculo.id] || []),
    serviceAlert: getServiceAlertMeta(vehiculo)
  })), [vehiculos, documentosByVehiculoId, getDocumentAlertMeta, getServiceAlertMeta]);

  const filteredRows = React.useMemo(() => rows.filter((row) => {
    if (filters.base_id && row.base_id !== filters.base_id) return false;
    if (filters.categoria && row.categoria !== filters.categoria) return false;
    if (filters.estado_operativo && row.estado_operativo !== filters.estado_operativo) return false;
    return true;
  }), [rows, filters]);

  const selectedVehiculo = React.useMemo(() => vehiculos.find((item) => item.id === selectedVehiculoId) || null, [vehiculos, selectedVehiculoId]);

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
    setVehiculoDraft({ ...emptyVehiculoDraft, id: buildId('veh') });
    setVehiculoErrors({});
    setVehiculoFormOpen(true);
  };

  const openEdit = (vehiculoId) => {
    const vehiculo = vehiculos.find((item) => item.id === vehiculoId);
    if (!vehiculo) return;
    setVehiculoFormMode('edit');
    setVehiculoDraft({ ...vehiculo });
    setVehiculoErrors({});
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

  const saveVehiculo = () => {
    if (!validateVehiculoDraft()) return;

    const persisted = {
      ...vehiculoDraft,
      anio: Number(vehiculoDraft.anio) || 0,
      altura_cm: Number(vehiculoDraft.altura_cm) || 0,
      kilometraje: Number(vehiculoDraft.kilometraje) || 0,
      proximo_service_km: Number(vehiculoDraft.proximo_service_km) || 0
    };

    setVehiculos((prev) => {
      const exists = prev.some((item) => item.id === persisted.id);
      if (exists) return prev.map((item) => item.id === persisted.id ? persisted : item);
      return [persisted, ...prev];
    });

    setSelectedVehiculoId(persisted.id);
    setDetailTab('datos_generales');
    setVehiculoFormOpen(false);
  };

  const handleStatusChange = (vehiculoId, nextStatus) => {
    if (!statusOptions.includes(nextStatus)) return;
    setVehiculos((prev) => prev.map((item) => item.id === vehiculoId ? { ...item, estado_operativo: nextStatus } : item));
  };

  const addDocumento = (vehiculoId, draft) => {
    setVehiculosDocumentos((prev) => [
      { id: buildId('vd'), vehiculo_id: vehiculoId, tipo: draft.tipo, numero: draft.numero, fecha_emision: draft.fecha_emision, fecha_vencimiento: draft.fecha_vencimiento, documento_url: draft.documento_url },
      ...prev
    ]);
  };

  const addMantenimiento = (vehiculoId, draft) => {
    setVehiculosMantenimiento((prev) => [
      { id: buildId('vm'), vehiculo_id: vehiculoId, tipo: draft.tipo, descripcion: draft.descripcion, fecha: draft.fecha, kilometraje_al_momento: Number(draft.kilometraje_al_momento) || 0, costo: Number(draft.costo) || 0, proveedor: draft.proveedor },
      ...prev
    ]);
  };

  const addChecklistItem = (vehiculoId, draft) => {
    setVehiculosChecklist((prev) => [
      { id: buildId('vc'), vehiculo_id: vehiculoId, item: draft.item, material_id: null, obligatorio: Boolean(draft.obligatorio), presente: Boolean(draft.presente), fecha_verificacion: TODAY.toISOString().slice(0, 10), verificado_por: draft.verificado_por },
      ...prev
    ]);
  };

  const updateChecklistItem = (itemId, changes) => {
    setVehiculosChecklist((prev) => prev.map((item) => item.id === itemId ? { ...item, ...changes } : item));
  };

  return (
    <div className="view flotas-screen flotas-screen-full">
      <section className="content-grid flotas-content-grid">
        <Panel className="span-12 flotas-hero-panel" title="Flotas" subtitle="Mock operativo alineado con su_vehiculos, documentos, mantenimiento y checklist.">
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
          <VehiculoList
            Button={Button}
            Tag={Tag}
            rows={filteredRows}
            filters={filters}
            bases={FLOTAS_BASES}
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
        </Panel>
      </section>

      {selectedVehiculo ? (
        <VehiculoDetail
          Button={Button}
          Tag={Tag}
          vehicle={selectedVehiculo}
          base={baseById[selectedVehiculo.base_id] || null}
          documentos={documentosByVehiculoId[selectedVehiculo.id] || []}
          mantenimiento={mantenimientoByVehiculoId[selectedVehiculo.id] || []}
          checklist={checklistByVehiculoId[selectedVehiculo.id] || []}
          activeTab={detailTab}
          onTabChange={setDetailTab}
          onClose={() => setSelectedVehiculoId(null)}
          onEdit={openEdit}
          onStatusChange={handleStatusChange}
          onAddDocumento={addDocumento}
          onAddMantenimiento={addMantenimiento}
          onAddChecklistItem={addChecklistItem}
          onUpdateChecklistItem={updateChecklistItem}
          getStatusVariant={getStatusVariant}
          getDocumentMeta={getDocumentMeta}
          getDocumentAlertMeta={getDocumentAlertMeta}
          getServiceAlertMeta={getServiceAlertMeta}
          formatCategoria={formatCategoria}
        />
      ) : null}

      {vehiculoFormOpen ? (
        <VehiculoForm
          Button={Button}
          draft={vehiculoDraft}
          setDraft={setVehiculoDraft}
          formMode={vehiculoFormMode}
          bases={FLOTAS_BASES}
          errors={vehiculoErrors}
          onClose={() => setVehiculoFormOpen(false)}
          onSubmit={saveVehiculo}
        />
      ) : null}
    </div>
  );
}
