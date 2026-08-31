import React from 'react';
import { X } from 'lucide-react';

const BOLSO_OPTIONS = [
  { value: 'comun', label: 'Bolso Común' },
  { value: 'rcp', label: 'Bolso RCP' },
  { value: 'ambulancia', label: 'Ambulancia' }
];

export default function MovimientoForm({
  Button,
  draft,
  setDraft,
  errors,
  movementTypes,
  responsibleOptions,
  locationOptions,
  sourceEntryOptions,
  onClose,
  onSubmit
}) {
  const isTransfer = draft.tipo_movimiento === 'traspaso';
  const isEntry = draft.tipo_movimiento === 'entrada';
  const isExit = !isEntry;
  const destinationOptions = draft.destino_tipo === 'vehiculo' ? locationOptions.vehiculo : locationOptions.base;
  const sourceOptions = draft.origen_tipo === 'vehiculo' ? locationOptions.vehiculo : locationOptions.base;

  const normalizedBolso = (value) => (value === 'ambulancia' ? '' : value);

  return (
    <div className="economato-modal-root">
      <div className="lot-wizard-overlay" onClick={onClose} />
      <section className="economato-modal-panel" role="dialog" aria-modal="true" aria-label="Registrar movimiento">
        <div className="economato-modal-header">
          <div>
            <h3>Registrar movimiento</h3>
            <p>Movimientos con soporte para origen/destino por bolso dentro del móvil.</p>
          </div>
          <button className="economato-close-button" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="economato-form-grid">
          <label>
            <span>Tipo de movimiento</span>
            <select
              value={draft.tipo_movimiento}
              onChange={(event) => setDraft((prev) => ({
                ...prev,
                tipo_movimiento: event.target.value,
                stock_entry_id: '',
                origen_tipo: 'vehiculo',
                origen_id: '',
                origen_bolso: 'comun',
                destino_tipo: 'vehiculo',
                destino_id: '',
                destino_bolso: 'comun',
                lote: '',
                fecha_vencimiento: '',
                servicio_id: ''
              }))}
            >
              {movementTypes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>

          <label>
            <span>Cantidad</span>
            <input type="number" min="1" value={draft.cantidad} onChange={(event) => setDraft((prev) => ({ ...prev, cantidad: event.target.value }))} />
            {errors.cantidad ? <small>{errors.cantidad}</small> : null}
          </label>

          <label>
            <span>Responsable</span>
            <select value={draft.responsable_id} onChange={(event) => setDraft((prev) => ({ ...prev, responsable_id: event.target.value }))}>
              <option value="">Seleccionar responsable</option>
              {responsibleOptions.map((person) => <option key={person.id} value={person.id}>{person.label}</option>)}
            </select>
            {errors.responsable_id ? <small>{errors.responsable_id}</small> : null}
          </label>

          <label>
            <span>Fecha</span>
            <input type="date" value={draft.fecha} onChange={(event) => setDraft((prev) => ({ ...prev, fecha: event.target.value }))} />
            {errors.fecha ? <small>{errors.fecha}</small> : null}
          </label>

          {isExit ? (
            <>
              <label>
                <span>{isTransfer ? 'Origen tipo' : 'Ubicación actual tipo'}</span>
                <select
                  value={draft.origen_tipo}
                  onChange={(event) => setDraft((prev) => ({
                    ...prev,
                    origen_tipo: event.target.value,
                    origen_id: '',
                    origen_bolso: event.target.value === 'vehiculo' ? 'comun' : '',
                    stock_entry_id: ''
                  }))}
                >
                  <option value="base">Base</option>
                  <option value="vehiculo">Vehículo</option>
                </select>
              </label>

              <label>
                <span>{isTransfer ? 'Origen' : 'Ubicación actual'}</span>
                <select
                  value={draft.origen_id}
                  onChange={(event) => setDraft((prev) => ({
                    ...prev,
                    origen_id: event.target.value,
                    stock_entry_id: ''
                  }))}
                >
                  <option value="">Seleccionar ubicación</option>
                  {sourceOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                {errors.origen_id ? <small>{errors.origen_id}</small> : null}
              </label>

              {draft.origen_tipo === 'vehiculo' ? (
                <label>
                  <span>Bolso origen</span>
                  <select
                    value={draft.origen_bolso || 'ambulancia'}
                    onChange={(event) => setDraft((prev) => ({
                      ...prev,
                      origen_bolso: normalizedBolso(event.target.value),
                      stock_entry_id: ''
                    }))}
                  >
                    {BOLSO_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              ) : null}

              <label className="span-2">
                <span>Lote de origen</span>
                <select value={draft.stock_entry_id} onChange={(event) => setDraft((prev) => ({ ...prev, stock_entry_id: event.target.value }))}>
                  <option value="">Seleccionar lote</option>
                  {sourceEntryOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                </select>
                {errors.stock_entry_id ? <small>{errors.stock_entry_id}</small> : null}
              </label>
            </>
          ) : null}

          {isEntry ? (
            <>
              <label>
                <span>Destino tipo</span>
                <select
                  value={draft.destino_tipo}
                  onChange={(event) => setDraft((prev) => ({
                    ...prev,
                    destino_tipo: event.target.value,
                    destino_id: '',
                    destino_bolso: event.target.value === 'vehiculo' ? 'comun' : ''
                  }))}
                >
                  <option value="base">Base</option>
                  <option value="vehiculo">Vehículo</option>
                </select>
              </label>

              <label>
                <span>Destino</span>
                <select value={draft.destino_id} onChange={(event) => setDraft((prev) => ({ ...prev, destino_id: event.target.value }))}>
                  <option value="">Seleccionar destino</option>
                  {destinationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                {errors.destino_id ? <small>{errors.destino_id}</small> : null}
              </label>

              {draft.destino_tipo === 'vehiculo' ? (
                <label>
                  <span>Bolso destino</span>
                  <select
                    value={draft.destino_bolso || 'ambulancia'}
                    onChange={(event) => setDraft((prev) => ({ ...prev, destino_bolso: normalizedBolso(event.target.value) }))}
                  >
                    {BOLSO_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              ) : null}

              <label>
                <span>Lote</span>
                <input value={draft.lote} onChange={(event) => setDraft((prev) => ({ ...prev, lote: event.target.value }))} />
                {errors.lote ? <small>{errors.lote}</small> : null}
              </label>

              <label>
                <span>Fecha de vencimiento</span>
                <input type="date" value={draft.fecha_vencimiento} onChange={(event) => setDraft((prev) => ({ ...prev, fecha_vencimiento: event.target.value }))} />
              </label>
            </>
          ) : null}

          {isTransfer ? (
            <>
              <label>
                <span>Destino tipo</span>
                <select
                  value={draft.destino_tipo}
                  onChange={(event) => setDraft((prev) => ({
                    ...prev,
                    destino_tipo: event.target.value,
                    destino_id: '',
                    destino_bolso: event.target.value === 'vehiculo' ? 'comun' : ''
                  }))}
                >
                  <option value="base">Base</option>
                  <option value="vehiculo">Vehículo</option>
                </select>
              </label>

              <label>
                <span>Destino</span>
                <select value={draft.destino_id} onChange={(event) => setDraft((prev) => ({ ...prev, destino_id: event.target.value }))}>
                  <option value="">Seleccionar destino</option>
                  {destinationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                {errors.destino_id ? <small>{errors.destino_id}</small> : null}
              </label>

              {draft.destino_tipo === 'vehiculo' ? (
                <label>
                  <span>Bolso destino</span>
                  <select
                    value={draft.destino_bolso || 'ambulancia'}
                    onChange={(event) => setDraft((prev) => ({ ...prev, destino_bolso: normalizedBolso(event.target.value) }))}
                  >
                    {BOLSO_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              ) : null}
            </>
          ) : null}

          {draft.tipo_movimiento === 'salida_servicio' ? (
            <label>
              <span>Servicio relacionado</span>
              <input value={draft.servicio_id} onChange={(event) => setDraft((prev) => ({ ...prev, servicio_id: event.target.value }))} placeholder="Ej. srv-20260830-011" />
              {errors.servicio_id ? <small>{errors.servicio_id}</small> : null}
            </label>
          ) : null}

          <label className="span-2">
            <span>Motivo</span>
            <textarea value={draft.motivo} onChange={(event) => setDraft((prev) => ({ ...prev, motivo: event.target.value }))} placeholder="Detalle breve del movimiento" />
            {errors.motivo ? <small>{errors.motivo}</small> : null}
          </label>

          {errors.form ? <div className="economato-error-banner span-2">{errors.form}</div> : null}
        </div>

        <div className="economato-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>Guardar movimiento</Button>
        </div>
      </section>
    </div>
  );
}
