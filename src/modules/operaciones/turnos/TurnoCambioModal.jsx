import React from 'react';

export default function TurnoCambioModal({
  Button,
  draft,
  setDraft,
  errors,
  currentTurno,
  peopleOptions,
  getRoleLabel,
  onClose,
  onSubmit
}) {
  const personaA = peopleOptions.find((item) => item.id === draft.persona_a_id);
  const personaB = peopleOptions.find((item) => item.id === draft.persona_b_id);

  return (
    <div className="turnos-modal-root" role="dialog" aria-modal="true" aria-label="Registrar cambio de turno">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="turnos-modal-panel">
        <div className="turnos-modal-header">
          <div>
            <h3>Registrar cambio de turno</h3>
            <p>
              Simplificación de mock: se reasigna el turno existente a otra persona.
              El diseño real del swap queda pendiente de definición de negocio.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="turnos-form-grid">
          <label>
            <span>Persona A</span>
            <select
              value={draft.persona_a_id}
              onChange={(event) => setDraft((prev) => ({ ...prev, persona_a_id: event.target.value }))}
            >
              <option value="">Seleccionar persona</option>
              {peopleOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            {personaA ? <small>Rol principal: {getRoleLabel(personaA.id)}</small> : null}
          </label>

          <label>
            <span>Persona B</span>
            <select
              value={draft.persona_b_id}
              onChange={(event) => setDraft((prev) => ({ ...prev, persona_b_id: event.target.value }))}
            >
              <option value="">Seleccionar reemplazo</option>
              {peopleOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            {personaB ? <small>Rol principal: {getRoleLabel(personaB.id)}</small> : null}
            {errors.persona_b_id ? <small>{errors.persona_b_id}</small> : null}
          </label>

          <label className="span-2">
            <span>Observación adicional</span>
            <textarea
              value={draft.nota}
              onChange={(event) => setDraft((prev) => ({ ...prev, nota: event.target.value }))}
            />
          </label>
        </div>

        {currentTurno ? (
          <div className="turnos-cambio-summary">
            <strong>Turno afectado</strong>
            <span>{currentTurno.fecha} · {currentTurno.hora_inicio} → {currentTurno.hora_fin}</span>
          </div>
        ) : null}

        <div className="turnos-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>Confirmar cambio</Button>
        </div>
      </div>
    </div>
  );
}
