import React from 'react';
import { Eye, Edit3, AlertTriangle, Clock3, Building2, MapPin, ChevronDown, ChevronRight, Crown } from 'lucide-react';

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

function PersonCard({ Button, Tag, person, isLeader, onView, onEdit, getBaseLabel, getStatusVariant, getAlertMeta }) {
  const alertMeta = getAlertMeta(person);
  const external = person.tipo_personal === 'externo';
  const nombreCompleto = `${person.nombre} ${person.apellido}`.trim();

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
        <Tag variant={getStatusVariant(person.estado)}>{person.estado || 'sin estado'}</Tag>
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

function MemberGrid({ Button, Tag, members, isLeader, onView, onEdit, getBaseLabel, getStatusVariant, getAlertMeta, emptyMessage }) {
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

function AreaSection({ area, Button, Tag, onView, onEdit, getBaseLabel, getStatusVariant, getAlertMeta, defaultExpanded }) {
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
                Button={Button} Tag={Tag} members={area.leaders} isLeader
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
                Button={Button} Tag={Tag} members={subgroup.members}
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
  const isEmpty = !hierarchy.direccionTecnica.length && hierarchy.areas.every((area) => area.total === 0);

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
        </>
      )}
    </div>
  );
}
