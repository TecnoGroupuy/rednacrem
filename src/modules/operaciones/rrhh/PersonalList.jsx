import React from 'react';
import { AlertTriangle, Clock3, MapPin, ChevronDown, ChevronRight, Crown, UserMinus, CameraOff, Baby, Stethoscope, GraduationCap } from 'lucide-react';
import { getEffectiveEstado } from './personalHierarchy.js';
import { displayFullName, displayBases } from './personDisplay.js';
import { getEspecialidadesMedico, getFormacionEnfermero, isSinClasificar } from './personalEspecialidadesHelpers.js';

// Duplicado a proposito, mismo criterio que ya explica PersonalDetail.jsx
// para su propia copia de toDateOnly: evitar un import circular entre
// RrhhScreen.jsx (que importa este archivo) y donde vive el original.
function toDateOnly(value) {
  if (!value) return '';
  const str = String(value);
  return str.length > 10 && str.includes('T') ? str.slice(0, 10) : str;
}

// Puramente por string, sin pasar por ningun objeto Date -- es la unica
// forma de evitar el corrimiento de dia en UTC-3 que castiga a
// new Date('YYYY-MM-DD') (hora local medianoche interpretada como el dia
// anterior).
function formatDateOnlyDisplay(value) {
  const dateOnly = toDateOnly(value);
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return dateOnly;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export const LICENCIA_TIPO_LABELS = {
  maternal: 'Maternal',
  certificacion_medica: 'Certificación médica',
  reglamentaria: 'Reglamentaria',
  sin_goce: 'Sin goce',
  otra: 'Otra'
};

export function StatusPill({ person, getStatusVariant, Tag }) {
  const effective = getEffectiveEstado(person);

  if (effective.estado === 'licencia') {
    const tipoLabel = effective.licencia?.tipo ? LICENCIA_TIPO_LABELS[effective.licencia.tipo] || effective.licencia.tipo : '';
    const dateText = effective.licencia?.fecha_hasta
      ? `hasta ${formatDateOnlyDisplay(effective.licencia.fecha_hasta)}`
      : 'sin fecha de regreso';
    return (
      <div className="rrhh-status-pill licencia">
        Licencia{tipoLabel ? ` (${tipoLabel})` : ''} · {dateText}
      </div>
    );
  }

  if (effective.estado === 'suspendido') {
    return <div className="rrhh-status-pill suspendido">Suspendido</div>;
  }

  return <Tag variant={getStatusVariant(effective.estado)}>{effective.estado || 'sin estado'}</Tag>;
}

// Colores de avatar por hash estable del id (no por indice de posicion en
// el array): en la vista jerarquica una misma persona puede aparecer en
// distintas listas segun filtros, y con hash por id el color no le salta
// cada vez que cambia de posicion.
const AVATAR_COLORS = ['#0f766e', '#2563eb', '#d97706', '#be123c', '#0891b2', '#7c3aed'];

function avatarColorFor(id) {
  const str = String(id || '');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFor(person) {
  const full = displayFullName(person);
  const parts = full.split(' ').filter(Boolean);
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'SU';
}

const REGIMEN_TURNO_LABELS = { fijo: 'Fijo', turnante: 'Turnante', suplente: 'Suplente' };

// Linea de turno: solo si hay regimen_turno (null -> no se muestra nada).
// "Fijo" ademas suma movil y franja si existen -- "Turnante"/"Suplente" van
// solos, esos dos regimenes no tienen movil ni franja fija.
function buildTurnoLine(person) {
  if (!person.regimen_turno) return null;
  const label = REGIMEN_TURNO_LABELS[person.regimen_turno] || person.regimen_turno;
  if (person.regimen_turno !== 'fijo') return label;
  const extra = [person.vehiculo_numero_interno, person.franja_turno].filter(Boolean);
  return [label, ...extra].join(' · ');
}

const LICENCIA_ESTADO_LABELS = {
  certificacion_medica: 'Licencia médica',
  maternal: 'Licencia maternal',
  reglamentaria: 'Licencia reglamentaria',
  sin_goce: 'Licencia sin goce'
};

// Estado efectivo de la tarjeta nueva: activo (verde), licencia (ambar, con
// subtipo si se reconoce), suspendido (naranja), baja (gris). Independiente
// de StatusPill/statusToVariant (que sigue usando PersonalDetail.jsx sin
// cambios) -- esta tarjeta tiene su propio chip mas compacto.
export function estadoEfectivoDisplay(person) {
  const effective = getEffectiveEstado(person);
  if (effective.estado === 'licencia') {
    const tipo = effective.licencia?.tipo;
    return { label: LICENCIA_ESTADO_LABELS[tipo] || 'Licencia', className: 'licencia' };
  }
  if (effective.estado === 'suspendido') return { label: 'Suspendido', className: 'suspendido' };
  if (effective.estado === 'baja') return { label: 'Baja', className: 'baja' };
  return { label: 'Activo', className: 'activo' };
}

// Foto cuadrada (esquinas levemente redondeadas): foto_url si existe, si no
// las iniciales del nombre mostrado, mismo formato cuadrado -- reemplaza el
// avatar circular viejo en esta tarjeta.
function PersonPhoto({ person }) {
  if (person.foto_url) {
    return <div className="rrhh-card2-photo" style={{ backgroundImage: `url(${person.foto_url})` }} />;
  }
  return (
    <div className="rrhh-card2-photo rrhh-card2-photo-initials" style={{ background: `linear-gradient(135deg, ${avatarColorFor(person.id)}, rgba(15, 23, 42, 0.88))` }}>
      {initialsFor(person)}
    </div>
  );
}

function PersonCard({ person, isLeader, dimmed, onView, getAlertMeta, formatRol }) {
  const handleActivate = () => onView(person.id);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivate();
    }
  };
  const fullName = displayFullName(person);
  const primaryRole = (person.roles || []).find((item) => item.rol_principal)?.rol || (person.roles || [])[0]?.rol || null;

  // Egresados: tarjeta atenuada, mismo layout nuevo -- solo cambia el chip
  // de estado por "Egresado · fecha" y no hay icono de alerta (ya no
  // aplica). Sin rojo en ningun lado.
  if (dimmed) {
    return (
      <article
        className="rrhh-card2 egresado"
        onClick={handleActivate}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <PersonPhoto person={person} />
        <div className="rrhh-card2-info">
          <div className="rrhh-card2-name" title={fullName}>{fullName}</div>
          <div className="rrhh-card2-chip egresado">
            <UserMinus size={12} />
            <span>Egresado{person.fecha_egreso ? ` · ${formatDateOnlyDisplay(person.fecha_egreso)}` : ''}</span>
          </div>
        </div>
      </article>
    );
  }

  const alertMeta = getAlertMeta(person);
  const estado = estadoEfectivoDisplay(person);
  const turnoLine = buildTurnoLine(person);
  const especialidadesMedico = getEspecialidadesMedico(person);
  const formacionEnfermero = getFormacionEnfermero(person);
  const sinClasificar = isSinClasificar(person);

  return (
    <article
      className={`rrhh-card2 ${isLeader ? 'leader' : ''}`}
      onClick={handleActivate}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <PersonPhoto person={person} />
      <div className="rrhh-card2-info">
        <div className="rrhh-card2-name" title={fullName}>
          {isLeader ? <Crown size={13} className="rrhh-leader-icon" /> : null}
          <span>{fullName}</span>
        </div>
        {primaryRole ? <div className="rrhh-card2-rol">{formatRol(primaryRole)}</div> : null}
        {turnoLine ? <div className="rrhh-card2-turno">{turnoLine}</div> : null}
        <div className="rrhh-card2-bases">
          <MapPin size={12} />
          <span>{displayBases(person.bases)}</span>
        </div>
        {especialidadesMedico.length ? (
          <div className="rrhh-card2-especialidades">
            <Stethoscope size={12} />
            <span>{especialidadesMedico.map((e) => e.nombre).join(', ')}</span>
          </div>
        ) : null}
        {formacionEnfermero ? (
          <div className="rrhh-card2-especialidades">
            <GraduationCap size={12} />
            <span>{formacionEnfermero.nombre}</span>
          </div>
        ) : null}
        <div className="rrhh-card2-estado-row">
          <span className={`rrhh-card2-chip ${estado.className}`}>{estado.label}</span>
          {person.atiende_ninos ? (
            <span
              className="rrhh-card2-chip atiende-ninos"
              title="Atiende niños"
              aria-label="Atiende niños"
            >
              <Baby size={12} /> Atiende niños
            </span>
          ) : null}
          {sinClasificar ? (
            <span
              className="rrhh-card2-alert-icon warning"
              title="Sin clasificar"
              aria-label="Sin clasificar"
            >
              <AlertTriangle size={14} />
            </span>
          ) : null}
          {alertMeta.hasAlert ? (
            <span
              className={`rrhh-card2-alert-icon ${alertMeta.variant}`}
              title={alertMeta.label}
              aria-label={alertMeta.label}
            >
              {alertMeta.variant === 'danger' ? <AlertTriangle size={14} /> : <Clock3 size={14} />}
            </span>
          ) : null}
          {!person.foto_url ? (
            <span
              className="rrhh-card2-alert-icon warning"
              title="Sin foto cargada"
              aria-label="Sin foto cargada"
            >
              <CameraOff size={14} />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MemberGrid({ members, isLeader, dimmed, onView, getAlertMeta, formatRol, emptyMessage }) {
  if (!members.length) {
    return <div className="rrhh-empty-inline">{emptyMessage || 'Sin personal en este grupo.'}</div>;
  }
  return (
    <div className="rrhh-card2-grid">
      {members.map((person) => (
        <PersonCard
          key={person.id}
          person={person}
          isLeader={isLeader}
          dimmed={dimmed}
          onView={onView}
          getAlertMeta={getAlertMeta}
          formatRol={formatRol}
        />
      ))}
    </div>
  );
}

// Seccion "Egresados" -- lista plana (sin jefatura/subgrupos, mismo criterio
// que Economato/Mantenimiento) de personal en estado='baja'. Colapsada por
// defecto: a diferencia de las areas normales, nunca "necesita atencion".
function EgresadosSection({ egresados, onView }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <section className="rrhh-hierarchy-section">
      <button
        type="button"
        className="rrhh-hierarchy-section-header"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span className="rrhh-hierarchy-section-title">Egresados</span>
        <span className="rrhh-hierarchy-count">{egresados.length}</span>
      </button>

      {expanded ? (
        <div className="rrhh-hierarchy-section-body">
          <MemberGrid
            members={egresados} dimmed
            onView={onView}
            emptyMessage="No hay personal egresado."
          />
        </div>
      ) : null}
    </section>
  );
}

function AreaSection({ area, onView, getAlertMeta, formatRol, defaultExpanded }) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <section className="rrhh-hierarchy-section">
      <button
        type="button"
        className="rrhh-hierarchy-section-header"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span className="rrhh-hierarchy-section-title">{area.label}</span>
        <span className="rrhh-hierarchy-count">{area.total}</span>
        {area.needsAttention ? <AlertTriangle size={16} className="rrhh-hierarchy-attention-icon" /> : null}
      </button>

      {expanded ? (
        <div className="rrhh-hierarchy-section-body">
          {area.hasLeaderConcept ? (
            area.leaders.length ? (
              <MemberGrid
                members={area.leaders} isLeader
                onView={onView} getAlertMeta={getAlertMeta} formatRol={formatRol}
              />
            ) : (
              <div className="rrhh-alert-banner warning">
                <AlertTriangle size={16} />
                <span>Sin {area.leaderRoleLabel} asignado/a todavía.</span>
              </div>
            )
          ) : null}

          {area.subgroups.map((subgroup) => (
            <div key={subgroup.key} className="rrhh-subgroup">
              {subgroup.label ? (
                <div className="rrhh-subgroup-title">
                  <span>{subgroup.label}</span>
                  <span className="rrhh-hierarchy-count">{subgroup.members.length}</span>
                </div>
              ) : null}
              <MemberGrid
                members={subgroup.members}
                onView={onView} getAlertMeta={getAlertMeta} formatRol={formatRol}
                emptyMessage={subgroup.emptyMessage}
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

// Píldora de filtro on/off (reemplaza los checkbox viejos, 2026-10):
// <button> con aria-pressed en vez de <input type="checkbox"> para que siga
// siendo accesible por teclado/lector de pantalla como un toggle, no como un
// link. El contador va siempre sobre el total SIN FILTRAR (filterCounts
// viene calculado así desde RrhhScreen) para que la píldora diga cuánta
// gente matchea ese criterio puntual, sin importar qué otros filtros estén
// activos a la vez.
function FilterPill({ label, count, active, onToggle }) {
  return (
    <button
      type="button"
      className={`rrhh-filter-pill${active ? ' active' : ''}`}
      aria-pressed={active}
      onClick={onToggle}
    >
      {label}
      {typeof count === 'number' ? <span className="rrhh-filter-pill-count">· {count}</span> : null}
    </button>
  );
}

export default function PersonalList({
  hierarchy,
  filters,
  filterCounts,
  bases,
  especialidadesCatalogo,
  onFilterChange,
  onClearFilters,
  onView,
  formatRol,
  getAlertMeta
}) {
  const egresados = hierarchy.egresados || [];
  const isEmpty = !hierarchy.direccionTecnica.length && hierarchy.areas.every((area) => area.total === 0) && !egresados.length;
  const hasActiveFilters = Boolean(
    filters.base_id || filters.estado || filters.sin_foto ||
    filters.especialidad_id || filters.atiende_ninos || filters.sin_clasificar
  );

  return (
    <div className="rrhh-stack">
      <div className="rrhh-filters-bar">
        <select
          className="rrhh-filter-select"
          value={filters.base_id}
          onChange={(event) => onFilterChange('base_id', event.target.value)}
        >
          <option value="">Todas las bases</option>
          {bases.map((base) => <option key={base.id} value={base.id}>{base.nombre}</option>)}
        </select>
        <select
          className="rrhh-filter-select"
          value={filters.estado}
          onChange={(event) => onFilterChange('estado', event.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="licencia">Licencia</option>
          <option value="suspendido">Suspendido</option>
          <option value="baja">Baja</option>
        </select>
        <select
          className="rrhh-filter-select"
          value={filters.especialidad_id || ''}
          onChange={(event) => onFilterChange('especialidad_id', event.target.value)}
        >
          <option value="">Todas las especialidades</option>
          {(especialidadesCatalogo || []).map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.nombre}</option>
          ))}
        </select>
        <FilterPill
          label="Sin foto"
          count={filterCounts?.sin_foto}
          active={Boolean(filters.sin_foto)}
          onToggle={() => onFilterChange('sin_foto', !filters.sin_foto)}
        />
        <FilterPill
          label="Atiende niños"
          count={filterCounts?.atiende_ninos}
          active={Boolean(filters.atiende_ninos)}
          onToggle={() => onFilterChange('atiende_ninos', !filters.atiende_ninos)}
        />
        <FilterPill
          label="Sin clasificar"
          count={filterCounts?.sin_clasificar}
          active={Boolean(filters.sin_clasificar)}
          onToggle={() => onFilterChange('sin_clasificar', !filters.sin_clasificar)}
        />
        {hasActiveFilters ? (
          <button type="button" className="rrhh-filter-clear" onClick={onClearFilters}>
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {isEmpty ? (
        <div className="rrhh-empty rrhh-empty-surface">No hay personal que coincida con los filtros.</div>
      ) : (
        <>
          {hierarchy.direccionTecnica.length ? (
            <div className="rrhh-hierarchy-top">
              <MemberGrid
                members={hierarchy.direccionTecnica} isLeader
                onView={onView} getAlertMeta={getAlertMeta} formatRol={formatRol}
              />
            </div>
          ) : null}

          {hierarchy.areas.map((area) => (
            <AreaSection
              key={area.key}
              area={area}
              onView={onView}
              getAlertMeta={getAlertMeta}
              formatRol={formatRol}
              defaultExpanded={area.needsAttention}
            />
          ))}

          {egresados.length ? (
            <EgresadosSection
              egresados={egresados}
              onView={onView}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
