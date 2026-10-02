import React from 'react';
import { FileText, Upload } from 'lucide-react';
import { getDocumentosPersonal, uploadDocumentoPersonal, getDocumentoContenido, revisarDocumentoPersonal } from '../../../services/rrhhService.js';
import DocumentoCapture from '../../../components/DocumentoCapture.jsx';
import DocumentViewerModal from './DocumentViewerModal.jsx';

// Pestaña "Documentación" de la ficha interna -- se maneja con estado
// propio (no via RrhhScreen.jsx, a diferencia del resto de la ficha) porque
// la cantidad de estado por item (edicion/validar/rechazar/subir, cada uno
// con sus propios campos) haria ilegible a RrhhScreen.jsx si se centralizara
// ahi. Mismo criterio de "cada item se carga por separado" que la ficha
// publica (ver CompletarFichaScreen.jsx), con los agregados de RRHH: grilla
// de tarjetas con miniatura + visor modal (Validar/Rechazar/Reemplazar/
// Descargar), y que el "Subir"/"Reemplazar" no tiene la restriccion de "no
// tocar lo ya validado" que si tiene el lado publico.

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

function formatDateDisplay(iso) {
  if (!iso) return '';
  const [anio, mes, dia] = String(iso).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : '';
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

const ESTADO_LABELS = { falta: 'Falta', pendiente: 'Cargado ✓ · pendiente de revisión', rechazado: 'Rechazado', validado: 'Validado' };

// Que campos son obligatorios antes de habilitar "Elegir archivo" -- items
// sin entrada en CATEGORIA_CAMPOS no tienen datos que completar.
function camposCompletos(categoria, { numero, fechaParts }) {
  const campos = CATEGORIA_CAMPOS[categoria] || {};
  if (campos.numero && !String(numero || '').trim()) return false;
  if (campos.fechaVencimiento && !partsToIso(fechaParts)) return false;
  return true;
}

// Miniatura de una tarjeta ya cargada: imagen real si el archivo es imagen,
// icono de PDF si no, spinner/placeholder mientras se resuelve.
function CardThumbnail({ content, onClick }) {
  if (!content || content.status === 'loading') {
    return <div className="rrhh-doc-card-thumb rrhh-doc-card-thumb-loading" onClick={onClick}>Cargando...</div>;
  }
  if (content.status === 'error') {
    return <div className="rrhh-doc-card-thumb rrhh-doc-card-thumb-error" onClick={onClick}>No se pudo cargar</div>;
  }
  if ((content.contentType || '').startsWith('image/')) {
    return (
      <div className="rrhh-doc-card-thumb" onClick={onClick}>
        <img src={content.url} alt="" />
      </div>
    );
  }
  return (
    <div className="rrhh-doc-card-thumb rrhh-doc-card-thumb-pdf" onClick={onClick}>
      <FileText size={32} />
      <span>PDF</span>
    </div>
  );
}

export default function PersonalDocumentosTab({ personalId }) {
  const [checklist, setChecklist] = React.useState([]);
  const [cursos, setCursos] = React.useState([]);
  // Habilitaciones/carnet/capacitaciones viejos, sin archivo vinculado (ver
  // getRegistrosDocumentalesAnteriores en el backend) -- solo lectura,
  // seccion aparte al pie de la pestaña.
  const [registrosAnteriores, setRegistrosAnteriores] = React.useState({ habilitaciones: [], carnet_salud: [], capacitaciones: [] });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [editingCategoria, setEditingCategoria] = React.useState(null);
  const [editNumero, setEditNumero] = React.useState('');
  const [editFechaParts, setEditFechaParts] = React.useState({ dia: '', mes: '', anio: '' });
  const [editShowCapture, setEditShowCapture] = React.useState(false);
  const [editUploading, setEditUploading] = React.useState(false);
  const [editError, setEditError] = React.useState('');

  const [showCursoForm, setShowCursoForm] = React.useState(false);
  const [cursoNombre, setCursoNombre] = React.useState('');
  const [cursoInstitucion, setCursoInstitucion] = React.useState('');
  const [cursoFechaParts, setCursoFechaParts] = React.useState({ dia: '', mes: '', anio: '' });
  const [cursoShowCapture, setCursoShowCapture] = React.useState(false);
  const [cursoUploading, setCursoUploading] = React.useState(false);
  const [cursoError, setCursoError] = React.useState('');

  const [revisando, setRevisando] = React.useState(null);
  const [revisarError, setRevisarError] = React.useState('');

  // Miniaturas/contenido: { [archivoId]: { status: 'loading'|'ready'|'error', url, contentType } }
  // -- se cargan en paralelo al abrir la pestaña (ver efecto mas abajo) y se
  // cachean mientras el componente este montado; las blob URLs se liberan
  // (revokeObjectURL) al desmontar (cambiar de pestaña o cerrar la ficha).
  const [thumbnails, setThumbnails] = React.useState({});
  const loadedIdsRef = React.useRef(new Set());
  const urlsToRevokeRef = React.useRef([]);

  // Visor modal: null = cerrado, numero = indice dentro de viewerItems.
  const [viewerIndex, setViewerIndex] = React.useState(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getDocumentosPersonal(personalId);
      setChecklist(result.checklist);
      setCursos(result.cursos);
      setRegistrosAnteriores(result.registrosAnteriores);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar la documentación.');
    } finally {
      setLoading(false);
    }
  }, [personalId]);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const loadThumbnail = React.useCallback(async (archivoId) => {
    setThumbnails((prev) => ({ ...prev, [archivoId]: { status: 'loading' } }));
    try {
      const { blob } = await getDocumentoContenido(personalId, archivoId);
      const url = URL.createObjectURL(blob);
      urlsToRevokeRef.current.push(url);
      setThumbnails((prev) => ({ ...prev, [archivoId]: { status: 'ready', url, contentType: blob.type } }));
    } catch {
      setThumbnails((prev) => ({ ...prev, [archivoId]: { status: 'error' } }));
    }
  }, [personalId]);

  // Dispara la carga de TODOS los archivos todavia no vistos, en paralelo
  // (no se espera uno para pedir el siguiente) -- nunca vuelve a pedir uno
  // ya cacheado, aunque cargar() refresque el checklist despues de validar/
  // rechazar/subir.
  React.useEffect(() => {
    const ids = [
      ...checklist.filter((item) => item.archivo_id).map((item) => item.archivo_id),
      ...cursos.filter((curso) => curso.archivo_id).map((curso) => curso.archivo_id)
    ];
    ids.forEach((id) => {
      if (loadedIdsRef.current.has(id)) return;
      loadedIdsRef.current.add(id);
      loadThumbnail(id);
    });
  }, [checklist, cursos, loadThumbnail]);

  // Libera todas las blob URLs cacheadas al desmontar -- pasa tanto al
  // cerrar la ficha como al cambiar de pestaña (PersonalDetail.jsx monta
  // este componente solo mientras activeTab === 'documentos').
  React.useEffect(() => () => {
    urlsToRevokeRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Avisa antes de cerrar la pestaña/recargar con una subida en curso o el
  // modal de captura abierto (archivo elegido/en preview sin confirmar).
  React.useEffect(() => {
    const handler = (event) => {
      if (!(editUploading || editShowCapture || cursoUploading || cursoShowCapture)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editUploading, editShowCapture, cursoUploading, cursoShowCapture]);

  const openEditItem = (item) => {
    setEditingCategoria(item.categoria);
    setEditNumero(item.numero || '');
    setEditFechaParts(isoToParts(item.fecha_vencimiento));
    setEditError('');
  };

  const closeEditItem = () => {
    setEditingCategoria(null);
    setEditShowCapture(false);
    setEditError('');
  };

  // Sube y guarda apenas se confirma el archivo en DocumentoCapture -- sin
  // paso intermedio de "Guardar". Si falla, el modal queda abierto (no se
  // toca editShowCapture) con el error y "Reintentar", sin perder el blob.
  const handleCapturarDocumentoItem = async (file) => {
    setEditUploading(true);
    setEditError('');
    try {
      const campos = CATEGORIA_CAMPOS[editingCategoria] || {};
      const result = await uploadDocumentoPersonal(personalId, {
        categoria: editingCategoria,
        nombreArchivo: file.nombreArchivo,
        contentType: file.contentType,
        blob: file.blob,
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
    setCursoShowCapture(false);
    setCursoNombre('');
    setCursoInstitucion('');
    setCursoFechaParts({ dia: '', mes: '', anio: '' });
    setCursoError('');
  };

  // nombre, institucion y fecha son obligatorios para habilitar "Elegir
  // archivo" (antes institucion/fecha eran opcionales).
  const cursoCamposCompletos = Boolean(cursoNombre.trim() && cursoInstitucion.trim() && partsToIso(cursoFechaParts));

  const handleCapturarCurso = async (file) => {
    setCursoUploading(true);
    setCursoError('');
    try {
      const result = await uploadDocumentoPersonal(personalId, {
        categoria: 'curso',
        nombreArchivo: file.nombreArchivo,
        contentType: file.contentType,
        blob: file.blob,
        cursoNombre: cursoNombre.trim(),
        cursoInstitucion: cursoInstitucion.trim(),
        fechaEmision: partsToIso(cursoFechaParts)
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

  const handleRechazar = async (archivoId, motivo) => {
    setRevisando(archivoId);
    setRevisarError('');
    try {
      await revisarDocumentoPersonal(personalId, archivoId, { estado_revision: 'rechazado', motivo_rechazo: motivo });
      await cargar();
    } catch (err) {
      setRevisarError(err?.message || 'No se pudo rechazar el documento.');
    } finally {
      setRevisando(null);
    }
  };

  // Items navegables del visor: checklist + cursos, solo los que ya tienen
  // archivo (los vacios no se pueden "ver"). Se recalcula en cada render a
  // partir de checklist/cursos/thumbnails, asi que el visor abierto refleja
  // Validar/Rechazar/un nuevo archivo sin tener que cerrarlo y reabrirlo.
  const viewerItems = [
    ...checklist.filter((item) => item.archivo_id).map((item) => {
      const campos = CATEGORIA_CAMPOS[item.categoria] || {};
      return {
        id: item.archivo_id,
        categoria: item.categoria,
        isCurso: false,
        label: item.label,
        estado: item.estado,
        motivoRechazo: item.motivo_rechazo,
        nombreArchivo: item.nombre_archivo,
        numero: campos.numero ? item.numero : null,
        numeroLabel: campos.numeroLabel,
        fechaVencimientoDisplay: campos.fechaVencimiento ? formatDateDisplay(item.fecha_vencimiento) : '',
        content: thumbnails[item.archivo_id]
      };
    }),
    ...cursos.filter((curso) => curso.archivo_id).map((curso) => ({
      id: curso.archivo_id,
      categoria: 'curso',
      isCurso: true,
      label: curso.tipo_capacitacion,
      estado: curso.estado,
      motivoRechazo: curso.motivo_rechazo,
      nombreArchivo: curso.institucion,
      numero: null,
      numeroLabel: null,
      fechaVencimientoDisplay: '',
      content: thumbnails[curso.archivo_id]
    }))
  ];

  const openViewerFor = (archivoId) => {
    const idx = viewerItems.findIndex((item) => item.id === archivoId);
    if (idx >= 0) setViewerIndex(idx);
  };

  const handleReemplazarDesdeVisor = (item) => {
    setViewerIndex(null);
    if (item.isCurso) return; // los cursos no tienen reemplazo -- ver nota en DocumentViewerModal.
    const checklistItem = checklist.find((ci) => ci.categoria === item.categoria);
    if (checklistItem) openEditItem(checklistItem);
  };

  if (loading) return <div className="rrhh-empty-inline">Cargando documentación...</div>;
  if (error) return <div className="rrhh-empty-inline" style={{ color: '#fdba74' }}>{error}</div>;

  return (
    <section className="rrhh-detail-card">
      <div className="rrhh-section-title">
        <div className="rrhh-inline-title"><FileText size={18} /><span>Documentación</span></div>
      </div>

      {revisarError && viewerIndex === null ? <div className="rrhh-form-error">{revisarError}</div> : null}

      <div className="rrhh-doc-grid">
        {checklist.map((item) => {
          const campos = CATEGORIA_CAMPOS[item.categoria] || {};
          const isEditing = editingCategoria === item.categoria;
          const completos = camposCompletos(item.categoria, { numero: editNumero, fechaParts: editFechaParts });

          if (isEditing) {
            return (
              <div key={item.categoria} className="rrhh-doc-card rrhh-doc-card-editing">
                <div className="rrhh-doc-card-head">
                  <span className="rrhh-doc-card-label">{item.label}</span>
                  <span className={`rrhh-doc-tab-badge rrhh-doc-tab-badge-${item.estado}`}>{ESTADO_LABELS[item.estado]}</span>
                </div>
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
                <div className="rrhh-inline-actions">
                  <button type="button" className="rrhh-doc-action-button" onClick={closeEditItem} disabled={editUploading}>Cancelar</button>
                  <button
                    type="button"
                    className="rrhh-doc-action-button"
                    onClick={() => setEditShowCapture(true)}
                    disabled={!completos || editUploading}
                  >
                    {completos ? 'Elegir archivo' : 'Completa los datos'}
                  </button>
                </div>
              </div>
            );
          }

          if (!item.archivo_id) {
            return (
              <div key={item.categoria} className="rrhh-doc-card rrhh-doc-card-empty">
                <div className="rrhh-doc-card-head">
                  <span className="rrhh-doc-card-label">{item.label}</span>
                  <span className={`rrhh-doc-tab-badge rrhh-doc-tab-badge-${item.estado}`}>{ESTADO_LABELS[item.estado]}</span>
                </div>
                <button type="button" className="rrhh-doc-card-upload-button" onClick={() => openEditItem(item)}>
                  <Upload size={20} />
                  <span>Subir</span>
                </button>
              </div>
            );
          }

          return (
            <div key={item.categoria} className={`rrhh-doc-card rrhh-doc-card-${item.estado}`}>
              <CardThumbnail content={thumbnails[item.archivo_id]} onClick={() => openViewerFor(item.archivo_id)} />
              <div className="rrhh-doc-card-body" onClick={() => openViewerFor(item.archivo_id)}>
                <div className="rrhh-doc-card-head">
                  <span className="rrhh-doc-card-label">{item.label}</span>
                  <span className={`rrhh-doc-tab-badge rrhh-doc-tab-badge-${item.estado}`}>{ESTADO_LABELS[item.estado]}</span>
                </div>
                {campos.numero && item.numero ? <p className="rrhh-subtle">{campos.numeroLabel}: {item.numero}</p> : null}
                {campos.fechaVencimiento && item.fecha_vencimiento ? <p className="rrhh-subtle">Vence: {formatDateDisplay(item.fecha_vencimiento)}</p> : null}
                {item.motivo_rechazo ? <p className="rrhh-doc-tab-motivo">Motivo: {item.motivo_rechazo}</p> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rrhh-doc-tab-cursos">
        <div className="rrhh-section-title" style={{ marginTop: 18 }}>
          <span>Cursos</span>
        </div>

        {cursos.length ? (
          <div className="rrhh-doc-grid">
            {cursos.map((curso) => (
              <div key={curso.archivo_id} className={`rrhh-doc-card rrhh-doc-card-${curso.estado}`}>
                <CardThumbnail content={thumbnails[curso.archivo_id]} onClick={() => openViewerFor(curso.archivo_id)} />
                <div className="rrhh-doc-card-body" onClick={() => openViewerFor(curso.archivo_id)}>
                  <div className="rrhh-doc-card-head">
                    <span className="rrhh-doc-card-label">{curso.tipo_capacitacion}</span>
                    <span className={`rrhh-doc-tab-badge rrhh-doc-tab-badge-${curso.estado}`}>{ESTADO_LABELS[curso.estado]}</span>
                  </div>
                  {curso.institucion ? <p className="rrhh-subtle">{curso.institucion}</p> : null}
                  {curso.motivo_rechazo ? <p className="rrhh-doc-tab-motivo">Motivo: {curso.motivo_rechazo}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {showCursoForm ? (
          <div className="rrhh-doc-tab-edit">
            <label className="rrhh-doc-tab-field">
              <span>Nombre del curso</span>
              <input type="text" value={cursoNombre} onChange={(event) => setCursoNombre(event.target.value)} />
            </label>
            <label className="rrhh-doc-tab-field">
              <span>Institución</span>
              <input type="text" value={cursoInstitucion} onChange={(event) => setCursoInstitucion(event.target.value)} />
            </label>
            <label className="rrhh-doc-tab-field">
              <span>Fecha</span>
              <FechaInputs idPrefix="int-curso-fecha" parts={cursoFechaParts} onChange={setCursoFechaParts} />
            </label>
            <div className="rrhh-inline-actions">
              <button type="button" className="rrhh-doc-action-button" onClick={resetCursoForm} disabled={cursoUploading}>Cancelar</button>
              <button
                type="button"
                className="rrhh-doc-action-button"
                onClick={() => setCursoShowCapture(true)}
                disabled={!cursoCamposCompletos || cursoUploading}
              >
                {cursoCamposCompletos ? 'Elegir archivo' : 'Completa los datos para cargar el documento'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="rrhh-doc-action-button" style={{ marginTop: cursos.length ? 14 : 0 }} onClick={() => setShowCursoForm(true)}>Agregar curso</button>
        )}
      </div>

      {registrosAnteriores.habilitaciones.length || registrosAnteriores.carnet_salud.length || registrosAnteriores.capacitaciones.length ? (
        <div className="rrhh-doc-legacy">
          <div className="rrhh-section-title" style={{ marginTop: 18 }}>
            <span>Registros anteriores</span>
          </div>
          <p className="rrhh-subtle">
            Cargados antes de que existiera esta pestaña, sin ningún archivo adjunto. Solo lectura -- para
            completarlos, subí el documento correspondiente arriba.
          </p>
          <div className="rrhh-doc-legacy-list">
            {registrosAnteriores.habilitaciones.map((item) => (
              <div key={`hab-${item.id}`} className="rrhh-doc-legacy-item">
                <span className="rrhh-doc-legacy-label">{item.label}</span>
                <span className="rrhh-subtle">
                  {[item.numero, item.fecha_vencimiento ? `vence ${formatDateDisplay(item.fecha_vencimiento)}` : null].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                </span>
              </div>
            ))}
            {registrosAnteriores.carnet_salud.map((item) => (
              <div key={`carnet-${item.id}`} className="rrhh-doc-legacy-item">
                <span className="rrhh-doc-legacy-label">Carné de salud</span>
                <span className="rrhh-subtle">
                  {item.fecha_vencimiento ? `vence ${formatDateDisplay(item.fecha_vencimiento)}` : 'Sin fecha de vencimiento'}
                </span>
              </div>
            ))}
            {registrosAnteriores.capacitaciones.map((item) => (
              <div key={`cap-${item.id}`} className="rrhh-doc-legacy-item">
                <span className="rrhh-doc-legacy-label">{item.tipo_capacitacion || 'Curso'}</span>
                <span className="rrhh-subtle">
                  {[item.institucion, item.fecha_emision ? `emitido ${formatDateDisplay(item.fecha_emision)}` : null].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {editShowCapture ? (
        <DocumentoCapture
          title="Documento"
          onCapture={handleCapturarDocumentoItem}
          onClose={() => { if (!editUploading) { setEditShowCapture(false); setEditError(''); } }}
          onPickAnother={() => setEditError('')}
          busy={editUploading}
          uploadError={editError}
        />
      ) : null}
      {cursoShowCapture ? (
        <DocumentoCapture
          title="Curso"
          onCapture={handleCapturarCurso}
          onClose={() => { if (!cursoUploading) { setCursoShowCapture(false); setCursoError(''); } }}
          onPickAnother={() => setCursoError('')}
          busy={cursoUploading}
          uploadError={cursoError}
        />
      ) : null}

      {viewerIndex !== null && viewerItems[viewerIndex] ? (
        <DocumentViewerModal
          items={viewerItems}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onValidar={handleValidar}
          onRechazar={handleRechazar}
          onReemplazar={handleReemplazarDesdeVisor}
          revisando={revisando}
          revisarError={revisarError}
        />
      ) : null}
    </section>
  );
}
