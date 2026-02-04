
export const calculateDaysRemaining = (endDateStr: string | undefined): number => {
  if (!endDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(endDateStr + 'T00:00:00');
  
  if (isNaN(endDate.getTime())) return 0;
  
  const diffTime = endDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const diffDaysBetweenDates = (startDateStr: string, endDateStr: string): number => {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
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

export const generateUniqueId = (prefix: string = 'ID'): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

export const addDaysToDate = (startDateStr: string, days: number): string => {
  if (!startDateStr || days < 1) return startDateStr;
  const date = new Date(startDateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + (days - 1));
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

export const generateLegalCertificatePDF = async (patient: any, caseId: string, ev: any, caseStatus: string) => {
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  
  const isAdmision = ev.user.includes('Admisión');
  const isAlta = ev.notes.toUpperCase().includes('ALTA') || caseStatus === 'ALTA_MEDICA';
  const hasLicense = (ev.daysAuthorized || ev.daysSuggested) > 0;
  
  const fechaAtencion = ev.timestamp.substring(0, 10).split('-').reverse().join('/');
  const fechaReintegro = isAlta ? formatDisplayDate(getReturnDate(ev.endDate)) : '--/--/----';
  const proximoControl = !isAlta ? formatDisplayDate(ev.endDate) : '--/--/----';
  const diasNum = isAdmision ? ev.daysSuggested : ev.daysAuthorized;
  const labelDias = isAdmision ? 'DÍAS SOLICITADOS' : 'DÍAS AUDITADOS';

  const drawPage = (copyLabel: string) => {
    const m = 10;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(m, m, 190, 128.5); 
    
    doc.setFillColor(188, 75, 19); 
    doc.rect(m+5, m+5, 12, 12, 'F');
    doc.setTextColor(255);
    doc.setFontSize(22);
    doc.text('A', m+7, m+14);
    doc.setTextColor(188, 75, 19);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ARIAL', m+20, m+13);
    
    doc.setDrawColor(0);
    doc.rect(80, m+5, 70, 10);
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('CONTROL MÉDICO LABORAL', 115, m+11.5, { align: 'center' });
    
    doc.rect(155, m+5, 35, 10);
    doc.text(`ID ${caseId.split('-').pop()}`, 172.5, m+11.5, { align: 'center' });

    let cy = m + 17;
    const drawBox = (label: string, value: string, x: number, w: number, h: number = 10) => {
      doc.setDrawColor(0);
      doc.rect(x, cy, w, h);
      doc.setFontSize(4.5);
      doc.setTextColor(120);
      doc.setFont('helvetica', 'bold');
      doc.text(label.toUpperCase(), x + 2, cy + 3.5);
      doc.setFontSize(9.5);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value || '').toUpperCase(), x + 2, cy + 8.5);
    };

    drawBox('EMPRESA', patient.empresa, m+5, 85);
    drawBox('EMPLEADO', `${patient.apellido}, ${patient.nombre}`, m+95, 85);
    
    cy += 12;
    drawBox('DNI Nº', patient.dni, m+5, 40);
    drawBox('OCUPACIÓN / LEGAJO', patient.legajo || 'S/D', m+50, 45);
    drawBox('FECHA ATENCIÓN', fechaAtencion, m+100, 45);
    drawBox('HORA', ev.timestamp.substring(11, 16), m+150, 30);

    cy += 15;
    doc.rect(m+5, cy, 90, 20);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('INASISTENCIA JUSTIFICADA:', m+10, cy + 7);
    doc.rect(m+50, cy + 3, 6, 6);
    if(hasLicense) doc.text('X', m+51.5, cy + 7.5);
    
    doc.text('APTO REINTEGRO:', m+10, cy + 15);
    doc.rect(m+50, cy + 11, 6, 6);
    if(isAlta) doc.text('X', m+51.5, cy + 15.5);
    
    doc.rect(m+100, cy, 85, 20);
    doc.setFontSize(4.5);
    doc.setTextColor(120);
    doc.text('FECHA INICIO', m+102, cy + 3.5);
    doc.text('FECHA FIN', m+145, cy + 3.5);
    doc.text(labelDias, m+102, cy + 13.5);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(ev.startDate.split('-').reverse().join('/'), m+102, cy + 8.5);
    doc.text(ev.endDate.split('-').reverse().join('/'), m+145, cy + 8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${diasNum} DÍAS`, m+102, cy + 18.5);

    cy += 25;
    drawBox('DIAGNÓSTICO', ev.diagnosis, m+5, 85, 12);
    drawBox('PRÓXIMO CONTROL', proximoControl, m+95, 42, 12);
    drawBox('FECHA DE REINTEGRO', fechaReintegro, m+142, 38, 12);

    cy += 17;
    const obsHeight = 20;
    doc.rect(m+5, cy, 180, obsHeight);
    doc.setFontSize(4.5);
    doc.setTextColor(120);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES', m+7, cy + 3.5);
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(ev.notes || 'S/O', 170);
    doc.text(splitNotes, m+7, cy + 9);

    const signY = cy + obsHeight + 10; 
    doc.setDrawColor(220);
    doc.line(140, signY - 5, 185, signY - 5);
    doc.setFontSize(9);
    doc.setFont('courier', 'bolditalic');
    doc.setTextColor(20, 40, 100); 
    doc.text(ev.user, 162.5, signY - 7, { align: 'center' });
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150);
    doc.text('FIRMA Y SELLO DIGITAL - AUDITORÍA MÉDICA ARIAL', 162.5, signY - 2, { align: 'center' });

    doc.setTextColor(200);
    doc.setFontSize(7);
    doc.text(copyLabel, m+5, 137);
  };

  drawPage('ORIGINAL EMPRESA');
  doc.addPage();
  drawPage('DUPLICADO ARIAL');
  doc.save(`Certificado_Arial_${patient.apellido}.pdf`);
};

export const generateFullClinicalHistoryPDF = async (patient: any, cases: any[]) => {
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF();
  
  const titleColor = [188, 75, 19];
  const secondaryColor = [30, 41, 59];

  // Portada / Header
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ARIAL MEDICINA LABORAL', 15, 20);
  doc.setFontSize(10);
  doc.text('HISTORIA CLÍNICA INTEGRAL DE AUSENTISMO', 15, 30);
  
  let y = 50;
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text(`${patient.apellido}, ${patient.nombre}`, 15, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`DNI: ${patient.dni} | Legajo: ${patient.legajo} | Empresa: ${patient.empresa}`, 15, y + 6);
  y += 20;

  cases.forEach((c, caseIdx) => {
    if (y > 250) { doc.addPage(); y = 20; }
    
    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, 180, 10, 'F');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`EPISODIO #${cases.length - caseIdx} - ID: ${c.id.split('-').pop()}`, 20, y + 7);
    y += 15;

    c.evolutions.forEach((ev: any, evIdx: any) => {
      if (y > 250) { doc.addPage(); y = 20; }
      
      const isAdm = ev.user.includes('Admisión');
      const evLabel = isAdm ? 'ADMISIÓN' : evIdx === c.evolutions.length - 1 && c.status === 'ALTA_MEDICA' ? 'ALTA MÉDICA' : `CONTROL ${evIdx}`;
      const accentColor = isAdm ? [37, 99, 235] : evLabel === 'ALTA MÉDICA' ? [5, 150, 105] : [188, 75, 19];

      doc.setDrawColor(220);
      doc.line(20, y, 20, y + 25);
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(1);
      doc.line(15, y, 15, y + 25);
      doc.setLineWidth(0.2);

      doc.setFontSize(8);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(evLabel, 20, y + 5);
      doc.setTextColor(100);
      doc.text(ev.timestamp, 195, y + 5, { align: 'right' });

      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(`${ev.cie10} - ${ev.diagnosis}`, 20, y + 10);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const dias = isAdm ? ev.daysSuggested : ev.daysAuthorized;
      const labelDias = isAdm ? 'Días Solicitados' : 'Días Auditados';
      doc.text(`${labelDias}: ${dias} d | Periodo: ${formatDisplayDate(ev.startDate)} al ${formatDisplayDate(ev.endDate)}`, 20, y + 15);
      
      const notes = doc.splitTextToSize(`Nota: ${ev.notes || 'S/O'}`, 170);
      doc.text(notes, 20, y + 20);
      
      y += 12 + (notes.length * 4);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150);
      doc.text(`Responsable: ${ev.user}`, 20, y);
      y += 15;
    });
    y += 10;
  });

  doc.save(`HC_Completa_${patient.apellido}_${patient.nombre}.pdf`);
};
