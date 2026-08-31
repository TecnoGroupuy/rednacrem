import React from 'react';
import { Briefcase, Building2, Users, AlertTriangle } from 'lucide-react';
import PersonalList from './PersonalList.jsx';
import PersonalForm from './PersonalForm.jsx';
import PersonalDetail from './PersonalDetail.jsx';
import EmpresasContratistasList from './EmpresasContratistasList.jsx';
import EmpresaContratistaForm from './EmpresaContratistaForm.jsx';
import {
  RRHH_BASES,
  RRHH_ROLE_OPTIONS,
  su_personal as initialPersonal,
  su_personal_roles as initialRoles,
  su_personal_habilitaciones as initialHabilitaciones,
  su_personal_capacitaciones as initialCapacitaciones,
  su_personal_carnet_salud as initialCarnetSalud,
  su_empresas_contratistas as initialEmpresas
} from './rrhhMockData.js';
import './rrhhStyles.css';

const TODAY = new Date('2026-08-30T00:00:00');
const AVATAR_COLORS = ['#0f766e', '#2563eb', '#d97706', '#be123c', '#0891b2', '#7c3aed'];

const emptyPersonalDraft = {
  id: '',
  organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd',
  nombre: '',
  apellido: '',
  documento: '',
  fecha_nacimiento: '',
  telefono: '',
  email: '',
  domicilio: '',
  foto_url: '',
  base_id: '',
  estado: 'activo',
  fecha_ingreso: '',
  fecha_egreso: '',
  tipo_personal: 'interno',
  empresa_contratista_id: ''
};

const emptyEmpresaDraft = {
  id: '',
  razon_social: '',
  rut: '',
  contacto_nombre: '',
  contacto_telefono: '',
  contacto_email: '',
  activa: true
};

const statusToVariant = {
  activo: 'success',
  licencia: 'warning',
  suspendido: 'danger',
  baja: 'info'
};

const docStatusToVariant = {
  vigente: 'success',
  vencida: 'danger',
  en_tramite: 'warning'
};

const diffDays = (dateValue) => {
  if (!dateValue) return null;
  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
};

const getVencimientoMeta = (dateValue) => {
  const days = diffDays(dateValue);
  if (days === null) return { variant: 'info', label: 'Sin fecha' };
  if (days < 0) return { variant: 'danger', label: `Vencida ${dateValue}` };
  if (days <= 30) return { variant: 'warning', label: `Vence ${dateValue}` };
  return { variant: 'success', label: `Vigente ${dateValue}` };
};

const formatRol = (value) => String(value || '').replaceAll('_', ' ');
const initials = (personal) => `${personal.nombre?.[0] || ''}${personal.apellido?.[0] || ''}`.toUpperCase() || 'SU';

const getDocumentAlertLevel = (items = [], dateField = 'fecha_vencimiento') => {
  const levels = items.map((item) => diffDays(item?.[dateField]));
  if (levels.some((days) => days !== null && days < 0)) return 'danger';
  if (levels.some((days) => days !== null && days <= 30)) return 'warning';
  return 'success';
};

