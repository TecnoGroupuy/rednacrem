import React from 'react';
import {
  AlertTriangle,
  HeartPulse,
  HandHelping,
  Route,
  Eye,
  Edit3,
  Clock3,
  Ambulance,
  MapPin
} from 'lucide-react';

const TYPE_META = {
  Asistencia: { icon: HeartPulse, className: 'type-asistencia' },
  Apoyo: { icon: HandHelping, className: 'type-apoyo' },
  Traslado: { icon: Route, className: 'type-traslado' }
};

export default function ServicioList({
  Button,
  Tag,
  rows,
  filters,
  providerOptions,
  bases,
  onFilterChange,
  onCreate,
  onView,
  onEdit,
  getElapsedLabel,
  getStatusVariant,
  getPriorityVariant
}) {
  return (
    <div className="servicios-stack">
      <div className="servicios-toolbar">
        <div className="servicios-filters">
          <select value={filters.estado} onChange={(event) => onFilterChange('estado', event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="solicitado">solicitado</option>
            <option value="asignado">asignado</option>
            <option value="en_curso">en_curso</option>
            <option value="finalizado">finalizado</option>
            <option value="cancelado">cancelado</option>
          </select>
          <select value={filters.tipo} onChange={(event) => onFilterChange('tipo', event.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="Asistencia">Asistencia</option>
            <option value="Apoyo">Apoyo</option>
            <option value="Traslado">Traslado</option>
          </select>
          <select value={filters.prestador_contratante} onChange={(event) => onFilterChange('prestador_contratante', event.target.value)}>
            <option value="">Todos los prestadores</option>
            {providerOptions.filter((item) => item !== 'Otro').map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={filters.base_id} onChange={(event) => onFilterChange('base_id', event.target.value)}>
            <option value="">Todas las bases</option>
            {bases.map((base) => <option key={base.id} value={base.id}>{base.nombre}</option>)}
          </select>
        </div>
        <Button onClick={onCreate}>Nuevo servicio</Button>
      </div>

      {rows.length ? (
        <div className="servicios-grid">
          {rows.map((row) => {
            const typeMeta = TYPE_META[row.tipo] || TYPE_META.Asistencia;
            const TypeIcon = typeMeta.icon;

            return (
              <article
                key={row.id}
                className={`servicios-card ${row.estado}`}
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
                <div className="servicios-card-top">
                  <div className="servicios-identity">
                    <div className={`servicios-type-icon ${typeMeta.className}`}>
                      <TypeIcon size={20} />
                    </div>
                    <div>
                      <div className="servicios-card-title">{row.tipo}</div>
                      <div className="servicios-subtle">{row.paciente_nombre}</div>
                    </div>
                  </div>
                  <div className="servicios-card-actions" onClick={(event) => event.stopPropagation()}>
                    <Button variant="ghost" icon={<Eye size={16} />} onClick={() => onView(row.id)}>Ver</Button>
                    <Button variant="ghost" icon={<Edit3 size={16} />} onClick={() => onEdit(row.id)}>Editar</Button>
                  </div>
                </div>

                <div className="servicios-card-meta">
                  <Tag variant={getPriorityVariant(row.prioridad)}>{row.prioridad || 'Sin prioridad'}</Tag>
                  <Tag variant={getStatusVariant(row.estado)}>{row.estado}</Tag>
                </div>

                <div className="servicios-kv-grid">
                  <div className="servicios-kv-item">
                    <span>Prestador</span>
                    <strong>{row.prestador_contratante}</strong>
                  </div>
                  <div className="servicios-kv-item">
                    <span>Vehículo</span>
                    <strong className="servicios-inline-strong">
                      <Ambulance size={14} />
                      <span>{row.vehiculo?.numero_interno || 'Sin asignar'}</span>
                    </strong>
                  </div>
                  <div className="servicios-kv-item">
                    <span>Base</span>
                    <strong className="servicios-inline-strong">
                      <MapPin size={14} />
                      <span>{row.base?.nombre || 'Sin base'}</span>
                    </strong>
                  </div>
                  <div className="servicios-kv-item">
                    <span>Tiempo transcurrido</span>
                    <strong className="servicios-inline-strong">
                      <Clock3 size={14} />
                      <span>{getElapsedLabel(row.hora_solicitud)}</span>
                    </strong>
                  </div>
                </div>

                {row.vehicleWarning ? (
                  <div className="servicios-warning-banner">
                    <AlertTriangle size={16} />
                    <span>{row.vehicleWarning}</span>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="servicios-empty">No hay servicios que coincidan con los filtros.</div>
      )}
    </div>
  );
}
