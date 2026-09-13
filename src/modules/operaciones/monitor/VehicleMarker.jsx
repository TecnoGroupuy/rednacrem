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

// Corrimiento fijo en pixeles (no depende del zoom) para que el icono del
// vehiculo no quede dibujado justo encima de la etiqueta con el nombre de
// la base: a zooms bajos, el offset geografico entre vehiculo y base en
// monitorMockData.js (~0.0021 grados) se traduce en muy pocos pixeles.
// SIDE_SHIFT_PX calculado para despejar el caso mas largo ("Barros Blancos",
// ~103px de ancho incluido padding) mas el radio del propio icono (17px).
// UP_SHIFT_PX corre el icono hacia arriba ademas del costado; solo es seguro
// combinarlo con un SIDE_SHIFT_PX que ya saque al vehiculo por fuera del
// ancho del badge de la base (46px, +-23px del centro) para no terminar
// tapando el logo en vez de la etiqueta.
const SIDE_SHIFT_PX = 70;
const UP_SHIFT_PX = 12;

export default function VehicleMarker({ vehicle, servicio, onClick, sideOffset = 1 }) {
  const shiftX = sideOffset * SIDE_SHIFT_PX;
  const icon = L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div class="vehicle-marker ${getVehicleClass(vehicle.estado_operativo)}">
        <img src="${ambulanceIconUrl}" alt="Ambulancia" class="vehicle-marker-image" />
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17 - shiftX, 17 + UP_SHIFT_PX],
    tooltipAnchor: [17 + shiftX, -14 - UP_SHIFT_PX],
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