export default function RrhhScreen({ Button, Panel, Tag }) {
  const [suPersonal, setSuPersonal] = React.useState(initialPersonal);
  const [suPersonalRoles, setSuPersonalRoles] = React.useState(initialRoles);
  const [suPersonalHabilitaciones] = React.useState(initialHabilitaciones);
  const [suPersonalCapacitaciones] = React.useState(initialCapacitaciones);
  const [suPersonalCarnetSalud] = React.useState(initialCarnetSalud);
  const [suEmpresasContratistas, setSuEmpresasContratistas] = React.useState(initialEmpresas);
  const [filters, setFilters] = React.useState({
    base_id: '',
    rol: '',
    estado: '',
    tipo_personal: ''
  });
  const [personalFormOpen, setPersonalFormOpen] = React.useState(false);
  const [personalFormMode, setPersonalFormMode] = React.useState('create');
  const [personalDraft, setPersonalDraft] = React.useState(emptyPersonalDraft);
  const [personalRolesDraft, setPersonalRolesDraft] = React.useState([]);
  const [personalErrors, setPersonalErrors] = React.useState({});
  const [selectedPersonalId, setSelectedPersonalId] = React.useState(null);
  const [detailTab, setDetailTab] = React.useState('datos_generales');
  const [empresasOpen, setEmpresasOpen] = React.useState(false);
  const [empresaFormOpen, setEmpresaFormOpen] = React.useState(false);
  const [empresaFormMode, setEmpresaFormMode] = React.useState('create');
  const [empresaDraft, setEmpresaDraft] = React.useState(emptyEmpresaDraft);

  const baseById = React.useMemo(
    () => Object.fromEntries(RRHH_BASES.map((base) => [base.id, base])),
    []
  );

  const empresaById = React.useMemo(
    () => Object.fromEntries(suEmpresasContratistas.map((empresa) => [empresa.id, empresa])),
    [suEmpresasContratistas]
  );

  const rolesByPersonalId = React.useMemo(() => {
    const grouped = {};
    suPersonalRoles.forEach((role) => {
      if (!grouped[role.personal_id]) grouped[role.personal_id] = [];
      grouped[role.personal_id].push(role);
    });
    return grouped;
  }, [suPersonalRoles]);

  const habilitacionesByPersonalId = React.useMemo(() => {
    const grouped = {};
    suPersonalHabilitaciones.forEach((item) => {
      if (!grouped[item.personal_id]) grouped[item.personal_id] = [];
      grouped[item.personal_id].push(item);
    });
    return grouped;
  }, [suPersonalHabilitaciones]);

  const capacitacionesByPersonalId = React.useMemo(() => {
    const grouped = {};
    suPersonalCapacitaciones.forEach((item) => {
      if (!grouped[item.personal_id]) grouped[item.personal_id] = [];
      grouped[item.personal_id].push(item);
    });
    return grouped;
  }, [suPersonalCapacitaciones]);

  const carnetByPersonalId = React.useMemo(
    () => Object.fromEntries(suPersonalCarnetSalud.map((item) => [item.personal_id, item])),
    [suPersonalCarnetSalud]
  );

  const personalRows = React.useMemo(() => (
    suPersonal.map((personal, index) => {
      const roles = rolesByPersonalId[personal.id] || [];
      const rolPrincipal = roles.find((item) => item.rol_principal)?.rol || '';
      const empresa = personal.empresa_contratista_id ? empresaById[personal.empresa_contratista_id] : null;
      return {
        ...personal,
        nombreCompleto: `${personal.nombre} ${personal.apellido}`.trim(),
        rolPrincipal,
        empresaRazonSocial: empresa?.razon_social || '',
        estadoLabel: personal.estado,
        avatarContent: personal.foto_url ? '' : initials(personal),
        avatarBackground: personal.foto_url
          ? `center / cover no-repeat url(${personal.foto_url})`
          : `linear-gradient(135deg, ${AVATAR_COLORS[index % AVATAR_COLORS.length]}, rgba(15, 23, 42, 0.88))`
      };
    })
  ), [suPersonal, rolesByPersonalId, empresaById]);

  const filteredRows = React.useMemo(() => personalRows.filter((row) => {
    if (filters.base_id && row.base_id !== filters.base_id) return false;
    if (filters.estado && row.estado !== filters.estado) return false;
    if (filters.tipo_personal && row.tipo_personal !== filters.tipo_personal) return false;
    if (filters.rol && row.rolPrincipal !== filters.rol && !(rolesByPersonalId[row.id] || []).some((item) => item.rol === filters.rol)) return false;
    return true;
  }), [personalRows, filters, rolesByPersonalId]);

  const selectedPersonal = React.useMemo(
    () => suPersonal.find((item) => item.id === selectedPersonalId) || null,
    [suPersonal, selectedPersonalId]
  );

  const getBaseLabel = React.useCallback((baseId) => baseById[baseId]?.nombre || 'Sin base', [baseById]);
  const getStatusVariant = React.useCallback((status) => statusToVariant[status] || 'info', []);
  const getDocumentStatusVariant = React.useCallback((status) => docStatusToVariant[status] || 'info', []);

  const getAlertMeta = React.useCallback((row) => {
    const habilitaciones = habilitacionesByPersonalId[row.id] || [];
    const capacitaciones = capacitacionesByPersonalId[row.id] || [];
    const carnet = carnetByPersonalId[row.id] ? [carnetByPersonalId[row.id]] : [];
    const levels = [
      getDocumentAlertLevel(habilitaciones),
      getDocumentAlertLevel(capacitaciones),
      getDocumentAlertLevel(carnet)
    ];
    if (levels.includes('danger')) return { hasAlert: true, variant: 'danger', label: 'Documentacion vencida' };
    if (levels.includes('warning')) return { hasAlert: true, variant: 'warning', label: 'Proximo a vencer' };
    return { hasAlert: false, variant: 'success', label: 'Sin alertas' };
  }, [habilitacionesByPersonalId, capacitacionesByPersonalId, carnetByPersonalId]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const openCreatePersonal = () => {
    setPersonalFormMode('create');
    setPersonalDraft({ ...emptyPersonalDraft, id: `p${Date.now()}` });
    setPersonalRolesDraft([]);
    setPersonalErrors({});
    setPersonalFormOpen(true);
  };

  const openEditPersonal = (personalId) => {
    const personal = suPersonal.find((item) => item.id === personalId);
    if (!personal) return;
    setPersonalFormMode('edit');
    setPersonalDraft({ ...personal });
    setPersonalRolesDraft((rolesByPersonalId[personalId] || []).map((item) => ({ ...item })));
    setPersonalErrors({});
    setPersonalFormOpen(true);
  };

  const validatePersonalDraft = () => {
    const nextErrors = {};
    if (!personalDraft.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.';
    if (!personalDraft.apellido.trim()) nextErrors.apellido = 'El apellido es obligatorio.';
    if (!personalDraft.documento.trim()) nextErrors.documento = 'El documento es obligatorio.';
    if (!personalDraft.base_id) nextErrors.base_id = 'Selecciona una base.';
    if (personalDraft.tipo_personal === 'externo' && !personalDraft.empresa_contratista_id) {
      nextErrors.empresa_contratista_id = 'Selecciona una empresa contratista para personal externo.';
    }
    if (!personalRolesDraft.length) nextErrors.roles = 'Debes asignar al menos un rol.';
    if (personalRolesDraft.length && !personalRolesDraft.some((item) => item.rol_principal)) {
      nextErrors.roles = 'Marca un rol principal.';
    }
    setPersonalErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const savePersonal = () => {
    if (!validatePersonalDraft()) return;

    const persistedPersonal = {
      ...personalDraft,
      empresa_contratista_id: personalDraft.tipo_personal === 'externo' ? personalDraft.empresa_contratista_id : ''
    };

    setSuPersonal((prev) => {
      const exists = prev.some((item) => item.id === persistedPersonal.id);
      if (exists) return prev.map((item) => item.id === persistedPersonal.id ? persistedPersonal : item);
      return [persistedPersonal, ...prev];
    });

    setSuPersonalRoles((prev) => {
      const nextRoles = personalRolesDraft.map((item, index) => ({
        ...item,
        id: item.id || `pr-${persistedPersonal.id}-${index + 1}`,
        personal_id: persistedPersonal.id
      }));
      return [...prev.filter((item) => item.personal_id !== persistedPersonal.id), ...nextRoles];
    });

    setSelectedPersonalId(persistedPersonal.id);
    setPersonalFormOpen(false);
  };

  const openDetail = (personalId) => {
    setSelectedPersonalId(personalId);
    setDetailTab('datos_generales');
  };

  const closeDetail = () => {
    setSelectedPersonalId(null);
  };

  const addRoleToSelected = () => {
    if (!selectedPersonalId) return;
    const available = RRHH_ROLE_OPTIONS.find((role) => !(rolesByPersonalId[selectedPersonalId] || []).some((item) => item.rol === role));
    if (!available) return;
    setSuPersonalRoles((prev) => [
      ...prev,
      {
        id: `pr-${selectedPersonalId}-${Date.now()}`,
        personal_id: selectedPersonalId,
        rol: available,
        rol_principal: !(rolesByPersonalId[selectedPersonalId] || []).length
      }
    ]);
  };

  const removeRoleFromSelected = (roleId) => {
    const current = rolesByPersonalId[selectedPersonalId] || [];
    const remaining = current.filter((item) => item.id !== roleId);
    setSuPersonalRoles((prev) => prev.filter((item) => item.id !== roleId));
    if (remaining.length && !remaining.some((item) => item.rol_principal)) {
      const nextPrimaryId = remaining[0].id;
      setSuPersonalRoles((prev) => prev.map((item) => {
        if (item.id === nextPrimaryId) return { ...item, rol_principal: true };
        return item;
      }));
    }
  };

  const openCreateEmpresa = () => {
    setEmpresaFormMode('create');
    setEmpresaDraft({ ...emptyEmpresaDraft, id: `ec-${Date.now()}` });
    setEmpresaFormOpen(true);
  };

  const openEditEmpresa = (empresaId) => {
    const empresa = suEmpresasContratistas.find((item) => item.id === empresaId);
    if (!empresa) return;
    setEmpresaFormMode('edit');
    setEmpresaDraft({ ...empresa });
    setEmpresaFormOpen(true);
  };

  const saveEmpresa = () => {
    setSuEmpresasContratistas((prev) => {
      const exists = prev.some((item) => item.id === empresaDraft.id);
      if (exists) return prev.map((item) => item.id === empresaDraft.id ? empresaDraft : item);
      return [empresaDraft, ...prev];
    });
    setEmpresaFormOpen(false);
  };

  return (
    <div className="view rrhh-screen rrhh-screen-full">
      <section className="content-grid rrhh-content-grid">
        <Panel
          className="span-12 rrhh-main-panel"
          title="Personal"
          subtitle="Listado mock con filtros controlados y alertas documentales"
        >
          <PersonalList
            Button={Button}
            Tag={Tag}
            rows={filteredRows}
            filters={filters}
            bases={RRHH_BASES}
            roleOptions={RRHH_ROLE_OPTIONS}
            onFilterChange={handleFilterChange}
            onCreate={openCreatePersonal}
            onView={openDetail}
            onEdit={openEditPersonal}
            formatRol={formatRol}
            getBaseLabel={getBaseLabel}
            getStatusVariant={getStatusVariant}
            getAlertMeta={getAlertMeta}
          />
        </Panel>
      </section>

      {selectedPersonal ? (
        <PersonalDetail
          Button={Button}
          Tag={Tag}
          personal={selectedPersonal}
          roles={rolesByPersonalId[selectedPersonal.id] || []}
          habilitaciones={habilitacionesByPersonalId[selectedPersonal.id] || []}
          capacitaciones={capacitacionesByPersonalId[selectedPersonal.id] || []}
          carnetSalud={carnetByPersonalId[selectedPersonal.id] || null}
          empresa={selectedPersonal.empresa_contratista_id ? empresaById[selectedPersonal.empresa_contratista_id] : null}
          activeTab={detailTab}
          onTabChange={setDetailTab}
          onClose={closeDetail}
          formatRol={formatRol}
          getBaseLabel={getBaseLabel}
          getStatusVariant={getStatusVariant}
          getDocumentStatusVariant={getDocumentStatusVariant}
          getVencimientoMeta={getVencimientoMeta}
          onAddRole={addRoleToSelected}
          onRemoveRole={removeRoleFromSelected}
        />
      ) : null}

      {personalFormOpen ? (
        <PersonalForm
          Button={Button}
          draft={personalDraft}
          setDraft={setPersonalDraft}
          formMode={personalFormMode}
          bases={RRHH_BASES}
          empresas={suEmpresasContratistas}
          roleOptions={RRHH_ROLE_OPTIONS}
          rolesDraft={personalRolesDraft}
          setRolesDraft={setPersonalRolesDraft}
          errors={personalErrors}
          onClose={() => setPersonalFormOpen(false)}
          onSubmit={savePersonal}
          onOpenEmpresas={() => setEmpresasOpen(true)}
          formatRol={formatRol}
        />
      ) : null}

      {empresasOpen ? (
        <div className="rrhh-modal-root" role="dialog" aria-modal="true" aria-label="Empresas contratistas">
          <div className="lot-wizard-overlay" onClick={() => setEmpresasOpen(false)} />
          <div className="rrhh-modal-panel rrhh-modal-panel-wide">
            <div className="rrhh-modal-header">
              <div>
                <h3>Empresas contratistas</h3>
                <p>Vista reutilizable para RRHH y selector del formulario.</p>
              </div>
              <Button variant="ghost" onClick={() => setEmpresasOpen(false)}>Cerrar</Button>
            </div>
            <EmpresasContratistasList
              Button={Button}
              Tag={Tag}
              empresas={suEmpresasContratistas}
              onCreate={openCreateEmpresa}
              onEdit={openEditEmpresa}
            />
          </div>
        </div>
      ) : null}

      {empresaFormOpen ? (
        <EmpresaContratistaForm
          Button={Button}
          draft={empresaDraft}
          setDraft={setEmpresaDraft}
          onClose={() => setEmpresaFormOpen(false)}
          onSubmit={saveEmpresa}
          formMode={empresaFormMode}
        />
      ) : null}
    </div>
  );
}
