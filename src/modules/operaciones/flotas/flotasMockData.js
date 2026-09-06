export const FLOTAS_BASES = [
  { id: 'b1', nombre: 'Pando', departamento: 'Canelones', direccion: 'Solis 932', lat: -34.7184, lng: -55.9627, moviles_minimos_habilitados: 3 },
  { id: 'b2', nombre: 'Barros Blancos', departamento: 'Canelones', direccion: 'Ruta 8 km 37', lat: -34.7534, lng: -56.0009, moviles_minimos_habilitados: 2 },
  { id: 'b3', nombre: 'Salinas', departamento: 'Canelones', direccion: 'Norte, esquina IB', lat: -34.7761, lng: -55.8487, moviles_minimos_habilitados: 2 },
  { id: 'b4', nombre: 'Atlantida', departamento: 'Canelones', direccion: 'Atlantida', lat: -34.7796, lng: -55.7569, moviles_minimos_habilitados: 2 }
];

export const su_vehiculos = [
  { id: 'v1', organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd', numero_interno: 'M-101', matricula: 'SUA 1101', marca: 'Mercedes-Benz', modelo: 'Sprinter', anio: 2022, categoria: 'AVA', modalidad: '24x7', es_backup: false, base_id: 'b1', altura_cm: 272, capacidad_camilla_articulada: true, estado_operativo: 'disponible', kilometraje: 118400, proximo_service_km: 120000 },
  { id: 'v2', organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd', numero_interno: 'M-130', matricula: 'SUA 1130', marca: 'Renault', modelo: 'Master', anio: 2021, categoria: 'AVA', modalidad: '24x7', es_backup: false, base_id: 'b1', altura_cm: 268, capacidad_camilla_articulada: true, estado_operativo: 'disponible', kilometraje: 154900, proximo_service_km: 150000 },
  { id: 'v3', organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd', numero_interno: 'M-205', matricula: 'SUA 2205', marca: 'Fiat', modelo: 'Ducato', anio: 2023, categoria: 'basico', modalidad: 'diurna', es_backup: false, base_id: 'b2', altura_cm: 255, capacidad_camilla_articulada: true, estado_operativo: 'en_servicio', kilometraje: 86400, proximo_service_km: 90000 },
  { id: 'v4', organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd', numero_interno: 'M-112', matricula: 'SUA 2112', marca: 'Peugeot', modelo: 'Boxer', anio: 2020, categoria: 'pediatrico', modalidad: '24x7', es_backup: true, base_id: 'b2', altura_cm: 259, capacidad_camilla_articulada: true, estado_operativo: 'en_base', kilometraje: 131200, proximo_service_km: 140000 },
  { id: 'v5', organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd', numero_interno: 'M-098', matricula: 'SUA 3098', marca: 'Mercedes-Benz', modelo: 'Sprinter', anio: 2019, categoria: 'AVA', modalidad: 'nocturna', es_backup: false, base_id: 'b3', altura_cm: 270, capacidad_camilla_articulada: true, estado_operativo: 'mantenimiento', kilometraje: 176300, proximo_service_km: 176000 },
  { id: 'v6', organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd', numero_interno: 'M-146', matricula: 'SUA 3146', marca: 'Citroen', modelo: 'Jumper', anio: 2024, categoria: 'basico', modalidad: 'diurna', es_backup: true, base_id: 'b3', altura_cm: 252, capacidad_camilla_articulada: false, estado_operativo: 'disponible', kilometraje: 22400, proximo_service_km: 30000 },
  { id: 'v7', organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd', numero_interno: 'M-220', matricula: 'SUA 4220', marca: 'Ford', modelo: 'Transit', anio: 2022, categoria: 'basico', modalidad: '24x7', es_backup: false, base_id: 'b4', altura_cm: 258, capacidad_camilla_articulada: true, estado_operativo: 'en_servicio', kilometraje: 97320, proximo_service_km: 100000 },
  { id: 'v8', organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd', numero_interno: 'M-177', matricula: 'SUA 4177', marca: 'Volkswagen', modelo: 'Crafter', anio: 2021, categoria: 'pediatrico', modalidad: '24x7', es_backup: false, base_id: 'b4', altura_cm: 261, capacidad_camilla_articulada: true, estado_operativo: 'fuera_de_servicio', kilometraje: 142880, proximo_service_km: 145000 },
  { id: 'v9', organization_id: 'ec63de4e-8ac3-4054-a4c7-8ceae5c76ddd', numero_interno: 'M-154', matricula: 'SUA 2154', marca: 'Iveco', modelo: 'Daily', anio: 2020, categoria: 'AVA', modalidad: '24x7', es_backup: true, base_id: 'b2', altura_cm: 266, capacidad_camilla_articulada: true, estado_operativo: 'disponible', kilometraje: 147650, proximo_service_km: 148000 }
];

export const su_vehiculos_documentos = [
  { id: 'vd1', vehiculo_id: 'v1', tipo: 'VTV', numero: 'VTV-1101', fecha_emision: '2026-01-15', fecha_vencimiento: '2026-09-18', documento_url: 'docs/m101-vtv.pdf' },
  { id: 'vd2', vehiculo_id: 'v1', tipo: 'seguro', numero: 'SEG-1101', fecha_emision: '2026-02-01', fecha_vencimiento: '2027-02-01', documento_url: 'docs/m101-seguro.pdf' },
  { id: 'vd3', vehiculo_id: 'v1', tipo: 'habilitacion_MSP', numero: 'MSP-1101', fecha_emision: '2025-11-01', fecha_vencimiento: '2026-12-20', documento_url: 'docs/m101-msp.pdf' },
  { id: 'vd4', vehiculo_id: 'v1', tipo: 'matafuego', numero: 'MAT-1101', fecha_emision: '2026-03-10', fecha_vencimiento: '2026-10-10', documento_url: 'docs/m101-matafuego.pdf' },
  { id: 'vd5', vehiculo_id: 'v2', tipo: 'VTV', numero: 'VTV-1130', fecha_emision: '2025-08-10', fecha_vencimiento: '2026-08-20', documento_url: 'docs/m130-vtv.pdf' },
  { id: 'vd6', vehiculo_id: 'v2', tipo: 'seguro', numero: 'SEG-1130', fecha_emision: '2026-01-01', fecha_vencimiento: '2026-09-05', documento_url: 'docs/m130-seguro.pdf' },
  { id: 'vd7', vehiculo_id: 'v3', tipo: 'VTV', numero: 'VTV-2205', fecha_emision: '2026-03-02', fecha_vencimiento: '2027-03-02', documento_url: 'docs/m205-vtv.pdf' },
  { id: 'vd8', vehiculo_id: 'v3', tipo: 'habilitacion_MSP', numero: 'MSP-2205', fecha_emision: '2026-04-14', fecha_vencimiento: '2026-09-12', documento_url: 'docs/m205-msp.pdf' },
  { id: 'vd9', vehiculo_id: 'v4', tipo: 'seguro', numero: 'SEG-2112', fecha_emision: '2026-02-22', fecha_vencimiento: '2026-12-01', documento_url: 'docs/m112-seguro.pdf' },
  { id: 'vd10', vehiculo_id: 'v4', tipo: 'matafuego', numero: 'MAT-2112', fecha_emision: '2026-01-09', fecha_vencimiento: '2026-09-01', documento_url: 'docs/m112-matafuego.pdf' },
  { id: 'vd11', vehiculo_id: 'v5', tipo: 'VTV', numero: 'VTV-3098', fecha_emision: '2025-08-28', fecha_vencimiento: '2026-08-28', documento_url: 'docs/m098-vtv.pdf' },
  { id: 'vd12', vehiculo_id: 'v5', tipo: 'seguro', numero: 'SEG-3098', fecha_emision: '2026-03-05', fecha_vencimiento: '2027-03-05', documento_url: 'docs/m098-seguro.pdf' },
  { id: 'vd13', vehiculo_id: 'v6', tipo: 'habilitacion_MSP', numero: 'MSP-3146', fecha_emision: '2026-05-16', fecha_vencimiento: '2027-05-16', documento_url: 'docs/m146-msp.pdf' },
  { id: 'vd14', vehiculo_id: 'v7', tipo: 'VTV', numero: 'VTV-4220', fecha_emision: '2026-02-19', fecha_vencimiento: '2026-11-18', documento_url: 'docs/m220-vtv.pdf' },
  { id: 'vd15', vehiculo_id: 'v7', tipo: 'matafuego', numero: 'MAT-4220', fecha_emision: '2026-03-21', fecha_vencimiento: '2026-09-14', documento_url: 'docs/m220-matafuego.pdf' },
  { id: 'vd16', vehiculo_id: 'v8', tipo: 'VTV', numero: 'VTV-4177', fecha_emision: '2025-10-10', fecha_vencimiento: '2026-10-30', documento_url: 'docs/m177-vtv.pdf' },
  { id: 'vd17', vehiculo_id: 'v8', tipo: 'seguro', numero: 'SEG-4177', fecha_emision: '2026-01-19', fecha_vencimiento: '2026-09-02', documento_url: 'docs/m177-seguro.pdf' },
  { id: 'vd18', vehiculo_id: 'v9', tipo: 'VTV', numero: 'VTV-2154', fecha_emision: '2026-01-30', fecha_vencimiento: '2026-09-27', documento_url: 'docs/m154-vtv.pdf' },
  { id: 'vd19', vehiculo_id: 'v9', tipo: 'seguro', numero: 'SEG-2154', fecha_emision: '2026-02-02', fecha_vencimiento: '2027-02-02', documento_url: 'docs/m154-seguro.pdf' }
];

export const su_vehiculos_mantenimiento = [
  { id: 'vm1', vehiculo_id: 'v2', tipo: 'preventivo', descripcion: 'Cambio de aceite y filtros', fecha: '2026-06-12', kilometraje_al_momento: 146000, costo: 18450, proveedor: 'Taller Ruta 8' },
  { id: 'vm2', vehiculo_id: 'v2', tipo: 'correctivo', descripcion: 'Ajuste de bomba de vacio', fecha: '2026-08-24', kilometraje_al_momento: 154200, costo: 32700, proveedor: 'Diesel Canelones' },
  { id: 'vm3', vehiculo_id: 'v5', tipo: 'correctivo', descripcion: 'Reparacion de sistema electrico de sirena', fecha: '2026-08-26', kilometraje_al_momento: 176280, costo: 21900, proveedor: 'Electromecanica Medica' },
  { id: 'vm4', vehiculo_id: 'v5', tipo: 'preventivo', descripcion: 'Service general y frenos', fecha: '2026-04-18', kilometraje_al_momento: 168000, costo: 40200, proveedor: 'Taller Atlantico' },
  { id: 'vm5', vehiculo_id: 'v7', tipo: 'preventivo', descripcion: 'Cambio de cubiertas delanteras', fecha: '2026-07-02', kilometraje_al_momento: 93800, costo: 29500, proveedor: 'Neumaticos del Este' },
  { id: 'vm6', vehiculo_id: 'v9', tipo: 'correctivo', descripcion: 'Reparacion de aire acondicionado', fecha: '2026-08-05', kilometraje_al_momento: 146900, costo: 15800, proveedor: 'Iveco Service Uy' }
];

export const su_vehiculos_equipamiento_checklist = [
  { id: 'vc1', vehiculo_id: 'v1', item: 'Monitor desfibrilador', material_id: null, obligatorio: true, presente: true, fecha_verificacion: '2026-08-25', verificado_por: 'Lucia Mendez' },
  { id: 'vc2', vehiculo_id: 'v1', item: 'Bolso de via aerea', material_id: null, obligatorio: true, presente: true, fecha_verificacion: '2026-08-25', verificado_por: 'Lucia Mendez' },
  { id: 'vc3', vehiculo_id: 'v2', item: 'Oxigeno portatil', material_id: null, obligatorio: true, presente: false, fecha_verificacion: '2026-08-29', verificado_por: 'Martin Suarez' },
  { id: 'vc4', vehiculo_id: 'v3', item: 'Tabla pediatrica', material_id: null, obligatorio: true, presente: true, fecha_verificacion: '2026-08-28', verificado_por: 'Camila Araujo' },
  { id: 'vc5', vehiculo_id: 'v4', item: 'Bomba de infusion', material_id: null, obligatorio: false, presente: true, fecha_verificacion: '2026-08-27', verificado_por: 'Noelia Pereyra' },
  { id: 'vc6', vehiculo_id: 'v5', item: 'Set trauma', material_id: null, obligatorio: true, presente: false, fecha_verificacion: '2026-08-30', verificado_por: 'Sebastian Alonso' },
  { id: 'vc7', vehiculo_id: 'v6', item: 'Camilla cuchara', material_id: null, obligatorio: true, presente: true, fecha_verificacion: '2026-08-20', verificado_por: 'Adriana Sosa' },
  { id: 'vc8', vehiculo_id: 'v7', item: 'Aspirador portatil', material_id: null, obligatorio: true, presente: true, fecha_verificacion: '2026-08-21', verificado_por: 'Gonzalo Martinez' },
  { id: 'vc9', vehiculo_id: 'v8', item: 'Kit neonatal', material_id: null, obligatorio: true, presente: false, fecha_verificacion: '2026-08-30', verificado_por: 'Valentina Rios' },
  { id: 'vc10', vehiculo_id: 'v9', item: 'Collarines cervicales', material_id: null, obligatorio: true, presente: true, fecha_verificacion: '2026-08-29', verificado_por: 'Paula Bentancur' }
];
