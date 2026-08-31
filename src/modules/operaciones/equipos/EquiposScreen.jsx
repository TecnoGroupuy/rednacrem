import React from 'react';
import { AlertTriangle, HeartPulse, ShieldAlert, Wrench } from 'lucide-react';
import EquipoList from './EquipoList.jsx';
import EquipoForm from './EquipoForm.jsx';
import EquipoDetail from './EquipoDetail.jsx';
import {
  EQUIPO_ESTADO_OPTIONS,
  EQUIPO_TYPE_SUGGESTIONS,
  EQUIPO_UBICACION_OPTIONS,
  su_equipos_biomedicos as initialEquipos,
  su_equipos_biomedicos_revisiones as initialRevisiones
} from './equiposMockData.js';
import { FLOTAS_BASES, su_vehiculos } from '../flotas/flotasMockData.js';
import { su_personal } from '../rrhh/rrhhMockData.js';
import './equiposStyles.css';

const TODAY = new Date('2026-08-30T00:00:00');

const emptyEquipoDraft = {
  id: '',
  organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd',
  equipo: '',
  marca: '',
  modelo: '',
  numero_serie: '',
  ubicacion_tipo: 'vehiculo',
  base_id: '',
  vehiculo_id: '',
  fecha_ultima_revision: '',
  fecha_proximo_service: '',
  estado: 'activo',
  observacion: ''
};

const emptyRevisionDraft = {
  fecha_revision: '2026-08-30',
  fecha_proximo_service: '',
  observacion: '',
  registrado_por: ''
};

