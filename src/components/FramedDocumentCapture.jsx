import React from 'react';
import { Camera, Image as ImageIcon, FileText, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import './FramedDocumentCapture.css';

// Captura con encuadre para el formulario publico de ficha (CompletarFichaScreen.jsx)
// -- sin librerias externas. Dos variantes de marco: "card" (cedula, carne de
// salud, libreta -- tarjeta ISO/IEC 7810 ID-1, 85.6x54mm, apaisada) y "a4"
// (titulo, registro MSP, cursos -- hoja A4 vertical, 210x297mm). El marco se
// dibuja por CSS (aspect-ratio) sobre el video/la imagen; el recorte real
// (al area exacta del marco, en pixeles nativos) se calcula en JS recien al
// confirmar, con getBoundingClientRect().
//
// Tres caminos para conseguir el archivo:
// 1) Camara en vivo (getUserMedia, facingMode "environment") con el marco
//    superpuesto y el fondo oscurecido -- al capturar, se recorta el frame
//    actual del <video> exactamente al area del marco.
// 2) Galeria: se elige una imagen con el picker nativo y se la ajusta sobre
//    el mismo marco (arrastrar para mover, pellizcar o la rueda/slider para
//    hacer zoom) antes de recortar.
// 3) PDF (solo si allowPdf): se sube tal cual, sin recorte -- mismo criterio
//    que el DocumentoCapture viejo para documentos tipo "hoja".
// Si getUserMedia no esta disponible o el permiso de camara es denegado, se
// cae al input de archivo nativo (mismo flujo que la galeria) sin romper el
// flujo -- nunca se bloquea la carga por falta de camara.
const OUTPUT_MAX_SIDE = 1600;
const OUTPUT_QUALITY = 0.85;
const DOCUMENTO_MAX_BYTES = 4 * 1024 * 1024;
const DOCUMENTO_MAX_BYTES_MESSAGE = 'El archivo supera 4 MB. Si es un PDF escaneado, probá sacarle una foto al documento.';

const FRAME_RATIO = { card: 85.6 / 54, a4: 210 / 297 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

async function decodeImageFile(file) {
  if (typeof createImageBitmap !== 'function') throw new Error('no-support');
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await createImageBitmap(file);
  }
}

// Recorta [sx,sy,sWidth,sHeight] (en pixeles nativos de `source`, un
// <video>/ImageBitmap) a un canvas de salida con el lado mayor en
// OUTPUT_MAX_SIDE, respetando `ratio` (ancho/alto).
function cropToCanvas(source, sx, sy, sWidth, sHeight, ratio) {
  const outW = ratio >= 1 ? OUTPUT_MAX_SIDE : Math.round(OUTPUT_MAX_SIDE * ratio);
  const outH = ratio >= 1 ? Math.round(OUTPUT_MAX_SIDE / ratio) : OUTPUT_MAX_SIDE;
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, outW, outH);
  return canvas;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Mapea el rect del marco (CSS px, relativo a viewport) a coordenadas
// nativas de un <video> mostrado con object-fit:cover dentro de `stageRect`.
function frameRectToVideoCoords(video, stageRect, frameRect) {
  const coverScale = Math.max(stageRect.width / video.videoWidth, stageRect.height / video.videoHeight);
  const displayedW = video.videoWidth * coverScale;
  const displayedH = video.videoHeight * coverScale;
  const clipX = (displayedW - stageRect.width) / 2;
  const clipY = (displayedH - stageRect.height) / 2;
  const frameLeftInStage = frameRect.left - stageRect.left;
  const frameTopInStage = frameRect.top - stageRect.top;
  const sx = (frameLeftInStage + clipX) / coverScale;
  const sy = (frameTopInStage + clipY) / coverScale;
  const sWidth = frameRect.width / coverScale;
  const sHeight = frameRect.height / coverScale;
  return { sx, sy, sWidth, sHeight };
}

export default function FramedDocumentCapture({
  title,
  frame = 'card',
  allowPdf = true,
  instruccion,
  onCapture,
  onClose,
  busy,
  uploadError,
  onPickAnother
}) {
  const ratio = FRAME_RATIO[frame] || FRAME_RATIO.card;
  // choice -> camera | gallery-pick (input nativo) -> camera-preview |
  // gallery-adjust -> pdf-preview. camera-unavailable es el fallback si
  // getUserMedia no existe o el permiso es denegado.
  const [mode, setMode] = React.useState('choice');
  // El stream arranca antes de que el <video> tenga metadata real (ancho/
  // alto nativos) -- sin esto, un tap al obturador apenas se abre la camara
  // caia en el guard de handleShutter (!video.videoWidth) y no hacia nada,
  // sin ningun indicio para quien lo toco.
  const [videoReady, setVideoReady] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [pdfInfo, setPdfInfo] = React.useState(null);
  // De donde vino el resultado mostrado en camera-preview -- define a donde
  // vuelve "Sacar otra": a la camara en vivo, o al ajuste de la MISMA imagen
  // de galeria ya decodificada (evita tener que volver a elegir el archivo).
  const [previewSource, setPreviewSource] = React.useState('camera');

  const stageRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const frameGuideRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const resultCanvasRef = React.useRef(null);
  const contentTypeRef = React.useRef('');
  const fileNameRef = React.useRef('documento');

  // --- Ajuste de galeria (pan/zoom sobre el mismo marco) ---
  const [galleryImg, setGalleryImg] = React.useState(null); // { bitmap, url, naturalWidth, naturalHeight }
  const [zoom, setZoom] = React.useState(MIN_ZOOM);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const baseScaleRef = React.useRef(1);
  const pointersRef = React.useRef(new Map());
  const gestureRef = React.useRef(null); // { kind:'pan', startPan, startPointer } | { kind:'pinch', startDist, startZoom }

  React.useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (galleryImg?.url) URL.revokeObjectURL(galleryImg.url);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setErrorMessage('');
    setVideoReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMode('camera-unavailable');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      streamRef.current = stream;
      setMode('camera');
      // El <video> todavia no esta montado en el primer render de este
      // handler (mode recien cambia ahora) -- se asigna el stream en el
      // efecto de abajo, disparado por el cambio de mode.
    } catch (err) {
      setMode('camera-unavailable');
      setErrorMessage(err?.name === 'NotAllowedError'
        ? 'No diste permiso para usar la cámara. Podés elegir el archivo desde la galería.'
        : 'No pudimos acceder a la cámara. Podés elegir el archivo desde la galería.');
    }
  };

  React.useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
    if (mode !== 'camera') stopCamera();
  }, [mode]);

  const handleShutter = () => {
    const video = videoRef.current;
    const stage = stageRef.current;
    const guide = frameGuideRef.current;
    if (!video || !stage || !guide || !video.videoWidth) return;
    const stageRect = stage.getBoundingClientRect();
    const frameRect = guide.getBoundingClientRect();
    const { sx, sy, sWidth, sHeight } = frameRectToVideoCoords(video, stageRect, frameRect);
    const canvas = cropToCanvas(video, sx, sy, sWidth, sHeight, ratio);
    resultCanvasRef.current = canvas;
    contentTypeRef.current = 'image/jpeg';
    fileNameRef.current = 'documento.jpg';
    stopCamera();
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewSource('camera');
      setMode('camera-preview');
    }, 'image/jpeg', OUTPUT_QUALITY);
  };

  // --- Galeria: elegir archivo -> decodificar -> pasar a modo ajuste ---
  const handleGalleryFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.type === 'application/pdf') {
      if (!allowPdf) return;
      if (file.size > DOCUMENTO_MAX_BYTES) {
        setMode('choice');
        setErrorMessage(DOCUMENTO_MAX_BYTES_MESSAGE);
        return;
      }
      resultCanvasRef.current = null;
      contentTypeRef.current = 'application/pdf';
      fileNameRef.current = file.name;
      setPdfInfo({ nombre: file.name, tamano: file.size, blob: file });
      setMode('pdf-preview');
      return;
    }

    try {
      const bitmap = await decodeImageFile(file);
      if (galleryImg?.url) URL.revokeObjectURL(galleryImg.url);
      setGalleryImg({ bitmap, url: URL.createObjectURL(file), naturalWidth: bitmap.width, naturalHeight: bitmap.height });
      setZoom(MIN_ZOOM);
      setPan({ x: 0, y: 0 });
      setMode('gallery-adjust');
    } catch {
      setMode('choice');
      setErrorMessage('No pudimos abrir este archivo. Probá con otra imagen o un PDF.');
    }
  };

  // baseScale: el factor que hace que la imagen cubra el marco a zoom=1
  // (equivalente a object-fit:cover), medido contra el tamaño REAL en
  // pantalla del marco (CSS px) -- se recalcula cuando cambia la imagen.
  const measureBaseScale = React.useCallback(() => {
    const guide = frameGuideRef.current;
    if (!guide || !galleryImg) return 1;
    const rect = guide.getBoundingClientRect();
    return Math.max(rect.width / galleryImg.naturalWidth, rect.height / galleryImg.naturalHeight);
  }, [galleryImg]);

  React.useEffect(() => {
    if (mode === 'gallery-adjust') {
      baseScaleRef.current = measureBaseScale();
      setPan({ x: 0, y: 0 });
    }
  }, [mode, measureBaseScale]);

  const clampPan = (nextPan, nextZoom) => {
    const guide = frameGuideRef.current;
    if (!guide || !galleryImg) return nextPan;
    const rect = guide.getBoundingClientRect();
    const renderedW = galleryImg.naturalWidth * baseScaleRef.current * nextZoom;
    const renderedH = galleryImg.naturalHeight * baseScaleRef.current * nextZoom;
    const maxX = Math.max(0, (renderedW - rect.width) / 2);
    const maxY = Math.max(0, (renderedH - rect.height) / 2);
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
    if (gesture.kind === 'pan' && pointersRef.current.size === 1) {
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
    if (pointersRef.current.size === 0) {
      gestureRef.current = null;
    } else if (pointersRef.current.size === 1) {
      const [[, point]] = pointersRef.current;
      gestureRef.current = { kind: 'pan', startPan: pan, startPointer: point };
    }
  };

  const handleWheelZoom = (event) => {
    event.preventDefault();
    applyZoom(zoom + (event.deltaY < 0 ? 0.15 : -0.15));
  };

  const confirmGalleryAdjust = () => {
    if (!galleryImg) return;
    const effScale = baseScaleRef.current * zoom;
    const cropWidthNative = Math.min(galleryImg.naturalWidth, frameGuideRef.current.getBoundingClientRect().width / effScale);
    const cropHeightNative = Math.min(galleryImg.naturalHeight, frameGuideRef.current.getBoundingClientRect().height / effScale);
    const centerXNative = galleryImg.naturalWidth / 2 - pan.x / effScale;
    const centerYNative = galleryImg.naturalHeight / 2 - pan.y / effScale;
    let sx = centerXNative - cropWidthNative / 2;
    let sy = centerYNative - cropHeightNative / 2;
    sx = Math.min(Math.max(sx, 0), Math.max(0, galleryImg.naturalWidth - cropWidthNative));
    sy = Math.min(Math.max(sy, 0), Math.max(0, galleryImg.naturalHeight - cropHeightNative));
    const canvas = cropToCanvas(galleryImg.bitmap, sx, sy, cropWidthNative, cropHeightNative, ratio);
    resultCanvasRef.current = canvas;
    contentTypeRef.current = 'image/jpeg';
    fileNameRef.current = 'documento.jpg';
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewSource('gallery');
      setMode('camera-preview');
    }, 'image/jpeg', OUTPUT_QUALITY);
  };

  // "Sacar otra"/"Elegir otro" desde la vista previa final: vuelve al paso
  // mas barato segun de donde vino, en vez de forzar un re-inicio completo.
  const handleBackFromPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    resultCanvasRef.current = null;
    if (onPickAnother) onPickAnother();
    if (mode === 'pdf-preview') {
      setPdfInfo(null);
      setMode('choice');
      return;
    }
    if (previewSource === 'gallery' && galleryImg) {
      setMode('gallery-adjust');
      return;
    }
    startCamera();
  };

  const handleConfirm = () => {
    if (mode === 'pdf-preview') {
      if (!pdfInfo) return;
      onCapture({ blob: pdfInfo.blob, contentType: 'application/pdf', nombreArchivo: pdfInfo.nombre });
      return;
    }
    if (!resultCanvasRef.current) return;
    resultCanvasRef.current.toBlob((blob) => {
      if (!blob) return;
      onCapture({ blob, contentType: contentTypeRef.current, nombreArchivo: fileNameRef.current });
    }, 'image/jpeg', OUTPUT_QUALITY);
  };

  const frameClass = frame === 'a4' ? 'fdc-frame-a4' : 'fdc-frame-card';
  const isPreviewStep = mode === 'camera-preview' || mode === 'pdf-preview';

  return (
    <div className="fdc-overlay" role="dialog" aria-modal="true" aria-label={title || 'Documento'}>
      <div className="fdc-header">
        <span>{title || 'Documento'}</span>
        <button type="button" className="fdc-close" onClick={onClose} aria-label="Cerrar" disabled={busy}>
          <X size={20} />
        </button>
      </div>

      <div className="fdc-body">
        {mode === 'choice' ? (
          <div className="fdc-choice">
            {errorMessage ? <p className="fdc-error">{errorMessage}</p> : null}
            <button type="button" className="fdc-choice-button" onClick={startCamera}>
              <Camera size={20} />
              <span>Sacar foto</span>
            </button>
            <label className="fdc-choice-button">
              <ImageIcon size={20} />
              <span>Elegir de galería</span>
              <input type="file" accept="image/*" onChange={handleGalleryFileChange} className="fdc-file-input" />
            </label>
            {allowPdf ? (
              <label className="fdc-choice-button fdc-choice-button-secondary">
                <Upload size={20} />
                <span>Subir PDF</span>
                <input type="file" accept="application/pdf" onChange={handleGalleryFileChange} className="fdc-file-input" />
              </label>
            ) : null}
          </div>
        ) : null}

        {mode === 'camera-unavailable' ? (
          <div className="fdc-choice">
            {errorMessage ? <p className="fdc-error">{errorMessage}</p> : null}
            <label className="fdc-choice-button">
              <ImageIcon size={20} />
              <span>Elegir de galería</span>
              <input type="file" accept="image/*" onChange={handleGalleryFileChange} className="fdc-file-input" />
            </label>
            {allowPdf ? (
              <label className="fdc-choice-button fdc-choice-button-secondary">
                <Upload size={20} />
                <span>Subir PDF</span>
                <input type="file" accept="application/pdf" onChange={handleGalleryFileChange} className="fdc-file-input" />
              </label>
            ) : null}
          </div>
        ) : null}

        {mode === 'camera' ? (
          <div className="fdc-stage fdc-stage-camera" ref={stageRef}>
            <video
              ref={videoRef}
              className="fdc-video"
              playsInline
              muted
              autoPlay
              onLoadedMetadata={() => setVideoReady(true)}
            />
            <div className="fdc-dim-overlay">
              <div className={`fdc-frame-guide ${frameClass}`} ref={frameGuideRef} />
            </div>
            <p className="fdc-instruccion">
              {videoReady ? (instruccion || 'Ubicá el documento dentro del recuadro') : 'Preparando cámara...'}
            </p>
            <button
              type="button"
              className="fdc-shutter"
              onClick={handleShutter}
              aria-label="Capturar"
              disabled={!videoReady}
            >
              <span className="fdc-shutter-dot" />
            </button>
          </div>
        ) : null}

        {mode === 'gallery-adjust' && galleryImg ? (
          <div className="fdc-stage">
            <div
              className={`fdc-frame-guide fdc-frame-guide-standalone ${frameClass}`}
              ref={frameGuideRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              onWheel={handleWheelZoom}
            >
              <img
                src={galleryImg.url}
                alt="Ajustar encuadre"
                className="fdc-gallery-img"
                draggable={false}
                style={{
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${baseScaleRef.current * zoom})`
                }}
              />
            </div>
            <p className="fdc-instruccion">Arrastrá y hacé zoom para encuadrar el documento</p>
            <div className="fdc-zoom-row">
              <button type="button" className="fdc-zoom-button" onClick={() => applyZoom(zoom - 0.3)} aria-label="Alejar">
                <ZoomOut size={18} />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(event) => applyZoom(Number(event.target.value))}
                className="fdc-zoom-slider"
              />
              <button type="button" className="fdc-zoom-button" onClick={() => applyZoom(zoom + 0.3)} aria-label="Acercar">
                <ZoomIn size={18} />
              </button>
            </div>
            <div className="fdc-preview-actions">
              <button type="button" className="fdc-secondary-button" onClick={handleBackFromPreview}>Elegir otra</button>
              <button type="button" className="fdc-primary-button" onClick={confirmGalleryAdjust}>Usar esta foto</button>
            </div>
          </div>
        ) : null}

        {isPreviewStep ? (
          <div className="fdc-preview-stage">
            {mode === 'pdf-preview' ? (
              <div className="fdc-preview-pdf">
                <FileText size={40} />
                <span>{pdfInfo?.nombre}</span>
                <span className="fdc-preview-pdf-size">{formatBytes(pdfInfo?.tamano || 0)}</span>
              </div>
            ) : (
              <div className={`fdc-preview-img-wrap ${frameClass}`}>
                <img src={previewUrl} alt="Vista previa" className="fdc-preview-img" />
              </div>
            )}
            {uploadError ? <p className="fdc-error">{uploadError}</p> : null}
            <div className="fdc-preview-actions">
              <button type="button" className="fdc-secondary-button" onClick={handleBackFromPreview} disabled={busy}>
                {mode === 'pdf-preview' ? 'Elegir otro' : 'Sacar otra'}
              </button>
              <button type="button" className="fdc-primary-button" onClick={handleConfirm} disabled={busy}>
                {busy ? 'Subiendo...' : (uploadError ? 'Reintentar' : (mode === 'pdf-preview' ? 'Usar este archivo' : 'Usar esta foto'))}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
