import React from 'react';
import { AlertTriangle, CalendarClock, ClipboardList, HeartPulse, History, MapPin, Wrench } from 'lucide-react';

export default function EquipoDetail({
  Button,
  Tag,
  equipo,
  revisiones,
  responsableOptions,
  revisionDraft,
  setRevisionDraft,
  revisionErrors,
  revisionFormOpen,
  onOpenRevisionForm,
  onCloseRevisionForm,
  onSubmitRevision,
  onClose,
  onEdit,
  getStatusVariant,
  getServiceMeta,
  formatLocationLabel
}) {
  if (!equipo) return null;

  const serviceMeta = getServiceMeta(equipo.fecha_proximo_service);

  return (
    <div className="equipos-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de equipo biomédico">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="equipos-detail-panel">
        <div className="equipos-detail-header">
          <div className="equipos-detail-identity">
            <div className="equipos-detail-badge"><HeartPulse size={34} /></div>
            <div>
              <h2>{equipo.equipo}</h2>
              <p>{equipo.marca} · {equipo.modelo}</p>
              <div className="equipos-detail-base">
                <MapPin size={16} />
                <span>{formatLocationLabel(equipo)}</span>
              </div>
            </div>
          </div>
          <div className="equipos-detail-actions">
            <Tag variant={getStatusVariant(equipo.estado)}>{equipo.estado}</Tag>
            <Tag variant={serviceMeta.variant}>{serviceMeta.label}</Tag>
            <Button variant="secondary" onClick={() => onEdit(equipo.id)}>Editar</Button>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>

        <div className="equipos-detail-content">
          <section className="equipos-detail-card">
            <div className="equipos-section-title"><ClipboardList size={18} /> Datos generales</div>
            <div className="equipos-kv-list">
              <div><span>Equipo</span><strong>{equipo.equipo}</strong></div>
              <div><span>Marca</span><strong>{equipo.marca}</strong></div>
              <div><span>Modelo</span><strong>{equipo.modelo}</strong></div>
              <div><span>Número de serie</span><strong>{equipo.numero_serie}</strong></div>
              <div><span>Ubicación tipo</span><strong>{equipo.ubicacion_tipo}</strong></div>
              <div><span>Ubicación</span><strong>{formatLocationLabel(equipo)}</strong></div>
              <div><span>Fecha última revisión</span><strong>{equipo.fecha_ultima_revision || 'Sin dato'}</strong></div>
              <div><span>Próximo service</span><strong><Tag variant={serviceMeta.variant}>{equipo.fecha_proximo_service || 'Sin fecha'}</Tag></strong></div>
              <div><span>Estado</span><strong><Tag variant={getStatusVariant(equipo.estado)}>{equipo.estado}</Tag></strong></div>
              <div className="span-2"><span>Observación</span><strong>{equipo.observacion || 'Sin observaciones'}</strong></div>
            </div>
            {equipo.observacion ? (
              <div className="equipos-observacion-banner">
                <AlertTriangle size={16} />
                <span>{equipo.observacion}</span>
              </div>
            ) : null}
          </section>

          <section className="equipos-detail-card">
            <div className="equipos-section-title-row">
              <div className="equipos-section-title"><History size={18} /> Historial de revisiones</div>
              <Button variant="secondary" onClick={revisionFormOpen ? onCloseRevisionForm : onOpenRevisionForm}>
                {revisionFormOpen ? 'Cancelar revisión' : 'Registrar revisión'}
              </Button>
            </div>

            {revisionFormOpen ? (
              <div className="equipos-inline-form-card">
                <div className="equipos-inline-form">
                  <label>
                    <span>Fecha revisión</span>
                    <input
                      type="date"
                      value={revisionDraft.fecha_revision}
                      onChange={(event) => setRevisionDraft((prev) => ({ ...prev, fecha_revision: event.target.value }))}
                    />
                  </label>

                  <label>
                    <span>Próximo service</span>
                    <input
                      type="date"
                      value={revisionDraft.fecha_proximo_service}
                      onChange={(event) => setRevisionDraft((prev) => ({ ...prev, fecha_proximo_service: event.target.value }))}
                    />
                    {revisionErrors.fecha_proximo_service ? <small>{revisionErrors.fecha_proximo_service}</small> : null}
                  </label>

                  <label>
                    <span>Registrado por</span>
                    <select
                      value={revisionDraft.registrado_por}
                      onChange={(event) => setRevisionDraft((prev) => ({ ...prev, registrado_por: event.target.value }))}
                    >
                      <option value="">Seleccionar responsable</option>
                      {responsableOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                    {revisionErrors.registrado_por ? <small>{revisionErrors.registrado_por}</small> : null}
                  </label>

                  <label className="span-3">
                    <span>Observación</span>
                    <textarea
                      value={revisionDraft.observacion}
                      onChange={(event) => setRevisionDraft((prev) => ({ ...prev, observacion: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="equipos-inline-form-footer">
                  <Button variant="ghost" onClick={onCloseRevisionForm}>Cancelar</Button>
                  <Button onClick={onSubmitRevision}>Guardar revisión</Button>
                </div>
              </div>
            ) : null}

            <div className="equipos-history-list">
              {revisiones.map((item) => {
                const itemMeta = getServiceMeta(item.fecha_proximo_service);
                const responsable = responsableOptions.find((option) => option.id === item.registrado_por);
                return (
                  <article key={item.id} className="equipos-history-card">
                    <div className="equipos-history-top">
                      <strong><CalendarClock size={16} /> {item.fecha_revision}</strong>
                      <Tag variant={itemMeta.variant}>{itemMeta.shortLabel}</Tag>
                    </div>
                    <div className="equipos-history-meta">
                      <span><Wrench size={14} /> Próximo service: {item.fecha_proximo_service}</span>
                      <span><MapPin size={14} /> Registrado por: {responsable?.label || item.registrado_por || 'Sin dato'}</span>
                    </div>
                    <p>{item.observacion || 'Sin observaciones.'}</p>
                  </article>
                );
              })}
              {!revisiones.length ? <div className="equipos-empty">No hay revisiones registradas para este equipo.</div> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
