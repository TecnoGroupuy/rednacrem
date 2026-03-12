export const alertsMock = [
  { id: 1, type: 'critical', title: 'Morosidad creciente en Montevideo', detail: 'El tramo de 60 a 90 dias subio 2.3 puntos en la ultima semana.', time: 'Hace 10 min', module: 'Finanzas' },
  { id: 2, type: 'warning', title: 'Seguimientos vencidos sin cierre', detail: 'Hay 18 gestiones pendientes con mas de 48 horas sin actualizacion.', time: 'Hace 28 min', module: 'Comercial' },
  { id: 3, type: 'info', title: 'Nuevo pico de altas en Canelones', detail: 'La cartera familiar aporto 37 nuevas ventas netas en tres dias.', time: 'Hace 1 h', module: 'Cartera' },
  { id: 4, type: 'critical', title: 'Proveedor con SLA fuera de rango', detail: 'Tiempo medio de coordinacion supero las 2 h 40 min.', time: 'Hace 2 h', module: 'Operaciones' }
];

export const directorMetricsMock = [
  { title: 'Cartera activa', value: '12.847', change: 3.2, label: 'vs. mes anterior', trend: 'up', icon: 'Users', bg: 'rgba(37,99,235,0.12)', color: '#2563eb' },
  { title: 'Ingreso mensual', value: '$ 48,5 M', change: 5.1, label: 'variacion neta', trend: 'up', icon: 'DollarSign', bg: 'rgba(15,118,110,0.12)', color: '#0f766e' },
  { title: 'Morosidad', value: '8,4%', change: -1.7, label: 'recuperacion', trend: 'up', icon: 'AlertTriangle', bg: 'rgba(190,18,60,0.1)', color: '#be123c' },
  { title: 'Retencion', value: '68%', change: 4.3, label: 'mejora trimestral', trend: 'up', icon: 'Target', bg: 'rgba(217,119,6,0.12)', color: '#d97706' },
  { title: 'Bajas netas', value: '117', change: -9.5, label: 'menor desgaste', trend: 'up', icon: 'TrendingDown', bg: 'rgba(124,58,237,0.1)', color: '#7c3aed' },
  { title: 'Tiempo de cierre', value: '2,8 dias', change: -6.1, label: 'mas agil', trend: 'up', icon: 'Activity', bg: 'rgba(21,128,61,0.12)', color: '#15803d' }
];

export const portfolioTrendMock = [
  { month: 'Oct', cartera: 11840, altas: 312, bajas: 181, morosidad: 9.6 },
  { month: 'Nov', cartera: 11964, altas: 338, bajas: 176, morosidad: 9.3 },
  { month: 'Dic', cartera: 12052, altas: 351, bajas: 204, morosidad: 9.1 },
  { month: 'Ene', cartera: 12196, altas: 388, bajas: 172, morosidad: 8.8 },
  { month: 'Feb', cartera: 12405, altas: 402, bajas: 165, morosidad: 8.5 },
  { month: 'Mar', cartera: 12847, altas: 436, bajas: 143, morosidad: 8.4 }
];

export const productSplitMock = [
  { name: 'Familiar Integral', value: 42, color: '#0f766e' },
  { name: 'Basico', value: 24, color: '#2563eb' },
  { name: 'Corporativo', value: 18, color: '#d97706' },
  { name: 'Individual', value: 16, color: '#be123c' }
];

export const teamRowsMock = [
  { name: 'Maria Gonzalez', sales: 124, conversion: '32%', health: 'Excelente', badge: 'success' },
  { name: 'Carlos Lopez', sales: 108, conversion: '28%', health: 'Solido', badge: 'info' },
  { name: 'Ana Silva', sales: 91, conversion: '24%', health: 'Atencion', badge: 'warning' }
];

export const contactsDirectoryMock = [
  { name: 'Nora Perez', phone: '099 421 330', city: 'Montevideo', status: 'Pendiente', last: 'Hoy, 09:40' },
  { name: 'Ruben Ferreira', phone: '099 410 220', city: 'Salto', status: 'Nuevo', last: 'Ayer, 18:20' },
  { name: 'Alicia Costa', phone: '098 117 500', city: 'Canelones', status: 'Gestionado', last: 'Hace 2 dias' },
  { name: 'Jorge Acosta', phone: '094 335 781', city: 'Paysandu', status: 'Pendiente', last: 'Hace 3 dias' },
  { name: 'Susana Perez', phone: '099 221 661', city: 'Maldonado', status: 'Gestionado', last: 'Hace 4 dias' }
];
