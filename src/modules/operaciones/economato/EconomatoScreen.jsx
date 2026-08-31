import React from 'react';
import { AlertTriangle, Ambulance, Archive, Building2 } from 'lucide-react';
import UbicacionSelector from './UbicacionSelector.jsx';
import BolsoTabs from './BolsoTabs.jsx';
import MaterialStockList from './MaterialStockList.jsx';
import MaterialForm from './MaterialForm.jsx';
import MovimientoForm from './MovimientoForm.jsx';
import {
  ECONOMATO_BOLSO_OPTIONS,
  ECONOMATO_CATEGORY_OPTIONS,
  ECONOMATO_MOVEMENT_TYPES,
  ECONOMATO_STOCK_MINIMOS as initialStockMinimos,
  su_materiales_catalogo as initialCatalogo,
  su_materiales_stock as initialStock,
  su_materiales_movimientos as initialMovimientos
} from './economatoMockData.js';
import { FLOTAS_BASES, su_vehiculos } from '../flotas/flotasMockData.js';
import { su_personal } from '../rrhh/rrhhMockData.js';
import './economatoStyles.css';

const TODAY = new Date('2026-08-30T00:00:00');

const VEHICLE_BAG_TABS = [
  { id: 'comun', label: 'Bolso Común' },
  { id: 'rcp', label: 'Bolso RCP' },
  { id: 'ambulancia', label: 'Ambulancia' }
];

const emptyMaterialDraft = {
  id: '',
  organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd',
  nombre: '',
  categoria: ECONOMATO_CATEGORY_OPTIONS[0],
  unidad_medida: '',
  requiere_control_vencimiento: false
};

const emptyMovimientoDraft = {
  id: '',
  organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd',
  material_id: '',
  tipo_movimiento: 'entrada',
  cantidad: 1,
  origen_tipo: 'vehiculo',
  origen_id: '',
  origen_bolso: 'comun',
  destino_tipo: 'vehiculo',
  destino_id: '',
  destino_bolso: 'comun',
  servicio_id: '',
  motivo: '',
  responsable_id: '',
  fecha: '2026-08-30',
  // NOTA: stock_entry_id es un campo auxiliar del mock/frontend para
  // identificar el lote de origen al simular el descuento de stock.
  // No existe como columna en su_materiales_movimientos real.
  stock_entry_id: '',
  lote: '',
  fecha_vencimiento: ''
};

const buildId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const normalizeBolso = (value) => (value === 'ambulancia' ? null : value || null);

