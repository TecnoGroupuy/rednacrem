import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import BaseMarker from './BaseMarker.jsx';
import VehicleMarker from './VehicleMarker.jsx';

function MapLayoutSync() {
  const map = useMap();

  useEffect(() => {
    const syncSize = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    syncSize();
    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, [map]);

  return null;
}

function MapReadySync({ onMapReady }) {
  const map = useMap();

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}

export default function MonitorMap({
  bases,
  vehicles,
  serviciosActivos,
  onBaseClick,
  onVehicleClick,
  mapRef,
  onMapReady,
}) {
  const getServicio = (vehiculoId) =>
    serviciosActivos.find((servicio) => servicio.vehiculo_id === vehiculoId) || null;

  return (
    <div className="monitor-map-area">
      <MapContainer
        center={[0, 0]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <MapLayoutSync />
        <MapReadySync onMapReady={onMapReady} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {bases.map((base) => (
          <BaseMarker key={base.id} base={base} onClick={onBaseClick} />
        ))}
        {vehicles.map((vehicle) => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            servicio={getServicio(vehicle.id)}
            onClick={onVehicleClick}
          />
        ))}
      </MapContainer>

      <div className="map-legend">
        <div className="map-legend-title">Estado de moviles</div>
        <div className="map-legend-item">
          <span className="map-legend-dot disponible"></span> Disponible
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot en_servicio"></span> En servicio
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot en_base"></span> En base
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot mantenimiento"></span> Mantenimiento
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot fuera_de_servicio"></span> Fuera de servicio
        </div>
      </div>
    </div>
  );
}
