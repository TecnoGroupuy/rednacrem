import React from 'react';

export default function PersonalForm({
  Button,
  draft,
  setDraft,
  formMode,
  bases,
  empresas,
  roleOptions,
  rolesDraft,
  setRolesDraft,
  errors,
  onClose,
  onSubmit,
  onOpenEmpresas,
  formatRol
}) {
  const setField = (field, value) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'tipo_personal' && value === 'interno') {
        next.empresa_contratista_id = '';
      }
      return next;
    });
  };

  const toggleRole = (rol) => {
    setRolesDraft((prev) => {
      const exists = prev.some((item) => item.rol === rol);
      if (exists) {
        const filtered = prev.filter((item) => item.rol !== rol);
        if (filtered.length && !filtered.some((item) => item.rol_principal)) {
          filtered[0] = { ...filtered[0], rol_principal: true };
        }
        return filtered;
      }
      const shouldBePrimary = prev.length === 0;
      return [...prev, { id: '', personal_id: draft.id || '', rol, rol_principal: shouldBePrimary }];
    });
  };

  const setPrimaryRole = (rol) => {
    setRolesDraft((prev) => prev.map((item) => ({ ...item, rol_principal: item.rol === rol })));
  };

  return (
    <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Formulario de personal">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="rrhh-modal-panel">
        <div className="rrhh-modal-header">
          <div>
            <h3>{formMode === 'create' ? 'Nuevo personal' : 'Editar personal'}</h3>
            <p>Frontend mock alineado con `su_personal` y tablas relacionadas.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="rrhh-form-grid">
          <label>
            <span>Nombre</span>
            <input value={draft.nombre} onChange={(event) => setField('nombre', event.target.value)} />
            {errors.nombre ? <small>{errors.nombre}</small> : null}
          </label>
          <label>
            <span>Apellido</span>
            <input value={draft.apellido} onChange={(event) => setField('apellido', event.target.value)} />
            {errors.apellido ? <small>{errors.apellido}</small> : null}
          </label>
          <label>
            <span>Documento</span>
            <input value={draft.documento} onChange={(event) => setField('documento', event.target.value)} />
            {errors.documento ? <small>{errors.documento}</small> : null}
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
              <option value="">Seleccionar base</option>
              {bases.map((base) => <option key={base.id} value={base.id}>{base.nombre}</option>)}
            </select>
            {errors.base_id ? <small>{errors.base_id}</small> : null}
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
            <span>Tipo de personal</span>
            <select value={draft.tipo_personal} onChange={(event) => setField('tipo_personal', event.target.value)}>
              <option value="interno">interno</option>
              <option value="externo">externo</option>
            </select>
          </label>
          {draft.tipo_personal === 'externo' ? (
            <>
              <label>
                <span>Empresa contratista</span>
                <select value={draft.empresa_contratista_id} onChange={(event) => setField('empresa_contratista_id', event.target.value)}>
                  <option value="">Seleccionar empresa</option>
                  {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.razon_social}</option>)}
                </select>
                {errors.empresa_contratista_id ? <small>{errors.empresa_contratista_id}</small> : null}
              </label>
              <div className="rrhh-inline-actions span-2">
                <Button variant="secondary" onClick={onOpenEmpresas}>Ver empresas contratistas</Button>
              </div>
            </>
          ) : null}
        </div>

        <div className="rrhh-form-section">
          <h4>Roles asignados</h4>
          <p>Selecciona uno o varios roles y marca cuál es `rol_principal`.</p>
          <div className="rrhh-role-grid">
            {roleOptions.map((rol) => {
              const selected = rolesDraft.some((item) => item.rol === rol);
              const primary = rolesDraft.some((item) => item.rol === rol && item.rol_principal);
              return (
                <div key={rol} className={'rrhh-role-item ' + (selected ? 'selected' : '')}>
                  <label className="rrhh-role-check">
                    <input type="checkbox" checked={selected} onChange={() => toggleRole(rol)} />
                    <span>{formatRol(rol)}</span>
                  </label>
                  <label className="rrhh-role-radio">
                    <input
                      type="radio"
                      name="rol_principal"
                      checked={primary}
                      disabled={!selected}
                      onChange={() => setPrimaryRole(rol)}
                    />
                    <span>Principal</span>
                  </label>
                </div>
              );
            })}
          </div>
          {errors.roles ? <small className="rrhh-block-error">{errors.roles}</small> : null}
        </div>

        <div className="rrhh-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>{formMode === 'create' ? 'Guardar personal' : 'Guardar cambios'}</Button>
        </div>
      </div>
    </div>
  );
}
