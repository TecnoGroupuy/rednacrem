import React from 'react';
import { AlertTriangle, Boxes, CalendarClock, Edit3, Eye, PackageOpen } from 'lucide-react';

const CATEGORY_LABELS = {
  descartable: 'Descartable',
  medicamento: 'Medicamento',
  oxigeno_gases: 'Oxígeno y gases',
  via_aerea: 'Vía aérea',
  trauma: 'Trauma',
  equipo_biomedico: 'Equipo biomédico'
};

export default function MaterialStockList({
  Button,
  Tag,
  rows,
  selectedLabel,
  onCreate,
  onEditMaterial,
  onOpenMovimiento,
  getExpiryMeta
}) {
  return (
    <div className="economato-stack">
      <div className="economato-toolbar">
        <div>
          <div className="economato-section-heading">Stock visible</div>
          <div className="economato-subtle">{selectedLabel}</div>
        </div>
        <div className="economato-toolbar-actions">
          <Button variant="ghost" icon={<Edit3 size={16} />} onClick={onEditMaterial}>Editar catálogo</Button>
          <Button variant="secondary" icon={<PackageOpen size={16} />} onClick={onOpenMovimiento}>Registrar movimiento</Button>
          <Button onClick={onCreate}>Nuevo material</Button>
        </div>
      </div>

      {rows.length ? (
        <div className="economato-material-grid">
          {rows.map((row) => {
            const expiryMeta = getExpiryMeta(row.fecha_vencimiento);
            return (
              <article key={row.stock_id} className={`economato-material-card ${expiryMeta.level}`}>
                <div className="economato-card-top">
                  <div>
                    <div className="economato-card-title">{row.nombre}</div>
                    <div className="economato-subtle">{CATEGORY_LABELS[row.categoria] || row.categoria}</div>
                  </div>
                    <div className="economato-card-actions">
                    <Button variant="ghost" icon={<Eye size={16} />} onClick={() => onOpenMovimiento(row.id)}>Mover</Button>
                  </div>
                </div>

                <div className="economato-card-meta">
                  <Tag variant="info">{row.unidad_medida}</Tag>
                  <Tag variant={expiryMeta.variant}>{expiryMeta.label}</Tag>
                  {row.requiere_control_vencimiento ? <Tag variant="warning">Control de vencimiento</Tag> : null}
                </div>

                <div className="economato-kv-grid">
                  <div className="economato-kv-item">
                    <span>Cantidad actual</span>
                    <strong className="economato-inline-strong"><Boxes size={14} /> {row.cantidad}</strong>
                  </div>
                  <div className="economato-kv-item">
                    <span>Lote</span>
                    <strong>{row.lote || 'Sin lote'}</strong>
                  </div>
                </div>

                {expiryMeta.level !== 'ok' ? (
                  <div className="economato-warning-banner">
                    <AlertTriangle size={16} />
                    <span>{row.nombre} {expiryMeta.level === 'danger' ? 'está vencido' : 'vence pronto'} en este contenedor.</span>
                  </div>
                ) : (
                  <div className="economato-ok-banner">
                    <CalendarClock size={16} />
                    <span>Sin alertas de vencimiento en este contenedor.</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="economato-empty">No hay materiales cargados para esta ubicación/contenedor.</div>
      )}
    </div>
  );
}
