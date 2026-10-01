import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, FileText, MapPin } from 'lucide-react';
import {
  verificarFicha,
  actualizarFichaPublica,
  subirFotoFichaPublica,
  getDocumentosFichaPublica,
  subirDocumentoFichaPublica,
  avisarTurnoFichaPublica,
  FichaPublicaError
} from '../../services/fichaPublicaService.js';
import PersonFotoCapture from '../../components/PersonFotoCapture.jsx';
import DocumentoCapture from '../../components/DocumentoCapture.jsx';
import suEmergenciaLogo from '../operaciones/monitor/assets/su-emergencia-logo.png';
import './completarFichaStyles.css';

// Pantalla publica de autocompletado de ficha (sin Cognito, sin AuthGate --
// ver main.jsx: se detecta por window.location.pathname ANTES de montar
// OidcAuthProvider). La unica identidad de quien entra es el token de link
// (en la URL) + documento + fecha de nacimiento que escribe -- nunca inicia
// sesion.
//
// Todas las fechas en pantalla van en dd/mm/aaaa, como tres campos
// separados (dia/mes/año) -- nunca un <input type="date"> ni un
// `new Date(string)` en ningun punto de este archivo: la fecha viaja
// siempre como string 'YYYY-MM-DD' armado por concatenacion simple, para no
// pisar el dia por un corrimiento de zona horaria.

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function partsToIso({ dia, mes, anio }) {
  if (!dia || !mes || !anio || anio.length < 4) return '';
  return `${anio.padStart(4, '0')}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

function isoToParts(iso) {
  if (!iso) return { dia: '', mes: '', anio: '' };
  const [anio, mes, dia] = String(iso).split('-');
  return { dia: dia || '', mes: mes || '', anio: anio || '' };
}

// Puramente por string, sin pasar por ningun objeto Date -- mismo criterio
// (y misma duplicacion a proposito, para no crear un import entre el modulo
// publico y el de RRHH) que ya explican PersonalDetail.jsx/PersonalList.jsx
// para sus propias copias de estos helpers de fecha.
function formatDateOnlyDisplay(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 3) return value || '';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function todayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetweenDateOnly(fromDateOnly, toDateOnlyValue) {
  const [fy, fm, fd] = fromDateOnly.split('-').map(Number);
  const [ty, tm, td] = toDateOnlyValue.split('-').map(Number);
  const fromUTC = Date.UTC(fy, fm - 1, fd);
  const toUTC = Date.UTC(ty, tm - 1, td);
  return Math.round((toUTC - fromUTC) / 86400000);
}

function addDaysDateOnly(dateOnlyValue, days) {
  const [y, m, d] = dateOnlyValue.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isFranco(dateOnlyValue, refDateOnly) {
  const diff = daysBetweenDateOnly(refDateOnly, dateOnlyValue);
  return ((diff % 5) + 5) % 5 === 0;
}

function getProximosFrancos(refDateOnly, count = 3) {
  const francos = [];
  let cursor = todayDateOnly();
  while (francos.length < count) {
    if (isFranco(cursor, refDateOnly)) francos.push(cursor);
    cursor = addDaysDateOnly(cursor, 1);
  }
  return francos;
}

const REGIMEN_TURNO_LABELS = { fijo: 'Fijo', turnante: 'Turnante', suplente: 'Suplente' };

// Que campos de datos mostrar por categoria -- presentacion pura (que input
// dibujar), no "que categorias le aplican a mi rol" (eso SI es 100% el
// backend via GET .../documentos, ver DOCUMENTOS_POR_ROL en index.mjs).
const CATEGORIA_CAMPOS = {
  carne_salud: { fechaVencimiento: true },
  registro_msp: { numero: true, numeroLabel: 'Número de registro' },
  libreta_conducir: { numero: true, numeroLabel: 'Categoría', fechaVencimiento: true }
};

const ESTADO_LABELS = {
  falta: 'Falta',
  pendiente: 'Pendiente de revisión',
  rechazado: 'Rechazado',
  validado: 'Validado'
};

function FechaInputs({ parts, onChange, idPrefix }) {
  const diaRef = React.useRef(null);
  const mesRef = React.useRef(null);
  const anioRef = React.useRef(null);

  const setPart = (key, maxLen, nextRef) => (event) => {
    const digits = onlyDigits(event.target.value).slice(0, maxLen);
    onChange({ ...parts, [key]: digits });
    if (digits.length === maxLen && nextRef?.current) nextRef.current.focus();
  };

  return (
    <div className="cf-fecha-row">
      <label className="cf-fecha-field">
        <span>Día</span>
        <input
          ref={diaRef}
          id={`${idPrefix}-dia`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="DD"
          value={parts.dia}
          onChange={setPart('dia', 2, mesRef)}
        />
      </label>
      <label className="cf-fecha-field">
        <span>Mes</span>
        <input
          ref={mesRef}
          id={`${idPrefix}-mes`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="MM"
          value={parts.mes}
          onChange={setPart('mes', 2, anioRef)}
        />
      </label>
      <label className="cf-fecha-field cf-fecha-field-anio">
        <span>Año</span>
        <input
          ref={anioRef}
          id={`${idPrefix}-anio`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="AAAA"
          value={parts.anio}
          onChange={setPart('anio', 4, null)}
        />
      </label>
    </div>
  );
}

function InitialsSquare({ nombre, apellido }) {
  const initials = `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase() || 'SU';
  return <div className="cf-foto-square cf-foto-initials">{initials}</div>;
}

