import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, FileText, MapPin } from 'lucide-react';
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
import FramedDocumentCapture from '../../components/FramedDocumentCapture.jsx';
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
//
// Flujo paso a paso (REDISEÑO): bienvenida -> documento -> fecha -> datos ->
// foto -> un documento pendiente/rechazado por pantalla -> cursos -> turno
// -> resumen final. docQueue es una FOTO fija de las categorias que
// necesitaban accion al entrar a la fase de documentos -- no se recalcula
// en cada guardado, para que "Documento 2 de 6" no cambie de numero a mitad
// de camino; el estado de CADA categoria (si ya se guardo, motivo de
// rechazo, etc.) siempre se lee en vivo de documentosChecklist.

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

// Marco de encuadre por categoria -- "card" (tarjeta ID-1 85.6x54mm,
// apaisada: cedula, carne de salud, libreta) o "a4" (hoja A4 vertical:
// titulo, registro MSP, cursos). PDF solo tiene sentido como alternativa
// para documentos tipo "hoja" -- una cedula nunca se escanea como PDF.
const CAPTURA_CONFIG = {
  ci_frente: { frame: 'card', allowPdf: false },
  ci_dorso: { frame: 'card', allowPdf: false },
  carne_salud: { frame: 'card', allowPdf: false },
  libreta_conducir: { frame: 'card', allowPdf: false },
  titulo: { frame: 'a4', allowPdf: true },
  registro_msp: { frame: 'a4', allowPdf: true }
};
const CURSO_CAPTURA_CONFIG = { frame: 'a4', allowPdf: true };

const ESTADO_LABELS = {
  falta: 'Falta',
  pendiente: 'Cargado ✓ · pendiente de revisión',
  rechazado: 'Rechazado',
  validado: 'Validado'
};

// Que campos son obligatorios antes de habilitar la captura -- items sin
// entrada en CATEGORIA_CAMPOS (ci_frente, ci_dorso) no tienen datos que
// completar, asi que siempre devuelve true para ellos.
function camposCompletos(categoria, { numero, fechaParts }) {
  const campos = CATEGORIA_CAMPOS[categoria] || {};
  if (campos.numero && !String(numero || '').trim()) return false;
  if (campos.fechaVencimiento && !partsToIso(fechaParts)) return false;
  return true;
}

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

// Pasos que llevan barra de progreso (bienvenida y resumen quedan afuera:
// ninguno de los dos es "un paso mas" del formulario en si).
const FIXED_STEPS = ['documento', 'fecha', 'datos', 'foto'];

