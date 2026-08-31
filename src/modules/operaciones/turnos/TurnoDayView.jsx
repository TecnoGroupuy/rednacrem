import React from 'react';
import { AlertTriangle, ArrowRightLeft, Clock3, MapPin, Truck } from 'lucide-react';

export default function TurnoDayView({
  Button,
  Tag,
  bases,
  groupedRows,
  onEdit,
  onOpenCambio,
  getRoleLabel,
  getVehicleLabel
}) {
  return (
    <div className="turnos-day-stack">
      {bases.map((base) => {
        const rows = groupedRows[base.id] || [];
        return (
          <section key={base.id} className="turnos-base-section">
            <div className="turnos-base-header">
              <div>
                <h3>{base.nombre}</h3>
                <p>{base.departamento} · {base.direccion}</p>
              </div>
              <Tag variant={rows.length ? 'info' : 'ghost'}>
                {rows.length} turno{rows.length === 1 ? '' : 's'}
              </Tag>
            </div>

            {rows.length ? (
              <div className="turnos-base-grid">
                {rows.map((row) => (
                  <article
                    key={row.id}
                    className="turnos-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => onEdit(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onEdit(row.id);
                      }
                    }}
                  >
                    <div className="turnos-card-top">
                      <div className="turnos-card-avatar">
                        {`${row.personal?.nombre?.[0] || ''}${row.personal?.apellido?.[0] || ''}`.toUpperCase() || 'SU'}
                      </div>
                      <div className="turnos-card-tags">
                        <Tag variant="success">{row.tipo_turno}</Tag>
                        {row.es_hora_extra ? <Tag variant="warning">Hora extra</Tag> : null}
                        {!row.vehiculo_id ? <Tag variant="danger">Sin vehículo</Tag> : null}
                      </div>
                    </div>

                    <div className="turnos-card-heading">
                      <h4>{row.personalLabel}</h4>
                      <p>{getRoleLabel(row.personal_id)}</p>
                    </div>

                    <div className="turnos-card-meta">
                      <span><Clock3 size={14} /> {row.hora_inicio} → {row.hora_fin}</span>
                      <span><Truck size={14} /> {getVehicleLabel(row.vehiculo_id)}</span>
                      <span><MapPin size={14} /> {base.nombre}</span>
                    </div>

                    {row.observaciones ? (
                      <div className="turnos-note-banner">
                        <AlertTriangle size={15} />
                        <span>{row.observaciones}</span>
                      </div>
                    ) : null}

                    <div className="turnos-card-footer">
                      <Button
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(row.id);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<ArrowRightLeft size={16} />}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenCambio(row.id);
                        }}
                      >
                        Registrar cambio de turno
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="turnos-empty">No hay turnos cargados para esta base en la fecha seleccionada.</div>
            )}
          </section>
        );
      })}
    </div>
  );
}