export default function CompletarFichaScreen() {
  const linkToken = React.useMemo(() => new URLSearchParams(window.location.search).get('token'), []);

  const [step, setStep] = React.useState(linkToken ? 'documento' : 'link_invalido');
  // A que step volver despues de re-verificar tras una sesion vencida --
  // por default 'ficha' (el primer paso post-verificacion), pero si la
  // sesion vence en 'foto' o 'documentos' se guarda ese paso aca, para
  // "volver y seguir" en vez de reiniciar el flujo desde cero.
  const [resumeStep, setResumeStep] = React.useState('ficha');
  const [documento, setDocumento] = React.useState('');
  const [fechaVerificar, setFechaVerificar] = React.useState({ dia: '', mes: '', anio: '' });
  const [sessionToken, setSessionToken] = React.useState('');
  const [persona, setPersona] = React.useState(null);
  const [draft, setDraft] = React.useState({ fechaParts: { dia: '', mes: '', anio: '' }, telefono: '', email: '', domicilio: '' });
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [showFotoCapture, setShowFotoCapture] = React.useState(false);
  const [fotoUploading, setFotoUploading] = React.useState(false);
  const [fotoError, setFotoError] = React.useState('');

  // Documentacion (checklist por rol)
  const [documentosChecklist, setDocumentosChecklist] = React.useState([]);
  const [documentosCursos, setDocumentosCursos] = React.useState([]);
  const [documentosTurno, setDocumentosTurno] = React.useState(null);
  const [documentosLoading, setDocumentosLoading] = React.useState(false);
  const [documentosError, setDocumentosError] = React.useState('');
  const [showValidados, setShowValidados] = React.useState(false);

  // Edicion de UN item de la checklist a la vez ("cada item se carga por
  // separado"): categoria actualmente expandida, sus campos de datos, el
  // archivo ya capturado (todavia no subido) y el estado de guardado.
  const [editingCategoria, setEditingCategoria] = React.useState(null);
  const [editNumero, setEditNumero] = React.useState('');
  const [editFechaParts, setEditFechaParts] = React.useState({ dia: '', mes: '', anio: '' });
  const [editFile, setEditFile] = React.useState(null);
  const [editShowCapture, setEditShowCapture] = React.useState(false);
  const [editUploading, setEditUploading] = React.useState(false);
  const [editError, setEditError] = React.useState('');

  // Alta de un nuevo curso (repetible, nunca "reemplaza" uno existente).
  const [showCursoForm, setShowCursoForm] = React.useState(false);
  const [cursoNombre, setCursoNombre] = React.useState('');
  const [cursoInstitucion, setCursoInstitucion] = React.useState('');
  const [cursoFechaParts, setCursoFechaParts] = React.useState({ dia: '', mes: '', anio: '' });
  const [cursoFile, setCursoFile] = React.useState(null);
  const [cursoShowCapture, setCursoShowCapture] = React.useState(false);
  const [cursoUploading, setCursoUploading] = React.useState(false);
  const [cursoError, setCursoError] = React.useState('');

  // "No coincide, avisar a RRHH"
  const [avisoOpen, setAvisoOpen] = React.useState(false);
  const [avisoComentario, setAvisoComentario] = React.useState('');
  const [avisoSending, setAvisoSending] = React.useState(false);
  const [avisoSent, setAvisoSent] = React.useState(false);
  const [avisoError, setAvisoError] = React.useState('');

  const handleContinuarDocumento = (event) => {
    event.preventDefault();
    if (!documento.trim()) return;
    setErrorMessage('');
    setStep('fecha');
  };

  const handleVerificar = async (event) => {
    event.preventDefault();
    const fechaIso = partsToIso(fechaVerificar);
    if (!fechaIso) {
      setErrorMessage('Completá día, mes y año de tu fecha de nacimiento.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const result = await verificarFicha({ token: linkToken, documento: onlyDigits(documento), fechaNacimiento: fechaIso });
      setSessionToken(result.session_token);
      setPersona(result.persona);
      // Si ya habia un draft cargado (volviendo de una sesion vencida en el
      // paso de ficha/foto), se conserva lo que la persona ya habia
      // escrito -- solo se inicializa desde el servidor la primera vez.
      setDraft((prev) => {
        const alreadyStarted = prev.telefono || prev.email || prev.domicilio || prev.fechaParts.dia;
        if (alreadyStarted) return prev;
        return {
          fechaParts: isoToParts(result.persona.fecha_nacimiento),
          telefono: result.persona.telefono || '',
          email: result.persona.email || '',
          domicilio: result.persona.domicilio || ''
        };
      });
      setStep(resumeStep);
    } catch (err) {
      if (err instanceof FichaPublicaError && err.status === 401) {
        setStep('link_invalido');
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err?.message || 'No se pudo verificar la ficha.');
      }
    } finally {
      setLoading(false);
    }
  };

  // nextResumeStep: a donde volver despues de re-verificar ("se vuelve a
  // verificar y sigue", nunca se reinicia el flujo desde el principio).
  const volverADocumentoPorSesionVencida = (message, nextResumeStep) => {
    setErrorMessage(message);
    setSessionToken('');
    if (nextResumeStep) setResumeStep(nextResumeStep);
    setStep('documento');
  };

  const handleGuardarFicha = async (event) => {
    event.preventDefault();
    const fechaIso = partsToIso(draft.fechaParts);
    if (!fechaIso) {
      setErrorMessage('Completá día, mes y año de tu fecha de nacimiento.');
      return;
    }
    setErrorMessage('');

    const updates = {};
    if (fechaIso !== persona.fecha_nacimiento) updates.fecha_nacimiento = fechaIso;
    if (draft.telefono !== (persona.telefono || '')) updates.telefono = draft.telefono || null;
    if (draft.email !== (persona.email || '')) updates.email = draft.email || null;
    if (draft.domicilio !== (persona.domicilio || '')) updates.domicilio = draft.domicilio || null;

    if (!Object.keys(updates).length) {
      setStep('foto');
      return;
    }

    setLoading(true);
    try {
      const result = await actualizarFichaPublica(sessionToken, updates);
      setPersona(result.persona);
      setStep('foto');
    } catch (err) {
      if (err instanceof FichaPublicaError && err.status === 401) {
        volverADocumentoPorSesionVencida(err.message, 'ficha');
      } else {
        setErrorMessage(err?.message || 'No se pudieron guardar los cambios.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCapturarFoto = async (blob) => {
    setFotoUploading(true);
    setFotoError('');
    try {
      const result = await subirFotoFichaPublica(sessionToken, blob);
      setPersona(result.persona);
      setShowFotoCapture(false);
    } catch (err) {
      // Se cierra el modal en CUALQUIER error (no solo sesion vencida): el
      // mensaje vive en el step de abajo (fotoError), y con el modal
      // encima tapandolo quedaba invisible -- la persona veia el preview
      // de la foto como si nada hubiera pasado, sin ningun indicio del
      // fallo (justo lo que pide evitar el punto "no dejar la UI colgada").
      setShowFotoCapture(false);
      if (err instanceof FichaPublicaError && err.status === 401) {
        volverADocumentoPorSesionVencida(err.message, 'foto');
      } else {
        setFotoError(err?.message || 'No se pudo subir la foto.');
      }
    } finally {
      setFotoUploading(false);
    }
  };

  const cargarDocumentos = React.useCallback(async () => {
    setDocumentosLoading(true);
    setDocumentosError('');
    try {
      const result = await getDocumentosFichaPublica(sessionToken);
      setDocumentosChecklist(result.checklist || []);
      setDocumentosCursos(result.cursos || []);
      setDocumentosTurno(result.turno || null);
    } catch (err) {
      if (err instanceof FichaPublicaError && err.status === 401) {
        volverADocumentoPorSesionVencida(err.message, 'documentos');
      } else {
        setDocumentosError(err?.message || 'No se pudo cargar la documentación.');
      }
    } finally {
      setDocumentosLoading(false);
    }
  }, [sessionToken]);

  React.useEffect(() => {
    if (step === 'documentos' && sessionToken) cargarDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sessionToken]);

  const openEditItem = (item) => {
    setEditingCategoria(item.categoria);
    setEditNumero(item.numero || '');
    setEditFechaParts(isoToParts(item.fecha_vencimiento));
    setEditFile(null);
    setEditError('');
  };

  const closeEditItem = () => {
    setEditingCategoria(null);
    setEditFile(null);
    setEditError('');
  };

  const handleGuardarItem = async () => {
    if (!editFile) return;
    setEditUploading(true);
    setEditError('');
    try {
      const campos = CATEGORIA_CAMPOS[editingCategoria] || {};
      const result = await subirDocumentoFichaPublica(sessionToken, {
        categoria: editingCategoria,
        nombreArchivo: editFile.nombreArchivo,
        contentType: editFile.contentType,
        blob: editFile.blob,
        numero: campos.numero ? editNumero || null : null,
        fechaVencimiento: campos.fechaVencimiento ? (partsToIso(editFechaParts) || null) : null
      });
      setDocumentosChecklist(result.checklist || []);
      setDocumentosCursos(result.cursos || []);
      closeEditItem();
    } catch (err) {
      if (err instanceof FichaPublicaError && err.status === 401) {
        volverADocumentoPorSesionVencida(err.message, 'documentos');
      } else {
        setEditError(err?.message || 'No se pudo subir el documento.');
      }
    } finally {
      setEditUploading(false);
    }
  };

  const resetCursoForm = () => {
    setShowCursoForm(false);
    setCursoNombre('');
    setCursoInstitucion('');
    setCursoFechaParts({ dia: '', mes: '', anio: '' });
    setCursoFile(null);
    setCursoError('');
  };

  const handleGuardarCurso = async () => {
    if (!cursoFile || !cursoNombre.trim()) return;
    setCursoUploading(true);
    setCursoError('');
    try {
      const result = await subirDocumentoFichaPublica(sessionToken, {
        categoria: 'curso',
        nombreArchivo: cursoFile.nombreArchivo,
        contentType: cursoFile.contentType,
        blob: cursoFile.blob,
        cursoNombre: cursoNombre.trim(),
        cursoInstitucion: cursoInstitucion.trim() || null,
        fechaEmision: partsToIso(cursoFechaParts) || null
      });
      setDocumentosChecklist(result.checklist || []);
      setDocumentosCursos(result.cursos || []);
      resetCursoForm();
    } catch (err) {
      if (err instanceof FichaPublicaError && err.status === 401) {
        volverADocumentoPorSesionVencida(err.message, 'documentos');
      } else {
        setCursoError(err?.message || 'No se pudo subir el curso.');
      }
    } finally {
      setCursoUploading(false);
    }
  };

  const handleEnviarAviso = async () => {
    setAvisoSending(true);
    setAvisoError('');
    try {
      await avisarTurnoFichaPublica(sessionToken, avisoComentario.trim());
      setAvisoSent(true);
      setAvisoOpen(false);
    } catch (err) {
      if (err instanceof FichaPublicaError && err.status === 401) {
        volverADocumentoPorSesionVencida(err.message, 'documentos');
      } else {
        setAvisoError(err?.message || 'No se pudo registrar el aviso.');
      }
    } finally {
      setAvisoSending(false);
    }
  };

  const itemsActivos = documentosChecklist.filter((item) => item.estado !== 'validado');
  const itemsValidados = documentosChecklist.filter((item) => item.estado === 'validado');
  const totalRequeridos = documentosChecklist.length;
  const totalFaltantes = itemsActivos.length;

  return (
    <div className="cf-root">
      <div className="cf-card">
        <img src={suEmergenciaLogo} alt="SU Emergencia" className="cf-logo" />

        {step === 'link_invalido' ? (
          <div className="cf-step">
            <AlertTriangle size={32} className="cf-icon-warning" />
            <h1>Enlace no disponible</h1>
            <p>{errorMessage || 'El enlace no es válido o venció. Pedí uno nuevo a tu contacto de RRHH.'}</p>
          </div>
        ) : null}

        {step === 'documento' ? (
          <form className="cf-step" onSubmit={handleContinuarDocumento}>
            <h1>Completá tu ficha</h1>
            <p className="cf-subtitle">Ingresá tu documento para empezar.</p>
            <label className="cf-field">
              <span>Documento</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                value={documento}
                onChange={(event) => setDocumento(onlyDigits(event.target.value))}
                placeholder="Sin puntos ni guiones"
              />
            </label>
            {errorMessage ? <p className="cf-error">{errorMessage}</p> : null}
            <button type="submit" className="cf-primary-button" disabled={!documento.trim()}>Continuar</button>
          </form>
        ) : null}

        {step === 'fecha' ? (
          <form className="cf-step" onSubmit={handleVerificar}>
            <h1>Tu fecha de nacimiento</h1>
            <p className="cf-subtitle">Para confirmar que sos vos.</p>
            <FechaInputs idPrefix="verificar" parts={fechaVerificar} onChange={setFechaVerificar} />
            {errorMessage ? <p className="cf-error">{errorMessage}</p> : null}
            <button type="submit" className="cf-primary-button" disabled={loading}>
              {loading ? <Loader2 size={16} className="cf-spin" /> : null}
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
            <button type="button" className="cf-link-button" onClick={() => { setStep('documento'); setErrorMessage(''); }}>
              Volver
            </button>
          </form>
        ) : null}

        {step === 'ficha' && persona ? (
          <form className="cf-step" onSubmit={handleGuardarFicha}>
            <h1>{persona.nombre} {persona.apellido}</h1>
            <p className="cf-subtitle">Revisá y completá tus datos.</p>

            <div className="cf-field-group">
              <span className="cf-field-group-label">Fecha de nacimiento</span>
              <FechaInputs idPrefix="ficha-fecha" parts={draft.fechaParts} onChange={(parts) => setDraft((prev) => ({ ...prev, fechaParts: parts }))} />
            </div>

            <label className="cf-field">
              <span>Teléfono</span>
              <input
                type="tel"
                value={draft.telefono}
                onChange={(event) => setDraft((prev) => ({ ...prev, telefono: event.target.value }))}
              />
            </label>
            <label className="cf-field">
              <span>Email</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label className="cf-field">
              <span>Domicilio</span>
              <input
                type="text"
                value={draft.domicilio}
                onChange={(event) => setDraft((prev) => ({ ...prev, domicilio: event.target.value }))}
              />
            </label>

            {errorMessage ? <p className="cf-error">{errorMessage}</p> : null}
            <button type="submit" className="cf-primary-button" disabled={loading}>
              {loading ? <Loader2 size={16} className="cf-spin" /> : null}
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </form>
        ) : null}

        {step === 'foto' && persona ? (
          <div className="cf-step">
            <h1>Tu foto</h1>
            <p className="cf-subtitle">Opcional, pero ayuda a identificarte.</p>

            {persona.foto_url ? (
              <img src={persona.foto_url} alt="Tu foto" className="cf-foto-square" />
            ) : (
              <InitialsSquare nombre={persona.nombre} apellido={persona.apellido} />
            )}

            {fotoError ? <p className="cf-error">{fotoError}</p> : null}

            <button type="button" className="cf-secondary-button" onClick={() => setShowFotoCapture(true)}>
              {persona.foto_url ? 'Cambiar foto' : 'Cargar foto'}
            </button>
            <button type="button" className="cf-primary-button" onClick={() => setStep('documentos')}>
              Continuar
            </button>
            <button type="button" className="cf-link-button" onClick={() => setStep('listo')}>
              Terminar por ahora
            </button>
          </div>
        ) : null}

        {step === 'documentos' && persona ? (
          <div className="cf-step cf-step-wide">
            <h1>Tu documentación</h1>
            {totalRequeridos ? (
              <p className="cf-subtitle">
                {totalFaltantes === 0
                  ? 'Completaste toda la documentación requerida.'
                  : `Te falta${totalFaltantes === 1 ? '' : 'n'} ${totalFaltantes} de ${totalRequeridos}.`}
              </p>
            ) : null}

            {documentosLoading ? <p className="cf-status">Cargando documentación...</p> : null}
            {documentosError ? <p className="cf-error">{documentosError}</p> : null}

            {!documentosLoading && !documentosError ? (
              <>
                <div className="cf-doc-list">
                  {itemsActivos.map((item) => {
                    const campos = CATEGORIA_CAMPOS[item.categoria] || {};
                    const isEditing = editingCategoria === item.categoria;
                    return (
                      <div key={item.categoria} className={`cf-doc-item cf-doc-item-${item.estado}`}>
                        <div className="cf-doc-item-head">
                          <span className="cf-doc-item-label">{item.label}</span>
                          <span className={`cf-doc-badge cf-doc-badge-${item.estado}`}>{ESTADO_LABELS[item.estado]}</span>
                        </div>
                        {item.motivo_rechazo ? <p className="cf-doc-motivo">Motivo: {item.motivo_rechazo}</p> : null}
                        {item.estado === 'pendiente' ? (
                          <p className="cf-doc-nombre-archivo">Ya subiste: {item.nombre_archivo}</p>
                        ) : null}

                        {(item.estado === 'falta' || item.estado === 'rechazado') ? (
                          isEditing ? (
                            <div className="cf-doc-edit">
                              {campos.numero ? (
                                <label className="cf-field">
                                  <span>{campos.numeroLabel}</span>
                                  <input type="text" value={editNumero} onChange={(event) => setEditNumero(event.target.value)} />
                                </label>
                              ) : null}
                              {campos.fechaVencimiento ? (
                                <div className="cf-field-group">
                                  <span className="cf-field-group-label">Fecha de vencimiento</span>
                                  <FechaInputs idPrefix={`doc-${item.categoria}`} parts={editFechaParts} onChange={setEditFechaParts} />
                                </div>
                              ) : null}

                              {editFile ? (
                                <p className="cf-doc-nombre-archivo">Archivo listo: {editFile.nombreArchivo}</p>
                              ) : (
                                <button type="button" className="cf-secondary-button" onClick={() => setEditShowCapture(true)}>
                                  Elegir archivo
                                </button>
                              )}

                              {editError ? <p className="cf-error">{editError}</p> : null}

                              <div className="cf-doc-edit-actions">
                                <button type="button" className="cf-link-button" onClick={closeEditItem} disabled={editUploading}>Cancelar</button>
                                <button type="button" className="cf-primary-button" onClick={handleGuardarItem} disabled={!editFile || editUploading}>
                                  {editUploading ? 'Guardando...' : 'Guardar'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" className="cf-secondary-button" onClick={() => openEditItem(item)}>
                              {item.estado === 'rechazado' ? 'Volver a cargar' : 'Cargar'}
                            </button>
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="cf-doc-cursos">
                  <div className="cf-doc-item-head">
                    <span className="cf-doc-item-label">Cursos</span>
                  </div>
                  {documentosCursos.map((curso) => (
                    <div key={curso.archivo_id} className="cf-doc-curso-item">
                      <FileText size={16} />
                      <div>
                        <strong>{curso.tipo_capacitacion}</strong>
                        <span className={`cf-doc-badge cf-doc-badge-${curso.estado}`}>{ESTADO_LABELS[curso.estado]}</span>
                        {curso.motivo_rechazo ? <p className="cf-doc-motivo">Motivo: {curso.motivo_rechazo}</p> : null}
                      </div>
                    </div>
                  ))}

                  {showCursoForm ? (
                    <div className="cf-doc-edit">
                      <label className="cf-field">
                        <span>Nombre del curso</span>
                        <input type="text" value={cursoNombre} onChange={(event) => setCursoNombre(event.target.value)} />
                      </label>
                      <label className="cf-field">
                        <span>Institución (opcional)</span>
                        <input type="text" value={cursoInstitucion} onChange={(event) => setCursoInstitucion(event.target.value)} />
                      </label>
                      <div className="cf-field-group">
                        <span className="cf-field-group-label">Fecha (opcional)</span>
                        <FechaInputs idPrefix="curso-fecha" parts={cursoFechaParts} onChange={setCursoFechaParts} />
                      </div>
                      {cursoFile ? (
                        <p className="cf-doc-nombre-archivo">Archivo listo: {cursoFile.nombreArchivo}</p>
                      ) : (
                        <button type="button" className="cf-secondary-button" onClick={() => setCursoShowCapture(true)}>
                          Elegir archivo
                        </button>
                      )}
                      {cursoError ? <p className="cf-error">{cursoError}</p> : null}
                      <div className="cf-doc-edit-actions">
                        <button type="button" className="cf-link-button" onClick={resetCursoForm} disabled={cursoUploading}>Cancelar</button>
                        <button
                          type="button"
                          className="cf-primary-button"
                          onClick={handleGuardarCurso}
                          disabled={!cursoFile || !cursoNombre.trim() || cursoUploading}
                        >
                          {cursoUploading ? 'Guardando...' : 'Guardar curso'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="cf-secondary-button" onClick={() => setShowCursoForm(true)}>
                      Agregar curso
                    </button>
                  )}
                </div>

                {itemsValidados.length ? (
                  <div className="cf-doc-validados">
                    <button type="button" className="cf-doc-collapse-toggle" onClick={() => setShowValidados((prev) => !prev)}>
                      {showValidados ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span>Ya validados ({itemsValidados.length})</span>
                    </button>
                    {showValidados ? (
                      <div className="cf-doc-list">
                        {itemsValidados.map((item) => (
                          <div key={item.categoria} className="cf-doc-item cf-doc-item-validado">
                            <div className="cf-doc-item-head">
                              <span className="cf-doc-item-label">{item.label}</span>
                              <span className="cf-doc-badge cf-doc-badge-validado">Validado</span>
                            </div>
                            <p className="cf-doc-nombre-archivo">{item.nombre_archivo}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {documentosTurno ? (
                  <div className="cf-doc-turno">
                    <div className="cf-doc-item-head">
                      <span className="cf-doc-item-label">Tu turno</span>
                    </div>
                    <div className="cf-doc-turno-kv">
                      <span>Régimen</span>
                      <strong>{REGIMEN_TURNO_LABELS[documentosTurno.regimen_turno] || 'Sin asignar'}</strong>
                    </div>
                    {documentosTurno.regimen_turno === 'fijo' ? (
                      <>
                        <div className="cf-doc-turno-kv">
                          <span>Móvil</span>
                          <strong>{documentosTurno.vehiculo_numero_interno || 'Sin asignar'}</strong>
                        </div>
                        <div className="cf-doc-turno-kv">
                          <span>Franja</span>
                          <strong>{documentosTurno.franja_turno || 'Sin asignar'}</strong>
                        </div>
                        <div className="cf-doc-turno-kv">
                          <span>Próximos francos</span>
                          <strong>
                            {documentosTurno.fecha_ref_descanso
                              ? getProximosFrancos(documentosTurno.fecha_ref_descanso, 3).map(formatDateOnlyDisplay).join(', ')
                              : 'Ciclo sin definir'}
                          </strong>
                        </div>
                      </>
                    ) : null}
                    <div className="cf-doc-turno-kv">
                      <MapPin size={14} />
                      <strong>
                        {(documentosTurno.bases || []).length
                          ? documentosTurno.bases.map((b) => b.nombre).join(' · ')
                          : 'Sin base'}
                      </strong>
                    </div>

                    {avisoSent ? (
                      <p className="cf-doc-aviso-ok">Gracias, le avisamos a RRHH.</p>
                    ) : avisoOpen ? (
                      <div className="cf-doc-edit">
                        <label className="cf-field">
                          <span>Comentario (opcional)</span>
                          <input type="text" value={avisoComentario} onChange={(event) => setAvisoComentario(event.target.value)} />
                        </label>
                        {avisoError ? <p className="cf-error">{avisoError}</p> : null}
                        <div className="cf-doc-edit-actions">
                          <button type="button" className="cf-link-button" onClick={() => setAvisoOpen(false)} disabled={avisoSending}>Cancelar</button>
                          <button type="button" className="cf-primary-button" onClick={handleEnviarAviso} disabled={avisoSending}>
                            {avisoSending ? 'Enviando...' : 'Avisar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="cf-link-button" onClick={() => setAvisoOpen(true)}>
                        No coincide, avisar a RRHH
                      </button>
                    )}
                  </div>
                ) : null}
              </>
            ) : null}

            <button type="button" className="cf-primary-button" onClick={() => setStep('listo')}>
              Terminar por ahora
            </button>
          </div>
        ) : null}

        {step === 'listo' ? (
          <div className="cf-step">
            <CheckCircle2 size={40} className="cf-icon-success" />
            <h1>¡Listo, gracias!</h1>
            <p>Podés volver a completar lo que falta con un nuevo link.</p>
          </div>
        ) : null}
      </div>

      {showFotoCapture ? (
        <PersonFotoCapture
          title="Tu foto"
          onCapture={handleCapturarFoto}
          onClose={() => { if (!fotoUploading) setShowFotoCapture(false); }}
          busy={fotoUploading}
        />
      ) : null}

      {editShowCapture ? (
        <DocumentoCapture
          title="Documento"
          onCapture={(file) => { setEditFile(file); setEditShowCapture(false); }}
          onClose={() => setEditShowCapture(false)}
        />
      ) : null}

      {cursoShowCapture ? (
        <DocumentoCapture
          title="Curso"
          onCapture={(file) => { setCursoFile(file); setCursoShowCapture(false); }}
          onClose={() => setCursoShowCapture(false)}
        />
      ) : null}
    </div>
  );
}
