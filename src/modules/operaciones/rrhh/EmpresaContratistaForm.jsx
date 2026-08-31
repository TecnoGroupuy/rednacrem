import React from 'react';

export default function EmpresaContratistaForm({
  Button,
  draft,
  setDraft,
  onClose,
  onSubmit,
  formMode
}) {
  const setField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Formulario de empresa contratista">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="rrhh-modal-panel rrhh-modal-panel-narrow">
        <div className="rrhh-modal-header">
          <div>
            <h3>{formMode === 'create' ? 'Nueva empresa contratista' : 'Editar empresa contratista'}</h3>
            <p>Formulario reutilizable para alta y edición.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        <div className="rrhh-form-grid">
          <label className="span-2">
            <span>Razón social</span>
            <input value={draft.razon_social} onChange={(event) => setField('razon_social', event.target.value)} />
          </label>
          <label>
            <span>RUT</span>
            <input value={draft.rut} onChange={(event) => setField('rut', event.target.value)} />
          </label>
          <label>
            <span>Contacto</span>
            <input value={draft.contacto_nombre} onChange={(event) => setField('contacto_nombre', event.target.value)} />
          </label>
          <label>
            <span>Teléfono</span>
            <input value={draft.contacto_telefono} onChange={(event) => setField('contacto_telefono', event.target.value)} />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={draft.contacto_email} onChange={(event) => setField('contacto_email', event.target.value)} />
          </label>
          <label className="rrhh-toggle">
            <input type="checkbox" checked={!!draft.activa} onChange={(event) => setField('activa', event.target.checked)} />
            <span>Empresa activa</span>
          </label>
        </div>
        <div className="rrhh-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>{formMode === 'create' ? 'Guardar empresa' : 'Guardar cambios'}</Button>
        </div>
      </div>
    </div>
  );
}
