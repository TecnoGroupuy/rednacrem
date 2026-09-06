import React, { useEffect, useState } from 'react';
import { MapContainer, Pane, Polygon, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import BaseMarker from './BaseMarker.jsx';
import VehicleMarker from './VehicleMarker.jsx';

const COVERAGE_COLOR = '#f97316';
const COVERAGE_NOTICE = 'Área de cobertura de SU Emergencia — Fuente: material institucional oficial de la cooperativa. Aproximación visual, no representa límites cartográficos exactos.';

// Trazado manual suministrado a partir del material institucional; no es un archivo GIS.
// 16 vértices y repetición de Toledo para cerrar el polígono, en el orden indicado.
const COVERAGE_POLYGON = [
  [-34.7403, -56.0925], // Toledo
  [-34.7534, -56.0724], // Casarino
  [-34.7338, -56.0327], // Joaquín Suárez
  [-34.7534, -56.0009], // Barros Blancos
  [-34.7184, -55.9627], // Pando
  [-34.6924, -55.8983], // Empalme Olmos
  [-34.6836, -55.7022], // Soca
  [-34.7341, -55.6856], // Estación La Floresta
  [-34.7542, -55.6758], // La Floresta
  [-34.7679, -55.6545], // Costa Azul
  [-34.7506, -55.7099], // Parque del Plata
  [-34.7796, -55.7569], // Atlántida
  [-34.7761, -55.8487], // Salinas
  [-34.7869, -55.8798], // Neptunia
  [-34.7963, -55.9096], // El Pinar
  [-34.8183, -56.0155], // Gral. Líber Seregni
  [-34.7403, -56.0925], // Cierre en Toledo
];

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
  const [showCoverage, setShowCoverage] = useState(true);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

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
        <Pane name="monitor-coverage" style={{ zIndex: 350 }}>
          {showCoverage && (
            <Polygon
              positions={COVERAGE_POLYGON}
              pathOptions={{ color: COVERAGE_COLOR, fillColor: COVERAGE_COLOR, fillOpacity: 0.12, opacity: 0.9, weight: 2 }}
            >
              <Tooltip sticky opacity={1}>
                <div style={{ maxWidth: 280, whiteSpace: 'normal' }}>{COVERAGE_NOTICE}</div>
              </Tooltip>
              <Popup autoPan={false}>{COVERAGE_NOTICE}</Popup>
            </Polygon>
          )}
        </Pane>
        {bases.map((base) => (
          <BaseMarker key={base.id} base={base} onClick={onBaseClick} />
        ))}
        {vehicles.map((vehicle) => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            servicio={serviciosActivos.find((servicio) => servicio.vehiculo_id === vehicle.id) || null}
            onClick={onVehicleClick}
          />
        ))}
      </MapContainer>

      <div className="map-legend" style={{ maxHeight: 'calc(100% - 32px)', maxWidth: 'calc(100% - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <span className="map-legend-title" style={{ marginBottom: 0 }}>Leyenda</span>
          <button
            type="button"
            aria-label={isLegendExpanded ? 'Minimizar leyenda' : 'Expandir leyenda'}
            aria-expanded={isLegendExpanded}
            onClick={() => setIsLegendExpanded((expanded) => !expanded)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0, border: '1px solid #475569', borderRadius: 4, background: '#1e293b', color: '#f8fafc', fontSize: 20, cursor: 'pointer' }}
          >
            {isLegendExpanded ? '−' : '+'}
          </button>
        </div>
        <div hidden={!isLegendExpanded} style={{ marginTop: 10 }}>
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
        <div style={{ borderTop: '1px solid #475569', marginTop: 10, paddingTop: 10 }}>
          <div className="map-legend-title">Cobertura de SU Emergencia</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8, color: '#f8fafc' }}>
            <input
              type="checkbox"
              role="switch"
              checked={showCoverage}
              onChange={(event) => setShowCoverage(event.target.checked)}
              style={{ accentColor: COVERAGE_COLOR }}
            />
            Mostrar área de cobertura
          </label>
          <div style={{ marginTop: 6, color: '#cbd5e1', fontSize: 10 }}>
            {COVERAGE_NOTICE}
          </div>
          <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 10 }}>
            Móviles en las coordenadas del mock; sin GPS real todavía.
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
