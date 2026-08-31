import React from 'react';
import { Eye, Edit3, AlertTriangle, Clock3, Building2, MapPin } from 'lucide-react';

export default function PersonalList({
  Button,
  Tag,
  rows,
  filters,
  bases,
  roleOptions,
  onFilterChange,
  onCreate,
  onView,
  onEdit,
  formatRol,
  getBaseLabel,
  getStatusVariant,
  getAlertMeta
}) {
  return (
    <div className="rrhh-stack">
      <div className="rrhh-toolbar">
        <div className="rrhh-filters">
          <select value={filters.base_id} onChange={(event) => onFilterChange('base_id', event.target.value)}>
            <option value="">Todas las bases</option>
            {bases.map((base) => <option key={base.id} value={base.id}>{base.nombre}</option>)}
          </select>
          <select value={filters.rol} onChange={(event) => onFilterChange('rol', event.target.value)}>
            <option value="">Todos los roles</option>
            {roleOptions.map((rol) => <option key={rol} value={rol}>{formatRol(rol)}</option>)}
          </select>
          <select value={filters.estado} onChange={(event) => onFilterChange('estado', event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="licencia">Licencia</option>
            <option value="suspendido">Suspendido</option>
            <option value="baja">Baja</option>
          </select>
          <select value={filters.tipo_personal} onChange={(event) => onFilterChange('tipo_personal', event.target.value)}>
            <option value="">Todo el personal</option>
            <option value="interno">Interno</option>
            <option value="externo">Externo</option>
          </select>
        </div>
        <Button icon={null} onClick={onCreate}>Nuevo personal</Button>
      </div>

      {rows.length ? (
        <div className="rrhh-person-grid">
          {rows.map((row) => {
            const alertMeta = getAlertMeta(row);
            const external = row.tipo_personal === 'externo';

            return (
              <article
                key={row.id}
                className={`rrhh-person-card ${external ? 'external' : 'internal'} ${alertMeta.hasAlert ? 'has-alert' : ''}`}
                onClick={() => onView(row.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onView(row.id);
                  }
                }}
              >
                <div className="rrhh-person-card-top">
                  <div className="rrhh-name-cell">
                    <div className="rrhh-avatar rrhh-avatar-large" style={{ background: row.avatarBackground }}>
                      {row.avatarContent}
                    </div>
                    <div>
                      <div className="rrhh-name">{row.nombreCompleto}</div>
                      <div className="rrhh-subtle">{row.documento}</div>
                    </div>
                  </div>
                  <div className="rrhh-card-actions" onClick={(event) => event.stopPropagation()}>
                    <Button variant="ghost" icon={<Eye size={16} />} onClick={() => onView(row.id)}>Ver</Button>
                    <Button variant="ghost" icon={<Edit3 size={16} />} onClick={() => onEdit(row.id)}>Editar</Button>
                  </div>
                </div>

                <div className="rrhh-person-card-body">
                  <div className="rrhh-person-meta">
                    <span className="rrhh-person-meta-label">Rol principal</span>
                    <strong>{row.rolPrincipal ? formatRol(row.rolPrincipal) : 'Sin rol principal'}</strong>
                  </div>
                  <div className="rrhh-person-meta">
                    <span className="rrhh-person-meta-label">Base asignada</span>
                    <strong className="rrhh-person-base">
                      <MapPin size={14} />
                      <span>{getBaseLabel(row.base_id)}</span>
                    </strong>
                  </div>
                </div>

                <div className="rrhh-person-card-tags">
                  <Tag variant={getStatusVariant(row.estado)}>{row.estadoLabel}</Tag>
                  {external ? (
                    <div className="rrhh-external-pill">
                      <Building2 size={14} />
                      <span>Externo - {row.empresaRazonSocial || 'Sin empresa'}</span>
                    </div>
                  ) : (
                    <div className="rrhh-internal-pill">Interno</div>
                  )}
                </div>

                <div className={`rrhh-alert-banner ${alertMeta.hasAlert ? alertMeta.variant : 'success'}`}>
                  {alertMeta.hasAlert ? (
                    <>
                      {alertMeta.variant === 'danger' ? <AlertTriangle size={16} /> : <Clock3 size={16} />}
                      <span>{alertMeta.label}</span>
                    </>
                  ) : (
                    <span>Sin alertas</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rrhh-empty rrhh-empty-surface">No hay personal que coincida con los filtros.</div>
      )}
    </div>
  );
}
