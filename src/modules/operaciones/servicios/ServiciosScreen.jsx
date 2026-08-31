import React from 'react';
import { Activity, Ambulance, CheckCircle2, Clock3, Route } from 'lucide-react';
import ServicioList from './ServicioList.jsx';
import ServicioForm from './ServicioForm.jsx';
import ServicioDetail from './ServicioDetail.jsx';
import {
  SERVICE_PRIORITY_SUGGESTIONS,
  SERVICE_PROVIDER_OPTIONS,
  su_servicios as initialServicios,
  su_servicios_dotacion as initialDotacion
} from './serviciosMockData.js';
import { FLOTAS_BASES, su_vehiculos as initialVehiculos } from '../flotas/flotasMockData.js';
import { su_personal as initialPersonal, su_personal_roles as initialRoles } from '../rrhh/rrhhMockData.js';
import './serviciosStyles.css';

const NOW = new Date('2026-08-30T18:58:00');

const emptyServicioDraft = {
  id: '',
  organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd',
  tipo: 'Asistencia',
  prestador_contratante: 'SuEmergencia',
  prioridad: 'Urgente',
  origen_direccion: '',
  origen_lat: '',
  origen_lng: '',
  destino_direccion: '',
  destino_lat: '',
  destino_lng: '',
  vehiculo_id: '',
  paciente_nombre: '',
  paciente_documento: '',
  paciente_edad: '',
  motivo_consulta: '',
  diagnostico_presuntivo: '',
  estado: 'solicitado',
  hora_solicitud: NOW.toISOString(),
  hora_despacho: '',
  hora_llegada_escena: '',
  hora_inicio_traslado: '',
  hora_finalizacion: ''
};

const STATUS_VARIANTS = {
  solicitado: 'warning',
  asignado: 'info',
  en_curso: 'danger',
  finalizado: 'success',
  cancelado: 'ghost'
};

const PRIORITY_VARIANTS = {
  'Crítico': 'danger',
  Urgente: 'warning',
  'No urgente': 'success'
};

const ALLOWED_TRANSITIONS = {
  solicitado: ['asignado', 'cancelado'],
  asignado: ['en_curso', 'cancelado'],
  en_curso: ['finalizado', 'cancelado'],
  finalizado: [],
  cancelado: []
};

