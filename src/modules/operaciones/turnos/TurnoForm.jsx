import React from 'react';

export default function TurnoForm({
  Button,
  draft,
  setDraft,
  formMode,
  errors,
  peopleOptions,
  baseOptions,
  vehicleOptions,
  typeOptions,
  getRoleLabel,
  onClose,
  onSubmit
}) {
  const selectedPerson = peopleOptions.find((item) => item.id === draft.personal_id);

  return (
    <div className="turnos-modal-root" role="dialog" aria-modal="true" aria-label="Formulario de turno">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="turnos-modal-panel turnos-modal-panel-wide">
        <div className="turnos-modal-header">
          <div>
            <h3>{formMode === 'create' ? 'Nuevo turno' : 'Editar turno'}</h3>
            <p>Alta y edición mock alineada con `su_turnos`.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="turnos-form-grid">
          <label>
            <span>Persona</span>
            <select
              value={draft.personal_id}
              onChange={(event) => setDraft((prev) => ({ ...prev, personal_id: event.target.value }))}
            >
              <option value="">Seleccionar persona</option>
              {peopleOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            {selectedPerson ? <small>Rol principal: {getRoleLabel(selectedPerson.id)}</small> : null}
            {errors.personal_id ? <small>{errors.personal_id}</small> : null}
          </label>

          <label>
            <span>Base</span>
            <select
              value={draft.base_id}
              onChange={(event) => setDraft((prev) => ({ ...prev, base_id: event.target.value, vehiculo_id: '' }))}
            >
              <option value="">Seleccionar base</option>
              {baseOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            {errors.base_id ? <small>{errors.base_id}</small> : null}
          </label>

          <label>
            <span>Vehículo</span>
            <select
              value={draft.vehiculo_id}
              onChange={(event) => setDraft((prev) => ({ ...prev, vehiculo_id: event.target.value }))}
            >
              <option value="">Sin vehículo asignado</option>
              {vehicleOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>

          <label>
            <span>Fecha</span>
            <input
              type="date"
              value={draft.fecha}
              onChange={(event) => setDraft((prev) => ({ ...prev, fecha: event.target.value }))}
            />
            {errors.fecha ? <small>{errors.fecha}</small> : null}
          </label>

          <label>
            <span>Hora inicio</span>
            <input
              type="time"
              value={draft.hora_inicio}
              onChange={(event) => setDraft((prev) => ({ ...prev, hora_inicio: event.target.value }))}
            />
            {errors.hora_inicio ? <small>{errors.hora_inicio}</small> : null}
          </label>

          <label>
            <span>Hora fin</span>
            <input
              type="time"
              value={draft.hora_fin}
              onChange={(event) => setDraft((prev) => ({ ...prev, hora_fin: event.target.value }))}
            />
            {errors.hora_fin ? <small>{errors.hora_fin}</small> : null}
          </label>

          <label>
            <span>Tipo de turno</span>
            <select
              value={draft.tipo_turno}
              onChange={(event) => setDraft((prev) => ({ ...prev, tipo_turno: event.target.value }))}
            >
              {typeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="turnos-checkbox-field">
            <span>Horas extra</span>
            <div className="turnos-checkbox-row">
              <input
                type="checkbox"
                checked={draft.es_hora_extra}
                onChange={(event) => setDraft((prev) => ({
                  ...prev,
                  es_hora_extra: event.target.checked,
                  horas_extra: event.target.checked ? prev.horas_extra || 1 : 0
                }))}
              />
              <strong>Marcar como hora extra</strong>
            </div>
          </label>

          {draft.es_hora_extra ? (
            <label>
              <span>Cantidad de horas extra</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={draft.horas_extra}
                onChange={(event) => setDraft((prev) => ({ ...prev, horas_extra: event.target.value }))}
              />
              {errors.horas_extra ? <small>{errors.horas_extra}</small> : null}
            </label>
          ) : null}

          <label className="span-2">
            <span>Observaciones</span>
            <textarea
              value={draft.observaciones}
              onChange={(event) => setDraft((prev) => ({ ...prev, observaciones: event.target.value }))}
            />
          </label>
        </div>

        <div className="turnos-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>{formMode === 'create' ? 'Guardar turno' : 'Guardar cambios'}</Button>
        </div>
      </div>
    </div>
  );
}
