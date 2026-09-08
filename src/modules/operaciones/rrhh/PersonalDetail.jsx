import React from 'react';
import { MapPin, Star, Shield, GraduationCap, HeartPulse, UserCircle2, Plus, Trash2, AlertTriangle } from 'lucide-react';

const TABS = [
  { key: 'datos_generales', label: 'Datos generales' },
  { key: 'roles', label: 'Roles' },
  { key: 'habilitaciones', label: 'Habilitaciones' },
  { key: 'capacitaciones', label: 'Capacitaciones' },
  { key: 'carnet_salud', label: 'Carné de salud' }
];

// Campos opcionales de su_personal (todo menos nombre/apellido/tipo_personal,
// que son los unicos NOT NULL) -- se usan para marcar visualmente que le
// falta completar a cada funcionario, ya que la carga inicial en produccion
// va a ser parcial a proposito.
const OPTIONAL_FIELD_LABELS = {
  documento: 'Documento',
  fecha_nacimiento: 'Fecha de nacimiento',
  telefono: 'Teléfono',
  email: 'Email',
  domicilio: 'Domicilio',
  base_id: 'Base asignada',
  fecha_ingreso: 'Fecha de ingreso'
};

export function getMissingFields(personal) {
  if (!personal) return [];
  return Object.entries(OPTIONAL_FIELD_LABELS)
    .filter(([field]) => !personal[field])
    .map(([, label]) => label);
}

// Duplicado a proposito (no importado desde RrhhScreen.jsx) para no crear un
// import circular entre el screen y este componente. Ver el comentario
// gemelo en RrhhScreen.jsx: las columnas de fecha se confirmaron por nombre
// contra produccion, no por tipo exacto, asi que el backend puede devolver
// "2026-01-10" o "2026-01-10T03:00:00.000Z" segun como esten tipadas.
function toDateOnly(value) {
  if (!value) return '';
  const str = String(value);
  return str.length > 10 && str.includes('T') ? str.slice(0, 10) : str;
}

const emptyHabilitacionDraft = { tipo: '', numero: '', organismo_emisor: '', fecha_emision: '', fecha_vencimiento: '', documento_url: '', estado: 'vigente' };
const emptyCapacitacionDraft = { tipo_capacitacion: '', institucion: '', fecha_emision: '', fecha_vencimiento: '', documento_url: '' };
const emptyCarnetDraft = { fecha_emision: '', fecha_vencimiento: '', documento_url: '' };

