import React from 'react';
import { X, ChevronLeft, ChevronRight, Check, XCircle, Upload, Download, ZoomIn, ZoomOut, FileText } from 'lucide-react';
import './documentViewerModal.css';

const ESTADO_LABELS = { falta: 'Falta', pendiente: 'Cargado ✓ · pendiente de revisión', rechazado: 'Rechazado', validado: 'Validado' };
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DOUBLE_CLICK_ZOOM = 2.5;

// Visor de documentos a pantalla completa, dentro de la pagina (sin
// window.open a una pestaña nueva, a diferencia del "Ver" viejo). Imagen
// con zoom (rueda, pellizco con dos punteros, doble click) y PDF incrustado
// via <object>/<iframe> con la blob URL ya cacheada por el padre (mismo
// contenido que la miniatura -- no se vuelve a pedir el archivo).
export default function DocumentViewerModal({
  items,
  index,
  onIndexChange,
  onClose,
  onValidar,
  onRechazar,
  onReemplazar,
  revisando,
  revisarError
}) {
  const item = items[index] || null;
  const [zoom, setZoom] = React.useState(MIN_ZOOM);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectMotivo, setRejectMotivo] = React.useState('');
  const stageRef = React.useRef(null);
  const pointersRef = React.useRef(new Map());
  const gestureRef = React.useRef(null);

  React.useEffect(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setRejectOpen(false);
    setRejectMotivo('');
  }, [item?.id]);

  React.useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (event.key === 'ArrowRight' && index < items.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, items.length, onIndexChange, onClose]);

  const isImage = (item?.content?.contentType || '').startsWith('image/');
  const isPdf = (item?.content?.contentType || '').includes('pdf');

  const clampPan = (nextPan, nextZoom) => {
    const stage = stageRef.current;
    if (!stage) return nextPan;
    const rect = stage.getBoundingClientRect();
    // Aproximacion: el margen de paneo disponible crece con el zoom --
    // suficiente para no perder la imagen de vista sin tener que medir el
    // tamaño natural real (la imagen ya esta en object-fit:contain).
    const maxX = (rect.width * (nextZoom - 1)) / 2;
    const maxY = (rect.height * (nextZoom - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, nextPan.x)),
      y: Math.min(maxY, Math.max(-maxY, nextPan.y))
    };
  };

  const applyZoom = (nextZoomRaw) => {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoomRaw));
    setZoom(nextZoom);
    setPan((prev) => clampPan(prev, nextZoom));
  };

  const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const handlePointerDown = (event) => {
    if (!isImage) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      gestureRef.current = { kind: 'pan', startPan: pan, startPointer: { x: event.clientX, y: event.clientY } };
    } else if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      gestureRef.current = { kind: 'pinch', startDist: distanceBetween(pts[0], pts[1]), startZoom: zoom };
    }
  };

  const handlePointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    if (!gesture) return;
    if (gesture.kind === 'pan' && pointersRef.current.size === 1 && zoom > 1) {
      const dx = event.clientX - gesture.startPointer.x;
      const dy = event.clientY - gesture.startPointer.y;
      setPan(clampPan({ x: gesture.startPan.x + dx, y: gesture.startPan.y + dy }, zoom));
    } else if (gesture.kind === 'pinch' && pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const dist = distanceBetween(pts[0], pts[1]);
      if (gesture.startDist > 0) applyZoom(gesture.startZoom * (dist / gesture.startDist));
    }
  };

  const endPointer = (event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) gestureRef.current = null;
    else if (pointersRef.current.size === 1) {
      const [[, point]] = pointersRef.current;
      gestureRef.current = { kind: 'pan', startPan: pan, startPointer: point };
    }
  };

  // Listener nativo, NO el prop onWheel de React: los synthetic handlers de
  // onWheel/onTouchStart son pasivos por default desde React 17 -- un
  // preventDefault() ahi adentro no hace nada (y tira el warning "Unable to
  // preventDefault inside passive event listener invocation" en consola),
  // asi que el scroll de la pagina no se frena de verdad al hacer zoom con
  // la rueda sobre la imagen.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !isImage) return undefined;
    const handleWheel = (event) => {
      event.preventDefault();
      applyZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2));
    };
    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [isImage, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDoubleClick = () => {
    if (!isImage) return;
    if (zoom > 1) {
      setZoom(MIN_ZOOM);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(DOUBLE_CLICK_ZOOM);
    }
  };

  const handleDescargar = () => {
    if (!item.content?.url) return;
    const a = document.createElement('a');
    a.href = item.content.url;
    a.download = item.nombreArchivo || 'documento';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const confirmRechazar = () => {
    if (!rejectMotivo.trim()) return;
    onRechazar(item.id, rejectMotivo.trim());
  };

  if (!item) return null;

  return (
    <div className="dvm-overlay" role="dialog" aria-modal="true" aria-label={item.label}>
      <div className="dvm-header">
        <span className="dvm-title">{item.label}</span>
        <button type="button" className="dvm-close" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <div className="dvm-body">
        <div className="dvm-main">
          <button
            type="button"
            className="dvm-nav dvm-nav-prev"
            onClick={() => onIndexChange(index - 1)}
            disabled={index === 0}
            aria-label="Documento anterior"
          >
            <ChevronLeft size={22} />
          </button>

          <div
            className="dvm-stage"
            ref={stageRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onDoubleClick={handleDoubleClick}
          >
            {!item.content || item.content.status === 'loading' ? (
              <p className="dvm-status">Cargando documento...</p>
            ) : item.content.status === 'error' ? (
              <p className="dvm-status dvm-status-error">No se pudo cargar el documento.</p>
            ) : isPdf ? (
              <object data={item.content.url} type="application/pdf" className="dvm-pdf">
                <iframe src={item.content.url} title={item.label} className="dvm-pdf" />
              </object>
            ) : isImage ? (
              <img
                src={item.content.url}
                alt={item.label}
                className="dvm-image"
                draggable={false}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              />
            ) : (
              <div className="dvm-status">
                <FileText size={40} />
                <span>{item.nombreArchivo}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="dvm-nav dvm-nav-next"
            onClick={() => onIndexChange(index + 1)}
            disabled={index === items.length - 1}
            aria-label="Documento siguiente"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {isImage ? (
          <div className="dvm-zoom-row">
            <button type="button" className="dvm-zoom-button" onClick={() => applyZoom(zoom - 0.3)} aria-label="Alejar">
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => applyZoom(Number(event.target.value))}
              className="dvm-zoom-slider"
            />
            <button type="button" className="dvm-zoom-button" onClick={() => applyZoom(zoom + 0.3)} aria-label="Acercar">
              <ZoomIn size={16} />
            </button>
          </div>
        ) : null}

        <div className="dvm-panel">
          <div className="dvm-panel-head">
            <span className="dvm-panel-label">{item.label}</span>
            <span className={`rrhh-doc-tab-badge rrhh-doc-tab-badge-${item.estado}`}>{ESTADO_LABELS[item.estado]}</span>
          </div>
          {item.motivoRechazo ? <p className="dvm-panel-motivo">Motivo: {item.motivoRechazo}</p> : null}
          {item.numero ? <p className="dvm-panel-meta">{item.numeroLabel || 'Número'}: {item.numero}</p> : null}
          {item.fechaVencimientoDisplay ? <p className="dvm-panel-meta">Vencimiento: {item.fechaVencimientoDisplay}</p> : null}
          {item.nombreArchivo ? <p className="dvm-panel-meta dvm-panel-filename">{item.nombreArchivo}</p> : null}

          {revisarError ? <div className="rrhh-form-error" style={{ margin: 0 }}>{revisarError}</div> : null}

          {rejectOpen ? (
            <div className="dvm-reject-form">
              <input
                type="text"
                placeholder="Motivo del rechazo (obligatorio)"
                value={rejectMotivo}
                onChange={(event) => setRejectMotivo(event.target.value)}
              />
              <div className="rrhh-inline-actions">
                <button type="button" className="rrhh-doc-action-button" onClick={() => setRejectOpen(false)}>Cancelar</button>
                <button
                  type="button"
                  className="rrhh-doc-action-button"
                  onClick={confirmRechazar}
                  disabled={!rejectMotivo.trim() || revisando === item.id}
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          ) : (
            <div className="dvm-panel-actions">
              {item.estado !== 'validado' ? (
                <button type="button" className="dvm-action-button dvm-action-validar" onClick={() => onValidar(item.id)} disabled={revisando === item.id}>
                  <Check size={16} /> Validar
                </button>
              ) : null}
              <button type="button" className="dvm-action-button dvm-action-rechazar" onClick={() => { setRejectOpen(true); setRejectMotivo(''); }} disabled={revisando === item.id}>
                <XCircle size={16} /> Rechazar
              </button>
              <button type="button" className="dvm-action-button" onClick={() => onReemplazar(item)}>
                <Upload size={16} /> Reemplazar
              </button>
              <button type="button" className="dvm-action-button" onClick={handleDescargar}>
                <Download size={16} /> Descargar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
