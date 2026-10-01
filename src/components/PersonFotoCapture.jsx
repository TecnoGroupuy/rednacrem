import React from 'react';
import { Camera, X } from 'lucide-react';
import './PersonFotoCapture.css';

// Componente compartido de foto de perfil, usado tanto por la ficha publica
// de autocompletado (sin Cognito) como por la ficha interna de RRHH
// (PersonalDetail.jsx) -- misma logica de recorte/export en los dos
// lugares, para terminar siempre con el mismo tipo de archivo (JPEG
// cuadrado 512x512) sin importar por donde se cargo la foto.
//
// input accept="image/*" SIN capture: en el celular el propio selector del
// sistema ya ofrece "Camara" o "Galeria", forzar capture sacaria esa
// segunda opcion.
//
// createImageBitmap(file, { imageOrientation: 'from-image' }) respeta la
// orientacion EXIF sin tener que parsear el EXIF a mano -- soportado en
// todos los navegadores modernos (Chrome/Firefox/Safari 15+). Si ese
// overload no esta disponible se reintenta sin la opcion (foto puede quedar
// rotada en navegadores muy viejos, pero no rompe el flujo), y si
// createImageBitmap en si no esta disponible o el archivo no se puede
// decodificar (ej. HEIC sin soporte), se muestra un mensaje claro.
//
// El recorte cuadrado centrado + el resize a 512x512 vía canvas pasan
// ademas por un re-encode a JPEG calidad 0.85 -- eso descarta cualquier
// metadata EXIF original (incluida ubicacion GPS si la tenia), sin tener
// que limpiarla a mano.
const OUTPUT_SIZE = 512;
const OUTPUT_QUALITY = 0.85;

async function decodeImage(file) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('no-support');
  }
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await createImageBitmap(file);
  }
}

function drawSquareCrop(bitmap) {
  const size = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - size) / 2;
  const sy = (bitmap.height - size) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return canvas;
}

export default function PersonFotoCapture({ title, onCapture, onClose, busy }) {
  const [step, setStep] = React.useState('pick'); // pick | loading | preview | error
  const [errorMessage, setErrorMessage] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState('');
  const canvasRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite re-elegir el mismo archivo despues de "Elegir otra"
    if (!file) return;

    setStep('loading');
    setErrorMessage('');
    try {
      const bitmap = await decodeImage(file);
      const canvas = drawSquareCrop(bitmap);
      canvasRef.current = canvas;
      canvas.toBlob((blob) => {
        if (!blob) {
          setStep('error');
          setErrorMessage('No pudimos procesar esta imagen. Probá con otra foto.');
          return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
        setStep('preview');
      }, 'image/jpeg', OUTPUT_QUALITY);
    } catch {
      setStep('error');
      setErrorMessage('No pudimos abrir esta imagen. Probá sacarla de nuevo o elegí una foto en formato JPG o PNG.');
    }
  };

  const handleUseThisPhoto = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, 'image/jpeg', OUTPUT_QUALITY);
  };

  const handlePickAnother = () => {
    setStep('pick');
    setErrorMessage('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    canvasRef.current = null;
  };

  return (
    <div className="pfc-overlay" role="dialog" aria-modal="true" aria-label={title || 'Foto de perfil'}>
      <div className="pfc-card">
        <div className="pfc-header">
          <span>{title || 'Foto de perfil'}</span>
          <button type="button" className="pfc-close" onClick={onClose} aria-label="Cerrar" disabled={busy}>
            <X size={18} />
          </button>
        </div>

        <div className="pfc-body">
          {step === 'pick' || step === 'error' ? (
            <>
              {step === 'error' ? <p className="pfc-error">{errorMessage}</p> : null}
              <label className="pfc-pick-button">
                <Camera size={18} />
                <span>Elegir foto</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="pfc-file-input"
                />
              </label>
            </>
          ) : null}

          {step === 'loading' ? <p className="pfc-status">Procesando imagen...</p> : null}

          {step === 'preview' ? (
            <>
              <div className="pfc-preview-wrap">
                <img src={previewUrl} alt="Vista previa" className="pfc-preview-img" />
              </div>
              <div className="pfc-preview-actions">
                <button type="button" className="pfc-secondary-button" onClick={handlePickAnother} disabled={busy}>Elegir otra</button>
                <button type="button" className="pfc-primary-button" onClick={handleUseThisPhoto} disabled={busy}>
                  {busy ? 'Subiendo...' : 'Usar esta foto'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
