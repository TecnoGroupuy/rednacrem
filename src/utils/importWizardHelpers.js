export const IMPORT_SAMPLE_CSV = [
  'documento,nombre,telefono,email,producto,plan,estado',
  '41234567,Maria Gonzalez,099123567,maria.gonzalez@example.com,Familiar Integral,Mensual,activo',
  '43456789,Juan Perez,094876543,juan.perez@example.com,Básico,Semestral,activo',
  '40123999,Roberto Silva,095444333,roberto.silva@example.com,Corporativo,Anual,baja'
].join('\n');

export const NO_LLAMAR_SAMPLE_CSV = [
  'telefono',
  '099123456',
  '091987654',
  '22223333'
].join('\n');

export const RESULTADOS_SAMPLE_CSV = [
  'telefono,documento,nombre,resultado,observacion,origen,fecha',
  '099123456,41234567,Maria Gonzalez,seguimiento,Contactar en la tarde,CSV,2026-03-19',
  '094876543,43456789,Juan Perez,no_contesta,Sin respuesta,CSV,2026-03-19',
  '095444333,40123999,Roberto Silva,venta,Cliente confirma,CSV,2026-03-19'
].join('\n');

export const DATOS_TRABAJAR_SAMPLE_CSV = [
  'Nombre completo,nombre,apellido,documento,fecha_nacimiento,telefono,celular,correo_electronico,direccion,departamento,origen del dato,pais',
  'Maria Gonzalez,Maria,Gonzalez,41234567,1950-10-20,22223333,099123456,maria.gonzalez@example.com,Montevideo 1234,Montevideo,Facebook,Uruguay',
  'Juan Perez,Juan,Perez,43456789,1962-05-11,45556666,094876543,juan.perez@example.com,Artigas 456,Canelones,WhatsApp,Uruguay'
].join('\n');

export const downloadCsvFile = (csvText, fileName) => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
};

export const formatFileSize = (bytes = 0) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes) || 0;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
};
