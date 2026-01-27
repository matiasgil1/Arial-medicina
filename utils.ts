
export const calculateDaysRemaining = (endDateStr: string | undefined): number => {
  if (!endDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(endDateStr + 'T00:00:00');
  
  if (isNaN(endDate.getTime())) return 0;
  
  const diffTime = endDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getLatestEvolution = (evolutions: any[]) => {
  if (!evolutions || evolutions.length === 0) return null;
  const sorted = [...evolutions].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });
  return sorted[0] || null;
};

/**
 * Calcula el fin de un bloque de reposo. 
 * Si empieza el 20 y es 1 día, el fin es el mismo 20.
 */
export const addDaysToDate = (startDateStr: string, days: number): string => {
  if (!startDateStr || days < 1) return startDateStr;
  const date = new Date(startDateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + (days - 1));
  return date.toISOString().split('T')[0];
};

/**
 * Calcula el día de inicio del siguiente periodo (día posterior al fin)
 */
export const getNextStartDate = (endDateStr: string): string => {
  const date = new Date(endDateStr + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
};

export const getReturnDate = (endDateStr: string): string => {
  const date = new Date(endDateStr + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
};

export const formatDisplayDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '---';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '---';
  
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Convierte un número a texto en español (Especializado para días de licencia)
 */
export const numberToSpanishText = (n: number): string => {
  const units = ['CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
  const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  
  if (n <= 20) return units[n];
  if (n < 30) return n === 20 ? 'VEINTE' : `VEINTI${units[n % 10]}`;
  if (n < 100) {
    const unitPart = n % 10;
    return `${tens[Math.floor(n / 10)]}${unitPart > 0 ? ` Y ${units[unitPart]}` : ''}`;
  }
  return n.toString(); // Fallback para números muy grandes
};
