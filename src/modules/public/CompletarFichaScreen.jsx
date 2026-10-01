import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { verificarFicha, actualizarFichaPublica, subirFotoFichaPublica, FichaPublicaError } from '../../services/fichaPublicaService.js';
import PersonFotoCapture from '../../components/PersonFotoCapture.jsx';
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
      setStep('ficha');
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

  const volverADocumentoPorSesionVencida = (message) => {
    setErrorMessage(message);
    setSessionToken('');
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
        volverADocumentoPorSesionVencida(err.message);
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
        volverADocumentoPorSesionVencida(err.message);
      } else {
        setFotoError(err?.message || 'No se pudo subir la foto.');
      }
    } finally {
      setFotoUploading(false);
    }
  };

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
            <button type="button" className="cf-primary-button" onClick={() => setStep('listo')}>
              Finalizar
            </button>
          </div>
        ) : null}

        {step === 'listo' ? (
          <div className="cf-step">
            <CheckCircle2 size={40} className="cf-icon-success" />
            <h1>¡Listo, gracias!</h1>
            <p>Tus datos quedaron actualizados.</p>
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
    </div>
  );
}
