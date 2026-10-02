import React from 'react';
import { FileText, Upload, X } from 'lucide-react';
import './PersonFotoCapture.css';

// Componente compartido de carga de documentos (cedula, carne de salud,
// titulo, etc.), usado tanto por la ficha publica de autocompletado como
// por la ficha interna de RRHH. A diferencia de PersonFotoCapture (foto de
// perfil: siempre imagen, recorte cuadrado), esto acepta imagen O PDF, y
// las imagenes NO se recortan -- solo se redimensionan.
//
// input accept="image/*,application/pdf" SIN capture: igual criterio que
// la foto de perfil, el selector del sistema ya ofrece camara o galeria.
//
// Imagenes: createImageBitmap(file, {imageOrientation:'from-image'}) para
// respetar la orientacion EXIF sin parsearlo a mano, resize manteniendo
// proporcion (lado mayor a 1600px, sin recorte), canvas -> JPEG calidad
// 0.85 (descarta toda la metadata EXIF, incluida ubicacion GPS).
// PDF: se sube tal cual (no hay forma de "comprimir" un PDF del lado del
// cliente sin una libreria de PDF, que esta fuera de alcance) -- solo se
// valida tipo y tamaño antes de ofrecer "Usar este archivo".
//
// El limite de 4MB (igual para JPEG y PDF) no es el de API Gateway (10MB) --
// es el de Lambda: una invocacion sincrona tiene un techo de 6MB de payload
// tanto en el request como en la response, y el archivo viaja en base64
// (~33% mas grande) tanto al subir como al verlo desde RRHH (que tambien
// devuelve el archivo en la respuesta de la Lambda). 4MB crudos ~= 5.33MB en
// base64, con margen real bajo ese techo.
//
// Guardado automatico: quien use este componente sube el archivo apenas
// llega onCapture (no hay boton "Guardar" en ningun lado) y controla el
// estado de red con los props busy/uploadError -- "Usar este archivo" pasa a
// decir "Subiendo..." (busy) o "Reintentar" (uploadError, sin perder el
// blob ya cargado: blobRef no se limpia hasta elegir otro archivo).
// onPickAnother avisa al padre que debe descartar un uploadError viejo
// cuando se elige un archivo nuevo despues de un fallo.
const OUTPUT_MAX_SIDE = 1600;
const OUTPUT_QUALITY = 0.85;
const DOCUMENTO_MAX_BYTES = 4 * 1024 * 1024;
const DOCUMENTO_MAX_BYTES_MESSAGE = 'El archivo supera 4 MB. Si es un PDF escaneado, probá sacarle una foto al documento.';

async function decodeImage(file) {
  if (typeof createImageBitmap !== 'function') throw new Error('no-support');
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await createImageBitmap(file);
  }
}

function drawResized(bitmap) {
  const scale = Math.min(1, OUTPUT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentoCapture({ title, onCapture, onClose, busy, uploadError, onPickAnother }) {
  const [step, setStep] = React.useState('pick'); // pick | loading | preview | error
  const [errorMessage, setErrorMessage] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [previewKind, setPreviewKind] = React.useState(''); // 'image' | 'pdf'
  const [fileInfo, setFileInfo] = React.useState(null); // { nombre, tamano }
  const blobRef = React.useRef(null);
  const contentTypeRef = React.useRef('');

  React.useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setStep('loading');
    setErrorMessage('');

    if (file.type === 'application/pdf') {
      if (file.size > DOCUMENTO_MAX_BYTES) {
        setStep('error');
        setErrorMessage(DOCUMENTO_MAX_BYTES_MESSAGE);
        return;
      }
      blobRef.current = file;
      contentTypeRef.current = 'application/pdf';
      setFileInfo({ nombre: file.name, tamano: file.size });
      setPreviewKind('pdf');
      setPreviewUrl('');
      setStep('preview');
      return;
    }

    try {
      const bitmap = await decodeImage(file);
      const canvas = drawResized(bitmap);
      canvas.toBlob((blob) => {
        if (!blob) {
          setStep('error');
          setErrorMessage('No pudimos procesar esta imagen. Probá con otra foto.');
          return;
        }
        // Defensivo: 1600px/JPEG 0.85 rara vez se acerca a 4MB, pero se
        // chequea igual para dar el mismo mensaje claro del lado del
        // cliente en vez de descubrirlo recien con el 422 del backend.
        if (blob.size > DOCUMENTO_MAX_BYTES) {
          setStep('error');
          setErrorMessage(DOCUMENTO_MAX_BYTES_MESSAGE);
          return;
        }
        blobRef.current = blob;
        contentTypeRef.current = 'image/jpeg';
        setFileInfo({ nombre: file.name, tamano: blob.size });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
        setPreviewKind('image');
        setStep('preview');
      }, 'image/jpeg', OUTPUT_QUALITY);
    } catch {
      setStep('error');
      setErrorMessage('No pudimos abrir este archivo. Probá sacarlo de nuevo o elegí una imagen JPG/PNG o un PDF.');
    }
  };

  const handleUseThisFile = () => {
    if (!blobRef.current) return;
    onCapture({ blob: blobRef.current, contentType: contentTypeRef.current, nombreArchivo: fileInfo?.nombre || 'documento' });
  };

  const handlePickAnother = () => {
    setStep('pick');
    setErrorMessage('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewKind('');
    setFileInfo(null);
    blobRef.current = null;
    contentTypeRef.current = '';
    if (onPickAnother) onPickAnother();
  };

  return (
    <div className="pfc-overlay" role="dialog" aria-modal="true" aria-label={title || 'Documento'}>
      <div className="pfc-card">
        <div className="pfc-header">
          <span>{title || 'Documento'}</span>
          <button type="button" className="pfc-close" onClick={onClose} aria-label="Cerrar" disabled={busy}>
            <X size={18} />
          </button>
        </div>

        <div className="pfc-body">
          {step === 'pick' || step === 'error' ? (
            <>
              {step === 'error' ? <p className="pfc-error">{errorMessage}</p> : null}
              <label className="pfc-pick-button">
                <Upload size={18} />
                <span>Elegir archivo</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="pfc-file-input"
                />
              </label>
            </>
          ) : null}

          {step === 'loading' ? <p className="pfc-status">Procesando archivo...</p> : null}

          {step === 'preview' ? (
            <>
              {previewKind === 'image' ? (
                <div className="pfc-preview-wrap">
                  <img src={previewUrl} alt="Vista previa" className="pfc-preview-img" />
                </div>
              ) : (
                <div className="pfc-preview-wrap pfc-preview-pdf">
                  <FileText size={40} />
                  <span>{fileInfo?.nombre}</span>
                  <span className="pfc-preview-pdf-size">{formatBytes(fileInfo?.tamano || 0)}</span>
                </div>
              )}
              {uploadError ? <p className="pfc-error">{uploadError}</p> : null}
              <div className="pfc-preview-actions">
                <button type="button" className="pfc-secondary-button" onClick={handlePickAnother} disabled={busy}>Elegir otro</button>
                <button type="button" className="pfc-primary-button" onClick={handleUseThisFile} disabled={busy}>
                  {busy ? 'Subiendo...' : (uploadError ? 'Reintentar' : 'Usar este archivo')}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
