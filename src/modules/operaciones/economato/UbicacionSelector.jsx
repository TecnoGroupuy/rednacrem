import React from 'react';
import { AlertTriangle, Ambulance, Archive, Building2, ChevronRight, Package2 } from 'lucide-react';

export default function UbicacionSelector({
  Tag,
  rows,
  selectedKey,
  onSelect,
  formatLocationType
}) {
  return (
    <div className="economato-selector-grid">
      {rows.map((row) => {
        const isVehicle = row.tipo === 'vehiculo';
        const LocationIcon = isVehicle ? Ambulance : Building2;

        return (
          <article
            key={row.key}
            className={`economato-selector-card ${selectedKey === row.key ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(row.key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(row.key);
              }
            }}
          >
            <div className="economato-selector-top">
              <div className="economato-selector-identity">
                <div className={`economato-selector-icon ${isVehicle ? 'vehicle' : 'base'}`}>
                  <LocationIcon size={20} />
                </div>
                <div>
                  <div className="economato-selector-title">{row.nombre}</div>
                  <div className="economato-subtle">{formatLocationType(row.tipo)} · {row.subtitulo}</div>
                </div>
              </div>
              <ChevronRight size={18} className="economato-selector-arrow" />
            </div>

            <div className="economato-card-meta">
              <Tag variant={row.alertLevel === 'danger' ? 'danger' : row.alertLevel === 'warning' ? 'warning' : 'success'}>
                {row.alertLabel}
              </Tag>
              {isVehicle ? <Tag variant="info">{row.containersCount} contenedores</Tag> : <Tag variant="ghost">Sin bolsos</Tag>}
            </div>

            <div className="economato-selector-kpis">
              <div>
                <span>Materiales</span>
                <strong><Package2 size={14} /> {row.materialCount}</strong>
              </div>
              <div>
                <span>Unidades</span>
                <strong><Archive size={14} /> {row.totalCantidad}</strong>
              </div>
              <div>
                <span>Alertas</span>
                <strong><AlertTriangle size={14} /> {row.alertCount}</strong>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
