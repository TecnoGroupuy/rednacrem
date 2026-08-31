import React, { useMemo } from 'react';

const STATUS_META = {
  disponible: { label: 'Disponible', className: 'status-disponible' },
  en_servicio: { label: 'En servicio', className: 'status-en-servicio' },
  en_base: { label: 'En base', className: 'status-en-base' },
  mantenimiento: { label: 'Mantenimiento', className: 'status-mantenimiento' },
  fuera_de_servicio: { label: 'Fuera de servicio', className: 'status-fuera-de-servicio' },
};

function getStatusMeta(status) {
  return STATUS_META[status] || { label: String(status || 'Sin estado').replace(/_/g, ' '), className: 'status-fuera-de-servicio' };
}

export default function BasesVehiculosPanel({ bases, vehiculos, onSelectVehicle }) {
  const basesConVehiculos = useMemo(() => (
    bases.map((base) => ({
      ...base,
      vehiculos: vehiculos.filter((vehicle) => vehicle.base_id === base.id),
    }))
  ), [bases, vehiculos]);

  return (
    <aside className="monitor-queue">
      <div className="monitor-queue-header">
        <div className="monitor-queue-title">Bases y móviles</div>
        <div className="monitor-queue-sub">Estado operativo actual por base</div>
      </div>

      <div className="monitor-queue-list">
        {basesConVehiculos.map((base) => (
          <section key={base.id} className="base-vehicles-group">
            <div className="base-vehicles-group-header">
              <span className="base-vehicles-group-title">{base.nombre}</span>
              <span className="base-vehicles-group-count">{base.vehiculos.length}</span>
            </div>

            <div className="base-vehicles-list">
              {base.vehiculos.length ? base.vehiculos.map((vehicle) => {
                const statusMeta = getStatusMeta(vehicle.estado_operativo);
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    className="base-vehicle-row"
                    onClick={() => onSelectVehicle(vehicle.id)}
                  >
                    <div>
                      <div className="base-vehicle-name">{vehicle.numero_interno}</div>
                      <div className="base-vehicle-meta">{vehicle.categoria}</div>
                    </div>
                    <span className={`base-vehicle-status ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </button>
                );
              }) : (
                <div className="base-vehicles-empty">Sin móviles asignados</div>
              )}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
