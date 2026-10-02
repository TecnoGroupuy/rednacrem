import React from 'react';
import { Star } from 'lucide-react';

// Damian va a cargar personal en produccion con datos incompletos desde el
// dia uno: solo nombre/apellido/rol de algunos funcionarios al principio,
// completando el resto con el tiempo. Por eso este form solo exige
// nombre/apellido (mas tipo_personal, que ya trae un default razonable) --
// todo lo demas es opcional y no bloquea el guardado.
//
// Roles (rediseño): antes este formulario solo ofrecia un selector de "rol
// inicial" en el alta (o un mensaje "se gestiona desde la ficha" en la
// edicion), porque el backend no tenia forma de cambiar cual rol ya
// guardado es el principal (solo POST/DELETE). Ahora hay un PATCH minimo
// para eso (ver setPersonalRolePrincipal en rrhhService.js), asi que los
// roles se editan completos aca mismo, en alta y en edicion -- draft.roles
// es un array de { id, rol, rol_principal } (id null para los que todavia
// no se guardaron), sincronizado contra el backend al guardar (ver
// syncPersonalRoles en RrhhScreen.jsx). La pestaña Roles de la ficha
// (PersonalDetail.jsx) sigue existiendo y usa la misma logica de
// agregar/quitar, para quien prefiera editar desde ahi sin abrir este form.
const REGIMEN_TURNO_ROLES = new Set(['Enfermero', 'Jefe_de_enfermeria', 'Chofer', 'Jefe_de_choferes']);
const FRANJA_TURNO_OPTIONS = ['00-06', '06-12', '12-18', '18-00'];
const ESTADO_LABELS = { activo: 'Activo', licencia: 'Licencia', suspendido: 'Suspendido', baja: 'Baja' };
// 'facturador' (2026-10): factura por cuenta propia, no lleva empresa
// contratista (igual que 'interno' en ese sentido) -- ver chk_personal_tipo_empresa
// en la migración 087 del backend.
const TIPO_PERSONAL_LABELS = { interno: 'Interno', externo: 'Externo', facturador: 'Facturador' };

// Un chip = dos <button> hermanos dentro de un mismo contenedor (no se
// puede anidar un <button> dentro de otro): el cuerpo togglea
// seleccionado/no, y la estrella -- solo visible si esta seleccionado --
// lo marca como principal. Mismo componente para roles y para bases.
function ChipToggle({ label, selected, principal, onToggle, onSetPrincipal, principalLabel }) {
  return (
    <div className={'rrhh-chip-toggle' + (selected ? ' selected' : '')}>
      <button type="button" className="rrhh-chip-toggle-body" onClick={onToggle} aria-pressed={selected}>
        {label}
      </button>
      {selected ? (
        <button
          type="button"
          className={'rrhh-chip-star' + (principal ? ' active' : '')}
          onClick={onSetPrincipal}
          aria-label={principalLabel}
          aria-pressed={principal}
        >
          <Star size={14} fill={principal ? 'currentColor' : 'none'} />
        </button>
      ) : null}
    </div>
  );
}

