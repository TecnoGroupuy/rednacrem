export const bases = [
  { id: 'b1', nombre: 'Pando', departamento: 'Canelones', direccion: 'Solis 932', lat: -34.7184, lng: -55.9627, moviles_minimos_habilitados: 3 },
  { id: 'b2', nombre: 'Barros Blancos', departamento: 'Canelones', direccion: 'Ruta 8 km 37', lat: -34.7534, lng: -56.0009, moviles_minimos_habilitados: 2 },
  { id: 'b3', nombre: 'Salinas', departamento: 'Canelones', direccion: 'Norte, esquina IB', lat: -34.7761, lng: -55.8487, moviles_minimos_habilitados: 2 },
  { id: 'b4', nombre: 'Atlantida', departamento: 'Canelones', direccion: 'Atlantida', lat: -34.7796, lng: -55.7569, moviles_minimos_habilitados: 2 },
];

export const personalPorBase = {
  b1: [
    { id: 'p1', nombre: 'Dr. Carlos Mendez', rol: 'Medico', en_turno: true, foto_url: null },
    { id: 'p2', nombre: 'Enf. Laura Vazquez', rol: 'Enfermero', en_turno: true, foto_url: null },
    { id: 'p3', nombre: 'Tec. Martin Rodriguez', rol: 'Auxiliar_de_servicio', en_turno: false, foto_url: null },
    { id: 'p4', nombre: 'Cond. Diego Silva', rol: 'Chofer', en_turno: true, foto_url: null },
  ],
  b2: [
    { id: 'p5', nombre: 'Dra. Ana Ferreira', rol: 'Medico', en_turno: true, foto_url: null },
    { id: 'p6', nombre: 'Enf. Pedro Gomez', rol: 'Enfermero', en_turno: true, foto_url: null },
    { id: 'p7', nombre: 'Cond. Luis Acosta', rol: 'Chofer', en_turno: false, foto_url: null },
  ],
  b3: [
    { id: 'p8', nombre: 'Dr. Javier Rios', rol: 'Jefe_medico', en_turno: true, foto_url: null },
    { id: 'p9', nombre: 'Enf. Camila Sosa', rol: 'Jefe_de_enfermeria', en_turno: true, foto_url: null },
  ],
  b4: [
    { id: 'p10', nombre: 'Dra. Maria Lopez', rol: 'Medico', en_turno: false, foto_url: null },
    { id: 'p11', nombre: 'Enf. Roberto Paz', rol: 'Enfermero', en_turno: true, foto_url: null },
    { id: 'p12', nombre: 'Cond. Fernando Ruiz', rol: 'Chofer', en_turno: true, foto_url: null },
  ],
};

// Posición fija en base — sin GPS real todavía. Reemplazar por tracking en vivo cuando se conecte la API real.
// Todos los estados operativos: offset de 0.0021° al oeste/este (~192 m de la base, ~384 m entre móviles).
export const vehiculos = [
  { id: 'v1', numero_interno: 'M-101', base_id: 'b1', categoria: 'AVA', estado_operativo: 'disponible', lat: -34.7184, lng: -55.9648, servicio_actual_id: null },
  { id: 'v2', numero_interno: 'M-205', base_id: 'b2', categoria: 'basico', estado_operativo: 'en_servicio', lat: -34.7534, lng: -56.0030, servicio_actual_id: 's1' },
  { id: 'v3', numero_interno: 'M-112', base_id: 'b2', categoria: 'pediatrico', estado_operativo: 'en_base', lat: -34.7534, lng: -55.9988, servicio_actual_id: null },
  { id: 'v4', numero_interno: 'M-098', base_id: 'b3', categoria: 'AVA', estado_operativo: 'mantenimiento', lat: -34.7761, lng: -55.8508, servicio_actual_id: null },
  { id: 'v5', numero_interno: 'M-220', base_id: 'b4', categoria: 'basico', estado_operativo: 'en_servicio', lat: -34.7796, lng: -55.7590, servicio_actual_id: 's2' },
  { id: 'v6', numero_interno: 'M-130', base_id: 'b1', categoria: 'AVA', estado_operativo: 'disponible', lat: -34.7184, lng: -55.9606, servicio_actual_id: null },
];

export const serviciosActivos = [
  { id: 's1', prioridad: 'P1', tipo: 'Emergencia cardiaca', vehiculo_id: 'v2', hora_solicitud: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
  { id: 's2', prioridad: 'P1', tipo: 'Accidente de transito', vehiculo_id: 'v5', hora_solicitud: new Date(Date.now() - 14 * 60 * 1000).toISOString() },
  { id: 's3', prioridad: 'P2', tipo: 'Dificultad respiratoria', vehiculo_id: 'v6', hora_solicitud: new Date(Date.now() - 22 * 60 * 1000).toISOString() },
  { id: 's4', prioridad: 'P2', tipo: 'Trauma pediatrico', vehiculo_id: 'v3', hora_solicitud: new Date(Date.now() - 31 * 60 * 1000).toISOString() },
  { id: 's5', prioridad: 'P3', tipo: 'Traslado programado', vehiculo_id: 'v1', hora_solicitud: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
];
