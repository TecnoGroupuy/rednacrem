import React from 'react';
import {
  Ambulance,
  Clock3,
  FileClock,
  MapPin,
  Plus,
  Route,
  Trash2,
  TriangleAlert,
  UserRoundPlus
} from 'lucide-react';

const TABS = [
  { key: 'datos_generales', label: 'Datos generales' },
  { key: 'dotacion', label: 'Dotación' },
  { key: 'cronologia', label: 'Cronología' }
];

export default function ServicioDetail({
  Button,
  Tag,
  service,
  vehicle,
  base,
  dotacion,
  people,
  rolesByPersonalId,
  activeTab,
  onTabChange,
  onClose,
  onEdit,
  onApplyStateChange,
  onAddDotacion,
  onRemoveDotacion,
  getStatusVariant,
  getPriorityVariant,
  getAllowedNextStates,
  formatDateTime,
  getElapsedLabel,
  getVehicleOptionMeta
}) {
  const [pendingState, setPendingState] = React.useState(service.estado);
  const [pendingVehicleId, setPendingVehicleId] = React.useState(service.vehiculo_id || '');
  const [pendingPersonId, setPendingPersonId] = React.useState('');
  const [pendingRole, setPendingRole] = React.useState('');
  const [dotacionError, setDotacionError] = React.useState('');

  React.useEffect(() => {
    setPendingState(service.estado);
    setPendingVehicleId(service.vehiculo_id || '');
    setPendingPersonId('');
    setPendingRole('');
    setDotacionError('');
  }, [service.id, service.estado, service.vehiculo_id]);

  const allowedStateOptions = [service.estado, ...getAllowedNextStates(service.estado)];
  const selectedPersonRoles = pendingPersonId ? (rolesByPersonalId[pendingPersonId] || []) : [];
  const vehicleMeta = pendingVehicleId ? getVehicleOptionMeta(pendingVehicleId, service.id) : null;

  const handleApplyStatus = () => {
    const result = onApplyStateChange({
      serviceId: service.id,
      nextState: pendingState,
      nextVehicleId: pendingVehicleId
    });
    if (result?.ok === false) {
      setDotacionError(result.message || 'No fue posible aplicar el cambio.');
      return;
    }
    setDotacionError('');
  };

  const handleAddDotacion = () => {
    const result = onAddDotacion({
      servicio_id: service.id,
      personal_id: pendingPersonId,
      rol_en_servicio: pendingRole
    });
    if (result?.ok === false) {
      setDotacionError(result.message || 'No fue posible asignar la dotación.');
      return;
    }
    setPendingPersonId('');
    setPendingRole('');
    setDotacionError('');
  };

  const showVehicleSelector = pendingState === 'asignado' || pendingState === 'en_curso' || service.estado === 'asignado' || service.estado === 'en_curso';
  const chronologyItems = [
    { key: 'hora_solicitud', label: 'Hora solicitud', value: service.hora_solicitud },
    { key: 'hora_despacho', label: 'Hora despacho', value: service.hora_despacho },
    { key: 'hora_llegada_escena', label: 'Hora llegada escena', value: service.hora_llegada_escena },
    { key: 'hora_inicio_traslado', label: 'Hora inicio traslado', value: service.hora_inicio_traslado },
    { key: 'hora_finalizacion', label: 'Hora finalización', value: service.hora_finalizacion }
  ];

  return (
    <div className="servicios-modal-root" role="dialog" aria-modal="true" aria-label="Detalle del servicio">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="servicios-detail-panel">
        <div className="servicios-detail-header">
          <div className="servicios-detail-identity">
            <div className="servicios-detail-badge">{service.tipo.slice(0, 3).toUpperCase()}</div>
            <div>
              <h2>{service.paciente_nombre}</h2>
              <p>{service.prestador_contratante}</p>
              <div className="servicios-inline-strong">
                <Clock3 size={15} />
                <span>{getElapsedLabel(service.hora_solicitud)}</span>
              </div>
            </div>
          </div>
          <div className="servicios-detail-actions">
            <Tag variant={getPriorityVariant(service.prioridad)}>{service.prioridad || 'Sin prioridad'}</Tag>
            <Tag variant={getStatusVariant(service.estado)}>{service.estado}</Tag>
            <Button variant="secondary" onClick={() => onEdit(service.id)}>Editar</Button>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>

        <div className="servicios-detail-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="servicios-detail-content">
          {activeTab === 'datos_generales' ? (
            <div className="servicios-detail-grid">
              <section className="servicios-detail-card">
                <div className="servicios-section-title">
                  <Route size={18} />
                  <span>Datos generales</span>
                </div>
                <div className="servicios-kv-grid-detail">
                  <div><span>id</span><strong>{service.id}</strong></div>
                  <div><span>organization_id</span><strong>{service.organization_id}</strong></div>
                  <div><span>tipo</span><strong>{service.tipo}</strong></div>
                  <div><span>prestador_contratante</span><strong>{service.prestador_contratante}</strong></div>
                  <div><span>prioridad</span><strong>{service.prioridad || 'Sin dato'}</strong></div>
                  <div><span>estado</span><strong>{service.estado}</strong></div>
                  <div><span>paciente_documento</span><strong>{service.paciente_documento || 'Sin dato'}</strong></div>
                  <div><span>paciente_edad</span><strong>{service.paciente_edad}</strong></div>
                  <div><span>motivo_consulta</span><strong>{service.motivo_consulta || 'Sin dato'}</strong></div>
                  <div><span>diagnostico_presuntivo</span><strong>{service.diagnostico_presuntivo || 'Sin dato'}</strong></div>
                  <div><span>origen_direccion</span><strong>{service.origen_direccion || 'Sin dato'}</strong></div>
                  <div><span>destino_direccion</span><strong>{service.destino_direccion || 'Sin destino'}</strong></div>
                  <div><span>vehículo actual</span><strong>{vehicle?.numero_interno || 'Sin asignar'}</strong></div>
                  <div><span>base derivada</span><strong>{base?.nombre || 'Sin base'}</strong></div>
                </div>
              </section>

              <section className="servicios-detail-card">
                <div className="servicios-section-title">
                  <Ambulance size={18} />
                  <span>Despacho y estado</span>
                </div>

                <div className="servicios-status-editor">
                  <label>
                    <span>Estado</span>
                    <select value={pendingState} onChange={(event) => setPendingState(event.target.value)}>
                      {allowedStateOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>

                  {showVehicleSelector ? (
                    <label>
                      <span>Vehículo</span>
                      <select value={pendingVehicleId} onChange={(event) => setPendingVehicleId(event.target.value)}>
                        <option value="">Seleccionar vehículo</option>
                        {people.vehicles.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.numero_interno} · {item.estado_operativo}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {vehicleMeta?.warning ? (
                    <div className="servicios-warning-banner">
                      <TriangleAlert size={16} />
                      <span>{vehicleMeta.warning}</span>
                    </div>
                  ) : null}

                  {dotacionError ? <div className="servicios-error-banner">{dotacionError}</div> : null}

                  <Button onClick={handleApplyStatus}>
                    {pendingState === service.estado ? 'Guardar asignación' : 'Aplicar cambio de estado'}
                  </Button>
                </div>

                <div className="servicios-mini-grid">
                  <div className="servicios-mini-card">
                    <MapPin size={16} />
                    <div>
                      <strong>Origen</strong>
                      <span>{service.origen_direccion || 'Sin dato'}</span>
                    </div>
                  </div>
                  <div className="servicios-mini-card">
                    <Route size={16} />
                    <div>
                      <strong>Destino</strong>
                      <span>{service.destino_direccion || 'Sin destino'}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'dotacion' ? (
            <section className="servicios-detail-card">
              <div className="servicios-section-title servicios-section-title-spread">
                <div className="servicios-inline-strong">
                  <UserRoundPlus size={18} />
                  <span>Dotación asignada</span>
                </div>
              </div>

              <div className="servicios-inline-form">
                <select value={pendingPersonId} onChange={(event) => {
                  setPendingPersonId(event.target.value);
                  setPendingRole('');
                }}>
                  <option value="">Seleccionar persona</option>
                  {people.staff.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre} {item.apellido}</option>
                  ))}
                </select>
                <select value={pendingRole} onChange={(event) => setPendingRole(event.target.value)} disabled={!pendingPersonId}>
                  <option value="">Seleccionar rol en servicio</option>
                  {selectedPersonRoles.map((item) => (
                    <option key={item.id} value={item.rol}>{item.rol}</option>
                  ))}
                </select>
                <Button icon={<Plus size={16} />} onClick={handleAddDotacion}>Agregar</Button>
              </div>

              {dotacionError ? <div className="servicios-error-banner">{dotacionError}</div> : null}

              <div className="servicios-dotacion-list">
                {dotacion.map((item) => (
                  <article key={item.id} className="servicios-dotacion-card">
                    <div>
                      <strong>{item.personalLabel}</strong>
                      <div className="servicios-subtle">{item.rol_en_servicio}</div>
                    </div>
                    <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => onRemoveDotacion(item.id)}>Quitar</Button>
                  </article>
                ))}
                {!dotacion.length ? <div className="servicios-empty-inline">No hay dotación asignada todavía.</div> : null}
              </div>
            </section>
          ) : null}

          {activeTab === 'cronologia' ? (
            <section className="servicios-detail-card">
              <div className="servicios-section-title">
                <FileClock size={18} />
                <span>Cronología del servicio</span>
              </div>
              <div className="servicios-timeline">
                {chronologyItems.filter((item) => item.value).map((item) => (
                  <article key={item.key} className="servicios-timeline-item">
                    <div className="servicios-timeline-dot" />
                    <div>
                      <strong>{item.label}</strong>
                      <div className="servicios-subtle">{formatDateTime(item.value)}</div>
                    </div>
                  </article>
                ))}
                {!chronologyItems.some((item) => item.value) ? (
                  <div className="servicios-empty-inline">No hay timestamps cargados.</div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