const buildId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export default function ServiciosScreen({ Button, Panel, Tag }) {
  const [servicios, setServicios] = React.useState(initialServicios);
  const [dotacion, setDotacion] = React.useState(initialDotacion);
  const [tick, setTick] = React.useState(Date.now());
  const [filters, setFilters] = React.useState({
    estado: '',
    tipo: '',
    prestador_contratante: '',
    base_id: ''
  });
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState('create');
  const [draft, setDraft] = React.useState(emptyServicioDraft);
  const [errors, setErrors] = React.useState({});
  const [selectedServicioId, setSelectedServicioId] = React.useState(null);
  const [detailTab, setDetailTab] = React.useState('datos_generales');

  React.useEffect(() => {
    const intervalId = window.setInterval(() => setTick(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const vehiclesById = React.useMemo(
    () => Object.fromEntries(initialVehiculos.map((item) => [item.id, item])),
    []
  );

  const basesById = React.useMemo(
    () => Object.fromEntries(FLOTAS_BASES.map((item) => [item.id, item])),
    []
  );

  const peopleById = React.useMemo(
    () => Object.fromEntries(initialPersonal.map((item) => [item.id, item])),
    []
  );

  const rolesByPersonalId = React.useMemo(() => {
    const grouped = {};
    initialRoles.forEach((item) => {
      if (!grouped[item.personal_id]) grouped[item.personal_id] = [];
      grouped[item.personal_id].push(item);
    });
    return grouped;
  }, []);

  const activeAssignments = React.useMemo(() => {
    const map = {};
    servicios.forEach((item) => {
      if (!item.vehiculo_id) return;
      if (!['asignado', 'en_curso'].includes(item.estado)) return;
      map[item.vehiculo_id] = item.id;
    });
    return map;
  }, [servicios]);

  const getElapsedLabel = React.useCallback((dateValue) => {
    if (!dateValue) return 'Sin dato';
    const target = new Date(dateValue);
    const diff = Math.max(0, tick - target.getTime());
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) return `${hours}h ${remainingMinutes}m`;
    return `${remainingMinutes}m`;
  }, [tick]);

  const getStatusVariant = React.useCallback((status) => STATUS_VARIANTS[status] || 'info', []);
  const getPriorityVariant = React.useCallback((priority) => PRIORITY_VARIANTS[priority] || 'ghost', []);
  const getAllowedNextStates = React.useCallback((status) => ALLOWED_TRANSITIONS[status] || [], []);
  const formatDateTime = React.useCallback((value) => {
    if (!value) return 'Sin dato';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-UY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getVehicleOptionMeta = React.useCallback((vehiculoId, currentServiceId) => {
    const vehicle = vehiclesById[vehiculoId];
    if (!vehicle) return { warning: 'El vehículo no existe en el mock de Flotas.' };
    if (activeAssignments[vehiculoId] && activeAssignments[vehiculoId] !== currentServiceId) {
      return { warning: `${vehicle.numero_interno} ya está tomado por otro servicio activo.` };
    }
    if (vehicle.estado_operativo !== 'disponible') {
      return { warning: `${vehicle.numero_interno} está en estado ${vehicle.estado_operativo}.` };
    }
    return { warning: '' };
  }, [activeAssignments, vehiclesById]);

  const rows = React.useMemo(() => servicios.map((item) => {
    const vehicle = item.vehiculo_id ? vehiclesById[item.vehiculo_id] : null;
    const base = vehicle?.base_id ? basesById[vehicle.base_id] : null;
    const warningMeta = item.vehiculo_id ? getVehicleOptionMeta(item.vehiculo_id, item.id) : null;

    return {
      ...item,
      vehiculo: vehicle,
      base,
      vehicleWarning: warningMeta?.warning || ''
    };
  }), [servicios, vehiclesById, basesById, getVehicleOptionMeta]);

  const filteredRows = React.useMemo(() => rows.filter((row) => {
    if (filters.estado && row.estado !== filters.estado) return false;
    if (filters.tipo && row.tipo !== filters.tipo) return false;
    if (filters.prestador_contratante && row.prestador_contratante !== filters.prestador_contratante) return false;
    if (filters.base_id && row.base?.id !== filters.base_id) return false;
    return true;
  }), [rows, filters]);

  const selectedService = React.useMemo(
    () => servicios.find((item) => item.id === selectedServicioId) || null,
    [servicios, selectedServicioId]
  );

  const selectedDotacion = React.useMemo(() => {
    if (!selectedService) return [];
    return dotacion
      .filter((item) => item.servicio_id === selectedService.id)
      .map((item) => ({
        ...item,
        personalLabel: `${peopleById[item.personal_id]?.nombre || ''} ${peopleById[item.personal_id]?.apellido || ''}`.trim() || item.personal_id
      }));
  }, [dotacion, selectedService, peopleById]);

  const summary = React.useMemo(() => ({
    total: servicios.length,
    abiertos: servicios.filter((item) => ['solicitado', 'asignado', 'en_curso'].includes(item.estado)).length,
    enCurso: servicios.filter((item) => item.estado === 'en_curso').length,
    finalizados: servicios.filter((item) => item.estado === 'finalizado').length
  }), [servicios]);

  const validateDraft = () => {
    const nextErrors = {};
    if (!draft.prestador_contratante.trim()) nextErrors.prestador_contratante = 'El prestador es obligatorio.';
    if (!draft.origen_direccion.trim()) nextErrors.origen_direccion = 'La dirección de origen es obligatoria.';
    if (!draft.paciente_nombre.trim()) nextErrors.paciente_nombre = 'El nombre del paciente es obligatorio.';
    const age = Number(draft.paciente_edad);
    if (!draft.paciente_edad || Number.isNaN(age) || age < 15 || age > 100) {
      nextErrors.paciente_edad = 'La edad debe estar entre 15 y 100 años.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openCreate = () => {
    setFormMode('create');
    setDraft({ ...emptyServicioDraft, id: buildId('srv'), hora_solicitud: new Date().toISOString() });
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (serviceId) => {
    const item = servicios.find((row) => row.id === serviceId);
    if (!item) return;
    setFormMode('edit');
    setDraft({
      ...item,
      vehiculo_id: item.vehiculo_id || ''
    });
    setErrors({});
    setFormOpen(true);
  };

  const saveServicio = () => {
    if (!validateDraft()) return;

    const persisted = {
      ...draft,
      origen_lat: draft.origen_lat === '' ? null : Number(draft.origen_lat),
      origen_lng: draft.origen_lng === '' ? null : Number(draft.origen_lng),
      destino_lat: draft.destino_lat === '' ? null : Number(draft.destino_lat),
      destino_lng: draft.destino_lng === '' ? null : Number(draft.destino_lng),
      paciente_edad: Number(draft.paciente_edad),
      vehiculo_id: draft.vehiculo_id || null
    };

    setServicios((prev) => {
      const exists = prev.some((item) => item.id === persisted.id);
      if (exists) return prev.map((item) => item.id === persisted.id ? persisted : item);
      return [persisted, ...prev];
    });

    setSelectedServicioId(persisted.id);
    setDetailTab('datos_generales');
    setFormOpen(false);
  };

  const applyStateChange = ({ serviceId, nextState, nextVehicleId }) => {
    const current = servicios.find((item) => item.id === serviceId);
    if (!current) return { ok: false, message: 'Servicio no encontrado.' };
    if (nextState !== current.estado && !getAllowedNextStates(current.estado).includes(nextState)) {
      return { ok: false, message: 'La transición de estado no es válida.' };
    }
    if ((nextState === 'asignado' || nextState === 'en_curso') && !nextVehicleId) {
      return { ok: false, message: 'Debes seleccionar un vehículo para ese estado.' };
    }

    const nowIso = new Date().toISOString();

    setServicios((prev) => prev.map((item) => {
      if (item.id !== serviceId) return item;
      const next = {
        ...item,
        estado: nextState,
        vehiculo_id: nextVehicleId || item.vehiculo_id || null
      };

      if (item.estado === 'solicitado' && nextState === 'asignado' && !next.hora_despacho) {
        next.hora_despacho = nowIso;
      }
      if (item.estado === 'asignado' && nextState === 'en_curso') {
        if (!next.hora_llegada_escena) next.hora_llegada_escena = nowIso;
        if (!next.hora_inicio_traslado) next.hora_inicio_traslado = nowIso;
      }
      if (item.estado === 'en_curso' && nextState === 'finalizado' && !next.hora_finalizacion) {
        next.hora_finalizacion = nowIso;
      }
      if (nextState === 'cancelado' && !next.hora_finalizacion) {
        next.hora_finalizacion = nowIso;
      }
      return next;
    }));

    return { ok: true };
  };

  const addDotacion = ({ servicio_id, personal_id, rol_en_servicio }) => {
    if (!personal_id || !rol_en_servicio) {
      return { ok: false, message: 'Debes seleccionar una persona y un rol.' };
    }
    const validRoles = rolesByPersonalId[personal_id] || [];
    if (!validRoles.some((item) => item.rol === rol_en_servicio)) {
      return { ok: false, message: 'Ese rol no existe entre los roles reales de la persona en RRHH.' };
    }
    setDotacion((prev) => [
      ...prev,
      {
        id: buildId('sd'),
        servicio_id,
        personal_id,
        rol_en_servicio
      }
    ]);
    return { ok: true };
  };

  const removeDotacion = (dotacionId) => {
    setDotacion((prev) => prev.filter((item) => item.id !== dotacionId));
  };

  return (
    <div className="view servicios-screen servicios-screen-full">
      <section className="content-grid servicios-content-grid">
        <Panel className="span-12 servicios-hero-panel" title="Servicios" subtitle="Mock operativo alineado con su_servicios y su_servicios_dotacion, sin historia clínica.">
          <div className="servicios-hero-kpis">
            <div className="servicios-kpi-card">
              <span className="servicios-kpi-label">Servicios totales</span>
              <strong className="servicios-kpi-value"><Activity size={18} /> {summary.total}</strong>
            </div>
            <div className="servicios-kpi-card">
              <span className="servicios-kpi-label">Abiertos</span>
              <strong className="servicios-kpi-value"><Clock3 size={18} /> {summary.abiertos}</strong>
            </div>
            <div className="servicios-kpi-card">
              <span className="servicios-kpi-label">En curso</span>
              <strong className="servicios-kpi-value"><Ambulance size={18} /> {summary.enCurso}</strong>
            </div>
            <div className="servicios-kpi-card">
              <span className="servicios-kpi-label">Finalizados</span>
              <strong className="servicios-kpi-value"><CheckCircle2 size={18} /> {summary.finalizados}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="span-12" title="Servicios activos y recientes" subtitle="Tarjetas con filtros, estado operativo y tiempo transcurrido en vivo.">
          <ServicioList
            Button={Button}
            Tag={Tag}
            rows={filteredRows}
            filters={filters}
            providerOptions={SERVICE_PROVIDER_OPTIONS}
            bases={FLOTAS_BASES}
            onFilterChange={(field, value) => setFilters((prev) => ({ ...prev, [field]: value }))}
            onCreate={openCreate}
            onView={(serviceId) => {
              setSelectedServicioId(serviceId);
              setDetailTab('datos_generales');
            }}
            onEdit={openEdit}
            getElapsedLabel={getElapsedLabel}
            getStatusVariant={getStatusVariant}
            getPriorityVariant={getPriorityVariant}
          />
        </Panel>
      </section>

      {selectedService ? (
        <ServicioDetail
          Button={Button}
          Tag={Tag}
          service={selectedService}
          vehicle={selectedService.vehiculo_id ? vehiclesById[selectedService.vehiculo_id] : null}
          base={selectedService.vehiculo_id ? basesById[vehiclesById[selectedService.vehiculo_id]?.base_id] : null}
          dotacion={selectedDotacion}
          people={{ staff: initialPersonal, vehicles: initialVehiculos }}
          rolesByPersonalId={rolesByPersonalId}
          activeTab={detailTab}
          onTabChange={setDetailTab}
          onClose={() => setSelectedServicioId(null)}
          onEdit={openEdit}
          onApplyStateChange={applyStateChange}
          onAddDotacion={addDotacion}
          onRemoveDotacion={removeDotacion}
          getStatusVariant={getStatusVariant}
          getPriorityVariant={getPriorityVariant}
          getAllowedNextStates={getAllowedNextStates}
          formatDateTime={formatDateTime}
          getElapsedLabel={getElapsedLabel}
          getVehicleOptionMeta={getVehicleOptionMeta}
        />
      ) : null}

      {formOpen ? (
        <ServicioForm
          Button={Button}
          draft={draft}
          setDraft={setDraft}
          formMode={formMode}
          providerOptions={SERVICE_PROVIDER_OPTIONS}
          prioritySuggestions={SERVICE_PRIORITY_SUGGESTIONS}
          errors={errors}
          onClose={() => setFormOpen(false)}
          onSubmit={saveServicio}
        />
      ) : null}
    </div>
  );
}
