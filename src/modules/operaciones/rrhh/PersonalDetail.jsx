import React from 'react';
import { MapPin, Star, Shield, GraduationCap, HeartPulse, UserCircle2, Plus, Trash2 } from 'lucide-react';

const TABS = [
  { key: 'datos_generales', label: 'Datos generales' },
  { key: 'roles', label: 'Roles' },
  { key: 'habilitaciones', label: 'Habilitaciones' },
  { key: 'capacitaciones', label: 'Capacitaciones' },
  { key: 'carnet_salud', label: 'Carné de salud' }
];

export default function PersonalDetail({
  Button,
  Tag,
  personal,
  roles,
  habilitaciones,
  capacitaciones,
  carnetSalud,
  empresa,
  activeTab,
  onTabChange,
  onClose,
  formatRol,
  getBaseLabel,
  getStatusVariant,
  getDocumentStatusVariant,
  getVencimientoMeta,
  onAddRole,
  onRemoveRole
}) {
  if (!personal) return null;

  const fullName = [personal.nombre, personal.apellido].filter(Boolean).join(' ');
  const primaryRole = roles.find((item) => item.rol_principal)?.rol || '';

  const renderVencimientoTag = (dateValue) => {
    const meta = getVencimientoMeta(dateValue);
    return <Tag variant={meta.variant}>{meta.label}</Tag>;
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
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>

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
                  <div><span>Documento</span><strong>{personal.documento || 'Sin dato'}</strong></div>
                  <div><span>Fecha de nacimiento</span><strong>{personal.fecha_nacimiento || 'Sin dato'}</strong></div>
                  <div><span>Teléfono</span><strong>{personal.telefono || 'Sin dato'}</strong></div>
                  <div><span>Email</span><strong>{personal.email || 'Sin dato'}</strong></div>
                  <div><span>Domicilio</span><strong>{personal.domicilio || 'Sin dato'}</strong></div>
                  <div><span>Fecha de ingreso</span><strong>{personal.fecha_ingreso || 'Sin dato'}</strong></div>
                  <div><span>Fecha de egreso</span><strong>{personal.fecha_egreso || 'Activo'}</strong></div>
                  <div><span>Estado</span><strong><Tag variant={getStatusVariant(personal.estado)}>{personal.estado}</Tag></strong></div>
                  <div><span>Tipo de personal</span><strong><Tag variant={personal.tipo_personal === 'externo' ? 'info' : 'success'}>{personal.tipo_personal}</Tag></strong></div>
                  {personal.tipo_personal === 'externo' ? (
                    <div>
                      <span>Empresa contratista</span>
                      <strong>
                        {empresa ? (
                          <button type="button" className="rrhh-link-chip">{empresa.razon_social}</button>
                        ) : 'Sin empresa'}
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
                <div className="rrhh-section-actions">
                  <Button variant="secondary" icon={<Plus size={16} />} onClick={onAddRole}>Agregar rol</Button>
                </div>
              </div>
              <div className="rrhh-chip-cloud">
                {roles.map((rol) => (
                  <div key={rol.id} className={'rrhh-role-chip ' + (rol.rol_principal ? 'primary' : '')}>
                    {rol.rol_principal ? <Star size={14} /> : null}
                    <span>{formatRol(rol.rol)}</span>
                    <button type="button" onClick={() => onRemoveRole(rol.id)} aria-label={`Quitar ${formatRol(rol.rol)}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {!roles.length ? <div className="rrhh-empty-inline">No hay roles asignados.</div> : null}
              </div>
            </section>
          ) : null}

          {activeTab === 'habilitaciones' ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <Shield size={18} />
                <span>Habilitaciones</span>
                <div className="rrhh-section-actions">
                  <Button variant="secondary" icon={<Plus size={16} />}>Cargar nueva</Button>
                </div>
              </div>
              <div className="rrhh-detail-list">
                {habilitaciones.map((item) => (
                  <article key={item.id} className="rrhh-doc-card">
                    <div className="rrhh-doc-head">
                      <strong>{item.tipo}</strong>
                      <Tag variant={getDocumentStatusVariant(item.estado)}>{item.estado}</Tag>
                    </div>
                    <div className="rrhh-doc-grid">
                      <span>Número</span><strong>{item.numero}</strong>
                      <span>Organismo emisor</span><strong>{item.organismo_emisor}</strong>
                      <span>Fecha emisión</span><strong>{item.fecha_emision}</strong>
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
                <GraduationCap size={18} />
                <span>Capacitaciones</span>
                <div className="rrhh-section-actions">
                  <Button variant="secondary" icon={<Plus size={16} />}>Cargar nueva</Button>
                </div>
              </div>
              <div className="rrhh-detail-list">
                {capacitaciones.map((item) => (
                  <article key={item.id} className="rrhh-doc-card">
                    <div className="rrhh-doc-head">
                      <strong>{item.tipo_capacitacion}</strong>
                      {renderVencimientoTag(item.fecha_vencimiento)}
                    </div>
                    <div className="rrhh-doc-grid">
                      <span>Institución</span><strong>{item.institucion}</strong>
                      <span>Fecha emisión</span><strong>{item.fecha_emision}</strong>
                      <span>Fecha vencimiento</span><strong>{item.fecha_vencimiento}</strong>
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
                <HeartPulse size={18} />
                <span>Carné de salud</span>
              </div>
              {carnetSalud ? (
                <div className="rrhh-kv-list">
                  <div><span>Fecha emisión</span><strong>{carnetSalud.fecha_emision}</strong></div>
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
