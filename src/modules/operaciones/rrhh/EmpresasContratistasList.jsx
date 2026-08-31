import React from 'react';
import { Edit3, Plus } from 'lucide-react';

export default function EmpresasContratistasList({
  Button,
  Tag,
  empresas,
  onCreate,
  onEdit
}) {
  return (
    <div className="rrhh-stack">
      <div className="rrhh-inline-actions">
        <h4>Empresas contratistas</h4>
        <Button icon={<Plus size={16} />} onClick={onCreate}>Nueva empresa</Button>
      </div>
      <div className="rrhh-table-wrap">
        <table className="rrhh-table">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>RUT</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((empresa) => (
              <tr key={empresa.id}>
                <td>{empresa.razon_social}</td>
                <td>{empresa.rut}</td>
                <td>{empresa.contacto_nombre} · {empresa.contacto_telefono}</td>
                <td>{empresa.contacto_email}</td>
                <td><Tag variant={empresa.activa ? 'success' : 'warning'}>{empresa.activa ? 'Activa' : 'Inactiva'}</Tag></td>
                <td>
                  <Button variant="ghost" icon={<Edit3 size={16} />} onClick={() => onEdit(empresa.id)}>Editar</Button>
                </td>
              </tr>
            ))}
            {!empresas.length ? (
              <tr>
                <td colSpan={6} className="rrhh-empty">No hay empresas contratistas cargadas.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
