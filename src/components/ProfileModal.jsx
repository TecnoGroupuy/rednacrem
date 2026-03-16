import React from 'react';
import { AlertTriangle, Check, Loader2, User as UserIcon, X } from 'lucide-react';
import './ProfileModal.css';

const REQUIRED_FIELDS = ['fullName', 'email', 'phone', 'department'];
const CIRCLE_LENGTH = 125.6;

const emailIsValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
const phoneHasExtensionMarker = (phone) => /\b(ext|int|interno)\b/i.test(String(phone || ''));
const phoneIsValid = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 && !phoneHasExtensionMarker(phone);
};
const extensionIsValid = (extension) => {
  const value = String(extension || '').trim();
  if (!value) return true;
  return /^[0-9]{1,6}$/.test(value);
};

const buildFullNameFromUser = (user) => {
  const first = user?.nombre || '';
  const last = user?.apellido || '';
  const combined = [first, last].filter(Boolean).join(' ').trim();
  return combined || user?.name || '';
};

const initialFormFromUser = (user) => ({
  fullName: buildFullNameFromUser(user),
  email: user?.email || '',
  phone: '',
  extension: '',
  department: '',
  confirmData: false
});

const fieldIsValid = (id, value) => {
  if (!String(value || '').trim()) return false;
  if (id === 'email') return emailIsValid(value);
  if (id === 'phone') return phoneIsValid(value);
  return true;
};