const buildId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export default function EquiposScreen({ Button, Panel, Tag }) {
  const [equipos, setEquipos] = React.useState(initialEquipos);
  const [revisiones, setRevisiones] = React.useState(initialRevisiones);
  const [filters, setFilters] = React.useState({
    equipo: '',
    ubicacion_tipo: '',
    estado: '',
    service_alert: ''
  });
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState('create');
  const [draft, setDraft] = React.useState(emptyEquipoDraft);
  const [errors, setErrors] = React.useState({});
  const [selectedEquipoId, setSelectedEquipoId] = React.useState(null);
  const [revisionFormOpen, setRevisionFormOpen] = React.useState(false);
  const [revisionDraft, setRevisionDraft] = React.useState(emptyRevisionDraft);
  const [revisionErrors, setRevisionErrors] = React.useState({});

  const basesById = React.useMemo(() => Object.fromEntries(FLOTAS_BASES.map((item) => [item.id, item])), []);
  const vehiclesById = React.useMemo(() => Object.fromEntries(su_vehiculos.map((item) => [item.id, item])), []);
  const peopleById = React.useMemo(() => Object.fromEntries(su_personal.map((item) => [item.id, item])), []);

  const responsableOptions = React.useMemo(
    () => su_personal.map((item) => ({ id: item.id, label: `${item.nombre} ${item.apellido}` })),
    []
  );

  const getStatusVariant = React.useCallback((status) => {
    if (status === 'activo') return 'success';
    if (status === 'reparacion') return 'warning';
    if (status === 'roto') return 'danger';
    return 'ghost';
  }, []);

  const getServiceMeta = React.useCallback((dateValue) => {
    if (!dateValue) return { variant: 'ghost', label: 'Sin fecha de service', shortLabel: 'Sin fecha', level: 'none' };
    const target = new Date(`${dateValue}T00:00:00`);
    const diffDays = Math.ceil((target.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { variant: 'danger', label: 'Service vencido', shortLabel: 'Vencido', level: 'danger' };
    if (diffDays <= 30) return { variant: 'warning', label: 'Próximo service', shortLabel: 'Próximo', level: 'warning' };
    return { variant: 'success', label: 'Service vigente', shortLabel: 'Vigente', level: 'ok' };
  }, []);

  const formatLocationType = React.useCallback((type) => {
    if (type === 'vehiculo') return 'Vehículo';
    if (type === 'base') return 'Base';
    if (type === 'economato') return 'Economato';
    if (type === 'backup') return 'Backup';
    return type;
  }, []);

  const formatLocationLabel = React.useCallback((equipo) => {
    if (equipo.ubicacion_tipo === 'vehiculo') {
      const vehiculo = vehiclesById[equipo.vehiculo_id];
      const base = vehiculo?.base_id ? basesById[vehiculo.base_id] : basesById[equipo.base_id];
      return [vehiculo?.numero_interno || 'Vehículo sin id', base?.nombre].filter(Boolean).join(' · ');
    }
    if (equipo.ubicacion_tipo === 'base') return basesById[equipo.base_id]?.nombre || 'Base sin asignar';
    if (equipo.ubicacion_tipo === 'economato') return 'Economato';
    if (equipo.ubicacion_tipo === 'backup') return 'Backup';
    return 'Sin ubicación';
  }, [basesById, vehiclesById]);

  const rows = React.useMemo(() => equipos.map((item) => ({
    ...item,
    ubicacion_label: formatLocationLabel(item)
  })), [equipos, formatLocationLabel]);

  const filteredRows = React.useMemo(() => rows.filter((row) => {
    if (filters.equipo && row.equipo !== filters.equipo) return false;
    if (filters.ubicacion_tipo && row.ubicacion_tipo !== filters.ubicacion_tipo) return false;
    if (filters.estado && row.estado !== filters.estado) return false;
    if (filters.service_alert === 'si' && !['warning', 'danger'].includes(getServiceMeta(row.fecha_proximo_service).level)) return false;
    if (filters.service_alert === 'no' && ['warning', 'danger'].includes(getServiceMeta(row.fecha_proximo_service).level)) return false;
    return true;
  }), [filters, getServiceMeta, rows]);

  const selectedEquipo = React.useMemo(
    () => equipos.find((item) => item.id === selectedEquipoId) || null,
    [equipos, selectedEquipoId]
  );

  const selectedRevisiones = React.useMemo(
    () => revisiones.filter((item) => item.equipo_id === selectedEquipoId).sort((a, b) => b.fecha_revision.localeCompare(a.fecha_revision)),
    [revisiones, selectedEquipoId]
  );

  const summary = React.useMemo(() => ({
    total: equipos.length,
    alertas: equipos.filter((item) => ['warning', 'danger'].includes(getServiceMeta(item.fecha_proximo_service).level)).length,
    vencidos: equipos.filter((item) => getServiceMeta(item.fecha_proximo_service).level === 'danger').length,
    reparacion: equipos.filter((item) => item.estado === 'reparacion').length
  }), [equipos, getServiceMeta]);

  const openCreate = () => {
    setFormMode('create');
    setDraft({ ...emptyEquipoDraft, id: buildId('eq') });
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (equipoId) => {
    const equipo = equipos.find((item) => item.id === equipoId);
    if (!equipo) return;
    setFormMode('edit');
    setDraft({
      ...equipo,
      base_id: equipo.base_id || '',
      vehiculo_id: equipo.vehiculo_id || ''
    });
    setErrors({});
    setSelectedEquipoId(equipoId);
    setFormOpen(true);
  };

  const validateDraft = () => {
    const nextErrors = {};
    if (!draft.equipo.trim()) nextErrors.equipo = 'El tipo de equipo es obligatorio.';
    if (!draft.marca.trim()) nextErrors.marca = 'La marca es obligatoria.';
    if (!draft.modelo.trim()) nextErrors.modelo = 'El modelo es obligatorio.';
    if (!draft.numero_serie.trim()) nextErrors.numero_serie = 'El número de serie es obligatorio.';
    if (!draft.fecha_ultima_revision) nextErrors.fecha_ultima_revision = 'La fecha de revisión es obligatoria.';
    if (!draft.fecha_proximo_service) nextErrors.fecha_proximo_service = 'La fecha de próximo service es obligatoria.';
    if (draft.ubicacion_tipo === 'base' && !draft.base_id) nextErrors.base_id = 'Selecciona una base.';
    if (draft.ubicacion_tipo === 'vehiculo' && !draft.vehiculo_id) nextErrors.vehiculo_id = 'Selecciona un vehículo.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveEquipo = () => {
    if (!validateDraft()) return;

    const selectedVehicle = draft.vehiculo_id ? vehiclesById[draft.vehiculo_id] : null;
    const persisted = {
      ...draft,
      base_id: draft.ubicacion_tipo === 'vehiculo'
        ? selectedVehicle?.base_id || null
        : draft.ubicacion_tipo === 'base'
          ? draft.base_id || null
          : null,
      vehiculo_id: draft.ubicacion_tipo === 'vehiculo' ? draft.vehiculo_id || null : null
    };

    setEquipos((prev) => {
      const exists = prev.some((item) => item.id === persisted.id);
      return exists ? prev.map((item) => item.id === persisted.id ? persisted : item) : [persisted, ...prev];
    });

    setSelectedEquipoId(persisted.id);
    setFormOpen(false);
  };

  const openRevisionForm = () => {
    if (!selectedEquipo) return;
    setRevisionDraft({
      ...emptyRevisionDraft,
      fecha_revision: '2026-08-30',
      fecha_proximo_service: selectedEquipo.fecha_proximo_service || ''
    });
    setRevisionErrors({});
    setRevisionFormOpen(true);
  };

  const closeRevisionForm = () => {
    setRevisionFormOpen(false);
    setRevisionErrors({});
    setRevisionDraft(emptyRevisionDraft);
  };

  const saveRevision = () => {
    const nextErrors = {};
    if (!selectedEquipo) return;
    if (!revisionDraft.fecha_proximo_service) nextErrors.fecha_proximo_service = 'Define la fecha del próximo service.';
    if (!revisionDraft.registrado_por) nextErrors.registrado_por = 'Selecciona quién registra la revisión.';
    setRevisionErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const persisted = {
      id: buildId('rev'),
      equipo_id: selectedEquipo.id,
      fecha_revision: revisionDraft.fecha_revision,
      fecha_proximo_service: revisionDraft.fecha_proximo_service,
      observacion: revisionDraft.observacion,
      registrado_por: revisionDraft.registrado_por
    };

    setRevisiones((prev) => [persisted, ...prev]);
    setEquipos((prev) => prev.map((item) => item.id === selectedEquipo.id ? {
      ...item,
      fecha_ultima_revision: revisionDraft.fecha_revision,
      fecha_proximo_service: revisionDraft.fecha_proximo_service,
      observacion: revisionDraft.observacion || item.observacion
    } : item));
    closeRevisionForm();
  };

  return (
    <div className="view equipos-screen equipos-screen-full">
      <section className="content-grid equipos-content-grid">
        <Panel className="span-12 equipos-hero-panel" title="Equipos biomédicos" subtitle="Control mock de equipos por móvil, base, economato o backup con semáforo de service.">
          <div className="equipos-hero-kpis">
            <div className="equipos-kpi-card">
              <span className="equipos-kpi-label">Equipos totales</span>
              <strong className="equipos-kpi-value"><HeartPulse size={18} /> {summary.total}</strong>
            </div>
            <div className="equipos-kpi-card">
              <span className="equipos-kpi-label">Con alerta</span>
              <strong className="equipos-kpi-value"><AlertTriangle size={18} /> {summary.alertas}</strong>
            </div>
            <div className="equipos-kpi-card">
              <span className="equipos-kpi-label">Service vencido</span>
              <strong className="equipos-kpi-value"><ShieldAlert size={18} /> {summary.vencidos}</strong>
            </div>
            <div className="equipos-kpi-card">
              <span className="equipos-kpi-label">En reparación</span>
              <strong className="equipos-kpi-value"><Wrench size={18} /> {summary.reparacion}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="span-12" title="Parque biomédico" subtitle="Tarjetas con filtros, estado operativo y semáforo de revisión técnica.">
          <EquipoList
            Button={Button}
            Tag={Tag}
            rows={filteredRows}
            filters={filters}
            typeSuggestions={EQUIPO_TYPE_SUGGESTIONS}
            onFilterChange={(field, value) => setFilters((prev) => ({ ...prev, [field]: value }))}
            onCreate={openCreate}
            onView={(equipoId) => {
              setSelectedEquipoId(equipoId);
              setRevisionFormOpen(false);
            }}
            onEdit={openEdit}
            getStatusVariant={getStatusVariant}
            getServiceMeta={getServiceMeta}
            formatLocationType={formatLocationType}
          />
        </Panel>
      </section>

      {selectedEquipo ? (
        <EquipoDetail
          Button={Button}
          Tag={Tag}
          equipo={selectedEquipo}
          revisiones={selectedRevisiones}
          responsableOptions={responsableOptions}
          revisionDraft={revisionDraft}
          setRevisionDraft={setRevisionDraft}
          revisionErrors={revisionErrors}
          revisionFormOpen={revisionFormOpen}
          onOpenRevisionForm={openRevisionForm}
          onCloseRevisionForm={closeRevisionForm}
          onSubmitRevision={saveRevision}
          onClose={() => {
            setSelectedEquipoId(null);
            setRevisionFormOpen(false);
          }}
          onEdit={openEdit}
          getStatusVariant={getStatusVariant}
          getServiceMeta={getServiceMeta}
          formatLocationLabel={formatLocationLabel}
        />
      ) : null}

      {formOpen ? (
        <EquipoForm
          Button={Button}
          draft={draft}
          setDraft={setDraft}
          formMode={formMode}
          typeSuggestions={EQUIPO_TYPE_SUGGESTIONS}
          statusOptions={EQUIPO_ESTADO_OPTIONS}
          locationOptions={EQUIPO_UBICACION_OPTIONS}
          bases={FLOTAS_BASES}
          vehiculos={su_vehiculos}
          errors={errors}
          onClose={() => setFormOpen(false)}
          onSubmit={saveEquipo}
        />
      ) : null}
    </div>
  );
}
