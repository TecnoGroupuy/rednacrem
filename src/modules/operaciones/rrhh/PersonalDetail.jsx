import React from 'react';
import { MapPin, Star, UserCircle2, Plus, Trash2, AlertTriangle, CalendarClock, Camera, CameraOff, History, X, Baby, Stethoscope, GraduationCap } from 'lucide-react';
import { StatusPill, LICENCIA_TIPO_LABELS, estadoEfectivoDisplay } from './PersonalList.jsx';
import { displayBases, displayFullName } from './personDisplay.js';
import PersonFotoCapture from '../../../components/PersonFotoCapture.jsx';
import PersonalDocumentosTab from './PersonalDocumentosTab.jsx';
import { esMedico, esEnfermero, getEspecialidadesMedico, getFormacionEnfermero, poblacionLabel } from './personalEspecialidadesHelpers.js';

// Habilitaciones/Capacitaciones/Carné de salud se sacaron de aca (ver
// PersonalDocumentosTab.jsx, seccion "Registros anteriores"): esas 3
// pestañas viejas permitian cargar datos sin ningun archivo adjunto, un
// flujo paralelo a Documentación que ya cubre lo mismo con el archivo
// subido. Los registros que ya existian sin archivo se migraron a esa
// seccion de solo lectura antes de sacar las pestañas, para no perderlos.
const TABS = [
  { key: 'datos_generales', label: 'Datos generales' },
  { key: 'roles', label: 'Roles' },
  { key: 'documentos', label: 'Documentación' },
  { key: 'licencias', label: 'Licencias' },
  { key: 'cambios', label: 'Cambios' }
];

const TIPO_PERSONAL_LABELS = { interno: 'Interno', externo: 'Externo', facturador: 'Facturador' };

const CAMBIO_CAMPO_LABELS = {
  telefono: 'Teléfono',
  email: 'Email',
  domicilio: 'Domicilio',
  fecha_nacimiento: 'Fecha de nacimiento',
  foto_url: 'Foto'
};

// Campos opcionales de su_personal (todo menos nombre/apellido/tipo_personal,
// que son los unicos NOT NULL) -- se usan para marcar visualmente que le
// falta completar a cada funcionario, ya que la carga inicial en produccion
// va a ser parcial a proposito.
const OPTIONAL_FIELD_LABELS = {
  documento: 'Documento',
  fecha_nacimiento: 'Fecha de nacimiento',
  telefono: 'Teléfono',
  email: 'Email',
  domicilio: 'Domicilio',
  fecha_ingreso: 'Fecha de ingreso'
};

// base_id ya no es un campo suelto de su_personal a estos efectos (migracion
// 081, varias bases por persona) -- "Base asignada" falta cuando el array
// person.bases viene vacio, no cuando un unico base_id esta en null.
export function getMissingFields(personal) {
  if (!personal) return [];
  const missing = Object.entries(OPTIONAL_FIELD_LABELS)
    .filter(([field]) => !personal[field])
    .map(([, label]) => label);
  if (!(personal.bases || []).length) missing.push('Base asignada');
  return missing;
}

// Duplicado a proposito (no importado desde RrhhScreen.jsx) para no crear un
// import circular entre el screen y este componente. Ver el comentario
// gemelo en RrhhScreen.jsx: las columnas de fecha se confirmaron por nombre
// contra produccion, no por tipo exacto, asi que el backend puede devolver
// "2026-01-10" o "2026-01-10T03:00:00.000Z" segun como esten tipadas.
function toDateOnly(value) {
  if (!value) return '';
  const str = String(value);
  return str.length > 10 && str.includes('T') ? str.slice(0, 10) : str;
}

