export const toEsUyDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-UY', {
    timeZone: 'America/Montevideo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const toEsUyDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' });
};

export const formatDate = (value) => {
  if (!value) return '—';
  const text = String(value).trim();
  if (!text) return '—';
  const datePart = text.split('T')[0].split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return text;
  const [year, month, day] = parts;
  if (!year || !month || !day) return text;
  return `${day}/${month}/${year}`;
};

export const toEsUyTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('es-UY', {
    timeZone: 'America/Montevideo',
    hour: '2-digit',
    minute: '2-digit'
  });
};
