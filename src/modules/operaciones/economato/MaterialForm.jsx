import React from 'react';
import { X } from 'lucide-react';

const CATEGORY_LABELS = {
  descartable: 'Descartable',
  medicamento: 'Medicamento',
  oxigeno_gases: 'Oxígeno y gases',
  via_aerea: 'Vía aérea',
  trauma: 'Trauma',
  equipo_biomedico: 'Equipo biomédico'
};

export default function MaterialForm({
  Button,
  draft,
  setDraft,
  minimumValue,
  setMinimumValue,
  formMode,
  categoryOptions,
  errors,
  onClose,
  onSubmit
}) {
  return (
    <div className="economato-modal-root">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <section className="economato-modal-panel" role="dialog" aria-modal="true" aria-label="Formulario de material">
        <div className="economato-modal-header">
          <div>
            <h3>{formMode === 'create' ? 'Nuevo material' : 'Editar material'}</h3>
            <p>Alta y edición del catálogo base de materiales de Economato.</p>
          </div>
          <button className="economato-close-button" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="economato-form-grid">
          <label className="span-2">
            <span>Nombre</span>
            <input
              value={draft.nombre}
              onChange={(event) => setDraft((prev) => ({ ...prev, nombre: event.target.value }))}
              placeholder="Ej. Adrenalina"
            />
            {errors.nombre ? <small>{errors.nombre}</small> : null}
          </label>

          <label>
            <span>Categoría</span>
            <select value={draft.categoria} onChange={(event) => setDraft((prev) => ({ ...prev, categoria: event.target.value }))}>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{CATEGORY_LABELS[option] || option}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Unidad de medida</span>
            <input
              value={draft.unidad_medida}
              onChange={(event) => setDraft((prev) => ({ ...prev, unidad_medida: event.target.value }))}
              placeholder="ampollas, unidades, blisters"
            />
            {errors.unidad_medida ? <small>{errors.unidad_medida}</small> : null}
          </label>

          <label>
            <span>Stock mínimo sugerido</span>
            <input
              type="number"
              min="0"
              value={minimumValue}
              onChange={(event) => setMinimumValue(event.target.value)}
            />
            {errors.stock_minimo_sugerido ? <small>{errors.stock_minimo_sugerido}</small> : null}
          </label>

          <label className="economato-checkbox-field">
            <input
              type="checkbox"
              checked={draft.requiere_control_vencimiento}
              onChange={(event) => setDraft((prev) => ({ ...prev, requiere_control_vencimiento: event.target.checked }))}
            />
            <span>Requiere control de vencimiento</span>
          </label>
        </div>

        <div className="economato-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>{formMode === 'create' ? 'Crear material' : 'Guardar cambios'}</Button>
        </div>
      </section>
    </div>
  );
}