export default function EconomatoScreen({ Button, Panel, Tag }) {
  const [catalogo, setCatalogo] = React.useState(initialCatalogo);
  const [stockMinimos, setStockMinimos] = React.useState(initialStockMinimos);
  const [stock, setStock] = React.useState(initialStock);
  const [movimientos, setMovimientos] = React.useState(initialMovimientos);
  const [materialFormOpen, setMaterialFormOpen] = React.useState(false);
  const [materialFormMode, setMaterialFormMode] = React.useState('create');
  const [materialDraft, setMaterialDraft] = React.useState(emptyMaterialDraft);
  const [materialMinimumDraft, setMaterialMinimumDraft] = React.useState(0);
  const [materialErrors, setMaterialErrors] = React.useState({});
  const [selectedLocationKey, setSelectedLocationKey] = React.useState('vehiculo:v1');
  const [selectedVehicleTab, setSelectedVehicleTab] = React.useState('comun');
  const [movimientoFormOpen, setMovimientoFormOpen] = React.useState(false);
  const [movimientoDraft, setMovimientoDraft] = React.useState(emptyMovimientoDraft);
  const [movimientoErrors, setMovimientoErrors] = React.useState({});

  const catalogById = React.useMemo(() => Object.fromEntries(catalogo.map((item) => [item.id, item])), [catalogo]);
  const vehiclesById = React.useMemo(() => Object.fromEntries(su_vehiculos.map((item) => [item.id, item])), []);
  const basesById = React.useMemo(() => Object.fromEntries(FLOTAS_BASES.map((item) => [item.id, item])), []);
  const peopleById = React.useMemo(() => Object.fromEntries(su_personal.map((item) => [item.id, item])), []);

  const parseLocationKey = React.useCallback((key) => {
    const [tipo, id] = String(key || '').split(':');
    return { tipo, id };
  }, []);

  const getExpiryMeta = React.useCallback((dateValue) => {
    if (!dateValue) return { variant: 'ghost', label: 'Sin vencimiento', level: 'ok' };
    const target = new Date(`${dateValue}T00:00:00`);
    const diffDays = Math.ceil((target.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { variant: 'danger', label: `Vencido ${dateValue}`, level: 'danger' };
    if (diffDays <= 30) return { variant: 'warning', label: `Vence ${dateValue}`, level: 'warning' };
    return { variant: 'success', label: `Vigente ${dateValue}`, level: 'ok' };
  }, []);

  const getMaterialMinimum = React.useCallback((materialId) => Number(stockMinimos[materialId] || 0), [stockMinimos]);

  const enrichEntry = React.useCallback((entry) => {
    const material = catalogById[entry.material_id];
    return {
      ...entry,
      stock_id: entry.id,
      ...material
    };
  }, [catalogById]);

  const buildLocationSummary = React.useCallback((entries) => {
    const alertItems = [];
    let alertLevel = 'ok';

    const totalCantidad = entries.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
    const materialIds = new Set(entries.map((item) => item.material_id));

    materialIds.forEach((materialId) => {
      const groupEntries = entries.filter((item) => item.material_id === materialId);
      const total = groupEntries.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
      if (total < getMaterialMinimum(materialId)) {
        alertItems.push(`${catalogById[materialId]?.nombre || materialId} con stock crítico`);
        alertLevel = 'danger';
      }
      groupEntries.forEach((entry) => {
        const expiry = getExpiryMeta(entry.fecha_vencimiento);
        if (expiry.level === 'danger') {
          alertItems.push(`${catalogById[materialId]?.nombre || materialId} vencido`);
          alertLevel = 'danger';
        } else if (expiry.level === 'warning' && alertLevel !== 'danger') {
          alertItems.push(`${catalogById[materialId]?.nombre || materialId} por vencer`);
          alertLevel = 'warning';
        }
      });
    });

    return {
      alertLevel,
      alertLabel: alertItems.length ? (alertLevel === 'danger' ? 'Alerta alta' : 'Atención') : 'Sin alertas',
      alertCount: alertItems.length,
      alertItems,
      totalCantidad,
      materialCount: materialIds.size
    };
  }, [catalogById, getExpiryMeta, getMaterialMinimum]);

  const locationCards = React.useMemo(() => {
    const vehicleRows = su_vehiculos.slice(0, 3).map((vehicle) => {
      const entries = stock.filter((item) => item.ubicacion_tipo === 'vehiculo' && item.vehiculo_id === vehicle.id);
      const summary = buildLocationSummary(entries);
      const containersCount = new Set(entries.map((item) => String(item.bolso ?? 'ambulancia'))).size;
      return {
        key: `vehiculo:${vehicle.id}`,
        tipo: 'vehiculo',
        nombre: vehicle.numero_interno,
        subtitulo: basesById[vehicle.base_id]?.nombre || 'Sin base',
        containersCount,
        ...summary
      };
    });

    const baseRows = FLOTAS_BASES.map((base) => {
      const entries = stock.filter((item) => item.ubicacion_tipo === 'base' && item.base_id === base.id);
      return {
        key: `base:${base.id}`,
        tipo: 'base',
        nombre: base.nombre,
        subtitulo: base.departamento,
        containersCount: 0,
        ...buildLocationSummary(entries)
      };
    });

    return [...vehicleRows, ...baseRows];
  }, [basesById, buildLocationSummary, stock]);

  const selectedLocation = React.useMemo(() => {
    const { tipo, id } = parseLocationKey(selectedLocationKey);
    if (tipo === 'vehiculo') return { tipo, id, label: vehiclesById[id]?.numero_interno || id, subtitle: basesById[vehiclesById[id]?.base_id]?.nombre || 'Sin base' };
    if (tipo === 'base') return { tipo, id, label: basesById[id]?.nombre || id, subtitle: basesById[id]?.departamento || 'Base' };
    return null;
  }, [basesById, parseLocationKey, selectedLocationKey, vehiclesById]);

  const selectedEntries = React.useMemo(() => {
    if (!selectedLocation) return [];
    return stock.filter((item) => (
      selectedLocation.tipo === 'vehiculo'
        ? item.ubicacion_tipo === 'vehiculo' && item.vehiculo_id === selectedLocation.id
        : item.ubicacion_tipo === 'base' && item.base_id === selectedLocation.id
    ));
  }, [selectedLocation, stock]);

  const vehicleTabCounts = React.useMemo(() => {
    if (!selectedLocation || selectedLocation.tipo !== 'vehiculo') return [];
    return VEHICLE_BAG_TABS.map((tab) => ({
      ...tab,
      count: selectedEntries.filter((item) => String(item.bolso ?? 'ambulancia') === tab.id).length
    }));
  }, [selectedEntries, selectedLocation]);

  const visibleRows = React.useMemo(() => {
    const entries = selectedLocation?.tipo === 'vehiculo'
      ? selectedEntries.filter((item) => String(item.bolso ?? 'ambulancia') === selectedVehicleTab)
      : selectedEntries;
    return entries.map(enrichEntry).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [enrichEntry, selectedEntries, selectedLocation, selectedVehicleTab]);

  const summary = React.useMemo(() => ({
    vehiculos: locationCards.filter((item) => item.tipo === 'vehiculo').length,
    bases: locationCards.filter((item) => item.tipo === 'base').length,
    alertas: locationCards.reduce((acc, item) => acc + item.alertCount, 0),
    materiales: catalogo.length
  }), [catalogo.length, locationCards]);

  const responsibleOptions = React.useMemo(
    () => su_personal.map((person) => ({ id: person.id, label: `${person.nombre} ${person.apellido}` })),
    []
  );

  const locationOptions = React.useMemo(() => ({
    base: FLOTAS_BASES.map((base) => ({ id: base.id, label: `${base.nombre} · Base` })),
    vehiculo: su_vehiculos.slice(0, 3).map((vehicle) => ({ id: vehicle.id, label: `${vehicle.numero_interno} · ${basesById[vehicle.base_id]?.nombre || 'Sin base'}` }))
  }), [basesById]);

  const sourceEntryOptions = React.useMemo(() => stock
    .filter((item) => item.material_id === movimientoDraft.material_id)
    .filter((item) => item.ubicacion_tipo === movimientoDraft.origen_tipo)
    .filter((item) => (
      movimientoDraft.origen_tipo === 'base'
        ? item.base_id === movimientoDraft.origen_id
        : item.vehiculo_id === movimientoDraft.origen_id
    ))
    .filter((item) => movimientoDraft.origen_tipo !== 'vehiculo' || normalizeBolso(movimientoDraft.origen_bolso) === item.bolso)
    .map((item) => ({
      id: item.id,
      label: `${catalogById[item.material_id]?.nombre || item.material_id} · lote ${item.lote || 'sin lote'} · stock ${item.cantidad}`
    })), [catalogById, movimientoDraft.material_id, movimientoDraft.origen_bolso, movimientoDraft.origen_id, movimientoDraft.origen_tipo, stock]);

  const openCreateMaterial = () => {
    setMaterialFormMode('create');
    setMaterialDraft({ ...emptyMaterialDraft, id: buildId('mat') });
    setMaterialMinimumDraft(0);
    setMaterialErrors({});
    setMaterialFormOpen(true);
  };

  const openEditMaterial = (materialId) => {
    const target = catalogById[materialId];
    if (!target) return;
    setMaterialFormMode('edit');
    setMaterialDraft({
      id: target.id,
      organization_id: target.organization_id,
      nombre: target.nombre,
      categoria: target.categoria,
      unidad_medida: target.unidad_medida,
      requiere_control_vencimiento: target.requiere_control_vencimiento
    });
    setMaterialMinimumDraft(getMaterialMinimum(target.id));
    setMaterialErrors({});
    setMaterialFormOpen(true);
  };

  const validateMaterialDraft = () => {
    const nextErrors = {};
    if (!materialDraft.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.';
    if (!materialDraft.unidad_medida.trim()) nextErrors.unidad_medida = 'La unidad de medida es obligatoria.';
    if (materialMinimumDraft === '' || Number(materialMinimumDraft) < 0) nextErrors.stock_minimo_sugerido = 'Define un mínimo válido.';
    setMaterialErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveMaterial = () => {
    if (!validateMaterialDraft()) return;
    const persisted = { ...materialDraft };
    setCatalogo((prev) => {
      const exists = prev.some((item) => item.id === persisted.id);
      return exists ? prev.map((item) => item.id === persisted.id ? persisted : item) : [persisted, ...prev];
    });
    setStockMinimos((prev) => ({ ...prev, [persisted.id]: Number(materialMinimumDraft) || 0 }));
    setMaterialFormOpen(false);
  };

  const openMovimientoForm = (materialId = '') => {
    setMovimientoDraft({
      ...emptyMovimientoDraft,
      id: buildId('mov'),
      material_id: materialId || visibleRows[0]?.id || '',
      origen_tipo: selectedLocation?.tipo || 'vehiculo',
      origen_id: selectedLocation?.id || '',
      origen_bolso: selectedLocation?.tipo === 'vehiculo' ? selectedVehicleTab : '',
      destino_tipo: selectedLocation?.tipo || 'vehiculo',
      destino_id: selectedLocation?.id || '',
      destino_bolso: selectedLocation?.tipo === 'vehiculo' ? selectedVehicleTab : ''
    });
    setMovimientoErrors({});
    setMovimientoFormOpen(true);
  };

  const validateMovimientoDraft = () => {
    const nextErrors = {};
    const quantity = Number(movimientoDraft.cantidad);
    if (!movimientoDraft.material_id) nextErrors.form = 'Selecciona un material desde la vista actual.';
    if (!quantity || quantity <= 0) nextErrors.cantidad = 'La cantidad debe ser mayor a cero.';
    if (!movimientoDraft.responsable_id) nextErrors.responsable_id = 'Selecciona un responsable.';
    if (!movimientoDraft.fecha) nextErrors.fecha = 'La fecha es obligatoria.';
    if (!movimientoDraft.motivo.trim()) nextErrors.motivo = 'El motivo es obligatorio.';

    if (movimientoDraft.tipo_movimiento === 'entrada') {
      if (!movimientoDraft.destino_id) nextErrors.destino_id = 'Selecciona el destino.';
      if (!movimientoDraft.lote.trim()) nextErrors.lote = 'El lote es obligatorio para la entrada.';
    } else {
      if (!movimientoDraft.origen_id) nextErrors.origen_id = 'Selecciona la ubicación de origen.';
      if (!movimientoDraft.stock_entry_id) nextErrors.stock_entry_id = 'Selecciona el lote de origen.';
      const sourceEntry = stock.find((item) => item.id === movimientoDraft.stock_entry_id);
      if (sourceEntry && quantity > Number(sourceEntry.cantidad || 0)) {
        nextErrors.form = 'No alcanza el stock actual en esa ubicación para este movimiento.';
      }
      if (movimientoDraft.tipo_movimiento === 'traspaso') {
        if (!movimientoDraft.destino_id) nextErrors.destino_id = 'Selecciona el destino del traspaso.';
        const sameBolso = normalizeBolso(movimientoDraft.origen_bolso) === normalizeBolso(movimientoDraft.destino_bolso);
        if (movimientoDraft.origen_tipo === movimientoDraft.destino_tipo && movimientoDraft.origen_id === movimientoDraft.destino_id && sameBolso) {
          nextErrors.form = 'El origen y el destino del traspaso no pueden ser iguales.';
        }
      }
      if (movimientoDraft.tipo_movimiento === 'salida_servicio' && !movimientoDraft.servicio_id.trim()) {
        nextErrors.servicio_id = 'Ingresa el servicio relacionado.';
      }
    }

    setMovimientoErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const mergeStockEntry = React.useCallback((entries, incoming) => {
    const existing = entries.find((item) => (
      item.material_id === incoming.material_id
      && item.ubicacion_tipo === incoming.ubicacion_tipo
      && item.base_id === incoming.base_id
      && item.vehiculo_id === incoming.vehiculo_id
      && (item.bolso ?? null) === (incoming.bolso ?? null)
      && (item.lote || '') === (incoming.lote || '')
      && (item.fecha_vencimiento || '') === (incoming.fecha_vencimiento || '')
    ));

    if (!existing) {
      return [...entries, { ...incoming, id: buildId('stock'), organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd' }];
    }

    return entries.map((item) => item.id === existing.id ? { ...item, cantidad: Number(item.cantidad || 0) + Number(incoming.cantidad || 0) } : item);
  }, []);

  const saveMovimiento = () => {
    if (!validateMovimientoDraft()) return;

    const quantity = Number(movimientoDraft.cantidad);
    const sourceEntry = stock.find((item) => item.id === movimientoDraft.stock_entry_id) || null;
    const persisted = {
      id: movimientoDraft.id,
      organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd',
      material_id: movimientoDraft.material_id,
      tipo_movimiento: movimientoDraft.tipo_movimiento,
      cantidad: quantity,
      origen_tipo: movimientoDraft.tipo_movimiento === 'entrada' ? 'proveedor' : movimientoDraft.origen_tipo,
      origen_id: movimientoDraft.tipo_movimiento === 'entrada' ? 'Carga manual' : movimientoDraft.origen_id,
      destino_tipo: movimientoDraft.tipo_movimiento === 'traspaso'
        ? movimientoDraft.destino_tipo
        : movimientoDraft.tipo_movimiento === 'entrada'
          ? movimientoDraft.destino_tipo
          : movimientoDraft.tipo_movimiento === 'salida_servicio'
            ? 'servicio'
            : 'baja',
      destino_id: movimientoDraft.tipo_movimiento === 'traspaso'
        ? movimientoDraft.destino_id
        : movimientoDraft.tipo_movimiento === 'entrada'
          ? movimientoDraft.destino_id
          : movimientoDraft.tipo_movimiento === 'salida_servicio'
            ? movimientoDraft.servicio_id
            : 'descarte-controlado',
      servicio_id: movimientoDraft.tipo_movimiento === 'salida_servicio' ? movimientoDraft.servicio_id : null,
      motivo: movimientoDraft.motivo,
      responsable_id: movimientoDraft.responsable_id,
      fecha: movimientoDraft.fecha
    };

    setMovimientos((prev) => [persisted, ...prev]);
    setStock((prev) => {
      let next = [...prev];

      if (movimientoDraft.tipo_movimiento === 'entrada') {
        next = mergeStockEntry(next, {
          material_id: movimientoDraft.material_id,
          ubicacion_tipo: movimientoDraft.destino_tipo,
          base_id: movimientoDraft.destino_tipo === 'base' ? movimientoDraft.destino_id : null,
          vehiculo_id: movimientoDraft.destino_tipo === 'vehiculo' ? movimientoDraft.destino_id : null,
          bolso: movimientoDraft.destino_tipo === 'vehiculo' ? normalizeBolso(movimientoDraft.destino_bolso) : null,
          cantidad: quantity,
          lote: movimientoDraft.lote,
          fecha_vencimiento: movimientoDraft.fecha_vencimiento || null
        });
        return next;
      }

      if (!sourceEntry) return prev;

      next = next
        .map((item) => item.id === sourceEntry.id ? { ...item, cantidad: Number(item.cantidad || 0) - quantity } : item)
        .filter((item) => Number(item.cantidad || 0) > 0);

      if (movimientoDraft.tipo_movimiento === 'traspaso') {
        next = mergeStockEntry(next, {
          material_id: movimientoDraft.material_id,
          ubicacion_tipo: movimientoDraft.destino_tipo,
          base_id: movimientoDraft.destino_tipo === 'base' ? movimientoDraft.destino_id : null,
          vehiculo_id: movimientoDraft.destino_tipo === 'vehiculo' ? movimientoDraft.destino_id : null,
          bolso: movimientoDraft.destino_tipo === 'vehiculo' ? normalizeBolso(movimientoDraft.destino_bolso) : null,
          cantidad: quantity,
          lote: sourceEntry.lote,
          fecha_vencimiento: sourceEntry.fecha_vencimiento
        });
      }

      return next;
    });

    setMovimientoFormOpen(false);
  };

  return (
    <div className="view economato-screen economato-screen-full">
      <section className="content-grid economato-content-grid">
        <Panel className="span-12 economato-hero-panel" title="Economato" subtitle="Selector por móvil o base, con control de stock por bolso común, bolso RCP y ambulancia.">
          <div className="economato-hero-kpis">
            <div className="economato-kpi-card">
              <span className="economato-kpi-label">Móviles monitoreados</span>
              <strong className="economato-kpi-value"><Ambulance size={18} /> {summary.vehiculos}</strong>
            </div>
            <div className="economato-kpi-card">
              <span className="economato-kpi-label">Bases con stock</span>
              <strong className="economato-kpi-value"><Building2 size={18} /> {summary.bases}</strong>
            </div>
            <div className="economato-kpi-card">
              <span className="economato-kpi-label">Alertas visibles</span>
              <strong className="economato-kpi-value"><AlertTriangle size={18} /> {summary.alertas}</strong>
            </div>
            <div className="economato-kpi-card">
              <span className="economato-kpi-label">Materiales en catálogo</span>
              <strong className="economato-kpi-value"><Archive size={18} /> {summary.materiales}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="span-12" title="Selector de móvil o base" subtitle="Cada tarjeta resume vencimientos y stock crítico de esa ubicación.">
          <UbicacionSelector
            Tag={Tag}
            rows={locationCards}
            selectedKey={selectedLocationKey}
            onSelect={(key) => {
              setSelectedLocationKey(key);
              if (String(key).startsWith('vehiculo:')) setSelectedVehicleTab('comun');
            }}
            formatLocationType={(tipo) => tipo === 'vehiculo' ? 'Móvil' : 'Base'}
          />
        </Panel>

        <Panel
          className="span-12"
          title={selectedLocation?.tipo === 'vehiculo' ? `${selectedLocation.label} · ${selectedLocation.subtitle}` : `${selectedLocation?.label || 'Base'} · stock general`}
          subtitle={selectedLocation?.tipo === 'vehiculo' ? 'El stock se organiza por bolso común, bolso RCP y ambulancia.' : 'Las bases muestran el stock sin segmentación por bolsos.'}
        >
          {selectedLocation?.tipo === 'vehiculo' ? (
            <BolsoTabs tabs={vehicleTabCounts} activeTab={selectedVehicleTab} onChange={setSelectedVehicleTab} />
          ) : null}

          <MaterialStockList
            Button={Button}
            Tag={Tag}
            rows={visibleRows}
            selectedLabel={selectedLocation?.tipo === 'vehiculo'
              ? `${selectedLocation.label} · ${(ECONOMATO_BOLSO_OPTIONS.find((item) => item.id === selectedVehicleTab)?.label || 'Ambulancia')}`
              : `${selectedLocation?.label || 'Base'} · stock general`}
            onCreate={openCreateMaterial}
            onEditMaterial={openEditMaterial}
            onOpenMovimiento={openMovimientoForm}
            getExpiryMeta={getExpiryMeta}
          />
        </Panel>
      </section>

      {materialFormOpen ? (
        <MaterialForm
          Button={Button}
          draft={materialDraft}
          setDraft={setMaterialDraft}
          minimumValue={materialMinimumDraft}
          setMinimumValue={setMaterialMinimumDraft}
          formMode={materialFormMode}
          categoryOptions={ECONOMATO_CATEGORY_OPTIONS}
          errors={materialErrors}
          onClose={() => setMaterialFormOpen(false)}
          onSubmit={saveMaterial}
        />
      ) : null}

      {movimientoFormOpen ? (
        <MovimientoForm
          Button={Button}
          draft={movimientoDraft}
          setDraft={setMovimientoDraft}
          errors={movimientoErrors}
          movementTypes={ECONOMATO_MOVEMENT_TYPES}
          responsibleOptions={responsibleOptions}
          locationOptions={locationOptions}
          sourceEntryOptions={sourceEntryOptions}
          onClose={() => setMovimientoFormOpen(false)}
          onSubmit={saveMovimiento}
        />
      ) : null}
    </div>
  );
}
