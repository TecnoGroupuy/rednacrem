import React, { useEffect } from 'react';
import { X, Phone } from 'lucide-react';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(6px)',
  zIndex: 40
};

const drawerStyle = {
  position: 'fixed',
  top: 0,
  right: 0,
  height: '100%',
  width: 'min(420px, 100%)',
  backgroundColor: '#fff',
  boxShadow: 'rgba(15, 23, 42, 0.25) 0px 20px 60px',
  padding: '24px',
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  transform: 'translateX(0)',
  transition: 'transform 0.3s ease-out'
};

const sectionStyle = {
  marginTop: 24,
  borderRadius: 16,
  padding: '16px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#f8fafc'
};

const fieldRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10
};

const labelStyle = {
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: '#6b7280'
};

const valueStyle = {
  fontSize: 16,
  fontWeight: 600,
  color: '#111827'
};

const badgeStyle = {
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12,
  letterSpacing: 1,
  textTransform: 'uppercase',
  fontWeight: 600
};

const progressBar = {
  height: 8,
  borderRadius: 999,
  backgroundColor: '#e5e7eb',
  overflow: 'hidden',
  marginTop: 10
};

const progressFiller = (value) => ({
  width: `${value}%`,
  height: '100%',
  borderRadius: 999,
  backgroundImage: 'linear-gradient(90deg, #10b981, #059669)'
});

const formatField = (value) => (value || 'Sin dato');

const ensureNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export default function ClienteFichaForm({ open, client, onClose }) {
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

  if (!open || !client) return null;

  const cuotas = ensureNumber(client.cuotasPagas);
  const carencia = ensureNumber(client.carenciaCuotas);
  const progress = carencia ? Math.min(100, Math.round((cuotas / carencia) * 100)) : 0;

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <aside style={drawerStyle}>
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>Ficha del cliente</p>
            <h2 style={{ margin: '6px 0', fontSize: 24, fontWeight: 700, color: '#111827' }}>{formatField(client.name)}</h2>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Cliente ID {formatField(client.id)}</p>
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

        <section style={sectionStyle}>
          <div style={fieldRow}>
            <div>
              <p style={labelStyle}>Documento</p>
              <p style={valueStyle}>{formatField(client.documento)}</p>
            </div>
            <div>
              <p style={labelStyle}>Teléfono</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={valueStyle}>{formatField(client.phone)}</span>
                {client.phone && (
                  <a href={`tel:${client.phone.replace(/\s/g, '')}`} style={{ color: '#059669' }}>
                    <Phone size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div style={fieldRow}>
            <div style={{ flex: 1 }}>
              <p style={labelStyle}>Email</p>
              <p style={valueStyle}>{formatField(client.email)}</p>
            </div>
          </div>
        </section>

        <section style={{ ...sectionStyle, backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>Producto</p>
            <span style={{ ...badgeStyle, backgroundColor: '#f0fdf4', color: '#047857', border: '1px solid #d1fae5' }}>{formatField(client.status)}</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={fieldRow}>
              <div>
                <p style={labelStyle}>Producto</p>
                <p style={valueStyle}>{formatField(client.product)}</p>
              </div>
              <div>
                <p style={labelStyle}>Plan</p>
                <p style={valueStyle}>{formatField(client.plan)}</p>
              </div>
            </div>
            <div style={fieldRow}>
              <div>
                <p style={labelStyle}>Fee</p>
                <p style={valueStyle}>{formatField(client.fee)}</p>
              </div>
              <div>
                <p style={labelStyle}>Cuotas pagas</p>
                <p style={valueStyle}>{cuotas}</p>
              </div>
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={labelStyle}>Carencia</p>
              <p style={valueStyle}>{carencia ? `${carencia} meses` : 'Sin dato'}</p>
            </div>
            <small style={{ fontSize: 11, color: '#6b7280' }}>Progreso</small>
          </div>
          <div style={progressBar}>
            <div style={progressFiller(progress)} />
          </div>
          <p style={{ marginTop: 10, color: '#475569', fontSize: 12 }}>Cuotas pagas: {cuotas} de {carencia || 'Sin dato'}</p>
        </section>
      </aside>
    </>
  );
}
