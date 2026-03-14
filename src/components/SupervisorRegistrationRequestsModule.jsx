import React from 'react';
import {
  listPendingRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest
} from '../services/supervisorApprovalsService.js';

export default function SupervisorRegistrationRequestsModule({ Panel, Button, Tag }) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [busyById, setBusyById] = React.useState({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await listPendingRegistrationRequests());
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar solicitudes pendientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const resolveRow = async (id, action) => {
    setBusyById((prev) => ({ ...prev, [id]: true }));
    setError('');
    try {
      if (action === 'approve') {
        await approveRegistrationRequest(id);
      } else {
        await rejectRegistrationRequest(id, {});
      }
      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar la solicitud.');
    } finally {
      setBusyById((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="view">
      <section className="content-grid">
        <Panel
          className="span-12"
          title="Solicitudes de registro"
          subtitle="Aprobación/rechazo de vendedores pendientes"
          action={<Tag variant="warning">Pendientes: {rows.length}</Tag>}
        >
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <Button variant="secondary" onClick={load}>Actualizar</Button>
          </div>

          {loading ? <div style={{ color: 'var(--muted)' }}>Cargando solicitudes...</div> : null}
          {error ? <div style={{ color: '#be123c', fontWeight: 700 }}>{error}</div> : null}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.nombre || '-'}</strong></td>
                    <td>{row.apellido || '-'}</td>
                    <td>{row.email || '-'}</td>
                    <td>{row.telefono || '-'}</td>
                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleString('es-UY') : '-'}</td>
                    <td><Tag variant="warning">{row.status || 'pending'}</Tag></td>
                    <td>
                      <div className="toolbar" style={{ gap: 8 }}>
                        <Button
                          variant="primary"
                          disabled={!!busyById[row.id]}
                          onClick={() => resolveRow(row.id, 'approve')}
                        >
                          Aprobar
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={!!busyById[row.id]}
                          onClick={() => resolveRow(row.id, 'reject')}
                        >
                          Rechazar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !rows.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay solicitudes pendientes.</div> : null}
          </div>
        </Panel>
      </section>
    </div>
  );
}
