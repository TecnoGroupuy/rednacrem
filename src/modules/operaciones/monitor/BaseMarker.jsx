import React from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';
import logoUrl from './assets/su-emergencia-logo.png';

export default function BaseMarker({ base, onClick }) {
  const baseIcon = L.divIcon({
    className: 'custom-base-icon',
    html: `
      <div class="base-station-marker">
        <div class="base-station-marker-badge">
          <div class="base-station-marker-frame">
            <img src="${logoUrl}" alt="" class="base-station-marker-logo" />
          </div>
        </div>
        <div class="base-marker-label">${base.nombre}</div>
      </div>
    `,
    iconSize: [46, 60],
    iconAnchor: [23, 54],
    tooltipAnchor: [0, -42],
  });

  return (
    <Marker
      position={[base.lat, base.lng]}
      icon={baseIcon}
      eventHandlers={{ click: () => onClick(base) }}
    />
  );
}