function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="cf-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="cf-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CompletarFichaScreen({ linkCodigo }) {
  // linkCodigo viene de main.jsx cuando la ruta es /f/<codigo> (mecanismo
  // actual, migracion 084). Si es null, estamos en /completar-ficha?token=
  // (mecanismo viejo, se mantiene por los links largos ya enviados) y se
  // lee el token de la query string.
  const linkToken = React.useMemo(
    () => (linkCodigo ? null : new URLSearchParams(window.location.search).get('token')),
    [linkCodigo]
  );
  const hasLink = Boolean(linkCodigo || linkToken);

  const [step, setStep] = React.useState('bienvenida');
  const [linkInvalido, setLinkInvalido] = React.useState(!hasLink);
  // A que step volver despues de re-verificar tras una sesion vencida --
  // por default 'datos' (el primer paso post-verificacion), pero si la
  // sesion vence en 'foto'/'documentos'/'cursos'/'turno' se guarda ese paso
  // aca, para "volver y seguir" en vez de reiniciar el flujo desde cero.
  const [resumeStep, setResumeStep] = React.useState('datos');
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

  // Documentacion (checklist por rol) -- se carga apenas hay sessionToken
  // (no recien al llegar al paso de documentos) para que la barra de
  // progreso ya sepa el total de pasos desde el principio del flujo.
  const [documentosChecklist, setDocumentosChecklist] = React.useState([]);
  const [documentosCursos, setDocumentosCursos] = React.useState([]);
  const [documentosTurno, setDocumentosTurno] = React.useState(null);
  const [documentosLoading, setDocumentosLoading] = React.useState(false);
  const [documentosError, setDocumentosError] = React.useState('');

  // docQueue: snapshot de categorias en 'falta'/'rechazado' al entrar a la
  // fase de documentos -- "al volver con un link nuevo, directo a lo
  // faltante o rechazado; lo validado (y lo ya pendiente de revision) no se
  // vuelve a pedir".
  const [docQueue, setDocQueue] = React.useState([]);
  const [docIndex, setDocIndex] = React.useState(0);
  const [docNumero, setDocNumero] = React.useState('');
  const [docFechaParts, setDocFechaParts] = React.useState({ dia: '', mes: '', anio: '' });
  const [docShowCapture, setDocShowCapture] = React.useState(false);
  const [docUploading, setDocUploading] = React.useState(false);
  const [docError, setDocError] = React.useState('');

  const [cursoNombre, setCursoNombre] = React.useState('');
  const [cursoInstitucion, setCursoInstitucion] = React.useState('');
  const [cursoFechaParts, setCursoFechaParts] = React.useState({ dia: '', mes: '', anio: '' });
  const [cursoShowCapture, setCursoShowCapture] = React.useState(false);
  const [cursoUploading, setCursoUploading] = React.useState(false);
  const [cursoError, setCursoError] = React.useState('');

  // "No coincide, avisar a RRHH"
  const [avisoOpen, setAvisoOpen] = React.useState(false);
  const [avisoComentario, setAvisoComentario] = React.useState('');
  const [avisoSending, setAvisoSending] = React.useState(false);
  const [avisoSent, setAvisoSent] = React.useState(false);
  const [avisoError, setAvisoError] = React.useState('');

  const handleComenzar = () => setStep('documento');

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
      const result = await verificarFicha({ codigo: linkCodigo, token: linkToken, documento: onlyDigits(documento), fechaNacimiento: fechaIso });
      setSessionToken(result.session_token);
      setPersona(result.persona);
      // Si ya habia un draft cargado (volviendo de una sesion vencida en el
      // paso de datos/foto/documentos), se conserva lo que la persona ya
      // habia escrito -- solo se inicializa desde el servidor la primera vez.
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
        setLinkInvalido(true);
        setErrorMessage(err.message);
        setStep('bienvenida');
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
        volverADocumentoPorSesionVencida(err.message, 'datos');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  React.useEffect(() => {
    if (sessionToken) cargarDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  const entrarAFaseDocumentos = () => {
    const pendientes = documentosChecklist
      .filter((item) => item.estado === 'falta' || item.estado === 'rechazado')
      .map((item) => item.categoria);
    setDocQueue(pendientes);
    setDocIndex(0);
    setStep('documentos');
  };

  const currentDocCategoria = docQueue[docIndex] || null;
  const currentDocItem = currentDocCategoria
    ? documentosChecklist.find((item) => item.categoria === currentDocCategoria) || null
    : null;

  const openDocItemFields = (item) => {
    setDocNumero(item.numero || '');
    setDocFechaParts(isoToParts(item.fecha_vencimiento));
    setDocError('');
  };

  React.useEffect(() => {
    if (step === 'documentos' && currentDocItem) openDocItemFields(currentDocItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, docIndex]);

  const avanzarDocIndex = () => {
    setDocError('');
    setDocShowCapture(false);
    setDocIndex((prev) => prev + 1);
  };

  React.useEffect(() => {
    // Se paso del ultimo item de la cola (o la cola esta vacia) -> cursos.
    if (step === 'documentos' && docIndex >= docQueue.length) {
      setStep('cursos');
    }
  }, [step, docIndex, docQueue.length]);

  const handleCapturarDocumentoItem = async (file) => {
    if (!currentDocCategoria) return;
    setDocUploading(true);
    setDocError('');
    try {
      const campos = CATEGORIA_CAMPOS[currentDocCategoria] || {};
      const result = await subirDocumentoFichaPublica(sessionToken, {
        categoria: currentDocCategoria,
        nombreArchivo: file.nombreArchivo,
        contentType: file.contentType,
        blob: file.blob,
        numero: campos.numero ? docNumero || null : null,
        fechaVencimiento: campos.fechaVencimiento ? (partsToIso(docFechaParts) || null) : null
      });
      setDocumentosChecklist(result.checklist || []);
      setDocumentosCursos(result.cursos || []);
      setDocShowCapture(false);
    } catch (err) {
      if (err instanceof FichaPublicaError && err.status === 401) {
        setDocShowCapture(false);
        volverADocumentoPorSesionVencida(err.message, 'documentos');
      } else {
        setDocError(err?.message || 'No se pudo subir el documento.');
      }
    } finally {
      setDocUploading(false);
    }
  };

  // cursoCamposCompletos: nombre, institucion y fecha son obligatorios para
  // habilitar la captura (antes institucion/fecha eran opcionales).
  const cursoCamposCompletos = Boolean(cursoNombre.trim() && cursoInstitucion.trim() && partsToIso(cursoFechaParts));

  const resetCursoForm = () => {
    setCursoShowCapture(false);
    setCursoNombre('');
    setCursoInstitucion('');
    setCursoFechaParts({ dia: '', mes: '', anio: '' });
    setCursoError('');
  };

  const handleCapturarCurso = async (file) => {
    setCursoUploading(true);
    setCursoError('');
    try {
      const result = await subirDocumentoFichaPublica(sessionToken, {
        categoria: 'curso',
        nombreArchivo: file.nombreArchivo,
        contentType: file.contentType,
        blob: file.blob,
        cursoNombre: cursoNombre.trim(),
        cursoInstitucion: cursoInstitucion.trim(),
        fechaEmision: partsToIso(cursoFechaParts)
      });
      setDocumentosChecklist(result.checklist || []);
      setDocumentosCursos(result.cursos || []);
      resetCursoForm();
    } catch (err) {
      if (err instanceof FichaPublicaError && err.status === 401) {
        setCursoShowCapture(false);
        volverADocumentoPorSesionVencida(err.message, 'cursos');
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
        volverADocumentoPorSesionVencida(err.message, 'turno');
      } else {
        setAvisoError(err?.message || 'No se pudo registrar el aviso.');
      }
    } finally {
      setAvisoSending(false);
    }
  };

  // --- Progreso y salida con aviso ---
  const totalSteps = FIXED_STEPS.length + docQueue.length + 1 /* cursos */ + 1 /* turno */;
  const currentStepNumber = (() => {
    const fixedIdx = FIXED_STEPS.indexOf(step);
    if (fixedIdx >= 0) return fixedIdx + 1;
    if (step === 'documentos') return FIXED_STEPS.length + Math.min(docIndex, docQueue.length) + 1;
    if (step === 'cursos') return FIXED_STEPS.length + docQueue.length + 1;
    if (step === 'turno') return FIXED_STEPS.length + docQueue.length + 2;
    return totalSteps;
  })();
  const showProgress = FIXED_STEPS.includes(step) || step === 'documentos' || step === 'cursos' || step === 'turno';

  const hayCargaDocumentalPendiente = () =>
    fotoUploading || showFotoCapture || docUploading || docShowCapture || cursoUploading || cursoShowCapture;

  React.useEffect(() => {
    const handler = (event) => {
      if (!hayCargaDocumentalPendiente()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoUploading, showFotoCapture, docUploading, docShowCapture, cursoUploading, cursoShowCapture]);

  const handleTerminarPorAhora = () => {
    if (hayCargaDocumentalPendiente()
      && !window.confirm('Tenés una carga en curso o un archivo sin confirmar. ¿Seguro que querés salir?')) {
      return;
    }
    setStep('resumen');
  };

  // --- Resumen final ---
  const resumenCargados = documentosChecklist.filter((item) => item.estado === 'pendiente' || item.estado === 'validado').length;
  const resumenTotal = documentosChecklist.length;
  const resumenFaltantes = documentosChecklist.filter((item) => item.estado === 'falta' || item.estado === 'rechazado');

  return (
    <div className="cf-root">
      <div className="cf-card">
        {step === 'bienvenida' ? (
          <div className="cf-step cf-step-bienvenida">
            <img src={suEmergenciaLogo} alt="SU Emergencia" className="cf-logo cf-logo-grande" />
            {linkInvalido ? (
              <>
                <AlertTriangle size={32} className="cf-icon-warning" />
                <h1>Enlace no disponible</h1>
                <p>{errorMessage || 'El enlace no es válido o venció. Pedí uno nuevo a tu contacto de RRHH.'}</p>
              </>
            ) : (
              <>
                <h1>Formulario de funcionario</h1>
                <p>Completá este formulario con los datos solicitados, que serán presentados ante el MSP.</p>
                <p>Es importante cargar toda la información. Si en este momento no tenés algún dato o documento, podés continuar igual y completarlo más adelante.</p>
                <p className="cf-nota-privacidad">Tus datos se usan únicamente para la gestión de personal de SU Emergencia y su presentación ante el MSP.</p>
                <button type="button" className="cf-primary-button cf-primary-button-verde" onClick={handleComenzar}>
                  Comenzar
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <img src={suEmergenciaLogo} alt="SU Emergencia" className="cf-logo" />
            {showProgress ? <ProgressBar current={currentStepNumber} total={totalSteps} /> : null}
          </>
        )}

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

        {step === 'datos' && persona ? (
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
              {loading ? 'Guardando...' : 'Continuar'}
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
            <button type="button" className="cf-primary-button" onClick={entrarAFaseDocumentos}>
              Continuar
            </button>
            <button type="button" className="cf-link-button" onClick={handleTerminarPorAhora}>
              Terminar por ahora
            </button>
          </div>
        ) : null}

        {step === 'documentos' ? (
          documentosLoading ? (
            <p className="cf-status">Cargando documentación...</p>
          ) : documentosError ? (
            <p className="cf-error">{documentosError}</p>
          ) : currentDocItem ? (
            <div className="cf-step cf-step-doc">
              <p className="cf-doc-counter">Documento {docIndex + 1} de {docQueue.length} · {currentDocItem.label}</p>
              {currentDocItem.estado === 'rechazado' && currentDocItem.motivo_rechazo ? (
                <p className="cf-doc-motivo">Motivo del rechazo: {currentDocItem.motivo_rechazo}</p>
              ) : null}

              {currentDocItem.estado === 'pendiente' ? (
                <>
                  <CheckCircle2 size={40} className="cf-icon-success" />
                  <p className="cf-subtitle">Cargado correctamente. Queda pendiente de revisión.</p>
                  <button type="button" className="cf-primary-button" onClick={avanzarDocIndex}>Siguiente</button>
                </>
              ) : (
                <>
                  {(() => {
                    const campos = CATEGORIA_CAMPOS[currentDocCategoria] || {};
                    const completos = camposCompletos(currentDocCategoria, { numero: docNumero, fechaParts: docFechaParts });
                    return (
                      <>
                        {campos.numero ? (
                          <label className="cf-field">
                            <span>{campos.numeroLabel}</span>
                            <input type="text" value={docNumero} onChange={(event) => setDocNumero(event.target.value)} />
                          </label>
                        ) : null}
                        {campos.fechaVencimiento ? (
                          <div className="cf-field-group">
                            <span className="cf-field-group-label">Fecha de vencimiento</span>
                            <FechaInputs idPrefix={`doc-${currentDocCategoria}`} parts={docFechaParts} onChange={setDocFechaParts} />
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className="cf-primary-button"
                          onClick={() => setDocShowCapture(true)}
                          disabled={!completos}
                        >
                          {completos ? 'Cargar documento' : 'Completa los datos para cargar el documento'}
                        </button>
                      </>
                    );
                  })()}
                  <button type="button" className="cf-link-button" onClick={avanzarDocIndex}>Saltar por ahora</button>
                </>
              )}
              <button type="button" className="cf-link-button" onClick={handleTerminarPorAhora}>Terminar por ahora</button>
            </div>
          ) : null
        ) : null}

        {step === 'cursos' ? (
          <div className="cf-step cf-step-doc">
            <h1>Cursos</h1>
            <p className="cf-subtitle">Si hiciste algún curso o capacitación, cargalo acá. Es opcional.</p>

            {documentosCursos.length ? (
              <div className="cf-doc-list">
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
              </div>
            ) : null}

            <div className="cf-doc-edit">
              <label className="cf-field">
                <span>Nombre del curso</span>
                <input type="text" value={cursoNombre} onChange={(event) => setCursoNombre(event.target.value)} />
              </label>
              <label className="cf-field">
                <span>Institución</span>
                <input type="text" value={cursoInstitucion} onChange={(event) => setCursoInstitucion(event.target.value)} />
              </label>
              <div className="cf-field-group">
                <span className="cf-field-group-label">Fecha</span>
                <FechaInputs idPrefix="curso-fecha" parts={cursoFechaParts} onChange={setCursoFechaParts} />
              </div>
              <button
                type="button"
                className="cf-secondary-button"
                onClick={() => setCursoShowCapture(true)}
                disabled={!cursoCamposCompletos}
              >
                {cursoCamposCompletos ? 'Agregar curso' : 'Completa los datos para cargar el documento'}
              </button>
            </div>

            <button type="button" className="cf-primary-button" onClick={() => setStep('turno')}>Continuar</button>
            <button type="button" className="cf-link-button" onClick={handleTerminarPorAhora}>Terminar por ahora</button>
          </div>
        ) : null}

        {step === 'turno' ? (
          <div className="cf-step cf-step-doc">
            <h1>Tu turno</h1>
            {documentosTurno ? (
              <div className="cf-doc-turno">
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
            ) : (
              <p className="cf-subtitle">Todavía no tenés un turno asignado.</p>
            )}

            <button type="button" className="cf-primary-button" onClick={() => setStep('resumen')}>Finalizar</button>
          </div>
        ) : null}

        {step === 'resumen' ? (
          <div className="cf-step">
            <CheckCircle2 size={40} className="cf-icon-success" />
            <h1>¡Listo, gracias!</h1>
            {resumenTotal ? (
              <p className="cf-subtitle">
                Cargaste {resumenCargados} de {resumenTotal}.
                {resumenFaltantes.length
                  ? ` Te faltan: ${resumenFaltantes.map((item) => item.label).join(', ')}. Podés completarlos más adelante con un nuevo link.`
                  : ' Completaste toda la documentación requerida.'}
              </p>
            ) : (
              <p>Podés volver a completar lo que falta con un nuevo link.</p>
            )}
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

      {docShowCapture && currentDocItem ? (
        <FramedDocumentCapture
          title={currentDocItem.label}
          frame={(CAPTURA_CONFIG[currentDocCategoria] || {}).frame || 'card'}
          allowPdf={Boolean((CAPTURA_CONFIG[currentDocCategoria] || {}).allowPdf)}
          instruccion={`Ubicá ${currentDocItem.label.toLowerCase()} dentro del recuadro`}
          onCapture={handleCapturarDocumentoItem}
          onClose={() => { if (!docUploading) { setDocShowCapture(false); setDocError(''); } }}
          onPickAnother={() => setDocError('')}
          busy={docUploading}
          uploadError={docError}
        />
      ) : null}

      {cursoShowCapture ? (
        <FramedDocumentCapture
          title="Curso"
          frame={CURSO_CAPTURA_CONFIG.frame}
          allowPdf={CURSO_CAPTURA_CONFIG.allowPdf}
          instruccion="Ubicá el certificado del curso dentro del recuadro"
          onCapture={handleCapturarCurso}
          onClose={() => { if (!cursoUploading) { setCursoShowCapture(false); setCursoError(''); } }}
          onPickAnother={() => setCursoError('')}
          busy={cursoUploading}
          uploadError={cursoError}
        />
      ) : null}
    </div>
  );
}
