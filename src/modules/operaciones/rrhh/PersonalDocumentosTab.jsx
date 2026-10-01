import React from 'react';
import { FileText, Eye, Check, X as XIcon, Upload } from 'lucide-react';
import { getDocumentosPersonal, uploadDocumentoPersonal, getDocumentoContenido, revisarDocumentoPersonal } from '../../../services/rrhhService.js';
import DocumentoCapture from '../../../components/DocumentoCapture.jsx';

// Pestaña "Documentación" de la ficha interna -- se maneja con estado
// propio (no via RrhhScreen.jsx, a diferencia del resto de la ficha) porque
// la cantidad de estado por item (edicion/validar/rechazar/subir, cada uno
// con sus propios campos) haria ilegible a RrhhScreen.jsx si se centralizara
// ahi. Mismo criterio de "cada item se carga por separado" que la ficha
// publica (ver CompletarFichaScreen.jsx), con los agregados de RRHH: Ver,
// Validar, Rechazar, y que el "Subir"/"Reemplazar" no tiene la restriccion
// de "no tocar lo ya validado" que si tiene el lado publico.

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
    <div className="rrhh-doc-fecha-row">
      <input id={`${idPrefix}-dia`} type="text" inputMode="numeric" maxLength={2} placeholder="DD" value={parts.dia} onChange={setPart('dia', 2, mesRef)} />
      <input ref={mesRef} id={`${idPrefix}-mes`} type="text" inputMode="numeric" maxLength={2} placeholder="MM" value={parts.mes} onChange={setPart('mes', 2, anioRef)} />
      <input ref={anioRef} id={`${idPrefix}-anio`} type="text" inputMode="numeric" maxLength={4} placeholder="AAAA" value={parts.anio} onChange={setPart('anio', 4, null)} />
    </div>
  );
}

const CATEGORIA_CAMPOS = {
  carne_salud: { fechaVencimiento: true },
  registro_msp: { numero: true, numeroLabel: 'Número de registro' },
  libreta_conducir: { numero: true, numeroLabel: 'Categoría', fechaVencimiento: true }
};

const ESTADO_LABELS = { falta: 'Falta', pendiente: 'Pendiente de revisión', rechazado: 'Rechazado', validado: 'Validado' };

