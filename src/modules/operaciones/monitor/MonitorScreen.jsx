import React, { useCallback, useEffect, useRef, useState } from 'react';
import BasePanel from './BasePanel.jsx';
import BasesVehiculosPanel from './BasesVehiculosPanel.jsx';
import MonitorMap from './MonitorMap.jsx';
import {
  bases,
  personalPorBase,
  startVehicleSimulation,
  vehiculos,
} from './monitorMockData.js';
import './monitorStyles.css';

function useClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  return time;
}

function formatHeaderDateTime(date) {
  const formatted = date.toLocaleDateString('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`;
}

const BASES_FIT_PADDING = [48, 48];
const BASE_FOCUS_ZOOM = 15;

export default function MonitorScreen() {
  const [vehicles, setVehicles] = useState(vehiculos);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const mapRef = useRef(null);
  const clock = useClock();

  useEffect(() => {
    const cleanup = startVehicleSimulation(setVehicles);
    return cleanup;
  }, []);

  const disponibles = vehicles.filter((vehicle) => vehicle.estado_operativo === 'disponible').length;
  const enServicio = vehicles.filter((vehicle) => vehicle.estado_operativo === 'en_servicio').length;
  const headerStatusLine = `${formatHeaderDateTime(clock)} - Moviles disponibles ${disponibles} / en servicio ${enServicio}`;

  const fitMapToBases = useCallback(() => {
    if (!mapRef.current || !bases.length) {
      return;
    }

    mapRef.current.fitBounds(
      bases.map((base) => [base.lat, base.lng]),
      {
        padding: BASES_FIT_PADDING,
        animate: true,
        duration: 1,
      }
    );
  }, []);

  const handleBaseClick = useCallback((base) => {
    setSelectedBaseId(base.id);
    if (mapRef.current) {
      mapRef.current.flyTo([base.lat, base.lng], BASE_FOCUS_ZOOM, { duration: 1 });
    }
  }, []);

  const handleCloseBasePanel = useCallback(() => {
    setSelectedBaseId(null);
    fitMapToBases();
  }, [fitMapToBases]);

  const handleSelectVehicle = useCallback((vehiculoId) => {
    const vehicle = vehicles.find((item) => item.id === vehiculoId);
    if (vehicle && mapRef.current) {
      mapRef.current.flyTo([vehicle.lat, vehicle.lng], 14, { duration: 1 });
    }
  }, [vehicles]);

  const handleMapReady = useCallback(() => {
    fitMapToBases();
  }, [fitMapToBases]);

  return (
    <div className="monitor-screen">
      <header className="monitor-header">
        <div className="monitor-header-left">
          <div className="monitor-logo">SU</div>
          <div className="monitor-header-title">SU Emergencia - Monitor de Operaciones</div>
        </div>
        <div className="monitor-header-right">
          <div className="monitor-header-status-line">{headerStatusLine}</div>
        </div>
      </header>

      <div className="monitor-body">
        <MonitorMap
          bases={bases}
          vehicles={vehicles}
          serviciosActivos={[]}
          onBaseClick={handleBaseClick}
          onVehicleClick={handleSelectVehicle}
          mapRef={mapRef}
          onMapReady={handleMapReady}
        />
        {/* TODO: volver a activar ServiciosQueue cuando existan datos reales de servicios. */}
        <BasesVehiculosPanel
          bases={bases}
          vehiculos={vehicles}
          onSelectVehicle={handleSelectVehicle}
        />
      </div>

      {selectedBaseId ? (
        <BasePanel
          baseId={selectedBaseId}
          bases={bases}
          personalPorBase={personalPorBase}
          vehiculos={vehicles}
          onClose={handleCloseBasePanel}
        />
      ) : null}
    </div>
  );
}
