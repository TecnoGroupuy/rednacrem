import React from 'react';
import { Ambulance, AlertTriangle, Clock3, Edit3, Eye, Gauge, MapPin, Wrench } from 'lucide-react';

export default function VehiculoList({
  Button,
  Tag,
  rows,
  filters,
  bases,
  onFilterChange,
  onCreate,
  onView,
  onEdit,
  formatCategoria,
  getBaseLabel,
  getStatusVariant,
  formatNumber
}) {
  return (
    <div className="flotas-stack">
      <div className="flotas-toolbar">
        <div className="flotas-filters">
          <select value={filters.base_id} onChange={(event) => onFilterChange('base_id', event.target.value)}>
            <option value="">Todas las bases</option>
            {bases.map((base) => <option key={base.id} value={base.id}>{base.nombre}</option>)}
          </select>
          <select value={filters.categoria} onChange={(event) => onFilterChange('categoria', event.target.value)}>
            <option value="">Todas las categorias</option>
            <option value="AVA">AVA</option>
            <option value="basico">Basico</option>
            <option value="pediatrico">Pediatrico</option>
          </select>
          <select value={filters.estado_operativo} onChange={(event) => onFilterChange('estado_operativo', event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="disponible">disponible</option>
            <option value="en_servicio">en_servicio</option>
            <option value="en_base">en_base</option>
            <option value="mantenimiento">mantenimiento</option>
            <option value="fuera_de_servicio">fuera_de_servicio</option>
          </select>
        </div>
        <Button onClick={onCreate}>Nuevo vehiculo</Button>
      </div>

      {rows.length ? (
        <div className="flotas-grid">
          {rows.map((row) => (
            <article
              key={row.id}
              className={`flotas-card ${row.documentAlert.hasAlert || row.serviceAlert.hasAlert ? 'has-alert' : ''}`}
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
              <div className="flotas-card-top">
                <div className="flotas-identity">
                  <div className="flotas-icon-shell">
                    <Ambulance size={20} />
                  </div>
                  <div>
                    <div className="flotas-number">{row.numero_interno}</div>
                    <div className="flotas-subtle">{formatCategoria(row.categoria)} · {row.marca} {row.modelo}</div>
                  </div>
                </div>
                <div className="flotas-card-actions" onClick={(event) => event.stopPropagation()}>
                  <Button variant="ghost" icon={<Eye size={16} />} onClick={() => onView(row.id)}>Ver</Button>
                  <Button variant="ghost" icon={<Edit3 size={16} />} onClick={() => onEdit(row.id)}>Editar</Button>
                </div>
              </div>

              <div className="flotas-card-meta">
                <div className="flotas-meta-block">
                  <span className="flotas-meta-label">Base asignada</span>
                  <strong className="flotas-inline-strong">
                    <MapPin size={14} />
                    <span>{getBaseLabel(row.base_id)}</span>
                  </strong>
                </div>
                <div className="flotas-meta-block">
                  <span className="flotas-meta-label">Estado operativo</span>
                  <Tag variant={getStatusVariant(row.estado_operativo)}>{row.estado_operativo}</Tag>
                </div>
              </div>

              <div className="flotas-card-stats">
                <div className="flotas-stat">
                  <span className="flotas-meta-label">Kilometraje</span>
                  <strong className="flotas-inline-strong">
                    <Gauge size={14} />
                    <span>{formatNumber(row.kilometraje)} km</span>
                  </strong>
                </div>
                <div className="flotas-stat">
                  <span className="flotas-meta-label">Proximo service</span>
                  <strong>{formatNumber(row.proximo_service_km)} km</strong>
                </div>
              </div>

              <div className="flotas-card-banners">
                <div className={`flotas-banner ${row.documentAlert.variant}`}>
                  {row.documentAlert.hasAlert ? <AlertTriangle size={16} /> : <Clock3 size={16} />}
                  <span>{row.documentAlert.label}</span>
                </div>
                <div className={`flotas-banner ${row.serviceAlert.variant}`}>
                  <Wrench size={16} />
                  <span>{row.serviceAlert.label}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flotas-empty">No hay vehiculos que coincidan con los filtros.</div>
      )}
    </div>
  );
}
