import React from 'react';
import { AlertTriangle, CalendarClock, HeartPulse, MapPin, Wrench } from 'lucide-react';

export default function EquipoList({
  Button,
  Tag,
  rows,
  filters,
  typeSuggestions,
  onFilterChange,
  onCreate,
  onView,
  onEdit,
  getStatusVariant,
  getServiceMeta,
  formatLocationType
}) {
  return (
    <div className="equipos-stack">
      <div className="equipos-toolbar">
        <div className="equipos-filters">
          <select value={filters.equipo} onChange={(event) => onFilterChange('equipo', event.target.value)}>
            <option value="">Todos los equipos</option>
            {typeSuggestions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <select value={filters.ubicacion_tipo} onChange={(event) => onFilterChange('ubicacion_tipo', event.target.value)}>
            <option value="">Todas las ubicaciones</option>
            <option value="vehiculo">Vehículo</option>
            <option value="base">Base</option>
            <option value="economato">Economato</option>
            <option value="backup">Backup</option>
          </select>

          <select value={filters.estado} onChange={(event) => onFilterChange('estado', event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="roto">Roto</option>
            <option value="reparacion">Reparación</option>
          </select>

          <select value={filters.service_alert} onChange={(event) => onFilterChange('service_alert', event.target.value)}>
            <option value="">Service: todos</option>
            <option value="si">Con alerta</option>
            <option value="no">Sin alerta</option>
          </select>
        </div>

        <Button onClick={onCreate}>Nuevo equipo</Button>
      </div>

      <div className="equipos-grid">
        {rows.map((row) => {
          const serviceMeta = getServiceMeta(row.fecha_proximo_service);
          return (
            <article
              key={row.id}
              className={`equipos-card state-${row.estado}`}
              role="button"
              tabIndex={0}
              onClick={() => onView(row.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onView(row.id);
                }
              }}
            >
              <div className="equipos-card-top">
                <div className="equipos-card-badge">
                  <HeartPulse size={22} />
                </div>
                <div className="equipos-card-actions">
                  <Tag variant={getStatusVariant(row.estado)}>{row.estado}</Tag>
                  <Tag variant={serviceMeta.variant}>{serviceMeta.label}</Tag>
                </div>
              </div>

              <div className="equipos-card-heading">
                <h3>{row.equipo}</h3>
                <p>{row.marca} · {row.modelo}</p>
              </div>

              <div className="equipos-card-meta">
                <div><span>Serie</span><strong>{row.numero_serie}</strong></div>
                <div><span>Ubicación</span><strong>{row.ubicacion_label}</strong></div>
                <div><span>Tipo ubicación</span><strong>{formatLocationType(row.ubicacion_tipo)}</strong></div>
                <div><span>Próximo service</span><strong>{row.fecha_proximo_service || 'Sin fecha'}</strong></div>
              </div>

              {row.observacion ? (
                <div className="equipos-observacion-banner">
                  <AlertTriangle size={16} />
                  <span>{row.observacion}</span>
                </div>
              ) : null}

              <div className="equipos-card-footer">
                <div className="equipos-card-pills">
                  <span><MapPin size={14} /> {row.ubicacion_label}</span>
                  <span><CalendarClock size={14} /> Rev. {row.fecha_ultima_revision || 'Sin dato'}</span>
                  <span><Wrench size={14} /> {serviceMeta.shortLabel}</span>
                </div>
                <Button variant="ghost" onClick={(event) => { event.stopPropagation(); onEdit(row.id); }}>Editar</Button>
              </div>
            </article>
          );
        })}
      </div>

      {!rows.length ? (
        <div className="equipos-empty">No hay equipos que coincidan con los filtros actuales.</div>
      ) : null}
    </div>
  );
}
