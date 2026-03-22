﻿import React from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, X, Search, Check } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { buildApiUrl, getApiBaseUrl } from '../services/apiClient.js';

const buildAuthHeaders = (token) => {
  const headers = {};
  if (!token) return headers;
  if (token === 'dev-token') {
    headers['X-Dev-Auth'] = 'true';
    headers['X-Dev-User-Email'] = localStorage.getItem('local_dev_user_email') || 'admin@local.test';
    headers['X-Dev-User-Role'] = localStorage.getItem('local_dev_user_role') || 'superadministrador';
    const devSub = localStorage.getItem('local_dev_user_sub');
    if (devSub) headers['X-Dev-User-Sub'] = devSub;
  } else {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const fetchJson = async (path, { method = 'GET', token, body } = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = buildApiUrl(path, baseUrl);
  const headers = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...buildAuthHeaders(token)
  };
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const parsed = response.status === 204
    ? null
    : (isJson ? await response.json().catch(() => null) : await response.text().catch(() => ''));
  if (!response.ok) {
    const message = parsed?.message || (typeof parsed === 'string' ? parsed : `HTTP ${response.status}`);
    const error = new Error(message);
    error.status = response.status;
    error.details = parsed;
    throw error;
  }
  return parsed;
};

const emptySegmentDraft = () => ({
  nombre: '',
  departamentos: [],
  localidades: [],
  edadDesde: '',
  edadHasta: '',
  codigosArea: [],
  fuentes: [],
  fechaDesde: '',
  fechaHasta: '',
  diasSinGestion: '',
  telefonosTipo: ''
});

const summarizeSegment = (segment) => {
  const parts = [];
  if (segment.nombre) parts.push(`Nombre: ${segment.nombre}`);
  if (segment.departamentos?.length) parts.push(`Depto: ${segment.departamentos.join(', ')}`);
  if (segment.localidades?.length) parts.push(`Localidad: ${segment.localidades.join(', ')}`);
  if (segment.edadDesde || segment.edadHasta) parts.push(`Edad: ${segment.edadDesde || ‘0’}-${segment.edadHasta || ‘∞’}`);
  if (segment.codigosArea?.length) parts.push(`Área: ${segment.codigosArea.join(‘, ‘)}`);
  if (segment.fuentes?.length) parts.push(`Fuente: ${segment.fuentes.join(‘, ‘)}`);
  if (segment.fechaDesde || segment.fechaHasta) parts.push(`Ingreso: ${segment.fechaDesde || ‘...’}→${segment.fechaHasta || ‘...’}`);
  if (segment.diasSinGestion) parts.push(`Sin gestión: +${segment.diasSinGestion} días`);
  if (segment.telefonosTipo) parts.push(`Teléfonos: ${segment.telefonosTipo}`);
  return parts.join(' · ') || 'Sin filtros';
};

const hasAnyFilter = (segment) => {
  return [
    segment.nombre,
    segment.departamentos?.length,
    segment.localidades?.length,
    segment.edadDesde,
    segment.edadHasta,
    segment.codigosArea?.length,
    segment.fuentes?.length,
    segment.fechaDesde,
    segment.fechaHasta,
    segment.diasSinGestion,
    segment.telefonosTipo
  ].some(Boolean);
};

export default function SupervisorLotWizard({ Panel, Button, onExit, onCreated }) {
  const { user } = useAuth();
  const token = user?.accessToken || null;
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState('');

  const [sellers, setSellers] = React.useState([]);
  const [sellerSearch, setSellerSearch] = React.useState('');
  const [sellerDropdownOpen, setSellerDropdownOpen] = React.useState(false);
  const [selectedSellers, setSelectedSellers] = React.useState([]);
  const [leadSources, setLeadSources] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [localities, setLocalities] = React.useState([]);
  const [areaCodes, setAreaCodes] = React.useState([]);

  const [draft, setDraft] = React.useState({
    nombre: '',
    maxIntentos: 3,
    vencimiento: '',
    franja_ola1_inicio: '10:00',
    franja_ola1_fin: '13:00',
    franja_ola2_inicio: '17:00',
    franja_ola2_fin: '20:00',
    dias_entre_olas: 1
  });
  const [step1Touched, setStep1Touched] = React.useState(false);

  const [segmentDraft, setSegmentDraft] = React.useState(emptySegmentDraft());
  const [segments, setSegments] = React.useState([]);
  const [segmentPreviewTotal, setSegmentPreviewTotal] = React.useState(0);
  const [segmentPreviewLoading, setSegmentPreviewLoading] = React.useState(false);
  const [lotPreviewTotal, setLotPreviewTotal] = React.useState(0);

  const [previewPage, setPreviewPage] = React.useState(1);
  const previewPageSize = 50;
  const [previewRows, setPreviewRows] = React.useState([]);
  const [previewTotal, setPreviewTotal] = React.useState(0);
  const [previewSearch, setPreviewSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [manualSelection, setManualSelection] = React.useState(false);

  const [rejectedIds, setRejectedIds] = React.useState([]);
  const [showRejected, setShowRejected] = React.useState(false);

  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const [sellersResponse, sourcesResponse, departmentsResponse, areaResponse] = await Promise.all([
          fetchJson('/sellers', { token }),
          fetchJson('/lead-sources', { token }).catch((error) => (error.status === 404 ? [] : Promise.reject(error))),
          fetchJson('/departamentos', { token }).catch((error) => (error.status === 404 ? [] : Promise.reject(error))),
          fetchJson('/area-codes', { token }).catch((error) => (error.status === 404 ? [] : Promise.reject(error)))
        ]);
        const sellersList = sellersResponse?.data || sellersResponse?.items || sellersResponse || [];
        setSellers(Array.isArray(sellersList) ? sellersList : []);
        const sourcesList = sourcesResponse?.data || sourcesResponse?.items || sourcesResponse || [];
        const departmentsList = departmentsResponse?.data || departmentsResponse?.items || departmentsResponse || [];
        const areaList = areaResponse?.data || areaResponse?.items || areaResponse || [];
        setLeadSources(Array.isArray(sourcesList) ? sourcesList : []);
        setDepartments(Array.isArray(departmentsList) ? departmentsList : []);
        setAreaCodes(Array.isArray(areaList) ? areaList : []);
      } catch (error) {
        setToast(error.message || 'No se pudieron cargar los filtros.');
      }
    };
    loadOptions();
  }, [token]);

  React.useEffect(() => {
    if (!segmentDraft.departamentos.length) {
      setLocalities([]);
      return;
    }
    const loadLocalities = async () => {
      try {
        const params = new URLSearchParams();
        params.set('departamentos', segmentDraft.departamentos.join(','));
        const response = await fetchJson(`/localidades?${params.toString()}`, { token }).catch((error) => (error.status === 404 ? [] : Promise.reject(error)));
        const localitiesList = response?.data || response?.items || response || [];
        setLocalities(Array.isArray(localitiesList) ? localitiesList : []);
      } catch (error) {
        setToast(error.message || 'No se pudieron cargar localidades.');
      }
    };
    loadLocalities();
  }, [segmentDraft.departamentos, token]);

  React.useEffect(() => {
    if (!hasAnyFilter(segmentDraft)) {
      setSegmentPreviewTotal(0);
      return;
    }
    const handler = window.setTimeout(async () => {
      setSegmentPreviewLoading(true);
      try {
        const filtros = encodeURIComponent(JSON.stringify(segmentDraft));
        const response = await fetchJson(`/datos-para-trabajar/preview?filtros=${filtros}`, { token });
        setSegmentPreviewTotal(response?.total || response?.count || 0);
      } catch (error) {
        setSegmentPreviewTotal(0);
        setToast(error.message || 'No se pudo previsualizar el segmento.');
      } finally {
        setSegmentPreviewLoading(false);
      }
    }, 500);
    return () => window.clearTimeout(handler);
  }, [segmentDraft, token]);

  React.useEffect(() => {
    if (!segments.length) {
      setLotPreviewTotal(0);
      return;
    }
    const handler = window.setTimeout(async () => {
      try {
        const filtros = encodeURIComponent(JSON.stringify({ segmentos: segments.map((s) => s.filtros) }));
        const response = await fetchJson(`/datos-para-trabajar/preview?filtros=${filtros}`, { token });
        setLotPreviewTotal(response?.total || response?.count || segments.reduce((acc, s) => acc + s.total, 0));
      } catch {
        setLotPreviewTotal(segments.reduce((acc, s) => acc + s.total, 0));
      }
    }, 400);
    return () => window.clearTimeout(handler);
  }, [segments, token]);

  React.useEffect(() => {
    if (step !== 3) return;
    const loadPreview = async () => {
      setLoading(true);
      try {
        const filtros = encodeURIComponent(JSON.stringify({ segmentos: segments.map((s) => s.filtros) }));
        const params = new URLSearchParams({
          filtros,
          page: String(previewPage),
          pageSize: String(previewPageSize),
          search: previewSearch || ''
        });
        const response = await fetchJson(`/datos-para-trabajar/preview?${params.toString()}`, { token });
        const items = response?.items || [];
        setPreviewRows(items);
        setPreviewTotal(response?.total || items.length);
        if (!manualSelection) {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            items.forEach((item) => next.add(item.id));
            return next;
          });
        }
      } catch (error) {
        setToast(error.message || 'No se pudo cargar la previsualización.');
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [step, previewPage, previewSearch, segments, token, manualSelection]);

  const getSellerLabel = (seller) => {
    if (!seller) return '';
    const nombre = seller.nombre || seller.name || '';
    const apellido = seller.apellido || '';
    const fullName = `${nombre} ${apellido}`.trim();
    return fullName || seller.email || '';
  };
  const getOptionLabel = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.nombre || item.name || item.label || item.codigo || item.code || item.id || '';
  };
  const getOptionValue = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.id || item.nombre || item.name || item.label || item.codigo || item.code || '';
  };

  const sellerOptions = (Array.isArray(sellers) ? sellers : []).filter((seller) => {
    const label = getSellerLabel(seller);
    const alreadySelected = selectedSellers.some((selected) => selected.id === seller.id);
    return label.toLowerCase().includes(sellerSearch.toLowerCase()) && !alreadySelected;
  });

  const addSegment = () => {
    const total = segmentPreviewTotal || 0;
    const filtroPayload = { ...segmentDraft };
    setSegments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), filtros: filtroPayload, total, resumen: summarizeSegment(filtroPayload) }
    ]);
    setSegmentDraft(emptySegmentDraft());
    setSegmentPreviewTotal(0);
  };

  const removeSegment = (id) => {
    setSegments((prev) => prev.filter((segment) => segment.id !== id));
  };

  const canNextStep = () => {
    if (step === 1) {
      return draft.nombre.trim()
        && selectedSellers.length > 0
        && Number(draft.maxIntentos) >= 1
        && draft.franja_ola1_inicio < draft.franja_ola1_fin
        && draft.franja_ola2_inicio < draft.franja_ola2_fin
        && draft.franja_ola1_fin <= draft.franja_ola2_inicio;
    }
    if (step === 2) {
      return segments.length > 0;
    }
    if (step === 3) {
      return selectedIds.size > 0;
    }
    return true;
  };

  const getStep1Errors = () => {
    const errors = {};
    if (!draft.nombre.trim()) errors.nombre = 'El nombre del lote es obligatorio.';
    if (!selectedSellers.length) errors.vendedor = 'Debe asignar al menos un vendedor.';
    if (Number(draft.maxIntentos) < 1) errors.maxIntentos = 'Debe ser mayor o igual a 1.';
    if (draft.franja_ola1_inicio >= draft.franja_ola1_fin) errors.ola1 = 'La hora de inicio debe ser menor a la de fin.';
    if (draft.franja_ola2_inicio >= draft.franja_ola2_fin) errors.ola2 = 'La hora de inicio debe ser menor a la de fin.';
    if (draft.franja_ola1_fin > draft.franja_ola2_inicio) errors.franjas = 'La Ola 2 debe comenzar después de que termine la Ola 1.';
    return errors;
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      await fetchJson('/lead-batches', {
        method: 'POST',
        token,
        body: {
          nombre: draft.nombre.trim(),
          sellerIds: selectedSellers.map((seller) => seller.id),
          max_intentos: Number(draft.maxIntentos),
          fecha_vencimiento: draft.vencimiento || null,
          franja_ola1_inicio: draft.franja_ola1_inicio,
          franja_ola1_fin: draft.franja_ola1_fin,
          franja_ola2_inicio: draft.franja_ola2_inicio,
          franja_ola2_fin: draft.franja_ola2_fin,
          dias_entre_olas: Number(draft.dias_entre_olas) || 0,
          estado: 'borrador',
          criterios: segments.map((segment) => segment.filtros)
        }
      });
      setToast('Borrador guardado.');
      if (onCreated) onCreated();
    } catch (error) {
      setToast(error.message || 'No se pudo guardar el borrador.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateLot = async () => {
    setLoading(true);
    try {
      const created = await fetchJson('/lead-batches', {
        method: 'POST',
        token,
        body: {
          nombre: draft.nombre.trim(),
          sellerIds: selectedSellers.map((seller) => seller.id),
          max_intentos: Number(draft.maxIntentos),
          fecha_vencimiento: draft.vencimiento || null,
          franja_ola1_inicio: draft.franja_ola1_inicio,
          franja_ola1_fin: draft.franja_ola1_fin,
          franja_ola2_inicio: draft.franja_ola2_inicio,
          franja_ola2_fin: draft.franja_ola2_fin,
          dias_entre_olas: Number(draft.dias_entre_olas) || 0,
          estado: 'activo',
          criterios: segments.map((segment) => segment.filtros)
        }
      });
      const lotId = created?.id || created?.data?.id || created?.data?.item?.id;
      const response = await fetchJson('/lead-batches/assign', {
        method: 'POST',
        token,
        body: {
          loteId: lotId,
          contactos: Array.from(selectedIds)
        }
      });
      if (response?.rejectedIds?.length) {
        setRejectedIds(response.rejectedIds);
        setShowRejected(true);
        return;
      }
      setToast('Lote activado con éxito.');
      if (onCreated) onCreated();
    } catch (error) {
      if (error.status === 422 && error.details?.rejectedIds?.length) {
        setRejectedIds(error.details.rejectedIds);
        setShowRejected(true);
      } else {
        setToast(error.message || 'No se pudo activar el lote.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithoutRejected = async () => {
    const filtered = Array.from(selectedIds).filter((id) => !rejectedIds.includes(id));
    setShowRejected(false);
    setRejectedIds([]);
    setSelectedIds(new Set(filtered));
    setLoading(true);
    try {
      await fetchJson('/lead-batches/assign', {
        method: 'POST',
        token,
        body: {
          contactos: filtered
        }
      });
      setToast('Lote activado sin los rechazados.');
      if (onCreated) onCreated();
    } catch (error) {
      setToast(error.message || 'No se pudo continuar sin los rechazados.');
    } finally {
      setLoading(false);
    }
  };

  const step1Errors = step1Touched ? getStep1Errors() : {};

  const titleStyle = { fontSize: 15, fontWeight: 700, color: '#1A5C4A', margin: '0 0 4px 0' };
  const subtitleStyle = { fontSize: 12, color: '#888', margin: '0 0 16px 0' };
  const labelStyle = { fontSize: 12, fontWeight: 500, color: '#555' };
  const inputStyle = { padding: '8px 12px', fontSize: 13, border: '1px solid #E0E0E0', borderRadius: 8, height: 38, background: '#FFFFFF' };
  const btnPrimary = { background: '#1A5C4A', color: 'white', borderRadius: 8, border: 'none', padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' };
  const btnDisabled = { background: '#E0E0E0', color: '#999', borderRadius: 8, border: 'none', padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'not-allowed', width: '100%' };
  const sectionCard = { background: '#F8FAF9', border: '1px solid #E0EDE9', borderRadius: 12, padding: '16px 18px' };
  const itemCard = { background: '#F8FAF9', border: '1px solid #E0EDE9', borderRadius: 8, padding: '10px 12px' };
  const badge = (color) => ({ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: color + '20', color, borderRadius: 999, fontSize: 12, fontWeight: 600 });

  return (
    <div className="wizard-root">
      <div className="wizard-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>Crear lote</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>Wizard de creación por segmentos</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map((idx) => {
              const isCompleted = idx < step;
              const isCurrent = idx === step;
              const bg = isCompleted ? '#1A5C4A' : isCurrent ? 'rgba(26,92,74,0.12)' : 'rgba(15,23,42,0.06)';
              const color = isCompleted ? '#ffffff' : isCurrent ? '#1A5C4A' : '#64748b';
              const border = isCurrent ? '1px solid #1A5C4A' : '1px solid transparent';
              return (
                <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: bg, color, border, fontWeight: 700, fontSize: 12 }}>
                  {isCompleted ? <Check size={14} /> : null}
                  Paso {idx}
                </div>
              );
            })}
          </div>
          <Button variant="ghost" onClick={onExit}>Volver a lotes</Button>
        </div>
      </div>

      <div className="wizard-content">
        <div className="wizard-step-card">
          {toast ? <div style={{ marginBottom: 12, color: '#1A5C4A', fontWeight: 600 }}>{toast}</div> : null}

          {step === 1 ? (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Configuración general</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>Define los datos base del lote</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
  <div className="wizard-step1-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Nombre del lote</label>
        <input
          className="input"
          style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #E0E0E0', padding: '8px 12px', fontSize: 13 }}
          value={draft.nombre}
          onChange={(event) => setDraft((prev) => ({ ...prev, nombre: event.target.value }))}
        />
        {step1Errors.nombre ? <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>{step1Errors.nombre}</div> : null}
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Máx. intentos</label>
        <input
          className="input"
          type="number"
          min="1"
          style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #E0E0E0', padding: '8px 12px', fontSize: 13 }}
          value={draft.maxIntentos}
          onChange={(event) => setDraft((prev) => ({ ...prev, maxIntentos: event.target.value }))}
        />
        {step1Errors.maxIntentos ? <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>{step1Errors.maxIntentos}</div> : null}
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Vendedores asignados</label>
        {selectedSellers.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, marginTop: 6 }}>
            {selectedSellers.map((seller) => (
              <div
                key={seller.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#F0F7F5',
                  border: '1px solid #1A5C4A',
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 13,
                  color: '#1A5C4A',
                  fontWeight: 600
                }}
              >
                {getSellerLabel(seller)}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSellers((prev) => prev.filter((item) => item.id !== seller.id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      setSelectedSellers((prev) => prev.filter((item) => item.id !== seller.id));
                    }
                  }}
                  style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                >
                  ×
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <input
          className="input"
          style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #E0E0E0', padding: '8px 32px 8px 12px', fontSize: 13 }}
          value={sellerSearch}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSellerSearch(nextValue);
            setSellerDropdownOpen(nextValue.length > 0);
          }}
          onBlur={() => {
            window.setTimeout(() => setSellerDropdownOpen(false), 150);
          }}
          placeholder={selectedSellers.length ? 'Agregar otro vendedor...' : 'Buscar vendedor...'}
        />
        {sellerSearch ? (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              setSellerSearch('');
              setSellerDropdownOpen(false);
            }}
            style={{
              position: 'absolute',
              right: 10,
              top: 28,
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1
            }}
            aria-label="Limpiar vendedor"
          >
            <X size={16} />
          </button>
        ) : null}
        {sellerDropdownOpen && sellerSearch.length > 0 ? (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #E0E0E0', borderRadius: 10, marginTop: 6, maxHeight: 220, overflowY: 'auto' }}>
            {!sellers.length ? (
              <div style={{ padding: 12, color: 'var(--muted)' }}>Cargando...</div>
            ) : sellerOptions.length ? (
              sellerOptions.map((seller) => (
                <div
                  key={seller.id}
                  onMouseDown={() => {
                    setSelectedSellers((prev) => [...prev, seller]);
                    setSellerSearch('');
                    setSellerDropdownOpen(false);
                  }}
                  style={{
                    padding: 10,
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'inherit',
                    fontWeight: 500,
                    borderRadius: 8
                  }}
                >
                  {getSellerLabel(seller)}
                </div>
              ))
            ) : (
              <div style={{ padding: 12, color: 'var(--muted)' }}>Sin resultados</div>
            )}
          </div>
        ) : null}
        {step1Errors.vendedor ? <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>{step1Errors.vendedor}</div> : null}
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Fecha de vencimiento</label>
        <input
          className="input"
          type="date"
          style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #E0E0E0', padding: '8px 12px', fontSize: 13 }}
          value={draft.vencimiento}
          onChange={(event) => setDraft((prev) => ({ ...prev, vencimiento: event.target.value }))}
        />
      </div>
    </div>
  </div>

  <div style={{
    background: '#F8FAF9',
    borderRadius: 12,
    border: '1px solid #E0EDE9',
    padding: '14px 18px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <strong style={{ fontSize: 14, color: '#1A5C4A' }}>
        Estrategia de contactación
      </strong>
    </div>
    <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
      El sistema presentará los contactos según la franja horaria activa
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#333', minWidth: 200 }}>
          Ola 1 – Primer contacto
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="input"
            type="time"
            value={draft.franja_ola1_inicio}
            onChange={(event) => setDraft((prev) => ({ ...prev, franja_ola1_inicio: event.target.value }))}
            style={{ width: 120, height: 34, padding: '5px 8px', fontSize: 12 }}
          />
          <span style={{ color: '#666', fontSize: 13 }}>hasta</span>
          <input
            className="input"
            type="time"
            value={draft.franja_ola1_fin}
            onChange={(event) => setDraft((prev) => ({ ...prev, franja_ola1_fin: event.target.value }))}
            style={{ width: 120, height: 34, padding: '5px 8px', fontSize: 12 }}
          />
        </div>
      </div>
      {step1Errors.ola1 ? <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>{step1Errors.ola1}</div> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#333', minWidth: 200 }}>
          Ola 2 – Reintento (no contesta)
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="input"
            type="time"
            value={draft.franja_ola2_inicio}
            onChange={(event) => setDraft((prev) => ({ ...prev, franja_ola2_inicio: event.target.value }))}
            style={{ width: 120, height: 34, padding: '5px 8px', fontSize: 12 }}
          />
          <span style={{ color: '#666', fontSize: 13 }}>hasta</span>
          <input
            className="input"
            type="time"
            value={draft.franja_ola2_fin}
            onChange={(event) => setDraft((prev) => ({ ...prev, franja_ola2_fin: event.target.value }))}
            style={{ width: 120, height: 34, padding: '5px 8px', fontSize: 12 }}
          />
        </div>
      </div>
      {step1Errors.ola2 ? <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>{step1Errors.ola2}</div> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#333', minWidth: 200 }}>
          Días mínimos entre intentos
        </span>
        <input
          className="input"
          type="number"
          min={0}
          max={7}
          value={draft.dias_entre_olas}
          onChange={(event) => setDraft((prev) => ({
            ...prev,
            dias_entre_olas: Number.parseInt(event.target.value, 10) || 0
          }))}
        style={{ width: 70, textAlign: 'center', height: 34, padding: '5px 8px', fontSize: 12 }}
        />
        <span style={{ fontSize: 12, color: '#666' }}>días entre llamadas al mismo contacto</span>
      </div>
    </div>

    {step1Errors.franjas ? <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 8 }}>{step1Errors.franjas}</div> : null}
  </div>
</div>
            </div>
          ) : null}

          {step === 2 ? (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    height: '100%'
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      overflowY: 'auto',
      paddingRight: 8
    }}>
      <div>
        <h3 style={titleStyle}>
          Filtros del segmento
        </h3>
        <p style={subtitleStyle}>
          Combiná filtros para definir el grupo de contactos
        </p>
      </div>

      <div>
        <label style={labelStyle}>
          Nombre o apellido
        </label>
        <input
          className="input"
          type="text"
          placeholder="Contiene..."
          value={segmentDraft.nombre}
          onChange={(event) => setSegmentDraft((prev) => ({ ...prev, nombre: event.target.value }))}
          style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: 8, background: '#FFFFFF', boxSizing: 'border-box', height: 38 }}
        />
      </div>

      <div>
        <label style={labelStyle}>
          Departamento
        </label>
        <select
          className="input"
          multiple
          value={segmentDraft.departamentos}
          onChange={(event) => setSegmentDraft((prev) => ({ ...prev, departamentos: Array.from(event.target.selectedOptions).map((opt) => opt.value) }))}
          style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: 8, background: '#FFFFFF', boxSizing: 'border-box', minHeight: 38 }}
        >
          {departments.map((dept) => (
            <option key={getOptionValue(dept) || getOptionLabel(dept)} value={getOptionValue(dept)}>
              {getOptionLabel(dept)}
            </option>
          ))}
        </select>
      </div>

      {segmentDraft.departamentos.length > 0 ? (
        <div>
          <label style={labelStyle}>
            Localidad
          </label>
          <select
            className="input"
            multiple
            value={segmentDraft.localidades}
            onChange={(event) => setSegmentDraft((prev) => ({ ...prev, localidades: Array.from(event.target.selectedOptions).map((opt) => opt.value) }))}
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: 8, background: '#FFFFFF', boxSizing: 'border-box', minHeight: 38 }}
          >
            {localities.map((loc) => (
              <option key={getOptionValue(loc) || getOptionLabel(loc)} value={getOptionValue(loc)}>
                {getOptionLabel(loc)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label style={labelStyle}>
          Edad
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            type="number"
            placeholder="Desde"
            min="0"
            max="120"
            value={segmentDraft.edadDesde}
            onChange={(event) => setSegmentDraft((prev) => ({ ...prev, edadDesde: event.target.value }))}
            style={{ width: '50%', padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: 8, background: '#FFFFFF', boxSizing: 'border-box', height: 38 }}
          />
          <span style={{ color: '#888', fontSize: 13 }}>–</span>
          <input
            className="input"
            type="number"
            placeholder="Hasta"
            min="0"
            max="120"
            value={segmentDraft.edadHasta}
            onChange={(event) => setSegmentDraft((prev) => ({ ...prev, edadHasta: event.target.value }))}
            style={{ width: '50%', padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: 8, background: '#FFFFFF', boxSizing: 'border-box', height: 38 }}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>
          Origen del dato
        </label>
        <select
          className="input"
          multiple
          value={segmentDraft.fuentes}
          onChange={(event) => setSegmentDraft((prev) => ({ ...prev, fuentes: Array.from(event.target.selectedOptions).map((opt) => opt.value) }))}
          style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: 8, background: '#FFFFFF', boxSizing: 'border-box', minHeight: 38 }}
        >
          {leadSources.map((source) => (
            <option key={getOptionValue(source) || getOptionLabel(source)} value={getOptionValue(source)}>
              {getOptionLabel(source)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>
          Teléfonos
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { value: '', label: 'Cualquiera' },
            { value: 'solo_celular', label: 'Solo celular' },
            { value: 'solo_fijo', label: 'Solo teléfono fijo' },
            { value: 'ambos', label: 'Ambos (celular y fijo)' }
          ].map((opt) => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="radio"
                name="telefono_tipo"
                value={opt.value}
                checked={segmentDraft.telefonosTipo === opt.value}
                onChange={(event) => setSegmentDraft((prev) => ({ ...prev, telefonosTipo: event.target.value }))}
                style={{ accentColor: '#1A5C4A' }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>
          Días mínimos sin gestión
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="input"
            type="number"
            min="0"
            placeholder="0"
            value={segmentDraft.diasSinGestion}
            onChange={(event) => setSegmentDraft((prev) => ({ ...prev, diasSinGestion: event.target.value }))}
            style={{ width: 80, padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: 8, background: '#FFFFFF', boxSizing: 'border-box', height: 38 }}
          />
          <span style={{ fontSize: 12, color: '#888' }}>días sin ser contactado</span>
        </div>
      </div>

      <div style={{
        marginTop: 8,
        padding: '12px 16px',
        background: segmentPreviewTotal > 0 ? '#F0F7F5' : '#F5F5F5',
        borderRadius: 10,
        border: `1px solid ${segmentPreviewTotal > 0 ? '#1A5C4A33' : '#E0E0E0'}`
      }}>
        <p style={{
          fontSize: 13,
          fontWeight: 600,
          color: segmentPreviewTotal > 0 ? '#1A5C4A' : '#999',
          margin: '0 0 10px 0'
        }}>
          {segmentPreviewLoading
            ? 'Calculando...'
            : `${segmentPreviewTotal.toLocaleString()} contactos coinciden`}
        </p>
        <button
          type="button"
          onClick={addSegment}
          disabled={segmentPreviewTotal <= 0 || segmentPreviewLoading || !hasAnyFilter(segmentDraft)}
          style={{
            width: '100%',
            ...(segmentPreviewTotal > 0 ? btnPrimary : btnDisabled)
          }}
        >
          + Agregar segmento al lote
        </button>
      </div>
    </div>

    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      overflowY: 'auto'
    }}>
      <div>
        <h3 style={titleStyle}>
          Segmentos agregados
        </h3>
        <p style={subtitleStyle}>
          El lote se acumula con cada segmento que agregás
        </p>
      </div>

      {segments.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          background: '#F9F9F9',
          borderRadius: 12,
          border: '2px dashed #E0E0E0',
          color: '#aaa',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: 12, marginBottom: 8, color: '#999', letterSpacing: 1, textTransform: 'uppercase' }}>Segmentos</span>
          <p style={{ fontSize: 13, margin: 0 }}>
            Todavía no hay segmentos.
            <br />
            Aplicá filtros y agregá grupos de contactos.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {segments.map((segment, idx) => (
            <div key={segment.id} style={{
              background: '#F8FAF9',
              border: '1px solid #E0EDE9',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1A5C4A', margin: '0 0 4px 0' }}>
                  Segmento #{idx + 1}
                </p>
                <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px 0' }}>
                  {segment.resumen}
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: 0 }}>
                  {segment.total.toLocaleString()} contactos
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeSegment(segment.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#E53E3E',
                  fontSize: 18,
                  lineHeight: 1,
                  padding: '0 4px'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: 'auto',
        padding: '14px 16px',
        background: segments.length > 0 ? '#1A5C4A' : '#F0F0F0',
        borderRadius: 10,
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: 13,
          color: segments.length > 0 ? '#ffffff99' : '#999',
          margin: '0 0 2px 0'
        }}>
          Total lote acumulado
        </p>
        <p style={{
          fontSize: 22,
          fontWeight: 700,
          color: segments.length > 0 ? '#fff' : '#ccc',
          margin: 0
        }}>
          {lotPreviewTotal.toLocaleString()} contactos
        </p>
      </div>
    </div>
  </div>
) : null}
{step === 3 ? (
            <div>
              <h3 style={titleStyle}>Previsualización del lote</h3>
              <p style={subtitleStyle}>Revisá y ajustá los contactos antes de activar el lote.</p>
              <div className="toolbar" style={{ marginBottom: 12 }}>
                <div className="searchbox" style={{ maxWidth: 320 }}>
                  <Search size={16} color="#69788d" />
                  <input
                    value={previewSearch}
                    onChange={(event) => setPreviewSearch(event.target.value)}
                    placeholder="Buscar por nombre..."
                    style={inputStyle}
                  />
                </div>
                <span style={badge('#1A5C4A')}>{selectedIds.size.toLocaleString()} seleccionados de {previewTotal.toLocaleString()}</span>
                <Button variant="ghost" onClick={() => {
                  setManualSelection(true);
                  setSelectedIds(new Set());
                }}>Deseleccionar todos</Button>
                <Button variant="secondary" onClick={() => {
                  setManualSelection(false);
                  setSelectedIds(new Set(previewRows.map((item) => item.id)));
                }}>Seleccionar todos</Button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Nombre completo</th>
                      <th>Departamento</th>
                      <th>Localidad</th>
                      <th>Teléfono fijo</th>
                      <th>Celular</th>
                      <th>Fuente</th>
                      <th>Días sin gestión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => {
                              setManualSelection(true);
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              });
                            }}
                            style={{ accentColor: '#1A5C4A' }}
                          />
                        </td>
                        <td><strong>{item.nombre || '-'}</strong></td>
                        <td>{item.departamento || '-'}</td>
                        <td>{item.localidad || '-'}</td>
                        <td>{item.telefono || '-'}</td>
                        <td>{item.celular || '-'}</td>
                        <td>{item.origen_dato || '-'}</td>
                        <td>{item.dias_sin_gestion || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!previewRows.length ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 16px',
                    background: '#F9F9F9',
                    borderRadius: '12px',
                    border: '2px dashed #E0E0E0',
                    color: '#aaa',
                    textAlign: 'center',
                    minHeight: '120px'
                  }}>
                    <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                      No hay contactos para esta vista.
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                <span style={badge('#9E9E9E')}>Página {previewPage}</span>
                <div className="toolbar">
                  <Button variant="secondary" onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                  <Button variant="secondary" onClick={() => setPreviewPage((p) => p + 1)}>Siguiente</Button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <h3 style={titleStyle}>Confirmación del lote</h3>
              <p style={subtitleStyle}>Revisá la configuración antes de activar.</p>
              <div className="wizard-step1-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={sectionCard}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A5C4A', marginBottom: 8 }}>Configuración</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#888' }}>Nombre</span>
                      <div style={{ fontWeight: 600, color: '#333' }}>{draft.nombre}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: '#888' }}>Vendedores</span>
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedSellers.length
                          ? selectedSellers.map((seller) => (
                            <span key={seller.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#F0F7F5', color: '#1A5C4A', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                              {getSellerLabel(seller)}
                            </span>
                          ))
                          : <span style={{ color: '#888', fontSize: 12 }}>-</span>}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: '#888' }}>Máx. intentos</span>
                      <div style={{ fontWeight: 600, color: '#333' }}>{draft.maxIntentos}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: '#888' }}>Vencimiento</span>
                      <div style={{ fontWeight: 600, color: '#333' }}>{draft.vencimiento || '-'}</div>
                    </div>
                  </div>
                </div>

                <div style={sectionCard}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A5C4A', marginBottom: 8 }}>Segmentos</div>
                  {segments.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '32px 16px',
                      background: '#F9F9F9',
                      borderRadius: '12px',
                      border: '2px dashed #E0E0E0',
                      color: '#aaa',
                      textAlign: 'center',
                      minHeight: '120px'
                    }}>
                      <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                        Todavía no hay segmentos.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {segments.map((segment) => (
                        <div key={segment.id} style={itemCard}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: '#1A5C4A', marginBottom: 4 }}>{segment.resumen}</div>
                          <div style={{ color: '#666', fontSize: 12 }}>{segment.total.toLocaleString()} contactos</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 12, fontWeight: 700 }}>Total final: {selectedIds.size.toLocaleString()} contactos</div>
                </div>
              </div>
            </div>
          ) : null}

        </div>
      </div>
      <div className="wizard-footer">
        <Button variant="ghost" onClick={() => setStep((prev) => Math.max(1, prev - 1))} disabled={step === 1}>
          <ChevronLeft size={16} />Anterior
        </Button>
        <div className="toolbar">
          <Button variant="secondary" onClick={handleSaveDraft} disabled={loading}>
            Guardar borrador
          </Button>
          {step < 4 ? (
            <Button onClick={() => {
              if (step === 1) setStep1Touched(true);
              if (!canNextStep()) return;
              setStep((prev) => Math.min(4, prev + 1));
            }} disabled={!canNextStep() || loading}>
              Siguiente <ChevronRight size={16} />
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleActivateLot}
              disabled={loading}
              style={{
                background: loading ? '#E0E0E0' : '#1A5C4A',
                color: loading ? '#999' : 'white',
                borderRadius: 8,
                border: 'none',
                padding: '10px 24px',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Activar lote
            </button>
          )}
        </div>
      </div>


      {showRejected ? (
        <div className="lot-wizard-overlay" onClick={() => setShowRejected(false)}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()}>
            <div className="lot-wizard-header">
              <div>
                <h3>Contactos rechazados</h3>
                <p>El backend rechazó {rejectedIds.length} contactos.</p>
              </div>
              <button className="icon-button" onClick={() => setShowRejected(false)}><X size={16} /></button>
            </div>
            <div className="list" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {rejectedIds.map((id) => <div key={id} className="alert">{id}</div>)}
            </div>
            <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="ghost" onClick={() => setShowRejected(false)}>Volver a revisar</Button>
              <Button onClick={handleContinueWithoutRejected}>Continuar sin ellos</Button>
            </div>
          </div>
        </div>
      ) : null}
      <style>{`
        .wizard-root {
          height: calc(100vh - var(--topbar-offset, 80px));
          display: flex;
          flex-direction: column;
          background: #F5F3EE;
          overflow: hidden;
          width: 100%;
          box-sizing: border-box;
          margin-left: -24px;
          margin-right: -24px;
          width: calc(100% + 48px);
        }
        .wizard-header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #FFFFFF;
          border-bottom: 1px solid #E0E0E0;
          padding: 16px 32px;
          flex-shrink: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .wizard-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 20px 32px;
          overflow: auto;
          min-height: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .wizard-step-card {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          background: #FFFFFF;
          border-radius: 16px;
          padding: 28px 36px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          box-sizing: border-box;
        }
        .wizard-step-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .wizard-step1-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }
        .wizard-step-card .input,
        .wizard-step-card select,
        .wizard-step-card input[type="text"],
        .wizard-step-card input[type="number"],
        .wizard-step-card input[type="date"] {
          height: 38px;
          padding: 8px 12px;
          font-size: 13px;
          border: 1px solid #E0E0E0;
          border-radius: 8px;
          background: #FFFFFF;
          color: #333;
        }
        .wizard-step-card input[type="time"] {
          height: 34px;
          padding: 5px 8px;
          font-size: 12px;
          border: 1px solid #E0E0E0;
          border-radius: 8px;
          background: #FFFFFF;
          color: #333;
        }
        .wizard-step-card label {
          font-size: 12px;
          font-weight: 500;
          color: #555;
          display: block;
          margin-bottom: 4px;
        }
        .wizard-step-card .input:focus,
        .wizard-step-card select:focus,
        .wizard-step-card textarea:focus {
          outline: none;
          border-color: #1A5C4A;
          box-shadow: 0 0 0 3px rgba(26, 92, 74, 0.1);
        }
        .wizard-step-card .list {
          gap: 10px;
        }
        .wizard-step-card .toolbar {
          gap: 10px;
          flex-wrap: wrap;
        }
        .wizard-step-card .table-wrap {
          max-height: 480px;
          overflow: auto;
        }
        .wizard-step-card table th,
        .wizard-step-card table td {
          padding: 10px 12px;
          font-size: 13px;
        }
        .wizard-step-card table thead th {
          background: #1A5C4A;
          color: #FFFFFF;
        }
        .wizard-step-card table tbody tr:nth-child(even) {
          background: #F8FAF9;
        }
        .wizard-footer {
          background: #FFFFFF;
          border-top: 1px solid #E0E0E0;
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-shrink: 0;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .wizard-step-grid {
            grid-template-columns: 1fr;
          }
          .wizard-step1-grid {
            grid-template-columns: 1fr;
          }
          .wizard-step-card {
            padding: 24px;
            max-width: 100%;
          }
          .wizard-content {
            padding: 24px;
          }
          .wizard-footer {
            flex-direction: column;
            align-items: stretch;
          }
          .wizard-footer .toolbar {
            width: 100%;
            flex-direction: column;
          }
          .wizard-footer .toolbar button {
            width: 100%;
          }
        }
        @media (max-width: 1023px) {
          .wizard-root {
            margin-left: -16px;
            margin-right: -16px;
            width: calc(100% + 32px);
          }
        }
        @media (max-width: 480px) {
          .wizard-content {
            padding: 16px;
          }
          .wizard-step-card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}




