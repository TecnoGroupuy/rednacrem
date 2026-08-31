import React, { useMemo, useState } from 'react';

const TABS = [
  { key: 'personal', label: 'Personal' },
  { key: 'turno', label: 'Turno actual' },
  { key: 'vehiculos', label: 'Vehiculos' },
  { key: 'resumen', label: 'Resumen' },
];

const ROLE_GROUPS = [
  { key: 'chofer', label: 'Chofer', matchers: ['chofer'] },
  { key: 'medico', label: 'Medico', matchers: ['medico'] },
  { key: 'enfermero', label: 'Enfermero', matchers: ['enfermero', 'enfermeria'] },
];

function formatRol(rol) {
  return String(rol || '').replace(/_/g, ' ');
}

function normalizeRoleKey(rol) {
  const normalized = String(rol || '').toLowerCase();
  const group = ROLE_GROUPS.find((item) => item.matchers.some((matcher) => normalized.includes(matcher)));
  return group?.key || 'otros';
}

function formatCoords(base) {
  return `Lat: ${base.lat.toFixed(4)}, Lng: ${base.lng.toFixed(4)}`;
}

export default function BasePanel({
  baseId,
  bases,
  personalPorBase,
  vehiculos,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('personal');

  const base = useMemo(() => bases.find((item) => item.id === baseId), [bases, baseId]);
  const personal = useMemo(() => personalPorBase[baseId] || [], [personalPorBase, baseId]);
  const vehiculosBase = useMemo(
    () => vehiculos.filter((vehicle) => vehicle.base_id === baseId),
    [vehiculos, baseId]
  );
  const personalActivo = useMemo(
    () => personal.filter((person) => person.en_turno),
    [personal]
  );
  const activeByRole = useMemo(() => {
    const grouped = new Map(ROLE_GROUPS.map((group) => [group.key, []]));
    personalActivo.forEach((person) => {
      const roleKey = normalizeRoleKey(person.rol);
      if (!grouped.has(roleKey)) {
        grouped.set(roleKey, []);
      }
      grouped.get(roleKey).push(person);
    });
    return grouped;
  }, [personalActivo]);

  const disponibles = vehiculosBase.filter((vehicle) => vehicle.estado_operativo === 'disponible').length;
  const minimo = base?.moviles_minimos_habilitados || 0;
  const alerta = disponibles < minimo;
  const vehiculosEnBase = vehiculosBase.filter((vehicle) => vehicle.estado_operativo === 'en_base').length;

  if (!base) return null;

  return (
    <div className="base-panel">
      <div className="base-panel-header">
        <div className="base-panel-heading">
          <div className="base-panel-eyebrow">Monitor de base operativa</div>
          <div className="base-panel-title-row">
            <div>
              <div className="base-panel-title">Base {base.nombre}</div>
              <div className="base-panel-sub">{formatCoords(base)}</div>
            </div>
            <div className="base-panel-badge">{base.departamento || 'Sin dato'}</div>
          </div>
        </div>
        <button type="button" className="base-panel-close" onClick={onClose} aria-label="Cerrar detalle de base">
          x
        </button>
      </div>

      <div className="base-panel-overview">
        <section className="base-detail-card base-overview-card">
          <div className="base-detail-label">Direccion</div>
          <div className="base-detail-value">{base.direccion || 'Sin dato'}</div>
        </section>
        <section className="base-detail-card base-overview-card">
          <div className="base-detail-label">Funcionarios activos</div>
          <div className="base-overview-metric">{personalActivo.length}</div>
        </section>
        <section className="base-detail-card base-overview-card">
          <div className="base-detail-label">Moviles disponibles</div>
          <div className="base-overview-metric">{disponibles}</div>
        </section>
        <section className="base-detail-card base-overview-card">
          <div className="base-detail-label">Moviles en base</div>
          <div className="base-overview-metric">{vehiculosEnBase}</div>
        </section>
      </div>

      <div className="base-panel-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`base-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="base-panel-content">
        {activeTab === 'personal' ? (
          <div className="base-panel-layout base-panel-layout-personal">
            <section className="base-detail-card">
              <div className="base-section-title">Datos de la base</div>
              <div className="base-detail-grid">
                <div>
                  <div className="base-detail-label">Departamento</div>
                  <div className="base-detail-value">{base.departamento || 'Sin dato'}</div>
                </div>
                <div>
                  <div className="base-detail-label">Direccion</div>
                  <div className="base-detail-value">{base.direccion || 'Sin dato'}</div>
                </div>
                <div>
                  <div className="base-detail-label">Moviles minimos habilitados</div>
                  <div className="base-detail-value">{minimo}</div>
                </div>
                <div>
                  <div className="base-detail-label">Personal total asignado</div>
                  <div className="base-detail-value">{personal.length}</div>
                </div>
              </div>
            </section>

            <section className="base-detail-card">
              <div className="base-section-title">Funcionarios activos ahora</div>
              <div className="base-role-groups">
                {ROLE_GROUPS.map((roleGroup) => {
                  const people = activeByRole.get(roleGroup.key) || [];
                  return (
                    <div key={roleGroup.key} className="base-role-group">
                      <div className="base-role-group-header">
                        <span className="base-role-group-title">{roleGroup.label}</span>
                        <span className="base-role-group-count">{people.length}</span>
                      </div>
                      {people.length ? (
                        <div className="base-role-people-list">
                          {people.map((person) => (
                            <div key={person.id} className="personal-row">
                              <div className="personal-avatar">P</div>
                              <div className="personal-info">
                                <div className="personal-name">{person.nombre}</div>
                                <div className="personal-role">{formatRol(person.rol)}</div>
                              </div>
                              <span className="status-dot on"></span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="base-role-empty">Sin personal activo</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="base-detail-card">
              <div className="base-section-title">Dotacion completa</div>
              <div className="base-people-grid">
                {personal.map((person) => (
                  <div key={person.id} className="personal-row">
                    <div className="personal-avatar">P</div>
                    <div className="personal-info">
                      <div className="personal-name">{person.nombre}</div>
                      <div className="personal-role">{formatRol(person.rol)}</div>
                    </div>
                    <span className={`status-dot ${person.en_turno ? 'on' : 'off'}`}></span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'turno' ? (
          <div className="base-panel-layout">
            <section className="base-detail-card">
              <div className="base-section-title">Turno actual</div>
              <div className="base-turno-summary">
                <span className="base-detail-label">Turno vigente</span>
                <strong>Manana (06:00 - 14:00)</strong>
              </div>
            </section>
            <section className="base-detail-card">
              <div className="base-section-title">Personal en turno</div>
              <div className="base-turno-grid">
                {personal.filter((person) => person.en_turno).map((person) => (
                  <div key={person.id} className="base-turno-card">
                    <div className="personal-name">{person.nombre}</div>
                    <div className="personal-role">{formatRol(person.rol)}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'vehiculos' ? (
          <div className="base-panel-layout">
            <section className="base-detail-card">
              <div className="base-section-title">Vehiculos asignados</div>
              <div className="base-vehiculos-grid">
                {vehiculosBase.map((vehicle) => {
                  const colorMap = {
                    disponible: '#22c55e',
                    en_servicio: '#3b82f6',
                    en_base: '#eab308',
                    mantenimiento: '#a855f7',
                    fuera_de_servicio: '#64748b',
                  };

                  return (
                    <div key={vehicle.id} className="vehiculo-row">
                      <div>
                        <div className="vehiculo-name">{vehicle.numero_interno}</div>
                        <div className="vehiculo-meta">
                          {vehicle.categoria} - {vehicle.estado_operativo.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <span
                        className="status-dot"
                        style={{ background: colorMap[vehicle.estado_operativo] || '#94a3b8' }}
                      ></span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'resumen' ? (
          <div className="base-panel-layout">
            <section className="base-detail-card">
              <div className="base-section-title">Resumen operativo</div>
              <div className="base-summary-grid">
                <div className="base-summary-item">
                  <span className="base-detail-label">Minimo habilitado</span>
                  <strong>{minimo} moviles</strong>
                </div>
                <div className="base-summary-item">
                  <span className="base-detail-label">Disponibles ahora</span>
                  <strong style={{ color: disponibles > 0 ? '#22c55e' : '#ef4444' }}>{disponibles}</strong>
                </div>
                <div className="base-summary-item">
                  <span className="base-detail-label">Personal total</span>
                  <strong>{personal.length}</strong>
                </div>
                <div className="base-summary-item">
                  <span className="base-detail-label">Personal activo</span>
                  <strong>{personalActivo.length}</strong>
                </div>
              </div>
              {alerta ? (
                <div className="alert-chip">
                  <span>!</span>
                  <span>Alerta: {minimo - disponibles} movil(es) por debajo del minimo habilitado</span>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
