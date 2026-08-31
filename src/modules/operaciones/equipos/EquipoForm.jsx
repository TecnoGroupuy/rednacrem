import React from 'react';

export default function EquipoForm({
  Button,
  draft,
  setDraft,
  formMode,
  typeSuggestions,
  statusOptions,
  locationOptions,
  bases,
  vehiculos,
  errors,
  onClose,
  onSubmit
}) {
  const setField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const ubicacionEsBase = draft.ubicacion_tipo === 'base';
  const ubicacionEsVehiculo = draft.ubicacion_tipo === 'vehiculo';
  const equipoUsaTipoCustom = draft.equipo && !typeSuggestions.includes(draft.equipo);

  return (
    <div className="equipos-modal-root" role="dialog" aria-modal="true" aria-label="Formulario de equipo biomédico">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="equipos-modal-panel equipos-modal-panel-wide">
        <div className="equipos-modal-header">
          <div>
            <h3>{formMode === 'create' ? 'Nuevo equipo biomédico' : 'Editar equipo biomédico'}</h3>
            <p>Alta y edición mock alineada con la tabla real `su_equipos_biomedicos`.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="equipos-form-grid">
          <label>
            <span>Equipo</span>
            <select
              value={typeSuggestions.includes(draft.equipo) ? draft.equipo : '__custom__'}
              onChange={(event) => {
                const value = event.target.value;
                setField('equipo', value === '__custom__' ? '' : value);
              }}
            >
              {typeSuggestions.map((item) => <option key={item} value={item}>{item}</option>)}
              <option value="__custom__">Otro</option>
            </select>
            {errors.equipo ? <small>{errors.equipo}</small> : null}
          </label>

          {equipoUsaTipoCustom || !draft.equipo ? (
            <label>
              <span>Tipo personalizado</span>
              <input value={draft.equipo} onChange={(event) => setField('equipo', event.target.value)} />
            </label>
          ) : null}

          <label>
            <span>Marca</span>
            <input value={draft.marca} onChange={(event) => setField('marca', event.target.value)} />
            {errors.marca ? <small>{errors.marca}</small> : null}
          </label>

          <label>
            <span>Modelo</span>
            <input value={draft.modelo} onChange={(event) => setField('modelo', event.target.value)} />
            {errors.modelo ? <small>{errors.modelo}</small> : null}
          </label>

          <label>
            <span>Número de serie</span>
            <input value={draft.numero_serie} onChange={(event) => setField('numero_serie', event.target.value)} />
            {errors.numero_serie ? <small>{errors.numero_serie}</small> : null}
          </label>

          <label>
            <span>Ubicación tipo</span>
            <select
              value={draft.ubicacion_tipo}
              onChange={(event) => {
                const nextType = event.target.value;
                setDraft((prev) => ({
                  ...prev,
                  ubicacion_tipo: nextType,
                  base_id: nextType === 'base' ? prev.base_id : nextType === 'vehiculo' ? prev.base_id : '',
                  vehiculo_id: nextType === 'vehiculo' ? prev.vehiculo_id : ''
                }));
              }}
            >
              {locationOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          {ubicacionEsBase ? (
            <label>
              <span>Base</span>
              <select value={draft.base_id} onChange={(event) => setField('base_id', event.target.value)}>
                <option value="">Seleccionar base</option>
                {bases.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </select>
              {errors.base_id ? <small>{errors.base_id}</small> : null}
            </label>
          ) : null}

          {ubicacionEsVehiculo ? (
            <label>
              <span>Vehículo</span>
              <select
                value={draft.vehiculo_id}
                onChange={(event) => {
                  const vehiculoId = event.target.value;
                  const selectedVehicle = vehiculos.find((item) => item.id === vehiculoId);
                  setDraft((prev) => ({
                    ...prev,
                    vehiculo_id: vehiculoId,
                    base_id: selectedVehicle?.base_id || ''
                  }));
                }}
              >
                <option value="">Seleccionar vehículo</option>
                {vehiculos.map((item) => <option key={item.id} value={item.id}>{item.numero_interno}</option>)}
              </select>
              {errors.vehiculo_id ? <small>{errors.vehiculo_id}</small> : null}
            </label>
          ) : null}

          <label>
            <span>Fecha última revisión</span>
            <input type="date" value={draft.fecha_ultima_revision} onChange={(event) => setField('fecha_ultima_revision', event.target.value)} />
            {errors.fecha_ultima_revision ? <small>{errors.fecha_ultima_revision}</small> : null}
          </label>

          <label>
            <span>Fecha próximo service</span>
            <input type="date" value={draft.fecha_proximo_service} onChange={(event) => setField('fecha_proximo_service', event.target.value)} />
            {errors.fecha_proximo_service ? <small>{errors.fecha_proximo_service}</small> : null}
          </label>

          <label>
            <span>Estado</span>
            <select value={draft.estado} onChange={(event) => setField('estado', event.target.value)}>
              {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="span-2">
            <span>Observación</span>
            <textarea value={draft.observacion} onChange={(event) => setField('observacion', event.target.value)} />
          </label>
        </div>

        <div className="equipos-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>{formMode === 'create' ? 'Guardar equipo' : 'Guardar cambios'}</Button>
        </div>
      </div>
    </div>
  );
}
