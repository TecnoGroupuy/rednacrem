import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BasePanel from './BasePanel.jsx';
import BasesVehiculosPanel from './BasesVehiculosPanel.jsx';
import MonitorMap from './MonitorMap.jsx';
// personalPorBase sigue siendo mock: no hay endpoint de personal/RRHH conectado
// a Monitor todavia (eso vive en el modulo RRHH, fuera de alcance aca). bases y
// vehiculos, en cambio, ya salen del backend real via flotasService.js -- mismo
// servicio que ya usa Flotas, para no duplicar logica de fetch.
import { personalPorBase } from './monitorMockData.js';
import { listBases, listVehiculos } from '../../../services/flotasService.js';
import './monitorStyles.css';

// El backend (su_bases) no guarda lat/lng -- columnas reales confirmadas contra
// produccion: id, organization_id, nombre, departamento, direccion, activa. No
// hay tracking GPS real de vehiculos tampoco. Hasta que eso exista, este es un
// workaround puramente de frontend: un diccionario chico de coordenadas
// conocidas por NOMBRE de base (las mismas lat/lng que ya tenia
// monitorMockData.js) para poder seguir dibujando el mapa con datos reales de
// bases/vehiculos en vez del mock completo.
//
// Decision para una base nueva sin coordenada conocida (ej. creada por el
// quick-create de Flotas): NO se le dibuja marcador en el mapa. Se prefiere
// omitirlo antes que inventar una ubicacion o clavarla en un punto por
// defecto -- este es un mapa operativo (despacho de emergencias), y una
// posicion incorrecta ahi es peor que la ausencia de marcador: puede hacer
// perder tiempo real buscando un movil donde no esta. La base igual aparece
// completa en el panel lateral "Bases y moviles" (que no depende de
// coordenadas), asi que no se pierde informacion, solo su posicion en el
// mapa hasta que alguien cargue una coordenada real (backend) o se agregue
// su nombre a este diccionario.
function normalizeBaseName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const KNOWN_BASE_COORDS = {
  'pando': { lat: -34.7184, lng: -55.9627 },
  'barros blancos': { lat: -34.7534, lng: -56.0009 },
  'salinas': { lat: -34.7761, lng: -55.8487 },
  'atlantida': { lat: -34.7796, lng: -55.7569 },
};

// Sin GPS real todavia: cada vehiculo se ubica en la coordenada de su base,
// con un offset chico para que los de una misma base no queden apilados
// exactamente en el mismo punto (mismo orden de magnitud que usaba
// monitorMockData.js, ~0.002-0.004 grados). Alterna direccion este/oeste y
// crece la magnitud cada 2 vehiculos.
const VEHICLE_OFFSET_DEG = 0.0021;

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
  const [bases, setBases] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const mapRef = useRef(null);
  const clock = useClock();

  const loadMonitor = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [basesItems, vehiculosItems] = await Promise.all([listBases(), listVehiculos()]);
      setBases(basesItems);
      // Los backups (es_backup = true) no son moviles operativos: no van en
      // Monitor (ni mapa, ni panel lateral, ni contadores del header). Se
      // filtran aca, una sola vez y lo antes posible -- todo lo que consume
      // `vehiculos` mas abajo (header, BasesVehiculosPanel,
      // vehiclesWithCoords/MonitorMap) ya recibe la lista sin backups, sin
      // tener que acordarse de filtrar en cada punto de consumo. Flotas no
      // pasa por aca -- sigue usando su propio fetch y su seccion "En
      // backup" separada, sin cambios.
      setVehiculos(vehiculosItems.filter((vehiculo) => !vehiculo.es_backup));
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar los datos de monitoreo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitor();
  }, [loadMonitor]);

  // Solo las bases con coordenada conocida se dibujan en el mapa (ver
  // comentario del diccionario arriba). El panel lateral usa `bases` (todas).
  const basesWithCoords = useMemo(() => bases
    .map((base) => {
      const coords = KNOWN_BASE_COORDS[normalizeBaseName(base.nombre)];
      return coords ? { ...base, lat: coords.lat, lng: coords.lng } : null;
    })
    .filter(Boolean), [bases]);

  const baseCoordsById = useMemo(
    () => Object.fromEntries(basesWithCoords.map((base) => [base.id, base])),
    [basesWithCoords]
  );

  // Mismo criterio que con las bases: un vehiculo cuya base no tiene
  // coordenada conocida tampoco tiene marcador en el mapa. El panel lateral
  // usa `vehiculos` (todos) y no depende de esto.
  const vehiclesWithCoords = useMemo(() => {
    const countByBase = {};
    return vehiculos
      .map((vehiculo) => {
        const base = baseCoordsById[vehiculo.base_id];
        if (!base) return null;
        const index = countByBase[vehiculo.base_id] || 0;
        countByBase[vehiculo.base_id] = index + 1;
        const direction = index % 2 === 0 ? 1 : -1;
        const magnitude = Math.floor(index / 2) + 1;
        return {
          ...vehiculo,
          lat: base.lat,
          lng: base.lng + direction * VEHICLE_OFFSET_DEG * magnitude,
        };
      })
      .filter(Boolean);
  }, [vehiculos, baseCoordsById]);

  const disponibles = vehiculos.filter((vehicle) => vehicle.estado_operativo === 'disponible').length;
  const enServicio = vehiculos.filter((vehicle) => vehicle.estado_operativo === 'en_servicio').length;
  const headerStatusLine = `${formatHeaderDateTime(clock)} - Moviles disponibles ${disponibles} / en servicio ${enServicio}`;

  const fitMapToBases = useCallback(() => {
    if (!mapRef.current || !basesWithCoords.length) {
      return;
    }

    mapRef.current.fitBounds(
      basesWithCoords.map((base) => [base.lat, base.lng]),
      {
        padding: BASES_FIT_PADDING,
        animate: true,
        duration: 1,
      }
    );
  }, [basesWithCoords]);

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
    const vehicle = vehiclesWithCoords.find((item) => item.id === vehiculoId);
    if (vehicle && mapRef.current) {
      mapRef.current.flyTo([vehicle.lat, vehicle.lng], 14, { duration: 1 });
    }
    // Si el vehiculo pertenece a una base sin coordenada conocida, no tiene
    // posicion en el mapa: no hacemos flyTo, pero la fila del panel lateral
    // sigue siendo clickeable sin romper nada.
  }, [vehiclesWithCoords]);

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

      {loading ? (
        <div className="monitor-status-message">Cargando datos de monitoreo...</div>
      ) : error ? (
        <div className="monitor-status-message monitor-status-message-error">
          <span>{error}</span>
          <button type="button" className="monitor-status-retry" onClick={loadMonitor}>Reintentar</button>
        </div>
      ) : (
        <div className="monitor-body">
          <MonitorMap
            bases={basesWithCoords}
            vehicles={vehiclesWithCoords}
            serviciosActivos={[]}
            onBaseClick={handleBaseClick}
            onVehicleClick={handleSelectVehicle}
            mapRef={mapRef}
            onMapReady={handleMapReady}
          />
          {/* TODO: volver a activar ServiciosQueue cuando existan datos reales de servicios. */}
          <BasesVehiculosPanel
            bases={bases}
            vehiculos={vehiculos}
            onSelectVehicle={handleSelectVehicle}
          />
        </div>
      )}

      {selectedBaseId ? (
        <BasePanel
          baseId={selectedBaseId}
          bases={basesWithCoords}
          personalPorBase={personalPorBase}
          vehiculos={vehiculos}
          onClose={handleCloseBasePanel}
        />
      ) : null}
    </div>
  );
}
