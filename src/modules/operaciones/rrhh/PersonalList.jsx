import React from 'react';
import { Eye, Edit3, AlertTriangle, Clock3, Building2, MapPin, ChevronDown, ChevronRight, Crown, UserMinus, Car } from 'lucide-react';
import { getEffectiveEstado } from './personalHierarchy.js';

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

// Badge de regimen fijo (movil y/o franja) -- solo se pide para el area de
// Enfermeria (ver PersonCard/AreaSection), asi que vive detras de un prop
// explicito en vez de mostrarse cada vez que el dato esta presente: un
// chofer fijo tambien tiene vehiculo_id, pero no corresponde mostrarle este
// badge fuera de Enfermeria.
function RegimenBadge({ person }) {
  const parts = [person.vehiculo_numero_interno, person.franja_turno].filter(Boolean);
  if (!parts.length) return null;
  return (
    <div className="rrhh-regimen-badge">
      <Car size={14} />
      <span>{parts.join(' · ')}</span>
    </div>
  );
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
  return `${person.nombre?.[0] || ''}${person.apellido?.[0] || ''}`.toUpperCase() || 'SU';
}

function PersonCard({ Button, Tag, person, isLeader, dimmed, showRegimenBadge, onView, onEdit, getBaseLabel, getStatusVariant, getAlertMeta }) {
  const external = person.tipo_personal === 'externo';
  const nombreCompleto = `${person.nombre} ${person.apellido}`.trim();

  // Egresados: tarjeta atenuada, sin banner de alertas de vencimiento (ya no
  // aplica) ni tag de estado a color -- solo la fecha de egreso. Sin rojo
  // en ningun lado, ni siquiera para el estado "baja" -- queda reservado
  // para "puesto descubierto" (fuera de alcance de esta fase).
  if (dimmed) {
    return (
      <article
        className="rrhh-person-card egresado"
        onClick={() => onView(person.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onView(person.id);
          }
        }}
      >
        <div className="rrhh-person-card-top">
          <div className="rrhh-name-cell">
            <div className="rrhh-avatar rrhh-avatar-large" style={{ background: `linear-gradient(135deg, ${avatarColorFor(person.id)}, rgba(15, 23, 42, 0.88))` }}>
              {initialsFor(person)}
            </div>
            <div>
              <div className="rrhh-name">{nombreCompleto}</div>
              <div className="rrhh-subtle">{person.documento || 'Sin documento'}</div>
            </div>
          </div>
          <div className="rrhh-card-actions" onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" icon={<Eye size={16} />} onClick={() => onView(person.id)}>Ver</Button>
          </div>
        </div>
        <div className="rrhh-person-card-tags">
          <div className="rrhh-status-pill egresado">
            <UserMinus size={14} />
            <span>Egresado{person.fecha_egreso ? ` · ${formatDateOnlyDisplay(person.fecha_egreso)}` : ''}</span>
          </div>
        </div>
      </article>
    );
  }

  const alertMeta = getAlertMeta(person);

  return (
    <article
      className={`rrhh-person-card ${external ? 'external' : 'internal'} ${alertMeta.hasAlert ? 'has-alert' : ''} ${isLeader ? 'leader' : ''}`}
      onClick={() => onView(person.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onView(person.id);
        }
      }}
    >
      <div className="rrhh-person-card-top">
        <div className="rrhh-name-cell">
          <div className="rrhh-avatar rrhh-avatar-large" style={{ background: `linear-gradient(135deg, ${avatarColorFor(person.id)}, rgba(15, 23, 42, 0.88))` }}>
            {initialsFor(person)}
          </div>
          <div>
            <div className="rrhh-name">
              {isLeader ? <Crown size={14} className="rrhh-leader-icon" /> : null}
              {nombreCompleto}
            </div>
            <div className="rrhh-subtle">{person.documento || 'Sin documento'}</div>
          </div>
        </div>
        <div className="rrhh-card-actions" onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" icon={<Eye size={16} />} onClick={() => onView(person.id)}>Ver</Button>
          <Button variant="ghost" icon={<Edit3 size={16} />} onClick={() => onEdit(person.id)}>Editar</Button>
        </div>
      </div>

      <div className="rrhh-person-card-body">
        <div className="rrhh-person-meta">
          <span className="rrhh-person-meta-label">Base asignada</span>
          <strong className="rrhh-person-base">
            <MapPin size={14} />
            <span>{getBaseLabel(person.base_id)}</span>
          </strong>
        </div>
        {person.missingCount ? (
          <div className="rrhh-person-meta">
            <span className="rrhh-person-meta-label">Datos pendientes</span>
            <strong>{person.missingCount} campo{person.missingCount === 1 ? '' : 's'} sin completar</strong>
          </div>
        ) : null}
      </div>

      <div className="rrhh-person-card-tags">
        <StatusPill person={person} getStatusVariant={getStatusVariant} Tag={Tag} />
        {showRegimenBadge ? <RegimenBadge person={person} /> : null}
        {external ? (
          <div className="rrhh-external-pill">
            <Building2 size={14} />
            <span>Externo</span>
          </div>
        ) : (
          <div className="rrhh-internal-pill">Interno</div>
        )}
      </div>

      <div className={`rrhh-alert-banner ${alertMeta.hasAlert ? alertMeta.variant : 'success'}`}>
        {alertMeta.hasAlert ? (
          <>
            {alertMeta.variant === 'danger' ? <AlertTriangle size={16} /> : <Clock3 size={16} />}
            <span>{alertMeta.label}</span>
          </>
        ) : (
          <span>Sin alertas</span>
        )}
      </div>
    </article>
  );
}

