import React from 'react';
import { AlertTriangle, CalendarClock, ClipboardCheck, FileText, Gauge, MapPin, Plus, ShieldCheck, Wrench } from 'lucide-react';

const TABS = [
  { key: 'datos_generales', label: 'Datos generales' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'mantenimiento', label: 'Mantenimiento' },
  { key: 'checklist', label: 'Checklist' }
];

const emptyDocumentoDraft = { tipo: 'VTV', numero: '', fecha_emision: '', fecha_vencimiento: '', documento_url: '' };
const emptyMantenimientoDraft = { tipo: 'preventivo', descripcion: '', fecha: '', kilometraje_al_momento: '', costo: '', proveedor: '' };
const emptyChecklistDraft = { item: '', obligatorio: true, presente: true, verificado_por: '' };

export default function VehiculoDetail({
  Button,
  Tag,
  vehicle,
  base,
  documentos,
  mantenimiento,
  checklist,
  loading,
  error,
  actionError,
  activeTab,
  onTabChange,
  onClose,
  onEdit,
  onStatusChange,
  onAddDocumento,
  onAddMantenimiento,
  onAddChecklistItem,
  getStatusVariant,
  getDocumentMeta,
  getDocumentAlertMeta,
  getServiceAlertMeta,
  formatCategoria,
  formatNumber
}) {
  const [showDocumentoForm, setShowDocumentoForm] = React.useState(false);
  const [showMantenimientoForm, setShowMantenimientoForm] = React.useState(false);
  const [showChecklistForm, setShowChecklistForm] = React.useState(false);
  const [documentoDraft, setDocumentoDraft] = React.useState(emptyDocumentoDraft);
  const [mantenimientoDraft, setMantenimientoDraft] = React.useState(emptyMantenimientoDraft);
  const [checklistDraft, setChecklistDraft] = React.useState(emptyChecklistDraft);

  React.useEffect(() => {
    setShowDocumentoForm(false);
    setShowMantenimientoForm(false);
    setShowChecklistForm(false);
    setDocumentoDraft(emptyDocumentoDraft);
    setMantenimientoDraft(emptyMantenimientoDraft);
    setChecklistDraft(emptyChecklistDraft);
  }, [vehicle?.id]);

  if (loading) {
    return (
      <div className="flotas-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de vehiculo">
        <div className="lot-wizard-overlay" onClick={onClose} />
        <div className="flotas-detail-panel">
          <div className="flotas-detail-header">
            <div>Cargando vehiculo...</div>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flotas-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de vehiculo">
        <div className="lot-wizard-overlay" onClick={onClose} />
        <div className="flotas-detail-panel">
          <div className="flotas-detail-header">
            <div>{error}</div>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) return null;

  const documentAlert = getDocumentAlertMeta(documentos);
  const serviceAlert = getServiceAlertMeta(vehicle);

  const handleAddDocumento = () => {
    if (!documentoDraft.numero || !documentoDraft.fecha_vencimiento) return;
    onAddDocumento(vehicle.id, documentoDraft);
    setDocumentoDraft(emptyDocumentoDraft);
    setShowDocumentoForm(false);
  };

  const handleAddMantenimiento = () => {
    if (!mantenimientoDraft.descripcion || !mantenimientoDraft.fecha) return;
    onAddMantenimiento(vehicle.id, mantenimientoDraft);
    setMantenimientoDraft(emptyMantenimientoDraft);
    setShowMantenimientoForm(false);
  };

  const handleAddChecklist = () => {
    if (!checklistDraft.item || !checklistDraft.verificado_por) return;
    onAddChecklistItem(vehicle.id, checklistDraft);
    setChecklistDraft(emptyChecklistDraft);
    setShowChecklistForm(false);
  };

  return (
    <div className="flotas-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de vehiculo">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="flotas-detail-panel">
        <div className="flotas-detail-header">
          <div className="flotas-detail-identity">
            <div className="flotas-detail-badge">{vehicle.numero_interno}</div>
            <div>
              <h2>{vehicle.marca} {vehicle.modelo}</h2>
              <p>{formatCategoria(vehicle.categoria)} · {vehicle.matricula}</p>
              <div className="flotas-detail-base">
                <MapPin size={16} />
                <span>{base?.nombre || 'Sin base'}{base?.departamento ? `, ${base.departamento}` : ''}</span>
              </div>
            </div>
          </div>
          <div className="flotas-detail-actions">
            <Tag variant={getStatusVariant(vehicle.estado_operativo)}>{vehicle.estado_operativo}</Tag>
            <Button variant="secondary" onClick={() => onEdit(vehicle.id)}>Editar</Button>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>

        {actionError ? (
          <div style={{ color: '#b91c1c', padding: '8px 20px' }}>{actionError}</div>
        ) : null}

        <div className="flotas-detail-tabs">
          {TABS.map((tab) => (
            <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => onTabChange(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flotas-detail-content">
          {activeTab === 'datos_generales' ? (
            <div className="flotas-detail-grid">
              <section className="flotas-detail-card">
                <div className="flotas-section-title">
                  <Gauge size={18} />
                  <span>Ficha del vehiculo</span>
                </div>
                <div className="flotas-kv-list">
                  <div><span>id</span><strong>{vehicle.id}</strong></div>
                  <div><span>numero_interno</span><strong>{vehicle.numero_interno || '—'}</strong></div>
                  <div><span>matricula</span><strong>{vehicle.matricula || '—'}</strong></div>
                  <div><span>marca</span><strong>{vehicle.marca || '—'}</strong></div>
                  <div><span>modelo</span><strong>{vehicle.modelo || '—'}</strong></div>
                  <div><span>anio</span><strong>{vehicle.anio ?? '—'}</strong></div>
                  <div><span>categoria</span><strong>{vehicle.categoria || '—'}</strong></div>
                  <div><span>modalidad</span><strong>{vehicle.modalidad || 'Sin dato'}</strong></div>
                  <div><span>es_backup</span><strong>{vehicle.es_backup ? 'true' : 'false'}</strong></div>
                  <div><span>base_id</span><strong>{vehicle.base_id || '—'}</strong></div>
                  <div><span>altura_cm</span><strong>{vehicle.altura_cm ?? '—'}</strong></div>
                  <div><span>capacidad_camilla_articulada</span><strong>{vehicle.capacidad_camilla_articulada ? 'true' : 'false'}</strong></div>
                  <div><span>kilometraje</span><strong>{formatNumber(vehicle.kilometraje)}</strong></div>
                  <div><span>proximo_service_km</span><strong>{formatNumber(vehicle.proximo_service_km)}</strong></div>
                </div>
              </section>

              <section className="flotas-detail-card">
                <div className="flotas-section-title">
                  <ShieldCheck size={18} />
                  <span>Estado operativo</span>
                </div>
                <div className="flotas-status-editor">
                  <select value={vehicle.estado_operativo} onChange={(event) => onStatusChange(vehicle.id, event.target.value)}>
                    <option value="disponible">disponible</option>
                    <option value="en_servicio">en_servicio</option>
                    <option value="en_base">en_base</option>
                    <option value="mantenimiento">mantenimiento</option>
                    <option value="fuera_de_servicio">fuera_de_servicio</option>
                  </select>
                  <div className={`flotas-banner ${documentAlert.variant}`}>
                    {documentAlert.hasAlert ? <AlertTriangle size={16} /> : <CalendarClock size={16} />}
                    <span>{documentAlert.label}</span>
                  </div>
                  <div className={`flotas-banner ${serviceAlert.variant}`}>
                    <Wrench size={16} />
                    <span>{serviceAlert.label}</span>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'documentos' ? (
            <section className="flotas-detail-card">
              <div className="flotas-section-title flotas-section-title-spread">
                <div className="flotas-inline-title">
                  <FileText size={18} />
                  <span>Documentos</span>
                </div>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowDocumentoForm((prev) => !prev)}>Cargar nuevo documento</Button>
              </div>

              {showDocumentoForm ? (
                <div className="flotas-inline-form">
                  <select value={documentoDraft.tipo} onChange={(event) => setDocumentoDraft((prev) => ({ ...prev, tipo: event.target.value }))}>
                    <option value="VTV">VTV</option>
                    <option value="seguro">seguro</option>
                    <option value="habilitacion_MSP">habilitacion_MSP</option>
                    <option value="matafuego">matafuego</option>
                  </select>
                  <input placeholder="Numero" value={documentoDraft.numero} onChange={(event) => setDocumentoDraft((prev) => ({ ...prev, numero: event.target.value }))} />
                  <input type="date" value={documentoDraft.fecha_emision} onChange={(event) => setDocumentoDraft((prev) => ({ ...prev, fecha_emision: event.target.value }))} />
                  <input type="date" value={documentoDraft.fecha_vencimiento} onChange={(event) => setDocumentoDraft((prev) => ({ ...prev, fecha_vencimiento: event.target.value }))} />
                  <input placeholder="documento_url" value={documentoDraft.documento_url} onChange={(event) => setDocumentoDraft((prev) => ({ ...prev, documento_url: event.target.value }))} />
                  <div className="flotas-inline-actions">
                    <Button variant="ghost" onClick={() => setShowDocumentoForm(false)}>Cancelar</Button>
                    <Button onClick={handleAddDocumento}>Guardar documento</Button>
                  </div>
                </div>
              ) : null}

              <div className="flotas-detail-list">
                {documentos.map((item) => {
                  const meta = getDocumentMeta(item.fecha_vencimiento);
                  return (
                    <article key={item.id} className="flotas-doc-card">
                      <div className="flotas-doc-head">
                        <strong>{item.tipo}</strong>
                        <Tag variant={meta.variant}>{meta.label}</Tag>
                      </div>
                      <div className="flotas-doc-grid">
                        <span>Numero</span><strong>{item.numero}</strong>
                        <span>Fecha emision</span><strong>{item.fecha_emision || 'Sin dato'}</strong>
                        <span>Fecha vencimiento</span><strong>{item.fecha_vencimiento || 'Sin dato'}</strong>
                        <span>Documento</span><strong>{item.documento_url || 'Sin adjunto'}</strong>
                      </div>
                    </article>
                  );
                })}
                {!documentos.length ? <div className="flotas-empty-inline">No hay documentos cargados.</div> : null}
              </div>
            </section>
          ) : null}

          {activeTab === 'mantenimiento' ? (
            <section className="flotas-detail-card">
              <div className="flotas-section-title flotas-section-title-spread">
                <div className="flotas-inline-title">
                  <Wrench size={18} />
                  <span>Historial de mantenimiento</span>
                </div>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowMantenimientoForm((prev) => !prev)}>Registrar mantenimiento</Button>
              </div>

              {showMantenimientoForm ? (
                <div className="flotas-inline-form">
                  <select value={mantenimientoDraft.tipo} onChange={(event) => setMantenimientoDraft((prev) => ({ ...prev, tipo: event.target.value }))}>
                    <option value="preventivo">preventivo</option>
                    <option value="correctivo">correctivo</option>
                  </select>
                  <input placeholder="Descripcion" value={mantenimientoDraft.descripcion} onChange={(event) => setMantenimientoDraft((prev) => ({ ...prev, descripcion: event.target.value }))} />
                  <input type="date" value={mantenimientoDraft.fecha} onChange={(event) => setMantenimientoDraft((prev) => ({ ...prev, fecha: event.target.value }))} />
                  <input type="number" placeholder="Kilometraje" value={mantenimientoDraft.kilometraje_al_momento} onChange={(event) => setMantenimientoDraft((prev) => ({ ...prev, kilometraje_al_momento: event.target.value }))} />
                  <input type="number" placeholder="Costo" value={mantenimientoDraft.costo} onChange={(event) => setMantenimientoDraft((prev) => ({ ...prev, costo: event.target.value }))} />
                  <input placeholder="Proveedor" value={mantenimientoDraft.proveedor} onChange={(event) => setMantenimientoDraft((prev) => ({ ...prev, proveedor: event.target.value }))} />
                  <div className="flotas-inline-actions">
                    <Button variant="ghost" onClick={() => setShowMantenimientoForm(false)}>Cancelar</Button>
                    <Button onClick={handleAddMantenimiento}>Guardar mantenimiento</Button>
                  </div>
                </div>
              ) : null}

              <div className="flotas-detail-list">
                {mantenimiento.map((item) => (
                  <article key={item.id} className="flotas-doc-card">
                    <div className="flotas-doc-head">
                      <strong>{item.tipo}</strong>
                      <Tag variant="warning">{item.fecha}</Tag>
                    </div>
                    <div className="flotas-doc-grid">
                      <span>Descripcion</span><strong>{item.descripcion}</strong>
                      <span>Kilometraje al momento</span><strong>{formatNumber(item.kilometraje_al_momento)}</strong>
                      <span>Costo</span><strong>{item.costo === null || item.costo === undefined ? '—' : `$ ${formatNumber(item.costo)}`}</strong>
                      <span>Proveedor</span><strong>{item.proveedor || 'Sin dato'}</strong>
                    </div>
                  </article>
                ))}
                {!mantenimiento.length ? <div className="flotas-empty-inline">No hay mantenimientos registrados.</div> : null}
              </div>
            </section>
          ) : null}

          {activeTab === 'checklist' ? (
            <section className="flotas-detail-card">
              <div className="flotas-section-title flotas-section-title-spread">
                <div className="flotas-inline-title">
                  <ClipboardCheck size={18} />
                  <span>Checklist de equipamiento</span>
                </div>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowChecklistForm((prev) => !prev)}>Agregar item</Button>
              </div>

              {showChecklistForm ? (
                <div className="flotas-inline-form">
                  <input placeholder="Item" value={checklistDraft.item} onChange={(event) => setChecklistDraft((prev) => ({ ...prev, item: event.target.value }))} />
                  <label className="flotas-inline-check">
                    <input type="checkbox" checked={Boolean(checklistDraft.obligatorio)} onChange={(event) => setChecklistDraft((prev) => ({ ...prev, obligatorio: event.target.checked }))} />
                    <span>Obligatorio</span>
                  </label>
                  <label className="flotas-inline-check">
                    <input type="checkbox" checked={Boolean(checklistDraft.presente)} onChange={(event) => setChecklistDraft((prev) => ({ ...prev, presente: event.target.checked }))} />
                    <span>Presente</span>
                  </label>
                  <input placeholder="Verificado por" value={checklistDraft.verificado_por} onChange={(event) => setChecklistDraft((prev) => ({ ...prev, verificado_por: event.target.value }))} />
                  <div className="flotas-inline-actions">
                    <Button variant="ghost" onClick={() => setShowChecklistForm(false)}>Cancelar</Button>
                    <Button onClick={handleAddChecklist}>Guardar item</Button>
                  </div>
                </div>
              ) : null}

              {/* El backend no expone un endpoint PATCH para items de checklist ya
                  existentes (solo POST para crear y GET para listar), asi que los
                  items cargados se muestran de solo lectura. */}
              <div className="flotas-checklist-list">
                {checklist.map((item) => (
                  <article key={item.id} className={`flotas-checklist-card ${item.presente ? 'ok' : 'missing'}`}>
                    <div className="flotas-checklist-head">
                      <div>
                        <strong>{item.item}</strong>
                        <div className="flotas-subtle">{item.obligatorio ? 'Obligatorio' : 'Opcional'}</div>
                      </div>
                      <Tag variant={item.presente ? 'success' : 'danger'}>{item.presente ? 'presente' : 'faltante'}</Tag>
                    </div>
                    <div className="flotas-checklist-controls">
                      <div className="flotas-subtle">Verificado por: {item.verificado_por || 'Sin dato'}</div>
                      <div className="flotas-subtle">Ultima verificacion: {item.fecha_verificacion || 'Sin fecha'}</div>
                    </div>
                  </article>
                ))}
                {!checklist.length ? <div className="flotas-empty-inline">No hay items cargados.</div> : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
