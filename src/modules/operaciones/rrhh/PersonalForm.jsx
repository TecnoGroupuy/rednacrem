import React from 'react';

// Damian va a cargar personal en produccion con datos incompletos desde el
// dia uno: solo nombre/apellido/rol de algunos funcionarios al principio,
// completando el resto con el tiempo. Por eso este form solo exige
// nombre/apellido (mas tipo_personal, que ya trae un default razonable) --
// todo lo demas es opcional y no bloquea el guardado. Roles, habilitaciones,
// capacitaciones y carne de salud dependen de personal_id (no existen hasta
// que la persona esta creada), asi que se cargan despues desde la ficha
// (PersonalDetail), no desde este formulario.
export default function PersonalForm({
  Button,
  draft,
  setDraft,
  formMode,
  bases,
  errors,
  saving,
  formError,
  onClose,
  onSubmit,
  onOpenEmpresas
}) {
  const setField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const isExterno = draft.tipo_personal === 'externo';

  return (
    <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Formulario de personal">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="rrhh-modal-panel">
        <div className="rrhh-modal-header">
          <div>
            <h3>{formMode === 'create' ? 'Nuevo personal' : 'Editar personal'}</h3>
            <p>Solo nombre y apellido son obligatorios. El resto se puede completar mas adelante.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        {formError ? <div className="rrhh-form-error">{formError}</div> : null}

        <div className="rrhh-form-grid">
          <label>
            <span>Nombre *</span>
            <input value={draft.nombre} onChange={(event) => setField('nombre', event.target.value)} />
            {errors.nombre ? <small>{errors.nombre}</small> : null}
          </label>
          <label>
            <span>Apellido *</span>
            <input value={draft.apellido} onChange={(event) => setField('apellido', event.target.value)} />
            {errors.apellido ? <small>{errors.apellido}</small> : null}
          </label>
          <label>
            <span>Documento</span>
            <input value={draft.documento} onChange={(event) => setField('documento', event.target.value)} />
          </label>
          <label>
            <span>Fecha nacimiento</span>
            <input type="date" value={draft.fecha_nacimiento} onChange={(event) => setField('fecha_nacimiento', event.target.value)} />
          </label>
          <label>
            <span>Teléfono</span>
            <input value={draft.telefono} onChange={(event) => setField('telefono', event.target.value)} />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={draft.email} onChange={(event) => setField('email', event.target.value)} />
          </label>
          <label className="span-2">
            <span>Domicilio</span>
            <input value={draft.domicilio} onChange={(event) => setField('domicilio', event.target.value)} />
          </label>
          <label>
            <span>Base asignada</span>
            <select value={draft.base_id} onChange={(event) => setField('base_id', event.target.value)}>
              <option value="">Sin asignar</option>
              {bases.map((base) => <option key={base.id} value={base.id}>{base.nombre}</option>)}
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select value={draft.estado} onChange={(event) => setField('estado', event.target.value)}>
              <option value="activo">activo</option>
              <option value="licencia">licencia</option>
              <option value="suspendido">suspendido</option>
              <option value="baja">baja</option>
            </select>
          </label>
          <label>
            <span>Fecha ingreso</span>
            <input type="date" value={draft.fecha_ingreso} onChange={(event) => setField('fecha_ingreso', event.target.value)} />
          </label>
          <label>
            <span>Fecha egreso</span>
            <input type="date" value={draft.fecha_egreso} onChange={(event) => setField('fecha_egreso', event.target.value)} />
          </label>
          <label>
            <span>Tipo de personal *</span>
            <select value={draft.tipo_personal} onChange={(event) => setField('tipo_personal', event.target.value)}>
              <option value="interno">interno</option>
              <option value="externo">externo</option>
            </select>
          </label>
          {isExterno ? (
            <label className="span-2">
              <span>Empresa contratista</span>
              <select value="" disabled>
                <option value="">No disponible todavia</option>
              </select>
              <small>
                Todavia no existe un endpoint de backend para empresas contratistas (su_empresas_contratistas).
                No se puede seleccionar ni guardar personal externo hasta que se implemente -- cambia a
                &quot;interno&quot; para poder guardar por ahora.
              </small>
              <div className="rrhh-inline-actions">
                <Button type="button" variant="secondary" onClick={onOpenEmpresas}>
                  Ver catalogo de empresas (mock, solo referencia)
                </Button>
              </div>
            </label>
          ) : null}
        </div>

        <div className="rrhh-inline-hint">
          Podés guardar solo con nombre y apellido ahora, y completar el resto (documento, contacto,
          base, roles, habilitaciones, capacitaciones, carné de salud) más adelante desde la ficha
          del funcionario.
        </div>

        <div className="rrhh-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving || isExterno}>
            {saving ? 'Guardando...' : formMode === 'create' ? 'Guardar personal' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