function MemberGrid({ Button, Tag, members, isLeader, dimmed, showRegimenBadge, onView, onEdit, getBaseLabel, getStatusVariant, getAlertMeta, emptyMessage }) {
  if (!members.length) {
    return <div className="rrhh-empty-inline">{emptyMessage || 'Sin personal en este grupo.'}</div>;
  }
  return (
    <div className="rrhh-person-grid">
      {members.map((person) => (
        <PersonCard
          key={person.id}
          Button={Button}
          Tag={Tag}
          person={person}
          isLeader={isLeader}
          dimmed={dimmed}
          showRegimenBadge={showRegimenBadge}
          onView={onView}
          onEdit={onEdit}
          getBaseLabel={getBaseLabel}
          getStatusVariant={getStatusVariant}
          getAlertMeta={getAlertMeta}
        />
      ))}
    </div>
  );
}

// Seccion "Egresados" -- lista plana (sin jefatura/subgrupos, mismo criterio
// que Economato/Mantenimiento) de personal en estado='baja'. Colapsada por
// defecto: a diferencia de las areas normales, nunca "necesita atencion".
function EgresadosSection({ egresados, Button, Tag, onView, getBaseLabel, getStatusVariant, getAlertMeta }) {
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
            Button={Button} Tag={Tag} members={egresados} dimmed
            onView={onView}
            getBaseLabel={getBaseLabel} getStatusVariant={getStatusVariant} getAlertMeta={getAlertMeta}
            emptyMessage="No hay personal egresado."
          />
        </div>
      ) : null}
    </section>
  );
}

function AreaSection({ area, Button, Tag, onView, onEdit, getBaseLabel, getStatusVariant, getAlertMeta, defaultExpanded }) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  // El badge de movil/franja (Fase 2 del regimen fijo) solo se pide para
  // Enfermeria -- Choferes tambien tiene regimen fijo con vehiculo_id, pero
  // queda fuera de alcance de esta fase.
  const showRegimenBadge = area.key === 'enfermeria';

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
                Button={Button} Tag={Tag} members={area.leaders} isLeader showRegimenBadge={showRegimenBadge}
                onView={onView} onEdit={onEdit}
                getBaseLabel={getBaseLabel} getStatusVariant={getStatusVariant} getAlertMeta={getAlertMeta}
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
                Button={Button} Tag={Tag} members={subgroup.members} showRegimenBadge={showRegimenBadge}
                onView={onView} onEdit={onEdit}
                getBaseLabel={getBaseLabel} getStatusVariant={getStatusVariant} getAlertMeta={getAlertMeta}
                emptyMessage={subgroup.emptyMessage}
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function PersonalList({
  Button,
  Tag,
  hierarchy,
  filters,
  bases,
  onFilterChange,
  onCreate,
  onView,
  onEdit,
  getBaseLabel,
  getStatusVariant,
  getAlertMeta
}) {
  const egresados = hierarchy.egresados || [];
  const isEmpty = !hierarchy.direccionTecnica.length && hierarchy.areas.every((area) => area.total === 0) && !egresados.length;

  return (
    <div className="rrhh-stack">
      <div className="rrhh-toolbar">
        <div className="rrhh-filters">
          <select value={filters.base_id} onChange={(event) => onFilterChange('base_id', event.target.value)}>
            <option value="">Todas las bases</option>
            {bases.map((base) => <option key={base.id} value={base.id}>{base.nombre}</option>)}
          </select>
          <select value={filters.estado} onChange={(event) => onFilterChange('estado', event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="licencia">Licencia</option>
            <option value="suspendido">Suspendido</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <Button icon={null} onClick={onCreate}>Nuevo personal</Button>
      </div>

      {isEmpty ? (
        <div className="rrhh-empty rrhh-empty-surface">No hay personal que coincida con los filtros.</div>
      ) : (
        <>
          {hierarchy.direccionTecnica.length ? (
            <div className="rrhh-hierarchy-top">
              <MemberGrid
                Button={Button} Tag={Tag} members={hierarchy.direccionTecnica} isLeader
                onView={onView} onEdit={onEdit}
                getBaseLabel={getBaseLabel} getStatusVariant={getStatusVariant} getAlertMeta={getAlertMeta}
              />
            </div>
          ) : null}

          {hierarchy.areas.map((area) => (
            <AreaSection
              key={area.key}
              area={area}
              Button={Button}
              Tag={Tag}
              onView={onView}
              onEdit={onEdit}
              getBaseLabel={getBaseLabel}
              getStatusVariant={getStatusVariant}
              getAlertMeta={getAlertMeta}
              defaultExpanded={area.needsAttention}
            />
          ))}

          {egresados.length ? (
            <EgresadosSection
              egresados={egresados}
              Button={Button}
              Tag={Tag}
              onView={onView}
              getBaseLabel={getBaseLabel}
              getStatusVariant={getStatusVariant}
              getAlertMeta={getAlertMeta}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
