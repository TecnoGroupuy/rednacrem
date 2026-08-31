import React from 'react';
import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import ambulanceIconUrl from './assets/ambulance-icon.svg';

const getVehicleClass = (estado) => {
  switch (estado) {
    case 'disponible':
    case 'en_servicio':
    case 'en_base':
    case 'mantenimiento':
    case 'fuera_de_servicio':
      return estado;
    default:
      return '';
  }
};

export default function VehicleMarker({ vehicle, servicio, onClick }) {
  const icon = L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div class="vehicle-marker ${getVehicleClass(vehicle.estado_operativo)}">
        <img src="${ambulanceIconUrl}" alt="Ambulancia" class="vehicle-marker-image" />
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    tooltipAnchor: [17, -14],
  });

  const estadoLabel = vehicle.estado_operativo.replace(/_/g, ' ');
  const servicioLabel = servicio ? servicio.tipo : '-';

  return (
    <Marker
      position={[vehicle.lat, vehicle.lng]}
      icon={icon}
      eventHandlers={onClick ? { click: () => onClick(vehicle.id) } : undefined}
    >
      <Tooltip direction="top" offset={[0, -14]} className="vehicle-tooltip">
        <div className="vehicle-tooltip-title">
          {vehicle.numero_interno} · {vehicle.categoria}
        </div>
        <div>Estado: <strong>{estadoLabel}</strong></div>
        <div>Servicio: {servicioLabel}</div>
      </Tooltip>
    </Marker>
  );
}
