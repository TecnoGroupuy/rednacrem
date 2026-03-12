export const contractingMock = {
  altas: [
    {
      id: 'alt-9001',
      sourceRef: 'manual:alt-9001',
      cliente: 'Lorena Varela',
      producto: 'Plan Familiar Plus',
      fecha: '2026-03-10T09:25:00',
      vendedorOrigen: 'Laura Techera',
      estado: 'pendiente',
      asignado: 'Marcos Viera'
    },
    {
      id: 'alt-9002',
      sourceRef: 'manual:alt-9002',
      cliente: 'Pedro Umpierrez',
      producto: 'Plan Individual Smart',
      fecha: '2026-03-10T11:40:00',
      vendedorOrigen: 'Sofia Rojas',
      estado: 'en_proceso',
      asignado: 'Marcos Viera'
    }
  ],
  retenciones: [
    {
      id: 'ret-7001',
      sourceRef: 'manual:ret-7001',
      cliente: 'Marta Gularte',
      motivo: 'Costo mensual',
      producto: 'Plan Familiar Plus',
      antiguedad: '2 años',
      asignado: 'Marcos Viera',
      estado: 'pendiente'
    },
    {
      id: 'ret-7002',
      sourceRef: 'manual:ret-7002',
      cliente: 'Diego Meneses',
      motivo: 'Cobertura insuficiente',
      producto: 'Plan Proteccion Senior',
      antiguedad: '1 año',
      asignado: 'Supervisor',
      estado: 'contactado'
    }
  ],
  recupero: [
    {
      id: 'rec-5001',
      sourceRef: 'manual:rec-5001',
      cliente: 'Alicia Taboada',
      fechaBaja: '2026-01-14T00:00:00',
      motivo: 'Baja voluntaria',
      productoAnterior: 'Plan Individual Smart',
      campana: 'Reactivación Marzo',
      asignado: 'Sofia Rojas',
      estado: 'pendiente'
    },
    {
      id: 'rec-5002',
      sourceRef: 'manual:rec-5002',
      cliente: 'Ricardo Mendez',
      fechaBaja: '2025-12-02T00:00:00',
      motivo: 'No uso del servicio',
      productoAnterior: 'Plan Familiar Plus',
      campana: 'Clientes históricos',
      asignado: 'Laura Techera',
      estado: 'interesado'
    }
  ]
};