// Puramente por string, sin pasar por ningun objeto Date -- mismo criterio
// (y misma duplicacion a proposito) que su gemela en PersonalList.jsx.
function formatDateOnlyDisplay(value) {
  const dateOnly = toDateOnly(value);
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return dateOnly;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

// Hoy en la zona horaria del navegador, sin pasar por UTC en ningun momento
// -- getFullYear/getMonth/getDate son locales por definicion, a diferencia
// de toISOString() (que corre el dia cerca de medianoche en UTC-3). Es el
// default razonable para el date input de "dar de baja": quien lo carga
// esta mirando la pantalla hoy, en su propia zona horaria.
function todayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Aritmetica de fechas pura para el ciclo 4x1 del regimen fijo (ver
// migracion 069): parsear anio/mes/dia a mano y operar con Date.UTC evita
// el corrimiento de dia de new Date('YYYY-MM-DD') (que arma medianoche
// LOCAL, y en UTC-3 cae en el dia anterior al convertir a UTC). Con
// Date.UTC ambos extremos quedan en el mismo huso horario ficticio (UTC),
// asi que restarlos da una diferencia de dias exacta sin importar la zona
// horaria del navegador.
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

// es_franco(d) = ((d - ref) en dias) mod 5 === 0 (ciclo 4 dias de trabajo +
// 1 de franco). El modulo se normaliza a [0, 5) antes de comparar porque el
// resto de JS para diferencias negativas (hoy anterior a la referencia)
// puede salir negativo.
function isFranco(dateOnlyValue, refDateOnly) {
  const diff = daysBetweenDateOnly(refDateOnly, dateOnlyValue);
  return ((diff % 5) + 5) % 5 === 0;
}

// Proximos N francos desde hoy inclusive (si hoy es franco, es el primero
// de la lista).
function getProximosFrancos(refDateOnly, count = 3) {
  const francos = [];
  let cursor = todayDateOnly();
  while (francos.length < count) {
    if (isFranco(cursor, refDateOnly)) francos.push(cursor);
    cursor = addDaysDateOnly(cursor, 1);
  }
  return francos;
}

const emptyLicenciaDraft = { tipo: '', fecha_desde: '', fecha_hasta: '', observaciones: '' };

// Mismos 4 roles que REGIMEN_TURNO_ROLES en PersonalForm.jsx (duplicado a
// proposito, mismo criterio que el resto de los helpers de este archivo).
const REGIMEN_TURNO_ROLES = new Set(['Enfermero', 'Jefe_de_enfermeria', 'Chofer', 'Jefe_de_choferes']);
const FRANJA_TURNO_OPTIONS = ['00-06', '06-12', '12-18', '18-00'];
const emptyRegimenDraft = { regimen_turno: '', vehiculo_id: '', franja_turno: '', fecha_ref_descanso: '' };
const REGIMEN_TURNO_LABELS = { fijo: 'Fijo', turnante: 'Turnante', suplente: 'Suplente' };

export default function PersonalDetail({
  Button,
  Tag,
  personal,
  loading,
  error,
  actionError,
  activeTab,
  onTabChange,
  onClose,
  onEdit,
  roleOptions,
  formatRol,
  getBaseLabel,
  getStatusVariant,
  onAddRole,
  onRemoveRole,
  especialidadesCatalogo,
  onAddEspecialidad,
  onRemoveEspecialidad,
  onSetPoblacionEnfermeria,
  onAddLicencia,
  onUpdateLicencia,
  onDarDeBaja,
  onUpdateRegimen,
  vehiculos,
  onUploadFoto,
  onDeleteFoto,
  fotoUploading,
  cambiosPublicos,
  cambiosLoading,
  cambiosError
}) {
  const [roleToAdd, setRoleToAdd] = React.useState('');
  const [especialidadToAdd, setEspecialidadToAdd] = React.useState('');
  const [showFotoCapture, setShowFotoCapture] = React.useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = React.useState(false);
  const [showLicenciaForm, setShowLicenciaForm] = React.useState(false);
  const [editingLicenciaId, setEditingLicenciaId] = React.useState(null);
  const [licenciaDraft, setLicenciaDraft] = React.useState(emptyLicenciaDraft);
  const [showBajaConfirm, setShowBajaConfirm] = React.useState(false);
  const [bajaFechaEgreso, setBajaFechaEgreso] = React.useState(todayDateOnly());
  const [showRegimenEdit, setShowRegimenEdit] = React.useState(false);
  const [regimenDraft, setRegimenDraft] = React.useState(emptyRegimenDraft);
  const [regimenSaving, setRegimenSaving] = React.useState(false);

  React.useEffect(() => {
    setRoleToAdd('');
    setEspecialidadToAdd('');
    setShowLicenciaForm(false);
    setEditingLicenciaId(null);
    setLicenciaDraft(emptyLicenciaDraft);
    setShowBajaConfirm(false);
    setBajaFechaEgreso(todayDateOnly());
    setShowFotoCapture(false);
    setShowPhotoViewer(false);
    setShowRegimenEdit(false);
  }, [personal?.id]);

  // Escape cierra la ficha -- mismo criterio que el boton X. No se registra
  // si hay un sub-modal propio abierto (foto grande, captura, confirmar
  // baja): en esos casos Escape deberia cerrar ESE paso primero, no saltar
  // directo a cerrar toda la ficha.
  //
  // El listener se suscribe UNA sola vez (deps []) y lee el estado actual
  // via ref, en vez de volver a suscribirse en cada cambio de
  // showPhotoViewer/showFotoCapture/onClose: hay un listener de actividad
  // global (registerActivity en main.jsx) que corre en CADA keydown de toda
  // la app y re-renderiza el arbol completo, incluida esta ficha -- si este
  // efecto dependiera de esos valores, React desuscribe y vuelve a
  // suscribir el listener de window EN MEDIO del mismo despacho del evento
  // Escape (el listener de actividad, montado antes, se ejecuta primero en
  // bubble phase), y por spec del DOM un listener removido durante el
  // despacho de un evento ya no se invoca para ESE evento -- Escape se
  // perdia silenciosamente. Con deps [] el listener nunca se recrea, asi
  // que no hay carrera posible.
  const escapeStateRef = React.useRef(null);
  escapeStateRef.current = { showPhotoViewer, showFotoCapture, onClose };

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const { showPhotoViewer: isPhotoViewerOpen, showFotoCapture: isCaptureOpen, onClose: close } = escapeStateRef.current;
      if (isPhotoViewerOpen) { setShowPhotoViewer(false); return; }
      if (isCaptureOpen) return;
      close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de personal">
        <div className="lot-wizard-overlay" onClick={onClose} />
        <div className="rrhh-detail-panel">
          <button type="button" className="rrhh-detail-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
          <div className="rrhh-detail-header">
            <div>Cargando funcionario...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de personal">
        <div className="lot-wizard-overlay" onClick={onClose} />
        <div className="rrhh-detail-panel">
          <button type="button" className="rrhh-detail-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
          <div className="rrhh-detail-header">
            <div>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!personal) return null;

  const roles = personal.roles || [];
  const licencias = personal.licencias || [];

  const primaryRole = roles.find((item) => item.rol_principal)?.rol || '';
  const missingFields = getMissingFields(personal);
  const availableRolesToAdd = roleOptions.filter((rol) => !roles.some((item) => item.rol === rol));
  const estadoIndicator = estadoEfectivoDisplay(personal);

  // Valor de un campo opcional: si esta vacio, lo marca visualmente como
  // pendiente en vez de mostrar un simple "Sin dato" igual al resto.
  const renderField = (value, isMissing) => (
    isMissing
      ? <strong className="rrhh-missing-value">Sin completar</strong>
      : <strong>{value}</strong>
  );

  // Regimen (fijo/turnante/suplente) solo tiene sentido para estos 4 roles
  // -- mismo criterio que PersonalForm.jsx, pero aca SI se conoce el rol
  // real de la persona (a diferencia del formulario, que a veces no sabe
  // cual es "el" rol relevante), asi que no hace falta el fallback de
  // "mostrar siempre si ya tiene algun rol".
  const hasRegimenRole = roles.some((item) => REGIMEN_TURNO_ROLES.has(item.rol));
  const hasEnfermeroRole = roles.some((item) => item.rol === 'Enfermero');
  const showRegimenFijoEditFields = regimenDraft.regimen_turno === 'fijo';
  const showFranjaEditSelect = showRegimenFijoEditFields && hasEnfermeroRole;
  const selectedBaseIds = (personal.bases || []).map((b) => b.base_id);
  const vehiculosFiltrados = selectedBaseIds.length
    ? (vehiculos || []).filter((v) => selectedBaseIds.includes(v.base_id))
    : (vehiculos || []);

  const handleAddRole = () => {
    if (!roleToAdd) return;
    onAddRole(roleToAdd, { rol_principal: !roles.length });
    setRoleToAdd('');
  };

  // Especialidad (médico) / formación (enfermero), 2026-10 -- mismo
  // criterio de "jefaturas equivalentes" que el backend/PersonalForm.
  const personaEsMedico = esMedico(personal);
  const personaEsEnfermero = esEnfermero(personal);
  const especialidadesMedico = getEspecialidadesMedico(personal);
  const formacionEnfermero = getFormacionEnfermero(personal);
  const especialidadesOptions = (especialidadesCatalogo || []).filter(
    (c) => c.tipo === 'especialidad' && !especialidadesMedico.some((e) => e.catalogo_id === c.id)
  );
  const formacionOptions = (especialidadesCatalogo || []).filter((c) => c.tipo === 'formacion');

  const handleAddEspecialidad = () => {
    if (!especialidadToAdd) return;
    onAddEspecialidad(especialidadToAdd);
    setEspecialidadToAdd('');
  };

  const startEditLicencia = (licencia) => {
    setEditingLicenciaId(licencia.id);
    setLicenciaDraft({
      tipo: licencia.tipo || '',
      fecha_desde: toDateOnly(licencia.fecha_desde),
      fecha_hasta: toDateOnly(licencia.fecha_hasta),
      observaciones: licencia.observaciones || ''
    });
    setShowLicenciaForm(true);
  };

  const startNewLicencia = () => {
    setEditingLicenciaId(null);
    setLicenciaDraft(emptyLicenciaDraft);
    setShowLicenciaForm(true);
  };

  const handleSaveLicencia = () => {
    if (!licenciaDraft.tipo || !licenciaDraft.fecha_desde) return;
    const payload = {
      tipo: licenciaDraft.tipo,
      fecha_desde: licenciaDraft.fecha_desde,
      fecha_hasta: licenciaDraft.fecha_hasta || null,
      observaciones: licenciaDraft.observaciones || null
    };
    if (editingLicenciaId) {
      onUpdateLicencia(editingLicenciaId, payload);
    } else {
      onAddLicencia(payload);
    }
    setLicenciaDraft(emptyLicenciaDraft);
    setEditingLicenciaId(null);
    setShowLicenciaForm(false);
  };

  const handleConfirmBaja = () => {
    if (!bajaFechaEgreso) return;
    onDarDeBaja(bajaFechaEgreso);
  };

  const openRegimenEdit = () => {
    setRegimenDraft({
      regimen_turno: personal.regimen_turno || '',
      vehiculo_id: personal.vehiculo_id || '',
      franja_turno: personal.franja_turno || '',
      fecha_ref_descanso: toDateOnly(personal.fecha_ref_descanso)
    });
    setShowRegimenEdit(true);
  };

  const setRegimenField = (field, value) => {
    setRegimenDraft((prev) => {
      const next = { ...prev, [field]: value };
      // Igual criterio que PersonalForm.jsx: salir de "fijo" limpia los 3
      // campos que solo aplican a ese regimen.
      if (field === 'regimen_turno' && value !== 'fijo') {
        next.vehiculo_id = '';
        next.franja_turno = '';
        next.fecha_ref_descanso = '';
      }
      return next;
    });
  };

  const handleSaveRegimen = async () => {
    setRegimenSaving(true);
    try {
      await onUpdateRegimen({
        regimen_turno: regimenDraft.regimen_turno || null,
        vehiculo_id: regimenDraft.vehiculo_id || null,
        franja_turno: regimenDraft.franja_turno || null,
        fecha_ref_descanso: regimenDraft.fecha_ref_descanso || null
      });
      setShowRegimenEdit(false);
    } finally {
      setRegimenSaving(false);
    }
  };

  const handleCapturarFoto = async (blob) => {
    await onUploadFoto(blob);
    setShowFotoCapture(false);
  };

  const handleQuitarFoto = async () => {
    setShowPhotoViewer(false);
    await onDeleteFoto();
  };

  return (
    <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Ficha de personal">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <div className="rrhh-detail-panel">
        <button type="button" className="rrhh-detail-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        <div className="rrhh-detail-header">
          <div className="rrhh-detail-identity">
            <button
              type="button"
              className="rrhh-detail-avatar rrhh-detail-avatar-button"
              onClick={() => setShowPhotoViewer(true)}
              aria-label="Ver foto"
              style={personal.foto_url ? { backgroundImage: `url(${personal.foto_url})` } : undefined}
            >
              {!personal.foto_url ? (`${personal.nombre?.[0] || ''}${personal.apellido?.[0] || ''}`.toUpperCase() || 'SU') : null}
              <span className="rrhh-detail-avatar-overlay"><Camera size={16} /></span>
            </button>
            <div>
              <h2>{displayFullName(personal)}</h2>
              <p className="rrhh-detail-subtitle">
                <span>{primaryRole ? formatRol(primaryRole) : 'Sin rol principal definido'}</span>
                <span aria-hidden="true"> · </span>
                <span className="rrhh-detail-base-inline">
                  <MapPin size={14} />
                  {displayBases(personal.bases)}
                </span>
              </p>
              {/* Foto de perfil obligatoria en el link de autocompletado
                  (2026-10) -- aviso explícito acá, no solo el placeholder de
                  iniciales en el avatar (eso ya existía pero no era
                  suficientemente accionable para que RRHH se la pida). */}
              {!personal.foto_url ? (
                <p className="rrhh-detail-sin-foto">
                  <CameraOff size={14} />
                  Sin foto cargada
                </p>
              ) : null}
            </div>
          </div>
          <div className="rrhh-detail-header-chips">
            <span className={`rrhh-detail-status rrhh-detail-status-${estadoIndicator.className}`}>
              <span className="rrhh-detail-status-dot" />
              {estadoIndicator.label}
            </span>
            <Tag variant={personal.tipo_personal === 'externo' ? 'info' : 'neutral'}>
              {TIPO_PERSONAL_LABELS[personal.tipo_personal] || personal.tipo_personal}
            </Tag>
          </div>
          <div className="rrhh-detail-header-actions">
            <Button variant="secondary" onClick={() => onEdit(personal.id)}>Editar</Button>
            {personal.estado !== 'baja' ? (
              <Button variant="danger" onClick={() => setShowBajaConfirm((prev) => !prev)}>Dar de baja</Button>
            ) : null}
          </div>
        </div>

        {showBajaConfirm ? (
          <div className="rrhh-inline-form" style={{ margin: '0 20px 12px', gridTemplateColumns: 'auto auto auto' }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12 }}>Fecha de egreso</span>
              <input type="date" value={bajaFechaEgreso} onChange={(event) => setBajaFechaEgreso(event.target.value)} />
            </label>
            <div className="rrhh-inline-actions">
              <Button variant="ghost" onClick={() => setShowBajaConfirm(false)}>Cancelar</Button>
              <Button onClick={handleConfirmBaja} disabled={!bajaFechaEgreso}>Confirmar baja</Button>
            </div>
          </div>
        ) : null}

        {actionError ? (
          <div style={{ color: '#b91c1c', padding: '8px 20px' }}>{actionError}</div>
        ) : null}

        {missingFields.length ? (
          <div className="rrhh-alert-banner warning" style={{ margin: '0 20px 12px' }}>
            <AlertTriangle size={16} />
            <span>Faltan completar {missingFields.length} dato{missingFields.length === 1 ? '' : 's'}: {missingFields.join(', ')}</span>
          </div>
        ) : null}

        <div className="rrhh-detail-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rrhh-detail-content">
          {activeTab === 'datos_generales' ? (
            <div className="rrhh-detail-section-grid">
              <section className="rrhh-detail-card">
                <div className="rrhh-section-title"><UserCircle2 size={18} /> Datos generales</div>
                <div className="rrhh-kv-list">
                  <div><span>Documento</span>{renderField(personal.documento, !personal.documento)}</div>
                  <div><span>Fecha de nacimiento</span>{renderField(formatDateOnlyDisplay(personal.fecha_nacimiento), !personal.fecha_nacimiento)}</div>
                  <div><span>Teléfono</span>{renderField(personal.telefono, !personal.telefono)}</div>
                  <div><span>Email</span>{renderField(personal.email, !personal.email)}</div>
                  <div><span>Domicilio</span>{renderField(personal.domicilio, !personal.domicilio)}</div>
                  <div><span>Fecha de ingreso</span>{renderField(formatDateOnlyDisplay(personal.fecha_ingreso), !personal.fecha_ingreso)}</div>
                  <div><span>Fecha de egreso</span><strong>{personal.fecha_egreso ? formatDateOnlyDisplay(personal.fecha_egreso) : 'Activo'}</strong></div>
                  <div><span>Estado</span><strong><StatusPill person={personal} getStatusVariant={getStatusVariant} Tag={Tag} /></strong></div>
                  <div><span>Tipo de personal</span><strong><Tag variant={personal.tipo_personal === 'externo' ? 'info' : 'success'}>{personal.tipo_personal}</Tag></strong></div>
                  {personal.tipo_personal === 'externo' ? (
                    <div>
                      <span>Empresa contratista</span>
                      <strong>
                        {/* No hay endpoint de backend para resolver el nombre de la empresa
                            contratista (su_empresas_contratistas) -- se muestra el id crudo. */}
                        {personal.empresa_contratista_id || 'Sin dato'}
                      </strong>
                    </div>
                  ) : null}
                </div>
              </section>

              {hasRegimenRole ? (
                <section className="rrhh-detail-card">
                  <div className="rrhh-section-title">
                    <div className="rrhh-inline-title"><CalendarClock size={18} /><span>Régimen</span></div>
                    {!showRegimenEdit ? (
                      <Button variant="secondary" onClick={openRegimenEdit}>Editar régimen</Button>
                    ) : null}
                  </div>

                  {showRegimenEdit ? (
                    <div className="rrhh-inline-form" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                      <label style={{ display: 'grid', gap: 4 }}>
                        <span style={{ fontSize: 12 }}>Régimen</span>
                        <select value={regimenDraft.regimen_turno} onChange={(event) => setRegimenField('regimen_turno', event.target.value)}>
                          <option value="">Sin asignar</option>
                          <option value="fijo">Fijo</option>
                          <option value="turnante">Turnante</option>
                          <option value="suplente">Suplente</option>
                        </select>
                      </label>
                      {showRegimenFijoEditFields ? (
                        <label style={{ display: 'grid', gap: 4 }}>
                          <span style={{ fontSize: 12 }}>Móvil</span>
                          <select value={regimenDraft.vehiculo_id} onChange={(event) => setRegimenField('vehiculo_id', event.target.value)}>
                            <option value="">Sin asignar</option>
                            {vehiculosFiltrados.map((v) => (
                              <option key={v.id} value={v.id}>{v.numero_interno || v.matricula || v.id}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {showRegimenFijoEditFields ? (
                        <label style={{ display: 'grid', gap: 4 }}>
                          <span style={{ fontSize: 12 }}>Fecha de referencia de franco</span>
                          <input
                            type="date"
                            value={regimenDraft.fecha_ref_descanso}
                            onChange={(event) => setRegimenField('fecha_ref_descanso', event.target.value)}
                          />
                        </label>
                      ) : null}
                      {showFranjaEditSelect ? (
                        <label style={{ display: 'grid', gap: 4 }}>
                          <span style={{ fontSize: 12 }}>Franja</span>
                          <select value={regimenDraft.franja_turno} onChange={(event) => setRegimenField('franja_turno', event.target.value)}>
                            <option value="">Sin asignar</option>
                            {FRANJA_TURNO_OPTIONS.map((franja) => <option key={franja} value={franja}>{franja}</option>)}
                          </select>
                        </label>
                      ) : null}
                      <div className="rrhh-inline-actions">
                        <Button variant="ghost" onClick={() => setShowRegimenEdit(false)} disabled={regimenSaving}>Cancelar</Button>
                        <Button onClick={handleSaveRegimen} disabled={regimenSaving}>{regimenSaving ? 'Guardando...' : 'Guardar'}</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rrhh-kv-list">
                      <div><span>Régimen</span><strong>{REGIMEN_TURNO_LABELS[personal.regimen_turno] || 'Sin asignar'}</strong></div>
                      {personal.regimen_turno === 'fijo' ? (
                        <>
                          <div><span>Móvil</span>{renderField(personal.vehiculo_numero_interno, !personal.vehiculo_numero_interno)}</div>
                          {hasEnfermeroRole ? (
                            <div><span>Franja</span>{renderField(personal.franja_turno, !personal.franja_turno)}</div>
                          ) : null}
                          <div><span>Fecha de referencia</span>{renderField(personal.fecha_ref_descanso ? formatDateOnlyDisplay(personal.fecha_ref_descanso) : '', !personal.fecha_ref_descanso)}</div>
                          <div>
                            <span>Próximos francos</span>
                            <strong>
                              {personal.fecha_ref_descanso
                                ? getProximosFrancos(toDateOnly(personal.fecha_ref_descanso), 3).map(formatDateOnlyDisplay).join(', ')
                                : 'Ciclo sin definir'}
                            </strong>
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </section>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'roles' ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <Star size={18} />
                <span>Roles asignados</span>
              </div>

              <div className="rrhh-inline-form" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <select value={roleToAdd} onChange={(event) => setRoleToAdd(event.target.value)}>
                  <option value="">Seleccionar rol para agregar</option>
                  {availableRolesToAdd.map((rol) => <option key={rol} value={rol}>{formatRol(rol)}</option>)}
                </select>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={handleAddRole} disabled={!roleToAdd}>
                  Agregar rol
                </Button>
              </div>

              <div className="rrhh-chip-cloud" style={{ marginTop: 14 }}>
                {roles.map((rol) => (
                  <div key={rol.id} className={'rrhh-role-chip ' + (rol.rol_principal ? 'primary' : '')}>
                    {rol.rol_principal ? <Star size={14} /> : null}
                    <span>{formatRol(rol.rol)}</span>
                    <button type="button" onClick={() => onRemoveRole(rol.id)} aria-label={`Quitar ${formatRol(rol.rol)}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {!roles.length ? <div className="rrhh-empty-inline">No hay roles asignados todavia.</div> : null}
              </div>
              {/* El backend no tiene un PATCH para su_personal_roles (solo POST y
                  DELETE), asi que no se puede re-marcar "principal" en un rol ya
                  guardado -- solo el primer rol que se agrega queda como principal. */}
            </section>
          ) : null}

          {activeTab === 'roles' && personaEsMedico ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <Stethoscope size={18} />
                <span>Especialidades</span>
              </div>
              <div className="rrhh-inline-form" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <select value={especialidadToAdd} onChange={(event) => setEspecialidadToAdd(event.target.value)}>
                  <option value="">Seleccionar especialidad para agregar</option>
                  {especialidadesOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                </select>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={handleAddEspecialidad} disabled={!especialidadToAdd}>
                  Agregar especialidad
                </Button>
              </div>
              <div className="rrhh-chip-cloud" style={{ marginTop: 14 }}>
                {especialidadesMedico.map((esp) => (
                  <div key={esp.id} className="rrhh-role-chip">
                    <span>{esp.nombre}</span>
                    <button type="button" onClick={() => onRemoveEspecialidad(esp.id)} aria-label={`Quitar ${esp.nombre}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {!especialidadesMedico.length ? <div className="rrhh-empty-inline">Sin clasificar -- no tiene ninguna especialidad asignada.</div> : null}
              </div>
              {personal.atiende_ninos ? (
                <p className="rrhh-detail-sin-foto" style={{ color: '#7dd3fc', marginTop: 10 }}>
                  <Baby size={14} /> Atiende niños (población: {poblacionLabel(personal.poblacion_efectiva)})
                </p>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'roles' && personaEsEnfermero ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <GraduationCap size={18} />
                <span>Formación y población</span>
              </div>
              <div className="rrhh-form-grid">
                <label>
                  <span>Formación</span>
                  <select
                    value={formacionEnfermero?.catalogo_id || ''}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      // POST /especialidades ya reemplaza cualquier formación
                      // previa del lado del backend (misma transacción) -- acá
                      // solo hace falta el DELETE explícito cuando se vuelve a
                      // "Sin asignar" (no hay un "agregar nada" equivalente).
                      if (nextId) onAddEspecialidad(nextId);
                      else if (formacionEnfermero) onRemoveEspecialidad(formacionEnfermero.id);
                    }}
                  >
                    <option value="">Sin asignar</option>
                    {formacionOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                  </select>
                </label>
                <label>
                  <span>Población que atiende</span>
                  <select value={personal.poblacion_enfermeria || ''} onChange={(event) => onSetPoblacionEnfermeria(event.target.value || null)}>
                    <option value="">Sin dato</option>
                    <option value="adultos">Adultos</option>
                    <option value="pediatrica">Pediátrica</option>
                    <option value="ambas">Ambas</option>
                  </select>
                </label>
              </div>
              {personal.atiende_ninos ? (
                <p className="rrhh-detail-sin-foto" style={{ color: '#7dd3fc', marginTop: 10 }}>
                  <Baby size={14} /> Atiende niños
                </p>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'documentos' ? (
            <PersonalDocumentosTab personalId={personal.id} />
          ) : null}

          {activeTab === 'licencias' ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <div className="rrhh-inline-title"><CalendarClock size={18} /><span>Licencias</span></div>
                <Button variant="secondary" icon={<Plus size={16} />} onClick={showLicenciaForm ? () => setShowLicenciaForm(false) : startNewLicencia}>
                  {showLicenciaForm ? 'Cancelar' : 'Cargar nueva'}
                </Button>
              </div>

              {showLicenciaForm ? (
                <div className="rrhh-inline-form">
                  <select value={licenciaDraft.tipo} onChange={(event) => setLicenciaDraft((prev) => ({ ...prev, tipo: event.target.value }))}>
                    <option value="">Tipo de licencia</option>
                    {Object.entries(LICENCIA_TIPO_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input type="date" value={licenciaDraft.fecha_desde} onChange={(event) => setLicenciaDraft((prev) => ({ ...prev, fecha_desde: event.target.value }))} />
                  <input type="date" value={licenciaDraft.fecha_hasta} onChange={(event) => setLicenciaDraft((prev) => ({ ...prev, fecha_hasta: event.target.value }))} />
                  <input placeholder="Observaciones (opcional)" value={licenciaDraft.observaciones} onChange={(event) => setLicenciaDraft((prev) => ({ ...prev, observaciones: event.target.value }))} />
                  <div className="rrhh-inline-actions">
                    <Button variant="ghost" onClick={() => { setShowLicenciaForm(false); setEditingLicenciaId(null); }}>Cancelar</Button>
                    <Button onClick={handleSaveLicencia}>{editingLicenciaId ? 'Guardar cambios' : 'Guardar licencia'}</Button>
                  </div>
                  <small>Dejar &quot;hasta&quot; vacío si todavía no tiene fecha de regreso.</small>
                </div>
              ) : null}

              {licencias.length ? (
                <div className="rrhh-kv-list">
                  {licencias.map((lic) => (
                    <div key={lic.id}>
                      <span>{LICENCIA_TIPO_LABELS[lic.tipo] || lic.tipo}</span>
                      <strong>
                        {formatDateOnlyDisplay(lic.fecha_desde)} · {lic.fecha_hasta ? formatDateOnlyDisplay(lic.fecha_hasta) : 'sin fecha de regreso'}
                        {lic.observaciones ? ` — ${lic.observaciones}` : ''}
                        {' '}
                        <button type="button" className="rrhh-link-chip" onClick={() => startEditLicencia(lic)}>Editar</button>
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rrhh-empty-inline">No hay licencias cargadas.</div>
              )}
            </section>
          ) : null}

          {activeTab === 'cambios' ? (
            <section className="rrhh-detail-card">
              <div className="rrhh-section-title">
                <div className="rrhh-inline-title"><History size={18} /><span>Cambios hechos por el funcionario</span></div>
              </div>
              <p className="rrhh-subtle" style={{ marginTop: -6, marginBottom: 14 }}>
                Historial de ediciones hechas desde el link público de autocompletado (no incluye cambios hechos desde esta ficha).
              </p>

              {cambiosLoading ? (
                <div className="rrhh-empty-inline">Cargando historial...</div>
              ) : cambiosError ? (
                <div className="rrhh-empty-inline" style={{ color: '#fdba74' }}>{cambiosError}</div>
              ) : (cambiosPublicos || []).length ? (
                <div className="rrhh-kv-list">
                  {cambiosPublicos.map((item) => (
                    <div key={item.id}>
                      <span>{CAMBIO_CAMPO_LABELS[item.campo] || item.campo}</span>
                      <strong>
                        {item.campo === 'foto_url'
                          ? 'Foto actualizada'
                          : item.campo === 'fecha_nacimiento'
                            ? `${item.valor_anterior ? formatDateOnlyDisplay(item.valor_anterior) : 'Sin dato'} → ${item.valor_nuevo ? formatDateOnlyDisplay(item.valor_nuevo) : 'Sin dato'}`
                            : `${item.valor_anterior || 'Sin dato'} → ${item.valor_nuevo || 'Sin dato'}`}
                        {' · '}
                        {formatDateOnlyDisplay(item.created_at)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rrhh-empty-inline">Todavía no hizo cambios por el link público.</div>
              )}
            </section>
          ) : null}
        </div>
      </div>

      {showPhotoViewer && !showFotoCapture ? (
        <div className="rrhh-photo-viewer" role="dialog" aria-modal="true" aria-label={`Foto de ${displayFullName(personal)}`}>
          <div className="lot-wizard-overlay" onClick={() => setShowPhotoViewer(false)} />
          <div className="rrhh-photo-viewer-panel">
            <button type="button" className="rrhh-detail-close" onClick={() => setShowPhotoViewer(false)} aria-label="Cerrar">
              <X size={18} />
            </button>
            {personal.foto_url ? (
              <img className="rrhh-photo-viewer-img" src={personal.foto_url} alt={`Foto de ${displayFullName(personal)}`} />
            ) : (
              <div className="rrhh-photo-viewer-placeholder">
                {`${personal.nombre?.[0] || ''}${personal.apellido?.[0] || ''}`.toUpperCase() || 'SU'}
              </div>
            )}
            <div className="rrhh-photo-viewer-actions">
              <Button variant="secondary" onClick={() => { setShowPhotoViewer(false); setShowFotoCapture(true); }}>
                {personal.foto_url ? 'Cambiar foto' : 'Subir foto'}
              </Button>
              {personal.foto_url ? (
                <Button variant="ghost" onClick={handleQuitarFoto} disabled={fotoUploading}>Quitar foto</Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showFotoCapture ? (
        <PersonFotoCapture
          title={`Foto de ${displayFullName(personal)}`}
          onCapture={handleCapturarFoto}
          onClose={() => { if (!fotoUploading) setShowFotoCapture(false); }}
          busy={fotoUploading}
        />
      ) : null}
    </div>
  );
}
