import React, { useEffect } from 'react';
import { X, Phone, Check, XCircle, Edit3, FileDown, ChevronDown } from 'lucide-react';
import { updateContact, downloadClientDocument, notifyClientDocumentSent } from '../services/clientsService.js';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(6px)',
  zIndex: 40
};

const drawerStyle = {
  position: 'fixed',
  top: 24,
  right: 24,
  bottom: 24,
  width: 'min(680px, calc(100% - 48px))',
  backgroundColor: '#fff',
  boxShadow: 'rgba(15, 23, 42, 0.25) 0px 20px 60px',
  padding: '22px',
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  borderRadius: 24,
  overflowY: 'auto'
};

const headerMeta = {
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: '#64748b'
};

const cardStyle = {
  borderRadius: 14,
  padding: '16px',
  border: '1px solid rgba(148, 163, 184, 0.32)',
  backgroundColor: '#f8fafc'
};

const gridTwo = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12
};

const labelStyle = {
  fontSize: 11,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: '#6b7280',
  marginBottom: 4
};

const valueStyle = {
  fontSize: 16,
  fontWeight: 600,
  color: '#111827',
  wordBreak: 'break-word'
};

const valueEmpty = {
  fontSize: 15,
  fontWeight: 600,
  color: '#94a3b8',
  fontStyle: 'italic',
  wordBreak: 'break-word'
};

const statusBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 11,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  fontWeight: 700,
  background: '#dcfce7',
  color: '#047857'
};

const progressBar = {
  height: 8,
  borderRadius: 999,
  backgroundColor: '#e5e7eb',
  overflow: 'hidden',
  marginTop: 8
};

const progressFiller = (value) => ({
  width: `${value}%`,
  height: '100%',
  borderRadius: 999,
  backgroundImage: 'linear-gradient(90deg, #10b981, #059669)'
});

const inputStyle = {
  marginTop: 6,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #e5e7eb'
};

const formatField = (value) => (value ? String(value) : '—');
const pickField = (...values) => {
  for (const value of values) {
    if (value === 0) return value;
    if (value) return value;
  }
  return '';
};

const ensureNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const computeMonthsSince = (value) => {
  if (!value) return 0;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  const now = new Date();
  let months = (now.getFullYear() - parsed.getFullYear()) * 12 + (now.getMonth() - parsed.getMonth());
  if (now.getDate() < parsed.getDate()) months -= 1;
  return Math.max(0, months);
};

const computeAge = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - parsed.getFullYear();
  const monthDelta = now.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < parsed.getDate())) {
    years -= 1;
  }
  return years < 0 ? null : years;
};

const extractLabel = (value, keys = []) => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'object') {
    for (const key of keys) {
      if (value[key]) return value[key];
    }
  }
  return '';
};

const toDateInput = (value) => {
  if (!value) return '';
  const text = String(value);
  return text.includes('T') ? text.split('T')[0] : text;
};

const formatDateDisplay = (value) => {
  if (!value) return '';
  const text = String(value).trim();
  if (!text) return '';
  const iso = text.includes('T') ? text.split('T')[0] : text;
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) return `${day}/${month}/${year}`;
  }
  return text;
};

const normalizePaymentMethod = (value) => {
  if (!value) return '';
  let text = String(value).trim().toLowerCase();
  if (!text) return '';
  try {
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    // Si el entorno no soporta normalize, dejamos el texto tal como viene.
  }
  if (text.includes('deb')) return 'debito';
  if (text.includes('cred')) return 'credito';
  if (text.includes('efect')) return 'efectivo';
  if (text.includes('transf')) return 'transferencia';
  return text;
};

const paymentMethodLabel = (value) => {
  const normalized = normalizePaymentMethod(value);
  const labels = {
    debito: 'Débito',
    credito: 'Crédito',
    efectivo: 'Efectivo',
    transferencia: 'Transferencia'
  };
  return labels[normalized] || (value ? String(value) : '');
};

