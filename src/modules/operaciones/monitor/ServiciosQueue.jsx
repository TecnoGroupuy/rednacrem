import React, { useEffect, useState } from 'react';

function formatElapsed(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
  const seconds = (diff % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default function ServiciosQueue({ serviciosActivos, vehiculos, onSelectVehicle }) {
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const sorted = [...serviciosActivos].sort((a, b) => {
    const prioOrder = { P1: 0, P2: 1, P3: 2 };
    return prioOrder[a.prioridad] - prioOrder[b.prioridad];
  });

  const getVehicleNum = (vehiculoId) => {
    const vehicle = vehiculos.find((item) => item.id === vehiculoId);
    return vehicle ? `${vehicle.numero_interno} · ${vehicle.categoria}` : '-';
  };

  return (
    <aside className="monitor-queue">
      <div className="monitor-queue-header">
        <div className="monitor-queue-title">Servicios activos</div>
        <div className="monitor-queue-sub">
          {sorted.length} en curso · ordenados por prioridad
        </div>
      </div>
      <div className="monitor-queue-list">
        {sorted.map((servicio) => {
          const priorityClass = servicio.prioridad.toLowerCase();
          return (
            <div
              key={servicio.id}
              className={`service-card ${priorityClass}`}
              onClick={() => onSelectVehicle(servicio.vehiculo_id)}
            >
              <div className="service-card-header">
                <span className={`service-badge ${priorityClass}`}>
                  {servicio.prioridad}{' '}
                  {servicio.prioridad === 'P1'
                    ? 'CRITICO'
                    : servicio.prioridad === 'P2'
                      ? 'URGENTE'
                      : 'NO URGENTE'}
                </span>
                <span className={`service-timer ${priorityClass}`}>
                  {formatElapsed(servicio.hora_solicitud)}
                </span>
              </div>
              <div className="service-card-title">{servicio.tipo}</div>
              <div className="service-card-vehiculo">
                <span>🚑</span> {getVehicleNum(servicio.vehiculo_id)}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
