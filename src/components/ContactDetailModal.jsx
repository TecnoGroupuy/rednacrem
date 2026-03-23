/**
 * ContactDetailModal
 * @prop {object} contact - Datos del contacto
 * @prop {function} onClose - Callback para cerrar el modal
 */
import React from 'react';
import { X, ArrowRight } from 'lucide-react';

const labelStyle = {
  fontFamily: 'IBM Plex Sans, sans-serif',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)'
};

const valueStyle = {
  fontFamily: 'Manrope, sans-serif',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text)'
};

const sectionTitleStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--info)',
  marginBottom: 12,
  fontFamily: 'IBM Plex Sans, sans-serif'
};

const fieldContainer = (isLast) => ({
  borderBottom: isLast ? 'none' : '1px solid var(--line)',
  paddingBottom: isLast ? 0 : 8
});

const renderValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return <span style={{ fontStyle: 'italic', color: 'var(--muted)', fontSize: 12 }}>Sin datos</span>;
  }
  return <span style={valueStyle}>{value}</span>;
};

const resolveGestionMeta = (contact) => {
  const rawStatus =
    contact?.resultado_gestion ||
    contact?.ultima_gestion_resultado ||
    contact?.resultado ||
    contact?.estado_gestion ||
    '';
  const normalized = String(rawStatus || '').toLowerCase();
  if (normalized.includes('venta') || normalized.includes('exito') || normalized.includes('cerrada')) {
    return { label: 'Éxito', color: '#15803d' };
  }
  if (normalized.includes('no_contesta') || normalized.includes('no_contact') || normalized.includes('rech')) {
    return { label: 'No contactado', color: '#be123c' };
  }
  if (normalized) {
    return { label: normalized.replace(/_/g, ' '), color: '#64748b' };
  }
  return { label: 'Pendiente', color: '#64748b' };
};

export default function ContactDetailModal({ contact, onClose }) {
  if (!contact) return null;
  const gestion = resolveGestionMeta(contact);
  const gestionFecha =
    contact?.ultima_gestion_fecha ||
    contact?.ultima_gestion_at ||
    contact?.updated_at ||
    '';
  const gestionTexto = contact?.ultima_gestion || contact?.gestion || '';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '48px',
        paddingBottom: '24px'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: 580,
          borderRadius: 'var(--radius)',
          background: 'var(--panel)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 72px)',
          height: 'auto'
        }}
      >
        <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h2 id="contact-modal-title" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, fontWeight: 700, margin: 0 }}>
                Detalle del contacto
              </h2>
              <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
                Datos completos y última gestión registrada.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.6)',
                display: 'grid',
                placeItems: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(20,34,53,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; }}
            >
              <X size={16} color="#152235" />
            </button>
          </div>
        </div>

        <div
          className="contact-modal-body"
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '16px 24px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <div style={sectionTitleStyle}>Datos personales</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            {[
              { label: 'Nombre', value: contact.nombre },
              { label: 'Apellido', value: contact.apellido },
              { label: 'Documento', value: contact.documento },
              { label: 'Fecha de nacimiento', value: contact.fecha_nacimiento }
            ].map((item, idx, arr) => (
              <div key={item.label} style={fieldContainer(idx === arr.length - 1)}>
                <div style={labelStyle}>{item.label}</div>
                {renderValue(item.value)}
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '14px 0 12px' }} />
          <div style={sectionTitleStyle}>Contacto</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            {[
              { label: 'Teléfono', value: contact.telefono },
              { label: 'Celular', value: contact.celular },
              { label: 'Correo electrónico', value: contact.correo_electronico, span: 2 },
              { label: 'Origen del dato', value: contact.origen_dato, span: 2 },
              { label: 'Fuente', value: contact.fuente || contact.origen || 'Import', span: 2 }
            ].map((item, idx, arr) => (
              <div key={item.label} style={{ ...fieldContainer(idx === arr.length - 1), gridColumn: item.span ? 'span 2' : 'auto' }}>
                <div style={labelStyle}>{item.label}</div>
                {renderValue(item.value)}
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '14px 0 12px' }} />
          <div style={sectionTitleStyle}>Ubicación</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            {[
              { label: 'Dirección', value: contact.direccion, span: 2 },
              { label: 'Departamento', value: contact.departamento },
              { label: 'Localidad', value: contact.localidad },
              { label: 'País', value: contact.pais }
            ].map((item, idx, arr) => (
              <div key={item.label} style={{ ...fieldContainer(idx === arr.length - 1), gridColumn: item.span ? 'span 2' : 'auto' }}>
                <div style={labelStyle}>{item.label}</div>
                {renderValue(item.value)}
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '14px 0 12px' }} />
          <div style={sectionTitleStyle}>Última gestión</div>
          {!gestionTexto && !contact?.proxima_accion ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', background: 'rgba(20,34,53,0.04)', borderRadius: 16, border: '1px dashed var(--line)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M7 2v2M17 2v2M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1z" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: '10px 0 4px' }}>
                Sin gestiones registradas
              </p>
              <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                No se han registrado acciones para este contacto
              </p>
            </div>
          ) : (
            <div style={{ borderRadius: 16, border: '1px solid var(--line)', padding: 16, background: 'rgba(255,255,255,0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: `${gestion.color}22`, color: gestion.color, fontSize: 11, fontWeight: 700 }}>
                  {gestion.label}
                </span>
                <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: 'var(--muted)' }}>
                  {gestionFecha || 'Sin fecha'}
                </span>
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, marginTop: 10 }}>
                {gestionTexto || 'Gestión registrada'}
              </div>
              {contact?.proxima_accion ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'var(--info)' }}>
                  <ArrowRight size={14} />
                  <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12 }}>Próxima acción: {contact.proxima_accion}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
        <style>{`
          .contact-modal-body::-webkit-scrollbar {
            width: 0;
            height: 0;
          }
        `}</style>
      </div>
    </div>
  );
}


