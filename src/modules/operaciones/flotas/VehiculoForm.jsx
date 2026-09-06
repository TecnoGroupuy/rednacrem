import React from 'react';

export default function VehiculoForm({
  Button,
  draft,
  setDraft,
  formMode,
  bases,
  errors,
  saving,
  formError,
  onClose,
  onSubmit
}) {
  const setField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flotas-modal-root" role="dialog" aria-modal="true" aria-label="Formulario de vehiculo">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="flotas-modal-panel flotas-modal-panel-narrow">
        <div className="flotas-modal-header">
          <div>
            <h3>{formMode === 'create' ? 'Nuevo vehiculo' : 'Editar vehiculo'}</h3>
            <p>Datos basicos alineados con `su_vehiculos`.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="flotas-form-grid">
          <label>
            <span>Numero interno</span>
            <input value={draft.numero_interno} onChange={(event) => setField('numero_interno', event.target.value)} />
            {errors.numero_interno ? <small>{errors.numero_interno}</small> : null}
          </label>
          <label>
            <span>Matricula</span>
            <input value={draft.matricula} onChange={(event) => setField('matricula', event.target.value)} />
            {errors.matricula ? <small>{errors.matricula}</small> : null}
          </label>
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
            <span>Anio</span>
            <input type="number" value={draft.anio} onChange={(event) => setField('anio', event.target.value)} />
          </label>
          <label>
            <span>Categoria</span>
            <select value={draft.categoria} onChange={(event) => setField('categoria', event.target.value)}>
              <option value="AVA">AVA</option>
              <option value="basico">basico</option>
              <option value="pediatrico">pediatrico</option>
            </select>
          </label>
          <label>
            <span>Modalidad</span>
            <input value={draft.modalidad} onChange={(event) => setField('modalidad', event.target.value)} />
          </label>
          <label>
            <span>Base</span>
            <select value={draft.base_id} onChange={(event) => setField('base_id', event.target.value)}>
              <option value="">Seleccionar base</option>
              {bases.map((base) => <option key={base.id} value={base.id}>{base.nombre}</option>)}
            </select>
            {errors.base_id ? <small>{errors.base_id}</small> : null}
          </label>
          <label>
            <span>Altura cm</span>
            <input type="number" value={draft.altura_cm} onChange={(event) => setField('altura_cm', event.target.value)} />
          </label>
          <label>
            <span>Kilometraje</span>
            <input type="number" value={draft.kilometraje} onChange={(event) => setField('kilometraje', event.target.value)} />
          </label>
          <label>
            <span>Proximo service km</span>
            <input type="number" value={draft.proximo_service_km} onChange={(event) => setField('proximo_service_km', event.target.value)} />
          </label>
          <label className="flotas-check-field">
            <input type="checkbox" checked={Boolean(draft.capacidad_camilla_articulada)} onChange={(event) => setField('capacidad_camilla_articulada', event.target.checked)} />
            <span>Capacidad camilla articulada</span>
          </label>
          <label className="flotas-check-field">
            <input type="checkbox" checked={Boolean(draft.es_backup)} onChange={(event) => setField('es_backup', event.target.checked)} />
            <span>Es backup</span>
          </label>
        </div>

        {formError ? <div style={{ color: '#b91c1c', padding: '8px 0' }}>{formError}</div> : null}

        <div className="flotas-modal-footer">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? 'Guardando...' : (formMode === 'create' ? 'Guardar vehiculo' : 'Guardar cambios')}
          </Button>
        </div>
      </div>
    </div>
  );
}