export default function PersonalDocumentosTab({ personalId }) {
  const [checklist, setChecklist] = React.useState([]);
  const [cursos, setCursos] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [editingCategoria, setEditingCategoria] = React.useState(null);
  const [editNumero, setEditNumero] = React.useState('');
  const [editFechaParts, setEditFechaParts] = React.useState({ dia: '', mes: '', anio: '' });
  const [editFile, setEditFile] = React.useState(null);
  const [editShowCapture, setEditShowCapture] = React.useState(false);
  const [editUploading, setEditUploading] = React.useState(false);
  const [editError, setEditError] = React.useState('');

  const [showCursoForm, setShowCursoForm] = React.useState(false);
  const [cursoNombre, setCursoNombre] = React.useState('');
  const [cursoInstitucion, setCursoInstitucion] = React.useState('');
  const [cursoFechaParts, setCursoFechaParts] = React.useState({ dia: '', mes: '', anio: '' });
  const [cursoFile, setCursoFile] = React.useState(null);
  const [cursoShowCapture, setCursoShowCapture] = React.useState(false);
  const [cursoUploading, setCursoUploading] = React.useState(false);
  const [cursoError, setCursoError] = React.useState('');

  // Rechazar: motivo obligatorio, se pide inline antes de confirmar.
  const [rejectingId, setRejectingId] = React.useState(null);
  const [rejectMotivo, setRejectMotivo] = React.useState('');
  const [revisando, setRevisando] = React.useState(null);
  const [revisarError, setRevisarError] = React.useState('');
  const [viendoId, setViendoId] = React.useState(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getDocumentosPersonal(personalId);
      setChecklist(result.checklist);
      setCursos(result.cursos);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar la documentación.');
    } finally {
      setLoading(false);
    }
  }, [personalId]);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

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
      const result = await uploadDocumentoPersonal(personalId, {
        categoria: editingCategoria,
        nombreArchivo: editFile.nombreArchivo,
        contentType: editFile.contentType,
        blob: editFile.blob,
        numero: campos.numero ? editNumero || null : null,
        fechaVencimiento: campos.fechaVencimiento ? (partsToIso(editFechaParts) || null) : null
      });
      setChecklist(result.checklist);
      setCursos(result.cursos);
      closeEditItem();
    } catch (err) {
      setEditError(err?.message || 'No se pudo subir el documento.');
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
      const result = await uploadDocumentoPersonal(personalId, {
        categoria: 'curso',
        nombreArchivo: cursoFile.nombreArchivo,
        contentType: cursoFile.contentType,
        blob: cursoFile.blob,
        cursoNombre: cursoNombre.trim(),
        cursoInstitucion: cursoInstitucion.trim() || null,
        fechaEmision: partsToIso(cursoFechaParts) || null
      });
      setChecklist(result.checklist);
      setCursos(result.cursos);
      resetCursoForm();
    } catch (err) {
      setCursoError(err?.message || 'No se pudo subir el curso.');
    } finally {
      setCursoUploading(false);
    }
  };

  const handleVer = async (archivoId) => {
    setViendoId(archivoId);
    setRevisarError('');
    try {
      const { blob } = await getDocumentoContenido(personalId, archivoId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setRevisarError(err?.message || 'No se pudo abrir el documento.');
    } finally {
      setViendoId(null);
    }
  };

  const handleValidar = async (archivoId) => {
    setRevisando(archivoId);
    setRevisarError('');
    try {
      await revisarDocumentoPersonal(personalId, archivoId, { estado_revision: 'validado' });
      await cargar();
    } catch (err) {
      setRevisarError(err?.message || 'No se pudo validar el documento.');
    } finally {
      setRevisando(null);
    }
  };

  const handleRechazar = async (archivoId) => {
    if (!rejectMotivo.trim()) return;
    setRevisando(archivoId);
    setRevisarError('');
    try {
      await revisarDocumentoPersonal(personalId, archivoId, { estado_revision: 'rechazado', motivo_rechazo: rejectMotivo.trim() });
      setRejectingId(null);
      setRejectMotivo('');
      await cargar();
    } catch (err) {
      setRevisarError(err?.message || 'No se pudo rechazar el documento.');
    } finally {
      setRevisando(null);
    }
  };

  if (loading) return <div className="rrhh-empty-inline">Cargando documentación...</div>;
  if (error) return <div className="rrhh-empty-inline" style={{ color: '#fdba74' }}>{error}</div>;

  return (
    <section className="rrhh-detail-card">
      <div className="rrhh-section-title">
        <div className="rrhh-inline-title"><FileText size={18} /><span>Documentación</span></div>
      </div>

      {revisarError ? <div className="rrhh-form-error">{revisarError}</div> : null}

      <div className="rrhh-doc-tab-list">
        {checklist.map((item) => {
          const campos = CATEGORIA_CAMPOS[item.categoria] || {};
          const isEditing = editingCategoria === item.categoria;
          return (
            <div key={item.categoria} className={`rrhh-doc-tab-item rrhh-doc-tab-item-${item.estado}`}>
              <div className="rrhh-doc-tab-item-head">
                <span className="rrhh-doc-tab-item-label">{item.label}</span>
                <span className={`rrhh-doc-tab-badge rrhh-doc-tab-badge-${item.estado}`}>{ESTADO_LABELS[item.estado]}</span>
              </div>
              {item.motivo_rechazo ? <p className="rrhh-doc-tab-motivo">Motivo: {item.motivo_rechazo}</p> : null}
              {item.nombre_archivo ? <p className="rrhh-subtle">{item.nombre_archivo}</p> : null}

              {item.archivo_id ? (
                <div className="rrhh-inline-actions" style={{ justifyContent: 'flex-start' }}>
                  <button type="button" className="rrhh-doc-action-button" onClick={() => handleVer(item.archivo_id)} disabled={viendoId === item.archivo_id}>
                    <Eye size={14} /> {viendoId === item.archivo_id ? 'Abriendo...' : 'Ver'}
                  </button>
                  {item.estado !== 'validado' ? (
                    <button type="button" className="rrhh-doc-action-button" onClick={() => handleValidar(item.archivo_id)} disabled={revisando === item.archivo_id}>
                      <Check size={14} /> Validar
                    </button>
                  ) : null}
                  {rejectingId === item.archivo_id ? null : (
                    <button type="button" className="rrhh-doc-action-button" onClick={() => { setRejectingId(item.archivo_id); setRejectMotivo(''); }} disabled={revisando === item.archivo_id}>
                      <XIcon size={14} /> Rechazar
                    </button>
                  )}
                </div>
              ) : null}

              {item.archivo_id && rejectingId === item.archivo_id ? (
                <div className="rrhh-doc-tab-edit">
                  <input type="text" placeholder="Motivo del rechazo (obligatorio)" value={rejectMotivo} onChange={(event) => setRejectMotivo(event.target.value)} />
                  <div className="rrhh-inline-actions">
                    <button type="button" className="rrhh-doc-action-button" onClick={() => setRejectingId(null)}>Cancelar</button>
                    <button type="button" className="rrhh-doc-action-button" onClick={() => handleRechazar(item.archivo_id)} disabled={!rejectMotivo.trim() || revisando === item.archivo_id}>
                      Confirmar rechazo
                    </button>
                  </div>
                </div>
              ) : null}

              {isEditing ? (
                <div className="rrhh-doc-tab-edit">
                  {campos.numero ? (
                    <label className="rrhh-doc-tab-field">
                      <span>{campos.numeroLabel}</span>
                      <input type="text" value={editNumero} onChange={(event) => setEditNumero(event.target.value)} />
                    </label>
                  ) : null}
                  {campos.fechaVencimiento ? (
                    <label className="rrhh-doc-tab-field">
                      <span>Fecha de vencimiento</span>
                      <FechaInputs idPrefix={`int-doc-${item.categoria}`} parts={editFechaParts} onChange={setEditFechaParts} />
                    </label>
                  ) : null}
                  {editFile ? (
                    <p className="rrhh-subtle">Archivo listo: {editFile.nombreArchivo}</p>
                  ) : (
                    <button type="button" className="rrhh-doc-action-button" onClick={() => setEditShowCapture(true)}>Elegir archivo</button>
                  )}
                  {editError ? <div className="rrhh-form-error">{editError}</div> : null}
                  <div className="rrhh-inline-actions">
                    <button type="button" className="rrhh-doc-action-button" onClick={closeEditItem} disabled={editUploading}>Cancelar</button>
                    <button type="button" className="rrhh-doc-action-button" onClick={handleGuardarItem} disabled={!editFile || editUploading}>
                      {editUploading ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="rrhh-doc-action-button" onClick={() => openEditItem(item)}>
                  <Upload size={14} /> {item.archivo_id ? 'Reemplazar' : 'Subir'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rrhh-doc-tab-cursos">
        <div className="rrhh-section-title" style={{ marginTop: 18 }}>
          <span>Cursos</span>
        </div>
        {cursos.map((curso) => (
          <div key={curso.archivo_id} className="rrhh-doc-tab-item">
            <div className="rrhh-doc-tab-item-head">
              <span className="rrhh-doc-tab-item-label">{curso.tipo_capacitacion}</span>
              <span className={`rrhh-doc-tab-badge rrhh-doc-tab-badge-${curso.estado}`}>{ESTADO_LABELS[curso.estado]}</span>
            </div>
            {curso.institucion ? <p className="rrhh-subtle">{curso.institucion}</p> : null}
            {curso.motivo_rechazo ? <p className="rrhh-doc-tab-motivo">Motivo: {curso.motivo_rechazo}</p> : null}
            <div className="rrhh-inline-actions" style={{ justifyContent: 'flex-start' }}>
              <button type="button" className="rrhh-doc-action-button" onClick={() => handleVer(curso.archivo_id)} disabled={viendoId === curso.archivo_id}>
                <Eye size={14} /> Ver
              </button>
              {curso.estado !== 'validado' ? (
                <button type="button" className="rrhh-doc-action-button" onClick={() => handleValidar(curso.archivo_id)} disabled={revisando === curso.archivo_id}>
                  <Check size={14} /> Validar
                </button>
              ) : null}
              {rejectingId === curso.archivo_id ? null : (
                <button type="button" className="rrhh-doc-action-button" onClick={() => { setRejectingId(curso.archivo_id); setRejectMotivo(''); }}>
                  <XIcon size={14} /> Rechazar
                </button>
              )}
            </div>
            {rejectingId === curso.archivo_id ? (
              <div className="rrhh-doc-tab-edit">
                <input type="text" placeholder="Motivo del rechazo (obligatorio)" value={rejectMotivo} onChange={(event) => setRejectMotivo(event.target.value)} />
                <div className="rrhh-inline-actions">
                  <button type="button" className="rrhh-doc-action-button" onClick={() => setRejectingId(null)}>Cancelar</button>
                  <button type="button" className="rrhh-doc-action-button" onClick={() => handleRechazar(curso.archivo_id)} disabled={!rejectMotivo.trim()}>
                    Confirmar rechazo
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {showCursoForm ? (
          <div className="rrhh-doc-tab-edit">
            <label className="rrhh-doc-tab-field">
              <span>Nombre del curso</span>
              <input type="text" value={cursoNombre} onChange={(event) => setCursoNombre(event.target.value)} />
            </label>
            <label className="rrhh-doc-tab-field">
              <span>Institución (opcional)</span>
              <input type="text" value={cursoInstitucion} onChange={(event) => setCursoInstitucion(event.target.value)} />
            </label>
            <label className="rrhh-doc-tab-field">
              <span>Fecha (opcional)</span>
              <FechaInputs idPrefix="int-curso-fecha" parts={cursoFechaParts} onChange={setCursoFechaParts} />
            </label>
            {cursoFile ? (
              <p className="rrhh-subtle">Archivo listo: {cursoFile.nombreArchivo}</p>
            ) : (
              <button type="button" className="rrhh-doc-action-button" onClick={() => setCursoShowCapture(true)}>Elegir archivo</button>
            )}
            {cursoError ? <div className="rrhh-form-error">{cursoError}</div> : null}
            <div className="rrhh-inline-actions">
              <button type="button" className="rrhh-doc-action-button" onClick={resetCursoForm} disabled={cursoUploading}>Cancelar</button>
              <button type="button" className="rrhh-doc-action-button" onClick={handleGuardarCurso} disabled={!cursoFile || !cursoNombre.trim() || cursoUploading}>
                {cursoUploading ? 'Guardando...' : 'Guardar curso'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="rrhh-doc-action-button" onClick={() => setShowCursoForm(true)}>Agregar curso</button>
        )}
      </div>

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
    </section>
  );
}