export default function ProfileModal({ isOpen, onClose, user, onSave }) {
  const [form, setForm] = React.useState(() => initialFormFromUser(user));
  const [touched, setTouched] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [shakeField, setShakeField] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    setForm(initialFormFromUser(user));
    setTouched({});
    setSaving(false);
    setSuccess(false);
    setShakeField('');
  }, [isOpen, user]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const onEsc = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose, saving]);

  const errors = React.useMemo(() => ({
    fullName: !fieldIsValid('fullName', form.fullName) ? 'Este campo es obligatorio' : '',
    email: !fieldIsValid('email', form.email) ? 'Ingrese un correo valido' : '',
    phone: !fieldIsValid('phone', form.phone) ? 'Numero invalido (8-15 digitos, sin extension)' : '',
    extension: !extensionIsValid(form.extension) ? 'La extension debe tener solo numeros (max. 6)' : '',
    department: !fieldIsValid('department', form.department) ? 'Seleccione un departamento' : '',
    confirmData: !form.confirmData ? 'Debe confirmar los datos para continuar' : ''
  }), [form]);

  const completed = React.useMemo(() => {
    let count = 0;
    REQUIRED_FIELDS.forEach((id) => {
      if (fieldIsValid(id, form[id])) count += 1;
    });
    if (form.confirmData) count += 1;
    return count;
  }, [form]);

  const progress = Math.round((completed / (REQUIRED_FIELDS.length + 1)) * 100);
  const strokeOffset = CIRCLE_LENGTH - (progress / 100) * CIRCLE_LENGTH;
  const progressColor = progress === 100 ? '#10B981' : progress > 50 ? '#F59E0B' : '#EF4444';

  const markTouched = (id) => setTouched((prev) => ({ ...prev, [id]: true }));

  const triggerShake = (id) => {
    setShakeField(id);
    window.setTimeout(() => {
      setShakeField((current) => (current === id ? '' : current));
    }, 520);
  };

  const handleChange = (id, value) => {
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const validateAll = () => {
    const nextTouched = {
      fullName: true,
      email: true,
      phone: true,
      extension: true,
      department: true,
      confirmData: true
    };
    setTouched(nextTouched);

    const invalid = Object.keys(nextTouched).find((key) => errors[key]);
    if (invalid) {
      triggerShake(invalid);
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    if (onSave) onSave(form);
    setSaving(false);
    setSuccess(true);
    window.setTimeout(() => {
      onClose();
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-root" role="dialog" aria-modal="true" aria-label="Mi perfil">
      <div className="profile-modal-backdrop" onClick={() => !saving && onClose()}></div>
      <div className="profile-modal-shell profile-modal-enter">
        <div className="profile-modal-card">
          <div className="profile-modal-header">
            <div>
              <h2>
                <UserIcon size={18} color="#10B981" />
                Mi Perfil
              </h2>
              <p>Complete sus datos de contacto para continuar</p>
            </div>
            <div className="profile-modal-header-actions">
              <div className="profile-progress-circle-wrap">
                <svg className="profile-progress-circle">
                  <circle cx="24" cy="24" r="20" stroke="#1e293b" strokeWidth="4" fill="none"></circle>
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke={progressColor}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={CIRCLE_LENGTH}
                    strokeDashoffset={strokeOffset}
                    className="profile-progress-fill"
                  ></circle>
                </svg>
                <span style={{ color: progressColor }}>{progress}%</span>
              </div>
              <button type="button" className="profile-close-btn" onClick={onClose} disabled={saving} aria-label="Cerrar perfil">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="profile-progress-track">
            <div className="profile-progress-bar" style={{ width: progress + '%' }}></div>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-alert">
              <AlertTriangle size={16} />
              <div>
                <strong>Datos requeridos</strong>
                <div>Todos los campos marcados con * son obligatorios para activar su cuenta</div>
              </div>
            </div>

            <div className={'profile-field ' + (shakeField === 'fullName' ? 'shake' : '')}>
              <label>Nombre completo <span>*</span></label>
              <div className="profile-input-wrap">
                <input
                  value={form.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  onBlur={() => markTouched('fullName')}
                  placeholder="Ej: Maria Gonzalez Lopez"
                />
                {fieldIsValid('fullName', form.fullName) ? <Check size={16} color="#10B981" className="profile-valid-icon" /> : null}
              </div>
              {touched.fullName && errors.fullName ? <p className="profile-error">{errors.fullName}</p> : null}
            </div>

            <div className={'profile-field ' + (shakeField === 'email' ? 'shake' : '')}>
              <label>Correo electronico corporativo <span>*</span></label>
              <div className="profile-input-wrap">
                <input
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => markTouched('email')}
                  placeholder="nombre@empresa.com"
                />
                {fieldIsValid('email', form.email) ? <Check size={16} color="#10B981" className="profile-valid-icon" /> : null}
              </div>
              {touched.email && errors.email ? <p className="profile-error">{errors.email}</p> : null}
            </div>

            <div className={'profile-field ' + (shakeField === 'phone' ? 'shake' : '')}>
              <label>Telefono movil <span>*</span></label>
              <div className="profile-input-wrap">
                <input
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => markTouched('phone')}
                  placeholder="Ej: 099123321"
                />
                {fieldIsValid('phone', form.phone) ? <Check size={16} color="#10B981" className="profile-valid-icon" /> : null}
              </div>
              {touched.phone && errors.phone ? <p className="profile-error">{errors.phone}</p> : null}
            </div>

            <div className="profile-field">
              <label>Extension / Telefono fijo <small>(Opcional)</small></label>
              <input
                value={form.extension}
                onChange={(e) => handleChange('extension', e.target.value)}
                onBlur={() => markTouched('extension')}
                placeholder="Solo numeros. Ej: 105"
              />
              {touched.extension && errors.extension ? <p className="profile-error">{errors.extension}</p> : null}
            </div>

            <div className={'profile-field ' + (shakeField === 'department' ? 'shake' : '')}>
              <label>Departamento <span>*</span></label>
              <select
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
                onBlur={() => markTouched('department')}
              >
                <option value="">Seleccione su departamento</option>
                <option value="soporte">Soporte Tecnico</option>
                <option value="ventas">Ventas</option>
                <option value="facturacion">Facturacion</option>
                <option value="reten">Retencion</option>
                <option value="supervisor">Supervision</option>
              </select>
              {touched.department && errors.department ? <p className="profile-error">{errors.department}</p> : null}
            </div>

            <label className="profile-checkbox-row">
              <input
                type="checkbox"
                checked={form.confirmData}
                onChange={(e) => handleChange('confirmData', e.target.checked)}
                onBlur={() => markTouched('confirmData')}
              />
              <span>Confirmo que los datos proporcionados son correctos y autorizo su uso para contacto laboral.</span>
            </label>
            {touched.confirmData && errors.confirmData ? <p className="profile-error">{errors.confirmData}</p> : null}

            <div className="profile-actions">
              <button type="button" className="profile-cancel-btn" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="submit" className="profile-submit-btn" disabled={saving}>
                {saving ? <Loader2 size={15} className="spin" /> : null}
                {saving ? 'Guardando...' : 'Guardar y continuar'}
              </button>
            </div>
          </form>
        </div>

        {success ? (
          <div className="profile-success-toast">
            <div className="profile-success-icon"><Check size={16} /></div>
            <div>
              <div className="profile-success-title">Perfil actualizado</div>
              <div className="profile-success-subtitle">Datos guardados correctamente.</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