export default function PersonalForm({
  Button,
  draft,
  setDraft,
  formMode,
  bases,
  vehiculos,
  roleOptions,
  formatRol,
  errors,
  saving,
  formError,
  onClose,
  onSubmit,
  onOpenEmpresas
}) {
  const setField = (field, value) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      // Al salir de "fijo" se limpian los 3 campos que solo aplican a ese
      // regimen -- evita mandar un vehiculo_id/franja_turno/fecha_ref_descanso
      // heredado de una seleccion anterior para un regimen al que ya no
      // corresponde (ej. turnante o sin asignar).
      if (field === 'regimen_turno' && value !== 'fijo') {
        next.vehiculo_id = null;
        next.franja_turno = null;
        next.fecha_ref_descanso = null;
      }
      return next;
    });
  };

  // Roles: seleccion multiple con una marcada como principal, mismo
  // criterio que bases (ver toggleBase/setPrincipalBase mas abajo) -- el
  // primer rol que se marca queda como principal por defecto, y si se
  // desmarca justo el principal se promueve el primero que quede.
  const toggleRole = (rol) => {
    setDraft((prev) => {
      const already = (prev.roles || []).some((r) => r.rol === rol);
      let nextRoles;
      if (already) {
        nextRoles = prev.roles.filter((r) => r.rol !== rol);
        if (nextRoles.length && !nextRoles.some((r) => r.rol_principal)) {
          nextRoles = nextRoles.map((r, index) => (index === 0 ? { ...r, rol_principal: true } : r));
        }
      } else {
        nextRoles = [...(prev.roles || []), { id: null, rol, rol_principal: !(prev.roles || []).length }];
      }
      return { ...prev, roles: nextRoles };
    });
  };

  const setPrincipalRole = (rol) => {
    setDraft((prev) => ({
      ...prev,
      roles: (prev.roles || []).map((r) => ({ ...r, rol_principal: r.rol === rol }))
    }));
  };

  // Bases (migracion 081): seleccion multiple con una marcada como
  // principal, unica via de escritura -- ver savePersonal en RrhhScreen.jsx
  // (se guarda con PUT /operaciones/personal/:id/bases despues del
  // POST/PATCH de la persona, este form ya no manda base_id).
  const toggleBase = (baseId) => {
    setDraft((prev) => {
      const alreadySelected = prev.bases.some((b) => b.base_id === baseId);
      let nextBases;
      if (alreadySelected) {
        nextBases = prev.bases.filter((b) => b.base_id !== baseId);
        // Si se saca justo la principal y quedan otras, se promueve la
        // primera restante -- nunca puede haber bases seleccionadas sin
        // ninguna principal.
        if (nextBases.length && !nextBases.some((b) => b.es_principal)) {
          nextBases = nextBases.map((b, index) => (index === 0 ? { ...b, es_principal: true } : b));
        }
      } else {
        // La primera base que se agrega queda como principal por defecto.
        nextBases = [...prev.bases, { base_id: baseId, es_principal: prev.bases.length === 0 }];
      }
      // Movil huerfano: si el vehiculo ya seleccionado no pertenece a
      // ninguna de las bases que quedaron elegidas, se limpia -- evita
      // guardar un vehiculo_id que deja de aparecer en su propio selector
      // (filtrado por bases) apenas se refresque. Sin ninguna base elegida
      // el selector no filtra nada, asi que no hay huerfano posible.
      const selectedBaseIds = nextBases.map((b) => b.base_id);
      let nextVehiculoId = prev.vehiculo_id;
      if (selectedBaseIds.length) {
        const currentVehiculo = (vehiculos || []).find((v) => v.id === prev.vehiculo_id);
        if (currentVehiculo && !selectedBaseIds.includes(currentVehiculo.base_id)) {
          nextVehiculoId = null;
        }
      }
      return { ...prev, bases: nextBases, vehiculo_id: nextVehiculoId };
    });
  };

  const setPrincipalBase = (baseId) => {
    setDraft((prev) => ({
      ...prev,
      bases: prev.bases.map((b) => ({ ...b, es_principal: b.base_id === baseId }))
    }));
  };

  const isExterno = draft.tipo_personal === 'externo';
  const selectedRoles = draft.roles || [];
  const selectedRoleNames = selectedRoles.map((r) => r.rol);
  const principalRoleName = selectedRoles.find((r) => r.rol_principal)?.rol || null;

  // El regimen reacciona en vivo a los roles marcados -- ya no distingue
  // alta de edicion (antes solo se mostraba en edicion si la persona ya
  // tenia roles cargados, ver comentario viejo arriba de REGIMEN_TURNO_ROLES
  // en la version anterior de este archivo).
  const showRegimenSelect = selectedRoleNames.some((rol) => REGIMEN_TURNO_ROLES.has(rol));

  // Movil y Fecha de referencia aplican a cualquier regimen fijo (enfermero
  // o chofer). Franja, en cambio, solo tiene sentido para Enfermero (turnos
  // de 6hs) -- un chofer fijo trabaja en turnos de 12hs, fuera del CHECK de
  // franja_turno de la base de datos, asi que el selector ni se muestra.
  const showRegimenFijoFields = draft.regimen_turno === 'fijo';
  const showFranjaSelect = showRegimenFijoFields && selectedRoleNames.includes('Enfermero');

  const selectedBaseIds = (draft.bases || []).map((b) => b.base_id);
  const vehiculosFiltrados = selectedBaseIds.length
    ? (vehiculos || []).filter((v) => selectedBaseIds.includes(v.base_id))
    : (vehiculos || []);

  return (
    <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Formulario de personal">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="rrhh-modal-panel rrhh-personal-form-panel">
        <div className="rrhh-modal-header">
          <div>
            <h3>{formMode === 'create' ? 'Nuevo personal' : 'Editar personal'}</h3>
            <p>Solo nombre y apellido son obligatorios. El resto se puede completar mas adelante.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="rrhh-personal-form-body">
          {formError ? <div className="rrhh-form-error">{formError}</div> : null}

          <section className="rrhh-form-section-block">
            <div className="rrhh-section-title"><span>Datos personales</span></div>
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
                <span>Nombre de uso</span>
                <input value={draft.nombre_uso || ''} onChange={(event) => setField('nombre_uso', event.target.value)} />
                <small>Como se lo suele llamar, si es distinto del primer nombre (ej. "Paula" para "María Paula").</small>
              </label>
              <label>
                <span>Documento</span>
                <input value={draft.documento} onChange={(event) => setField('documento', event.target.value)} />
              </label>
              <label>
                <span>Fecha nacimiento</span>
                <input type="date" value={draft.fecha_nacimiento} onChange={(event) => setField('fecha_nacimiento', event.target.value)} />
              </label>
            </div>
          </section>

          <section className="rrhh-form-section-block">
            <div className="rrhh-section-title"><span>Contacto</span></div>
            <div className="rrhh-form-grid">
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
            </div>
          </section>

          <section className="rrhh-form-section-block">
            <div className="rrhh-section-title"><span>Puesto</span></div>
            <div className="rrhh-form-grid">
              <label className="span-2">
                <span>Roles</span>
                <div className="rrhh-chip-row">
                  {roleOptions.map((rol) => (
                    <ChipToggle
                      key={rol}
                      label={formatRol(rol)}
                      selected={selectedRoleNames.includes(rol)}
                      principal={principalRoleName === rol}
                      onToggle={() => toggleRole(rol)}
                      onSetPrincipal={() => setPrincipalRole(rol)}
                      principalLabel={`Marcar ${formatRol(rol)} como rol principal`}
                    />
                  ))}
                </div>
              </label>
              {showRegimenSelect ? (
                <label>
                  <span>Régimen</span>
                  <select value={draft.regimen_turno || ''} onChange={(event) => setField('regimen_turno', event.target.value || null)}>
                    <option value="">Sin asignar</option>
                    <option value="fijo">Fijo</option>
                    <option value="turnante">Turnante</option>
                    <option value="suplente">Suplente</option>
                  </select>
                </label>
              ) : null}
              {showRegimenFijoFields ? (
                <label>
                  <span>Móvil</span>
                  <select value={draft.vehiculo_id || ''} onChange={(event) => setField('vehiculo_id', event.target.value || null)}>
                    <option value="">Sin asignar</option>
                    {vehiculosFiltrados.map((v) => (
                      <option key={v.id} value={v.id}>{v.numero_interno || v.matricula || v.id}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              {showRegimenFijoFields ? (
                <label>
                  <span>Fecha de referencia de franco</span>
                  <input
                    type="date"
                    value={draft.fecha_ref_descanso || ''}
                    onChange={(event) => setField('fecha_ref_descanso', event.target.value || null)}
                  />
                  <small>Cualquier día de franco; el sistema calcula el ciclo 4x1.</small>
                </label>
              ) : null}
              {showFranjaSelect ? (
                <label>
                  <span>Franja</span>
                  <select value={draft.franja_turno || ''} onChange={(event) => setField('franja_turno', event.target.value || null)}>
                    <option value="">Sin asignar</option>
                    {FRANJA_TURNO_OPTIONS.map((franja) => <option key={franja} value={franja}>{franja}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="span-2">
                <span>Bases asignadas</span>
                <div className="rrhh-chip-row">
                  {(bases || []).map((base) => {
                    const selected = selectedBaseIds.includes(base.id);
                    const isPrincipal = (draft.bases || []).some((b) => b.base_id === base.id && b.es_principal);
                    return (
                      <ChipToggle
                        key={base.id}
                        label={base.nombre}
                        selected={selected}
                        principal={isPrincipal}
                        onToggle={() => toggleBase(base.id)}
                        onSetPrincipal={() => setPrincipalBase(base.id)}
                        principalLabel={`Marcar ${base.nombre} como base principal`}
                      />
                    );
                  })}
                  {!(bases || []).length ? <small>No hay bases cargadas todavía.</small> : null}
                </div>
              </label>
            </div>
          </section>

          <section className="rrhh-form-section-block">
            <div className="rrhh-section-title"><span>Situación laboral</span></div>
            <div className="rrhh-form-grid">
              <label>
                <span>Estado</span>
                <select value={draft.estado} onChange={(event) => setField('estado', event.target.value)}>
                  {Object.entries(ESTADO_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                <span>Tipo de personal *</span>
                <select value={draft.tipo_personal} onChange={(event) => setField('tipo_personal', event.target.value)}>
                  {Object.entries(TIPO_PERSONAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
              <label>
                <span>Fecha ingreso</span>
                <input type="date" value={draft.fecha_ingreso} onChange={(event) => setField('fecha_ingreso', event.target.value)} />
              </label>
              {draft.estado === 'baja' ? (
                <label>
                  <span>Fecha egreso</span>
                  <input type="date" value={draft.fecha_egreso} onChange={(event) => setField('fecha_egreso', event.target.value)} />
                </label>
              ) : null}
            </div>
          </section>

          <div className="rrhh-inline-hint">
            Podés guardar solo con nombre y apellido ahora, y completar el resto (documento, contacto,
            habilitaciones, capacitaciones, carné de salud) más adelante desde la ficha del funcionario.
          </div>
        </div>

        <div className="rrhh-modal-footer rrhh-personal-form-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving || isExterno}>
            {saving ? 'Guardando...' : formMode === 'create' ? 'Guardar personal' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
