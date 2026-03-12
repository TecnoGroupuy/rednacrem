export const TICKET_TYPES = {
  solicitud_baja: { id: 'solicitud_baja', label: 'Solicitud de baja' },
  info_servicio: { id: 'info_servicio', label: 'Informacion sobre servicio' },
  cambio_metodo_pago: { id: 'cambio_metodo_pago', label: 'Cambio de metodo de pago' },
  solicitud_servicio: { id: 'solicitud_servicio', label: 'Solicitud de servicio' },
  desconoce_descuento: { id: 'desconoce_descuento', label: 'Desconoce descuento' },
  reclamo: { id: 'reclamo', label: 'Reclamo' },
  otro: { id: 'otro', label: 'Otro' }
};

export const TICKET_TYPE_LIST = Object.values(TICKET_TYPES);
