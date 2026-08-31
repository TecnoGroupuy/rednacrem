import React from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import TurnoDayView from './TurnoDayView.jsx';
import TurnoForm from './TurnoForm.jsx';
import TurnoCambioModal from './TurnoCambioModal.jsx';
import { TURNO_TYPE_OPTIONS, su_turnos as initialTurnos } from './turnosMockData.js';
import { FLOTAS_BASES, su_vehiculos } from '../flotas/flotasMockData.js';
import { su_personal, su_personal_roles } from '../rrhh/rrhhMockData.js';
import './turnosStyles.css';

const TODAY = '2026-08-30';

const emptyTurnoDraft = {
  id: '',
  organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd',
  personal_id: '',
  base_id: '',
  vehiculo_id: '',
  fecha: TODAY,
  hora_inicio: '',
  hora_fin: '',
  tipo_turno: '12hs',
  es_hora_extra: false,
  horas_extra: 0,
  observaciones: ''
};

const emptyCambioDraft = {
  turno_id: '',
  persona_a_id: '',
  persona_b_id: '',
  nota: ''
};

const buildId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const addDays = (dateValue, amount) => {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
};

export default function TurnosScreen({ Button, Panel, Tag }) {
  const [selectedDate, setSelectedDate] = React.useState(TODAY);
  const [turnos, setTurnos] = React.useState(initialTurnos);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState('create');
  const [draft, setDraft] = React.useState(emptyTurnoDraft);
  const [errors, setErrors] = React.useState({});
  const [cambioOpen, setCambioOpen] = React.useState(false);
  const [cambioDraft, setCambioDraft] = React.useState(emptyCambioDraft);
  const [cambioErrors, setCambioErrors] = React.useState({});

  const peopleById = React.useMemo(() => Object.fromEntries(su_personal.map((item) => [item.id, item])), []);
  const vehiclesById = React.useMemo(() => Object.fromEntries(su_vehiculos.map((item) => [item.id, item])), []);
  const rolesByPersonalId = React.useMemo(() => {
    const grouped = {};
    su_personal_roles.forEach((item) => {
      if (!grouped[item.personal_id]) grouped[item.personal_id] = [];
      grouped[item.personal_id].push(item);
    });
    return grouped;
  }, []);

  const getRoleLabel = React.useCallback((personalId) => {
    const roles = rolesByPersonalId[personalId] || [];
    const primary = roles.find((item) => item.rol_principal) || roles[0];
    return primary?.rol?.replaceAll('_', ' ') || 'Sin rol';
  }, [rolesByPersonalId]);

  const getVehicleLabel = React.useCallback((vehiculoId) => {
    if (!vehiculoId) return 'Sin vehículo asignado';
    return vehiclesById[vehiculoId]?.numero_interno || vehiculoId;
  }, [vehiclesById]);

  const dayRows = React.useMemo(() => turnos
    .filter((item) => item.fecha === selectedDate)
    .map((item) => ({
      ...item,
      personal: peopleById[item.personal_id] || null,
      personalLabel: `${peopleById[item.personal_id]?.nombre || ''} ${peopleById[item.personal_id]?.apellido || ''}`.trim() || item.personal_id
    })), [peopleById, selectedDate, turnos]);

  const groupedRows = React.useMemo(() => {
    const grouped = {};
    FLOTAS_BASES.forEach((base) => {
      grouped[base.id] = dayRows
        .filter((item) => item.base_id === base.id)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    });
    return grouped;
  }, [dayRows]);

  const summary = React.useMemo(() => ({
    total: dayRows.length,
    horasExtra: dayRows.filter((item) => item.es_hora_extra).length,
    sinVehiculo: dayRows.filter((item) => !item.vehiculo_id).length
  }), [dayRows]);

  const peopleOptions = React.useMemo(
    () => su_personal
      .filter((item) => item.estado !== 'baja')
      .map((item) => ({ id: item.id, label: `${item.nombre} ${item.apellido}` })),
    []
  );

  const baseOptions = React.useMemo(
    () => FLOTAS_BASES.map((item) => ({ id: item.id, label: item.nombre })),
    []
  );

  const currentVehicleOptions = React.useMemo(
    () => su_vehiculos
      .filter((item) => item.base_id === draft.base_id)
      .map((item) => ({ id: item.id, label: `${item.numero_interno} · ${item.categoria}` })),
    [draft.base_id]
  );

  const openCreate = () => {
    setFormMode('create');
    setDraft({ ...emptyTurnoDraft, id: buildId('tu'), fecha: selectedDate });
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (turnoId) => {
    const turno = turnos.find((item) => item.id === turnoId);
    if (!turno) return;
    setFormMode('edit');
    setDraft({
      ...turno,
      vehiculo_id: turno.vehiculo_id || '',
      horas_extra: turno.horas_extra || 0
    });
    setErrors({});
    setFormOpen(true);
  };

  const validateDraft = () => {
    const nextErrors = {};
    if (!draft.personal_id) nextErrors.personal_id = 'Selecciona una persona.';
    if (!draft.base_id) nextErrors.base_id = 'Selecciona una base.';
    if (!draft.fecha) nextErrors.fecha = 'La fecha es obligatoria.';
    if (!draft.hora_inicio) nextErrors.hora_inicio = 'La hora de inicio es obligatoria.';
    if (!draft.hora_fin) nextErrors.hora_fin = 'La hora de fin es obligatoria.';
    if (draft.es_hora_extra && (draft.horas_extra === '' || Number(draft.horas_extra) <= 0)) {
      nextErrors.horas_extra = 'Ingresa una cantidad válida de horas extra.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveTurno = () => {
    if (!validateDraft()) return;

    const nowIso = new Date().toISOString();
    const persisted = {
      ...draft,
      vehiculo_id: draft.vehiculo_id || '',
      horas_extra: draft.es_hora_extra ? Number(draft.horas_extra || 0) : 0,
      updated_at: nowIso,
      created_at: formMode === 'create' ? nowIso : draft.created_at || nowIso
    };

    setTurnos((prev) => {
      const exists = prev.some((item) => item.id === persisted.id);
      return exists ? prev.map((item) => item.id === persisted.id ? persisted : item) : [persisted, ...prev];
    });
    setFormOpen(false);
  };

  const openCambio = (turnoId) => {
    const turno = turnos.find((item) => item.id === turnoId);
    if (!turno) return;
    setCambioDraft({
      turno_id: turno.id,
      persona_a_id: turno.personal_id,
      persona_b_id: '',
      nota: ''
    });
    setCambioErrors({});
    setCambioOpen(true);
  };

  const currentCambioTurno = React.useMemo(
    () => turnos.find((item) => item.id === cambioDraft.turno_id) || null,
    [cambioDraft.turno_id, turnos]
  );

  const saveCambio = () => {
    const nextErrors = {};
    if (!cambioDraft.persona_a_id) nextErrors.persona_a_id = 'Selecciona la persona original.';
    if (!cambioDraft.persona_b_id) nextErrors.persona_b_id = 'Selecciona la persona reemplazo.';
    if (cambioDraft.persona_a_id && cambioDraft.persona_b_id && cambioDraft.persona_a_id === cambioDraft.persona_b_id) {
      nextErrors.persona_b_id = 'La persona reemplazo debe ser distinta.';
    }
    setCambioErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const personaA = peopleById[cambioDraft.persona_a_id];
    const personaB = peopleById[cambioDraft.persona_b_id];
    const baseNote = `Cambio de turno: ${personaA?.nombre || 'Persona A'} ${personaA?.apellido || ''} cedió a ${personaB?.nombre || 'Persona B'} ${personaB?.apellido || ''} el ${new Date().toISOString().slice(0, 16).replace('T', ' ')}.`;
    const extraNote = cambioDraft.nota.trim();

    setTurnos((prev) => prev.map((item) => {
      if (item.id !== cambioDraft.turno_id) return item;
      return {
        ...item,
        personal_id: cambioDraft.persona_b_id,
        observaciones: [item.observaciones, baseNote, extraNote].filter(Boolean).join(' '),
        updated_at: new Date().toISOString()
      };
    }));

    setCambioOpen(false);
  };

  return (
    <div className="view turnos-screen turnos-screen-full">
      <section className="content-grid turnos-content-grid">
        <Panel className="span-12 turnos-hero-panel" title="Turnos" subtitle="Cobertura diaria por base y móvil, con soporte para horas extra y cambios de turno.">
          <div className="turnos-toolbar">
            <div className="turnos-date-selector">
              <Button variant="ghost" onClick={() => setSelectedDate((prev) => addDays(prev, -1))}>
                <ChevronLeft size={16} />
              </Button>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              <Button variant="ghost" onClick={() => setSelectedDate((prev) => addDays(prev, 1))}>
                <ChevronRight size={16} />
              </Button>
            </div>
            <Button onClick={openCreate}>Nuevo turno</Button>
          </div>

          <div className="turnos-hero-kpis">
            <div className="turnos-kpi-card">
              <span className="turnos-kpi-label">Turnos del día</span>
              <strong className="turnos-kpi-value"><CalendarDays size={18} /> {summary.total}</strong>
            </div>
            <div className="turnos-kpi-card">
              <span className="turnos-kpi-label">Con horas extra</span>
              <strong className="turnos-kpi-value"><Clock3 size={18} /> {summary.horasExtra}</strong>
            </div>
            <div className="turnos-kpi-card">
              <span className="turnos-kpi-label">Sin vehículo</span>
              <strong className="turnos-kpi-value"><AlertTriangle size={18} /> {summary.sinVehiculo}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="span-12" title="Vista del día" subtitle="Grilla agrupada por base con todas las asignaciones visibles para la fecha seleccionada.">
          <TurnoDayView
            Button={Button}
            Tag={Tag}
            bases={FLOTAS_BASES}
            groupedRows={groupedRows}
            onEdit={openEdit}
            onOpenCambio={openCambio}
            getRoleLabel={getRoleLabel}
            getVehicleLabel={getVehicleLabel}
          />
        </Panel>
      </section>

      {formOpen ? (
        <TurnoForm
          Button={Button}
          draft={draft}
          setDraft={setDraft}
          formMode={formMode}
          errors={errors}
          peopleOptions={peopleOptions}
          baseOptions={baseOptions}
          vehicleOptions={currentVehicleOptions}
          typeOptions={TURNO_TYPE_OPTIONS}
          getRoleLabel={getRoleLabel}
          onClose={() => setFormOpen(false)}
          onSubmit={saveTurno}
        />
      ) : null}

      {cambioOpen ? (
        <TurnoCambioModal
          Button={Button}
          draft={cambioDraft}
          setDraft={setCambioDraft}
          errors={cambioErrors}
          currentTurno={currentCambioTurno}
          peopleOptions={peopleOptions}
          getRoleLabel={getRoleLabel}
          onClose={() => setCambioOpen(false)}
          onSubmit={saveCambio}
        />
      ) : null}
    </div>
  );
}