const splitName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { nombre: '', apellido: '' };
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return {
    nombre: parts.slice(0, parts.length - 1).join(' '),
    apellido: parts[parts.length - 1]
  };
};

const buildDraftFromClient = (client) => {
  const fullName = client.nombre || client.name || '';
  const fallbackParts = client.apellido ? { nombre: fullName, apellido: client.apellido } : splitName(fullName);
  return {
    nombre: client.nombre || fallbackParts.nombre || '',
    apellido: client.apellido || fallbackParts.apellido || '',
    documento: client.documento || '',
    fecha_nacimiento: toDateInput(client.fecha_nacimiento || client.fechaNacimiento || ''),
    telefono: client.telefono || client.phone || '',
    celular: client.celular || client.cellphone || client.telefono_celular || client.telefonoCelular || '',
    email: client.email || '',
    direccion: client.direccion || '',
    departamento: client.departamento || '',
    pais: client.pais || 'Uruguay'
  };
};

export default function ClienteFichaForm({ open, client, onClose, onUpdated, detailError = '' }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState(buildDraftFromClient(client || {}));
  const [editError, setEditError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [downloadNotice, setDownloadNotice] = React.useState('');
  const [downloading, setDownloading] = React.useState(false);
  const [familyOpen, setFamilyOpen] = React.useState(true);

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !client) return;
    setIsEditing(false);
    setEditError('');
    setDownloadNotice('');
    setEditDraft(buildDraftFromClient(client));
    setFamilyOpen(true);
  }, [open, client?.id]);

  if (!open || !client) return null;

  const telefono = pickField(client.phone, client.telefono, client.telefono_principal);
  const celular = pickField(client.celular, client.cellphone, client.telefonoCelular, client.telefono_celular, client.celularNumero);
  const fechaNacimiento = pickField(client.fechaNacimiento, client.fecha_nacimiento);
  const direccion = pickField(client.direccion, client.address);
  const departamento = pickField(client.departamento, client.state);
  const pais = pickField(client.pais, client.country);
  const nombreFamiliar = pickField(client.nombre_familiar, client.nombreFamiliar, client.familiar_nombre, client.nombreFamiliarTitular);
  const apellidoFamiliar = pickField(client.apellido_familiar, client.apellidoFamiliar, client.familiar_apellido, client.apellidoFamiliarTitular);
  const telefonoFamiliar = pickField(client.telefono_familiar, client.telefonoFamiliar, client.familiar_telefono, client.contactoFamiliarTelefono);
  const parentescoFamiliar = pickField(client.parentesco, client.parentesco_familiar, client.parentescoFamiliar, client.familiar_parentesco);
  const hasFamilyData = Boolean(nombreFamiliar || apellidoFamiliar || telefonoFamiliar || parentescoFamiliar);
  const salesHistory = Array.isArray(client.salesHistory)
    ? client.salesHistory
    : (Array.isArray(client.sales) ? client.sales : []);
  const primarySale = salesHistory[0] || null;
  const fechaVenta = pickField(
    client.fechaVenta,
    client.fecha_venta,
    client.ventaFecha,
    client.products?.[0]?.fechaAlta,
    client.products?.[0]?.fecha_alta,
    client.product?.fechaAlta,
    client.product?.fecha_alta,
    client.producto?.fechaAlta,
    client.producto?.fecha_alta,
    primarySale?.fechaAlta,
    primarySale?.fecha_alta,
    primarySale?.fechaVenta,
    primarySale?.fecha_venta,
    client.createdAt
  );
  const vendedor = pickField(
    client.vendedor,
    client.vendedorNombre,
    client.vendedor_nombre,
    client.salesRep,
    client.product?.sellerName,
    client.product?.seller_name,
    client.producto?.sellerName,
    client.producto?.seller_name,
    primarySale?.sellerName,
    primarySale?.seller_name,
    primarySale?.vendedor,
    primarySale?.vendedorNombre
  );
  const medioPago = pickField(
    client.medioPago,
    client.medio_pago,
    client.product?.medioPago,
    client.product?.medio_pago,
    client.producto?.medioPago,
    client.producto?.medio_pago,
    primarySale?.medioPago,
    primarySale?.medio_pago
  );
  const medioPagoLabel = paymentMethodLabel(medioPago);
  const productsList = Array.isArray(client.products) ? client.products : [];
  const sortedProducts = productsList.slice().sort((a, b) => {
    const aDate = new Date(a.fechaAlta || a.fecha_alta || 0).getTime() || 0;
    const bDate = new Date(b.fechaAlta || b.fecha_alta || 0).getTime() || 0;
    return bDate - aDate;
  });
  const normalizedProducts = [];
  const seenProducts = new Set();
  for (const item of sortedProducts) {
    const key = [
      item.id || '',
      item.nombreProducto || item.nombre || item.name || '',
      item.precio ?? '',
      item.estado || item.estadoProducto || '',
      item.fechaAlta || item.fecha_alta || '',
      item.fechaBaja || item.fecha_baja || '',
      item.medioPago || item.medio_pago || '',
      item.sellerName || item.vendedor || item.seller_name || ''
    ].join('|').toLowerCase();
    if (seenProducts.has(key)) continue;
    seenProducts.add(key);
    normalizedProducts.push(item);
  }
  const primaryProduct = normalizedProducts[0] || null;
  const primaryKey = primaryProduct
    ? [
      primaryProduct.id || '',
      primaryProduct.nombreProducto || primaryProduct.nombre || primaryProduct.name || '',
      primaryProduct.precio ?? '',
      primaryProduct.estado || primaryProduct.estadoProducto || '',
      primaryProduct.fechaAlta || primaryProduct.fecha_alta || '',
      primaryProduct.fechaBaja || primaryProduct.fecha_baja || '',
      primaryProduct.medioPago || primaryProduct.medio_pago || '',
      primaryProduct.sellerName || primaryProduct.vendedor || primaryProduct.seller_name || ''
    ].join('|').toLowerCase()
    : null;
  const associatedProducts = primaryKey
    ? normalizedProducts.filter((item) => {
      const key = [
        item.id || '',
        item.nombreProducto || item.nombre || item.name || '',
        item.precio ?? '',
        item.estado || item.estadoProducto || '',
        item.fechaAlta || item.fecha_alta || '',
        item.fechaBaja || item.fecha_baja || '',
        item.medioPago || item.medio_pago || '',
        item.sellerName || item.vendedor || item.seller_name || ''
      ].join('|').toLowerCase();
      return key !== primaryKey;
    })
    : normalizedProducts;

  const productName = pickField(
    primaryProduct?.nombreProducto,
    primaryProduct?.nombre,
    primaryProduct?.name,
    extractLabel(client.product, ['nombre', 'name', 'nombreProducto', 'nombre_producto']),
    extractLabel(client.producto, ['nombre', 'name', 'nombreProducto', 'nombre_producto']),
    extractLabel(client.producto_nombre, ['nombre', 'name', 'nombreProducto', 'nombre_producto']),
    extractLabel(client.productoNombre, ['nombre', 'name', 'nombreProducto', 'nombre_producto']),
    extractLabel(client.servicio, ['nombre', 'name']),
    extractLabel(client.productDetail, ['nombre', 'name'])
  );
  const planName = pickField(
    primaryProduct?.plan,
    primaryProduct?.planNombre,
    primaryProduct?.plan_nombre,
    client.plan,
    extractLabel(client.planNombre, ['nombre', 'name']),
    extractLabel(client.plan_nombre, ['nombre', 'name']),
    extractLabel(client.planDetail, ['nombre', 'name'])
  );
  const productStatus = pickField(
    primaryProduct?.estado,
    primaryProduct?.estadoProducto,
    primaryProduct?.estado_producto,
    client.product?.estadoProducto,
    client.product?.estado,
    client.product?.estado_producto,
    client.producto?.estadoProducto,
    client.producto?.estado,
    client.producto?.estado_producto,
    client.estadoProducto,
    client.estado_producto,
    client.productStatus,
    client.product_status
  );
  const fechaBaja = pickField(
    primaryProduct?.fechaBaja,
    primaryProduct?.fecha_baja,
    client.product?.fechaBaja,
    client.product?.fecha_baja,
    client.producto?.fechaBaja,
    client.producto?.fecha_baja,
    client.fechaBaja,
    client.fecha_baja
  );
  const isBaja = String(productStatus || '').toLowerCase() === 'baja';
  const statusBadgeStyle = isBaja
    ? { ...statusBadge, background: '#fee2e2', color: '#b91c1c' }
    : statusBadge;
  const statusLabel = productStatus || client.status;
  const feeRaw = pickField(
    primaryProduct?.precio,
    client.fee,
    client.cuota,
    client.precio,
    client.cuota_mensual,
    client.price
  );
  const feeNumeric = Number(String(feeRaw || '').replace(/[^0-9.-]/g, ''));
  const feeValue = Number.isNaN(feeNumeric) ? feeRaw : `$ ${feeNumeric.toLocaleString('es-UY')}`;
  const edad = computeAge(fechaNacimiento);
  const carenciaCalculada = typeof edad === 'number' ? (edad < 80 ? 12 : 24) : 0;
  const carencia = ensureNumber(primaryProduct?.carenciaCuotas || primaryProduct?.carencia_cuotas) || ensureNumber(client.carenciaCuotas) || carenciaCalculada;
  const cuotasCalculadas = computeMonthsSince(fechaVenta);
  const cuotas = ensureNumber(primaryProduct?.cuotasPagas || primaryProduct?.cuotas_pagas) || ensureNumber(client.cuotasPagas) || cuotasCalculadas;
  const progress = carencia ? Math.min(100, Math.round((cuotas / carencia) * 100)) : 0;
  const cumpleCarencia = carencia > 0 && cuotas >= carencia;
  const shouldShowProductsList = associatedProducts.length > 0;

  const handleDraftChange = (field, value) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError('');
    setEditDraft(buildDraftFromClient(client));
  };

  const formatValidationErrors = (errors) => {
    if (!errors || typeof errors !== 'object') return '';
    return Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(' · ');
  };

  const handleSaveEdit = async () => {
    if (!client?.id || saving) return;
    setSaving(true);
    setEditError('');
    try {
      const payload = { contact: { ...editDraft } };
      const updated = await updateContact(client.id, payload);
      setIsEditing(false);
      setEditDraft(buildDraftFromClient(updated));
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      const status = err?.status;
      if (status === 409) {
        setEditError('Documento o email ya existe.');
      } else if (status === 422) {
        const detailErrors = err?.details?.errors || err?.errors;
        setEditError(formatValidationErrors(detailErrors) || 'Hay errores de validacion en el formulario.');
      } else {
        setEditError(err?.message || 'No se pudo guardar la ficha.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!client?.id || downloading) return;
    setDownloading(true);
    setDownloadNotice('');
    try {
      const { blob, filename } = await downloadClientDocument(client.id, { template: 'standard', lang: 'es' });
      console.log('PDF size', blob?.size, 'type', blob?.type);
      const fallbackName = `ficha-cliente-${client.id}.pdf`;
      const finalName = filename || fallbackName;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloadNotice('Documento descargado.');
      try {
        await notifyClientDocumentSent(client.id, { channel: 'whatsapp', note: 'enviado al cliente' });
      } catch {
        // No bloquear la descarga si falla la notificacion.
      }
    } catch (err) {
      setDownloadNotice(err?.message || 'No se pudo descargar el documento.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <aside style={drawerStyle} className="client-sheet">
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={headerMeta}>Ficha del cliente</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: '6px 0', fontSize: 24, fontWeight: 700, color: '#111827' }}>{formatField(client.nombre || client.name || editDraft.nombre)}</h2>
              <button
                type="button"
                aria-label="Descargar PDF"
                onClick={handleDownloadPdf}
                style={{ border: 'none', background: '#eef2ff', borderRadius: '50%', width: 42, height: 42, cursor: downloading ? 'progress' : 'pointer', display: 'grid', placeItems: 'center', opacity: downloading ? 0.7 : 1 }}
              >
                <FileDown size={20} color="#334155" />
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer' }}
          >
            <X size={18} color="#334155" />
          </button>
        </header>
        {detailError ? (
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: -6 }}>
            {detailError}
          </div>
        ) : null}
        {downloadNotice ? (
          <div style={{ fontSize: 12, color: downloadNotice.includes('No se pudo') ? '#b91c1c' : '#15803d', marginTop: -6 }}>
            {downloadNotice}
          </div>
        ) : null}

        <section style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={labelStyle}>Datos del contacto</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isEditing ? (
                <button type="button" onClick={() => setIsEditing(true)} style={{ border: 'none', background: '#eef2ff', borderRadius: 10, padding: 6, cursor: 'pointer' }}>
                  <Edit3 size={14} color="#334155" />
                </button>
              ) : (
                <>
                  <button type="button" onClick={handleSaveEdit} style={{ border: 'none', background: '#dcfce7', borderRadius: 10, padding: 6, cursor: 'pointer' }}>
                    <Check size={14} color="#047857" />
                  </button>
                  <button type="button" onClick={handleCancelEdit} style={{ border: 'none', background: '#fee2e2', borderRadius: 10, padding: 6, cursor: 'pointer' }}>
                    <XCircle size={14} color="#b91c1c" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={gridTwo} className="client-sheet-grid">
            <div>
              <div style={labelStyle}>Nombre</div>
              {isEditing ? (
                <input value={editDraft.nombre} onChange={(event) => handleDraftChange('nombre', event.target.value)} style={inputStyle} />
              ) : (
                <div style={editDraft.nombre ? valueStyle : valueEmpty}>{formatField(client.nombre || editDraft.nombre)}</div>
              )}
            </div>
            <div>
              <div style={labelStyle}>Apellido</div>
              {isEditing ? (
                <input value={editDraft.apellido} onChange={(event) => handleDraftChange('apellido', event.target.value)} style={inputStyle} />
              ) : (
                <div style={editDraft.apellido ? valueStyle : valueEmpty}>{formatField(client.apellido || editDraft.apellido)}</div>
              )}
            </div>
            <div>
              <div style={labelStyle}>Documento</div>
              {isEditing ? (
                <input value={editDraft.documento} onChange={(event) => handleDraftChange('documento', event.target.value)} style={inputStyle} />
              ) : (
                <div style={client.documento ? valueStyle : valueEmpty}>{formatField(client.documento)}</div>
              )}
            </div>
            <div>
              <div style={labelStyle}>Fecha de nacimiento</div>
              {isEditing ? (
                <input type="date" value={editDraft.fecha_nacimiento} onChange={(event) => handleDraftChange('fecha_nacimiento', event.target.value)} style={inputStyle} />
              ) : (
                <div style={fechaNacimiento ? valueStyle : valueEmpty}>{formatField(formatDateDisplay(fechaNacimiento))}</div>
              )}
            </div>
            <div>
              <div style={labelStyle}>Edad</div>
              <div style={typeof edad === 'number' ? valueStyle : valueEmpty}>{typeof edad === 'number' ? `${edad} años` : '—'}</div>
            </div>
            <div>
              <div style={labelStyle}>Telefono</div>
              {isEditing ? (
                <input value={editDraft.telefono} onChange={(event) => handleDraftChange('telefono', event.target.value)} style={inputStyle} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={telefono ? valueStyle : valueEmpty}>{formatField(telefono)}</span>
                  {telefono && (
                    <a href={`tel:${String(telefono).replace(/\s/g, '')}`} style={{ color: '#059669' }}>
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              )}
            </div>
            <div>
              <div style={labelStyle}>Celular</div>
              {isEditing ? (
                <input value={editDraft.celular} onChange={(event) => handleDraftChange('celular', event.target.value)} style={inputStyle} />
              ) : (
                <div style={celular ? valueStyle : valueEmpty}>{formatField(celular)}</div>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Email</div>
              {isEditing ? (
                <input value={editDraft.email} onChange={(event) => handleDraftChange('email', event.target.value)} style={inputStyle} />
              ) : (
                <div style={client.email ? valueStyle : valueEmpty}>{formatField(client.email)}</div>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Direccion</div>
              {isEditing ? (
                <input value={editDraft.direccion} onChange={(event) => handleDraftChange('direccion', event.target.value)} style={inputStyle} />
              ) : (
                <div style={direccion ? valueStyle : valueEmpty}>{formatField(direccion)}</div>
              )}
            </div>
            <div>
              <div style={labelStyle}>Departamento</div>
              {isEditing ? (
                <input value={editDraft.departamento} onChange={(event) => handleDraftChange('departamento', event.target.value)} style={inputStyle} />
              ) : (
                <div style={departamento ? valueStyle : valueEmpty}>{formatField(departamento)}</div>
              )}
            </div>
            <div>
              <div style={labelStyle}>Pais</div>
              {isEditing ? (
                <input value={editDraft.pais} onChange={(event) => handleDraftChange('pais', event.target.value)} style={inputStyle} />
              ) : (
                <div style={pais ? valueStyle : valueEmpty}>{formatField(pais)}</div>
              )}
            </div>
          </div>
          {editError ? <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 12 }}>{editError}</div> : null}
        </section>

        {hasFamilyData ? (
          <section style={cardStyle}>
            <button
              type="button"
              onClick={() => setFamilyOpen((prev) => !prev)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
              aria-expanded={familyOpen}
            >
              <div style={labelStyle}>Datos de familiar</div>
              <ChevronDown size={18} color="#475569" style={{ transition: 'transform 180ms ease', transform: familyOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            {familyOpen ? (
              <div style={{ ...gridTwo, marginTop: 12 }} className="client-sheet-grid">
                <div>
                  <div style={labelStyle}>Nombre</div>
                  <div style={nombreFamiliar ? valueStyle : valueEmpty}>{formatField(nombreFamiliar)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Apellido</div>
                  <div style={apellidoFamiliar ? valueStyle : valueEmpty}>{formatField(apellidoFamiliar)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Teléfono</div>
                  <div style={telefonoFamiliar ? valueStyle : valueEmpty}>{formatField(telefonoFamiliar)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Parentesco</div>
                  <div style={parentescoFamiliar ? valueStyle : valueEmpty}>{formatField(parentescoFamiliar)}</div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section style={{ ...cardStyle, backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={labelStyle}>Servicio</div>
            <span style={statusBadgeStyle}>{formatField(statusLabel)}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ ...gridTwo, alignItems: 'baseline' }} className="client-sheet-grid">
              <div>
                <div style={valueStyle}>{formatField(productName)}</div>
                <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>{formatField(planName)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={valueStyle}>{formatField(feeValue)}</div>
                <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>{cuotas}/{carencia || 0} cuotas</div>
              </div>
            </div>
            <div style={progressBar}>
              <div style={progressFiller(progress)} />
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {carencia ? `${cuotas} de ${carencia} cuotas pagadas` : 'Sin carencia definida'}
              </span>
              {carencia ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: cumpleCarencia ? '#15803d' : '#b91c1c' }}>
                  {cumpleCarencia ? 'Cumple con la carencia' : 'No cumple con carencia'}
                </span>
              ) : null}
            </div>
            {isBaja ? (
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                Fecha de baja: {formatField(formatDateDisplay(fechaBaja))}
              </div>
            ) : null}
            {null}
          </div>
        </section>

        <section style={{ ...cardStyle, backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={labelStyle}>Venta</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={gridTwo} className="client-sheet-grid">
              <div>
                <div style={labelStyle}>Fecha de venta</div>
                <div style={fechaVenta ? valueStyle : valueEmpty}>{formatField(formatDateDisplay(fechaVenta))}</div>
              </div>
              <div>
                <div style={labelStyle}>Vendedor</div>
                <div style={vendedor ? valueStyle : valueEmpty}>{formatField(vendedor)}</div>
              </div>
              <div>
                <div style={labelStyle}>Medio de pago</div>
                <div style={medioPago ? valueStyle : valueEmpty}>{formatField(medioPagoLabel)}</div>
              </div>
            </div>
            {salesHistory.length ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Historial de ventas</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {salesHistory.map((sale, index) => {
                    const saleDate = pickField(sale.fechaAlta, sale.fecha_alta, sale.fechaVenta, sale.fecha_venta);
                    const saleSeller = pickField(sale.sellerName, sale.seller_name, sale.vendedor, sale.vendedorNombre);
                    const saleProduct = pickField(sale.productoNombre, sale.product?.nombre, sale.nombreProducto, sale.productName, sale.plan, sale.producto);
                    const saleMedioPago = pickField(sale.medioPago, sale.medio_pago);
                    const saleMedioPagoLabel = paymentMethodLabel(saleMedioPago);
                    return (
                      <div key={sale.id || `sale-${index}`} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.24)', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{formatField(saleProduct || 'Venta')}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{formatField(formatDateDisplay(saleDate))}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: '#475569', flexWrap: 'wrap' }}>
                          <span>Vendedor: {formatField(saleSeller)}</span>
                          <span>Medio de pago: {formatField(saleMedioPagoLabel)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {shouldShowProductsList ? (
          <section style={{ ...cardStyle, backgroundColor: '#ffffff', borderTop: '1px dashed rgba(148, 163, 184, 0.5)' }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Productos asociados</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {associatedProducts.map((item, index) => {
                const prodName = item.nombreProducto || item.nombre || item.name || 'Producto';
                const prodStatus = item.estado || item.estadoProducto || '';
                const prodFee = item.precio !== undefined && item.precio !== null ? `$ ${Number(item.precio).toLocaleString('es-UY')}` : '—';
                const prodAltaValue = item.fechaAlta || item.fecha_alta || '';
                const prodAlta = formatDateDisplay(prodAltaValue);
                const prodBajaValue = item.fechaBaja || item.fecha_baja || '';
                const prodBaja = formatDateDisplay(prodBajaValue);
                const prodCuotas = item.cuotasPagas ?? item.cuotas_pagas ?? null;
                const prodCarencia = item.carenciaCuotas ?? item.carencia_cuotas ?? null;
                const prodMedioPago = item.medioPago || item.medio_pago || '';
                const prodSeller = item.sellerName || item.vendedor || item.seller_name || '';
                const prodPlan = item.plan || item.planNombre || item.plan_nombre || '';
                const isProdBaja = String(prodStatus || '').toLowerCase() === 'baja';
                return (
                  <div
                    key={item.id || `product-${index}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: isProdBaja ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(148, 163, 184, 0.24)',
                      background: isProdBaja ? '#fef2f2' : '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{formatField(prodName)}</div>
                        {isProdBaja ? (
                          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', background: '#fee2e2', color: '#b91c1c' }}>
                            Baja
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{prodAlta || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: '#475569', flexWrap: 'wrap' }}>
                      <span>Estado: {formatField(prodStatus || '—')}</span>
                      <span>Cuota: {formatField(prodFee)}</span>
                      {prodCuotas !== null && prodCarencia !== null ? (
                        <span>Cuotas: {prodCuotas}/{prodCarencia}</span>
                      ) : null}
                      {prodPlan ? <span>Plan: {formatField(prodPlan)}</span> : null}
                      {prodMedioPago ? <span>Medio de pago: {formatField(prodMedioPago)}</span> : null}
                      {prodSeller ? <span>Vendedor: {formatField(prodSeller)}</span> : null}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#475569', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>Fecha de alta: {formatField(prodAlta)}</span>
                      {prodBaja ? <span>Fecha de baja: {formatField(prodBaja)}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </aside>
    </>
  );
}



