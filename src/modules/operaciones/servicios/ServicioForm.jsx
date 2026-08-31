import React from 'react';

export default function ServicioForm({
  Button,
  draft,
  setDraft,
  formMode,
  providerOptions,
  prioritySuggestions,
  errors,
  onClose,
  onSubmit
}) {
  const setField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const providerIsCustom = !providerOptions.includes(draft.prestador_contratante) || draft.prestador_contratante === 'Otro';

  return (
    <div className="servicios-modal-root" role="dialog" aria-modal="true" aria-label="Formulario de servicio">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="servicios-modal-panel servicios-modal-panel-wide">
        <div className="servicios-modal-header">
          <div>
            <h3>{formMode === 'create' ? 'Nuevo servicio' : 'Editar servicio'}</h3>
            <p>Alta y edición de datos generales sin cambio de estado ni asignación de vehículo.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="servicios-form-grid">
          <label>
            <span>Tipo</span>
            <select value={draft.tipo} onChange={(event) => setField('tipo', event.target.value)}>
              <option value="Asistencia">Asistencia</option>
              <option value="Apoyo">Apoyo</option>
              <option value="Traslado">Traslado</option>
            </select>
          </label>

          <label>
            <span>Prestador contratante</span>
            <select
              value={providerOptions.includes(draft.prestador_contratante) ? draft.prestador_contratante : 'Otro'}
              onChange={(event) => {
                const value = event.target.value;
                setField('prestador_contratante', value === 'Otro' ? '' : value);
              }}
            >
              {providerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {errors.prestador_contratante ? <small>{errors.prestador_contratante}</small> : null}
          </label>

          {providerIsCustom ? (
            <label>
              <span>Otro prestador</span>
              <input value={draft.prestador_contratante} onChange={(event) => setField('prestador_contratante', event.target.value)} />
            </label>
          ) : null}

          <label className="span-2">
            <span>Prioridad</span>
            <div className="servicios-priority-field">
              <div className="servicios-chip-row">
                {prioritySuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`servicios-priority-chip ${draft.prioridad === item ? 'active' : ''}`}
                    onClick={() => setField('prioridad', item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <input
                placeholder="Texto libre"
                value={draft.prioridad}
                onChange={(event) => setField('prioridad', event.target.value)}
              />
            </div>
          </label>

          <label className="span-2">
            <span>Origen dirección</span>
            <input value={draft.origen_direccion} onChange={(event) => setField('origen_direccion', event.target.value)} />
            {errors.origen_direccion ? <small>{errors.origen_direccion}</small> : null}
          </label>

          <label>
            <span>Origen lat</span>
            <input type="number" step="0.0001" value={draft.origen_lat} onChange={(event) => setField('origen_lat', event.target.value)} />
          </label>

          <label>
            <span>Origen lng</span>
            <input type="number" step="0.0001" value={draft.origen_lng} onChange={(event) => setField('origen_lng', event.target.value)} />
          </label>

          <label className="span-2">
            <span>Destino dirección</span>
            <input value={draft.destino_direccion} onChange={(event) => setField('destino_direccion', event.target.value)} />
          </label>

          <label>
            <span>Destino lat</span>
            <input type="number" step="0.0001" value={draft.destino_lat} onChange={(event) => setField('destino_lat', event.target.value)} />
          </label>

          <label>
            <span>Destino lng</span>
            <input type="number" step="0.0001" value={draft.destino_lng} onChange={(event) => setField('destino_lng', event.target.value)} />
          </label>

          <label>
            <span>Paciente nombre</span>
            <input value={draft.paciente_nombre} onChange={(event) => setField('paciente_nombre', event.target.value)} />
            {errors.paciente_nombre ? <small>{errors.paciente_nombre}</small> : null}
          </label>

          <label>
            <span>Paciente documento</span>
            <input value={draft.paciente_documento} onChange={(event) => setField('paciente_documento', event.target.value)} />
          </label>

          <label>
            <span>Paciente edad</span>
            <input type="number" value={draft.paciente_edad} onChange={(event) => setField('paciente_edad', event.target.value)} />
            {errors.paciente_edad ? <small>{errors.paciente_edad}</small> : null}
          </label>

          <label className="span-2">
            <span>Motivo consulta</span>
            <textarea value={draft.motivo_consulta} onChange={(event) => setField('motivo_consulta', event.target.value)} />
          </label>

          <label className="span-2">
            <span>Diagnóstico presuntivo</span>
            <textarea value={draft.diagnostico_presuntivo} onChange={(event) => setField('diagnostico_presuntivo', event.target.value)} />
          </label>
        </div>

        <div className="servicios-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>{formMode === 'create' ? 'Guardar servicio' : 'Guardar cambios'}</Button>
        </div>
      </div>
    </div>
  );
}