export default function PersonalDetail({
  Button,
  Tag,
  personal,
  loading,
  error,
  actionError,
  activeTab,
  onTabChange,
  onClose,
  onEdit,
  roleOptions,
  formatRol,
  getBaseLabel,
  getStatusVariant,
  getDocumentStatusVariant,
  getVencimientoMeta,
  onAddRole,
  onRemoveRole,
  onAddHabilitacion,
  onAddCapacitacion,
  onAddCarnetSalud
}) {
  const [roleToAdd, setRoleToAdd] = React.useState('');
  const [showHabilitacionForm, setShowHabilitacionForm] = React.useState(false);
  const [showCapacitacionForm, setShowCapacitacionForm] = React.useState(false);
  const [showCarnetForm, setShowCarnetForm] = React.useState(false);
  const [habilitacionDraft, setHabilitacionDraft] = React.useState(emptyHabilitacionDraft);
  const [capacitacionDraft, setCapacitacionDraft] = React.useState(emptyCapacitacionDraft);
  const [carnetDraft, setCarnetDraft] = React.useState(emptyCarnetDraft);

  React.useEffect(() => {
    setRoleToAdd('');
    setShowHabilitacionForm(false);
    setShowCapacitacionForm(false);
    setShowCarnetForm(false);
    setHabilitacionDraft(emptyHabilitacionDraft);
    setCapacitacionDraft(emptyCapacitacionDraft);
    setCarnetDraft(emptyCarnetDraft);
  }, [personal?.id]);

  if (loading) {
    return (
      <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de personal">
        <div className="lot-wizard-overlay" onClick={onClose} />
        <div className="rrhh-detail-panel">
          <div className="rrhh-detail-header">
            <div>Cargando funcionario...</div>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de personal">
        <div className="lot-wizard-overlay" onClick={onClose} />
        <div className="rrhh-detail-panel">
          <div className="rrhh-detail-header">
            <div>{error}</div>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!personal) return null;

  const roles = personal.roles || [];
  const habilitaciones = personal.habilitaciones || [];
  const capacitaciones = personal.capacitaciones || [];
  // El backend ordena carnet_salud DESC por created_at: el primero es el mas
  // reciente / vigente.
  const carnetSalud = (personal.carnet_salud || [])[0] || null;

  const fullName = [personal.nombre, personal.apellido].filter(Boolean).join(' ');
  const primaryRole = roles.find((item) => item.rol_principal)?.rol || '';
  const missingFields = getMissingFields(personal);
  const availableRolesToAdd = roleOptions.filter((rol) => !roles.some((item) => item.rol === rol));

  const renderVencimientoTag = (dateValue) => {
    const meta = getVencimientoMeta(dateValue);
    return <Tag variant={meta.variant}>{meta.label}</Tag>;
  };

  // Valor de un campo opcional: si esta vacio, lo marca visualmente como
  // pendiente en vez de mostrar un simple "Sin dato" igual al resto.
  const renderField = (value, isMissing) => (
    isMissing
      ? <strong className="rrhh-missing-value">Sin completar</strong>
      : <strong>{value}</strong>
  );

  const handleAddRole = () => {
    if (!roleToAdd) return;
    onAddRole(roleToAdd, { rol_principal: !roles.length });
    setRoleToAdd('');
  };

  const handleAddHabilitacion = () => {
    if (!habilitacionDraft.tipo.trim()) return;
    onAddHabilitacion(habilitacionDraft);
    setHabilitacionDraft(emptyHabilitacionDraft);
    setShowHabilitacionForm(false);
  };

  const handleAddCapacitacion = () => {
    if (!capacitacionDraft.tipo_capacitacion.trim()) return;
    onAddCapacitacion(capacitacionDraft);
    setCapacitacionDraft(emptyCapacitacionDraft);
    setShowCapacitacionForm(false);
  };

  const handleAddCarnet = () => {
    if (!carnetDraft.fecha_emision) return;
    onAddCarnetSalud(carnetDraft);
    setCarnetDraft(emptyCarnetDraft);
    setShowCarnetForm(false);
  };

  return (
    <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de personal">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="rrhh-detail-panel">
        <div className="rrhh-detail-header">
          <div className="rrhh-detail-identity">
            <div className="rrhh-detail-avatar">{`${personal.nombre?.[0] || ''}${personal.apellido?.[0] || ''}`.toUpperCase() || 'SU'}</div>
            <div>
              <h2>{fullName}</h2>
              <p>{primaryRole ? formatRol(primaryRole) : 'Sin rol principal definido'}</p>
              <div className="rrhh-detail-base">
                <MapPin size={16} />
                <span>{getBaseLabel(personal.base_id)}</span>
              </div>
            </div>
          </div>
          <div className="rrhh-detail-header-actions">
            <Tag variant={getStatusVariant(personal.estado)}>{personal.estado}</Tag>
            <Tag variant={personal.tipo_personal === 'externo' ? 'info' : 'success'}>
              {personal.tipo_personal}
            </Tag>
            <Button variant="secondary" onClick={() => onEdit(personal.id)}>Editar</Button>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>

        {actionError ? (
          <div style={{ color: '#b91c1c', padding: '8px 20px' }}>{actionError}</div>
        ) : null}

        {missingFields.length ? (
          <div className="rrhh-alert-banner warning" style={{ margin: '0 20px 12px' }}>
            <AlertTriangle size={16} />
            <span>Faltan completar {missingFields.length} dato{missingFields.length === 1 ? '' : 's'}: {missingFields.join(', ')}</span>
          </div>
        ) : null}

        <div className="rrhh-detail-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rrhh-detail-content">
          {activeTab === 'datos_generales' ? (
            <div className="rrhh-detail-section-grid">
              <section className="rrhh-detail-card">
                <div className="rrhh-section-title"><UserCircle2 size={18} /> Datos generales</div>
                <div className="rrhh-kv-list">
                  <div><span>Documento</span>{renderField(personal.documento, !personal.documento)}</div>
                  <div><span>Fecha de nacimiento</span>{renderField(toDateOnly(personal.fecha_nacimiento), !personal.fecha_nacimiento)}</div>
                  <div><span>Teléfono</span>{renderField(personal.telefono, !personal.telefono)}</div>
                  <div><span>Email</span>{renderField(personal.email, !personal.email)}</div>
                  <div><span>Domicilio</span>{renderField(personal.domicilio, !personal.domicilio)}</div>
                  <div><span>Fecha de ingreso</span>{renderField(toDateOnly(personal.fecha_ingreso), !personal.fecha_ingreso)}</div>
                  <div><span>Fecha de egreso</span><strong>{personal.fecha_egreso ? toDateOnly(personal.fecha_egreso) : 'Activo'}</strong></div>
                  <div><span>Estado</span><strong><Tag variant={getStatusVariant(personal.estado)}>{personal.estado}</Tag></strong></div>
                  <div><span>Tipo de personal</span><strong><Tag variant={personal.tipo_personal === 'externo' ? 'info' : 'success'}>{personal.tipo_personal}</Tag></strong></div>
                  {personal.tipo_personal === 'externo' ? (
                    <div>
                      <span>Empresa contratista</span>
                      <strong>
                        {/* No hay endpoint de backend para resolver el nombre de la empresa
                            contratista (su_empresas_contratistas) -- se muestra el id crudo. */}
                        {personal.empresa_contratista_id || 'Sin dato'}
                      </strong>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'roles' ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <Star size={18} />
                <span>Roles asignados</span>
              </div>

              <div className="rrhh-inline-form" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <select value={roleToAdd} onChange={(event) => setRoleToAdd(event.target.value)}>
                  <option value="">Seleccionar rol para agregar</option>
                  {availableRolesToAdd.map((rol) => <option key={rol} value={rol}>{formatRol(rol)}</option>)}
                </select>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={handleAddRole} disabled={!roleToAdd}>
                  Agregar rol
                </Button>
              </div>

              <div className="rrhh-chip-cloud" style={{ marginTop: 14 }}>
                {roles.map((rol) => (
                  <div key={rol.id} className={'rrhh-role-chip ' + (rol.rol_principal ? 'primary' : '')}>
                    {rol.rol_principal ? <Star size={14} /> : null}
                    <span>{formatRol(rol.rol)}</span>
                    <button type="button" onClick={() => onRemoveRole(rol.id)} aria-label={`Quitar ${formatRol(rol.rol)}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {!roles.length ? <div className="rrhh-empty-inline">No hay roles asignados todavia.</div> : null}
              </div>
              {/* El backend no tiene un PATCH para su_personal_roles (solo POST y
                  DELETE), asi que no se puede re-marcar "principal" en un rol ya
                  guardado -- solo el primer rol que se agrega queda como principal. */}
            </section>
          ) : null}

          {activeTab === 'habilitaciones' ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <div className="rrhh-inline-title"><Shield size={18} /><span>Habilitaciones</span></div>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowHabilitacionForm((prev) => !prev)}>Cargar nueva</Button>
              </div>

              {showHabilitacionForm ? (
                <div className="rrhh-inline-form">
                  <input placeholder="Tipo (ej. Registro MSP)" value={habilitacionDraft.tipo} onChange={(event) => setHabilitacionDraft((prev) => ({ ...prev, tipo: event.target.value }))} />
                  <input placeholder="Numero" value={habilitacionDraft.numero} onChange={(event) => setHabilitacionDraft((prev) => ({ ...prev, numero: event.target.value }))} />
                  <input placeholder="Organismo emisor" value={habilitacionDraft.organismo_emisor} onChange={(event) => setHabilitacionDraft((prev) => ({ ...prev, organismo_emisor: event.target.value }))} />
                  <select value={habilitacionDraft.estado} onChange={(event) => setHabilitacionDraft((prev) => ({ ...prev, estado: event.target.value }))}>
                    <option value="vigente">vigente</option>
                    <option value="vencida">vencida</option>
                    <option value="en_tramite">en_tramite</option>
                  </select>
                  <input type="date" value={habilitacionDraft.fecha_emision} onChange={(event) => setHabilitacionDraft((prev) => ({ ...prev, fecha_emision: event.target.value }))} />
                  <input type="date" value={habilitacionDraft.fecha_vencimiento} onChange={(event) => setHabilitacionDraft((prev) => ({ ...prev, fecha_vencimiento: event.target.value }))} />
                  <input placeholder="documento_url" value={habilitacionDraft.documento_url} onChange={(event) => setHabilitacionDraft((prev) => ({ ...prev, documento_url: event.target.value }))} />
                  <div className="rrhh-inline-actions">
                    <Button variant="ghost" onClick={() => setShowHabilitacionForm(false)}>Cancelar</Button>
                    <Button onClick={handleAddHabilitacion}>Guardar habilitación</Button>
                  </div>
                </div>
              ) : null}

              <div className="rrhh-detail-list">
                {habilitaciones.map((item) => (
                  <article key={item.id} className="rrhh-doc-card">
                    <div className="rrhh-doc-head">
                      <strong>{item.tipo}</strong>
                      <Tag variant={getDocumentStatusVariant(item.estado)}>{item.estado || 'sin estado'}</Tag>
                    </div>
                    <div className="rrhh-doc-grid">
                      <span>Número</span><strong>{item.numero || 'Sin dato'}</strong>
                      <span>Organismo emisor</span><strong>{item.organismo_emisor || 'Sin dato'}</strong>
                      <span>Fecha emisión</span><strong>{item.fecha_emision ? toDateOnly(item.fecha_emision) : 'Sin dato'}</strong>
                      <span>Fecha vencimiento</span><strong>{renderVencimientoTag(item.fecha_vencimiento)}</strong>
                      <span>Documento</span><strong>{item.documento_url || 'Sin adjunto'}</strong>
                    </div>
                  </article>
                ))}
                {!habilitaciones.length ? <div className="rrhh-empty-inline">No hay habilitaciones cargadas.</div> : null}
              </div>
            </section>
          ) : null}

          {activeTab === 'capacitaciones' ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <div className="rrhh-inline-title"><GraduationCap size={18} /><span>Capacitaciones</span></div>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowCapacitacionForm((prev) => !prev)}>Cargar nueva</Button>
              </div>

              {showCapacitacionForm ? (
                <div className="rrhh-inline-form">
                  <input placeholder="Tipo de capacitacion" value={capacitacionDraft.tipo_capacitacion} onChange={(event) => setCapacitacionDraft((prev) => ({ ...prev, tipo_capacitacion: event.target.value }))} />
                  <input placeholder="Institucion" value={capacitacionDraft.institucion} onChange={(event) => setCapacitacionDraft((prev) => ({ ...prev, institucion: event.target.value }))} />
                  <input type="date" value={capacitacionDraft.fecha_emision} onChange={(event) => setCapacitacionDraft((prev) => ({ ...prev, fecha_emision: event.target.value }))} />
                  <input type="date" value={capacitacionDraft.fecha_vencimiento} onChange={(event) => setCapacitacionDraft((prev) => ({ ...prev, fecha_vencimiento: event.target.value }))} />
                  <input placeholder="documento_url" value={capacitacionDraft.documento_url} onChange={(event) => setCapacitacionDraft((prev) => ({ ...prev, documento_url: event.target.value }))} />
                  <div className="rrhh-inline-actions">
                    <Button variant="ghost" onClick={() => setShowCapacitacionForm(false)}>Cancelar</Button>
                    <Button onClick={handleAddCapacitacion}>Guardar capacitación</Button>
                  </div>
                </div>
              ) : null}

              <div className="rrhh-detail-list">
                {capacitaciones.map((item) => (
                  <article key={item.id} className="rrhh-doc-card">
                    <div className="rrhh-doc-head">
                      <strong>{item.tipo_capacitacion}</strong>
                      {renderVencimientoTag(item.fecha_vencimiento)}
                    </div>
                    <div className="rrhh-doc-grid">
                      <span>Institución</span><strong>{item.institucion || 'Sin dato'}</strong>
                      <span>Fecha emisión</span><strong>{item.fecha_emision ? toDateOnly(item.fecha_emision) : 'Sin dato'}</strong>
                      <span>Fecha vencimiento</span><strong>{item.fecha_vencimiento ? toDateOnly(item.fecha_vencimiento) : 'Sin dato'}</strong>
                      <span>Documento</span><strong>{item.documento_url || 'Sin adjunto'}</strong>
                    </div>
                  </article>
                ))}
                {!capacitaciones.length ? <div className="rrhh-empty-inline">No hay capacitaciones cargadas.</div> : null}
              </div>
            </section>
          ) : null}

          {activeTab === 'carnet_salud' ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <div className="rrhh-inline-title"><HeartPulse size={18} /><span>Carné de salud</span></div>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowCarnetForm((prev) => !prev)}>Cargar nuevo</Button>
              </div>

              {showCarnetForm ? (
                <div className="rrhh-inline-form">
                  <input type="date" value={carnetDraft.fecha_emision} onChange={(event) => setCarnetDraft((prev) => ({ ...prev, fecha_emision: event.target.value }))} />
                  <input type="date" value={carnetDraft.fecha_vencimiento} onChange={(event) => setCarnetDraft((prev) => ({ ...prev, fecha_vencimiento: event.target.value }))} />
                  <input placeholder="documento_url" value={carnetDraft.documento_url} onChange={(event) => setCarnetDraft((prev) => ({ ...prev, documento_url: event.target.value }))} />
                  <div className="rrhh-inline-actions">
                    <Button variant="ghost" onClick={() => setShowCarnetForm(false)}>Cancelar</Button>
                    <Button onClick={handleAddCarnet}>Guardar carné</Button>
                  </div>
                </div>
              ) : null}

              {carnetSalud ? (
                <div className="rrhh-kv-list">
                  <div><span>Fecha emisión</span><strong>{toDateOnly(carnetSalud.fecha_emision)}</strong></div>
                  <div><span>Fecha vencimiento</span><strong>{renderVencimientoTag(carnetSalud.fecha_vencimiento)}</strong></div>
                  <div><span>Documento adjunto</span><strong>{carnetSalud.documento_url || 'Sin adjunto'}</strong></div>
                </div>
              ) : (
                <div className="rrhh-empty-inline">No hay carné de salud cargado.</div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
