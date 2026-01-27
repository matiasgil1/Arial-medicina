
import React, { useState, useMemo, useEffect } from 'react';
import { AbsenteeismCase, Patient } from '../types';
import { formatDisplayDate, getLatestEvolution, getReturnDate } from '../utils';

interface GlobalHistoryProps {
  cases: AbsenteeismCase[];
  patients: Patient[];
  onNavigateToPatientHistory: (patientId: string) => void;
}

const GlobalHistory: React.FC<GlobalHistoryProps> = ({ cases, patients, onNavigateToPatientHistory }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCaseForModal, setSelectedCaseForModal] = useState<any | null>(null);
  const itemsPerPage = 10;

  const allEvents = useMemo(() => {
    return cases.map(c => {
      const patient = patients.find(p => p.id === c.patientId);
      const latest = getLatestEvolution(c.evolutions);
      
      // Encontrar la fecha de fin más lejana de todas las evoluciones
      const maxEndDate = c.evolutions.reduce((max, ev) => {
        if (!ev.endDate) return max;
        return ev.endDate > max ? ev.endDate : max;
      }, '0000-00-00');

      const admission = c.evolutions.find(ev => ev.user.includes('Admisión'));
      const originalSuggested = admission ? admission.daysSuggested : (c.evolutions[0]?.daysSuggested || 0);
      
      const totalAuthorized = c.evolutions.reduce((acc, ev) => {
        if (!ev.user.includes('Admisión')) {
          return acc + (ev.daysAuthorized || 0);
        }
        return acc;
      }, 0);
      
      return {
        ...c,
        patient,
        latest,
        maxEndDate,
        originalSuggested,
        totalAuthorized,
        eventDate: admission?.timestamp || latest?.timestamp || '---',
        dateObject: new Date(admission?.timestamp || latest?.timestamp || 0)
      };
    }).sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());
  }, [cases, patients]);

  const filteredEvents = useMemo(() => {
    if (!searchTerm.trim()) return allEvents;
    const term = searchTerm.toLowerCase().trim();
    
    return allEvents.filter(ev => {
      const patientName = `${ev.patient?.nombre} ${ev.patient?.apellido}`.toLowerCase();
      const company = (ev.patient?.empresa || '').toLowerCase();
      const diagnosis = (ev.latest?.diagnosis || '').toLowerCase();
      const cie10 = (ev.latest?.cie10 || '').toLowerCase();
      const legajo = (ev.patient?.legajo || '').toLowerCase();
      
      return patientName.includes(term) || 
             company.includes(term) || 
             diagnosis.includes(term) || 
             cie10.includes(term) || 
             legajo.includes(term);
    });
  }, [allEvents, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const currentData = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const printOfficialCertificate = (caseData: any) => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const p = caseData.patient;
    const latest = caseData.latest;
    // Usamos la fecha máxima de fin encontrada en el memo allEvents
    const finalEndDate = caseData.maxEndDate;
    const today = new Date().toLocaleDateString('es-AR');

    // Encabezado Corporativo
    doc.setFillColor(188, 75, 19);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("ARIAL", 15, 22);
    doc.setFontSize(8);
    doc.text("MEDICINA LABORAL & AUDITORÍA MÉDICA", 15, 30);
    doc.setFontSize(14);
    doc.text("REPORTE DE AUDITORÍA CLÍNICA", 200, 25, { align: 'right' });
    
    // Datos del Colaborador
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL COLABORADOR", 15, 55);
    doc.roundedRect(15, 58, 180, 35, 3, 3);
    doc.setFont("helvetica", "normal");
    doc.text(`Apellido y Nombre: ${p.apellido}, ${p.nombre}`, 20, 68);
    doc.text(`DNI: ${p.dni} | Legajo: ${p.legajo} | Edad: ${p.edad} años`, 20, 78);
    doc.text(`Empresa: ${p.empresa}`, 20, 88);

    // Trazabilidad de Intervenciones
    doc.setFont("helvetica", "bold");
    doc.text("TRAZABILIDAD DE INTERVENCIONES MÉDICAS", 15, 110);
    
    const medicalEvos = [...caseData.evolutions]
      .filter((ev: any) => !ev.user.includes('Admisión'))
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const tableData = medicalEvos.map((ev: any) => [
      formatDisplayDate(ev.timestamp.substring(0, 10)),
      ev.user,
      ev.daysAuthorized + " d",
      ev.notes
    ]);

    doc.autoTable({
      startY: 115,
      head: [['Fecha', 'Médico Auditor', 'Días', 'Observaciones / Evolución']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [188, 75, 19], fontSize: 8 },
      bodyStyles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 15 },
        3: { cellWidth: 'auto' } // Columna elástica para evitar desbordamiento
      },
      tableWidth: 'auto',
      margin: { left: 15, right: 15 }
    });

    // Resolución Final
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.text("ESTADO FINAL DEL EVENTO", 15, finalY);
    doc.roundedRect(15, finalY + 3, 180, 25, 3, 3);
    doc.setFont("helvetica", "normal");
    doc.text(`Diagnóstico Final: ${latest?.diagnosis || 'S/D'} (${latest?.cie10 || '---'})`, 20, finalY + 12);
    doc.text(`Total Días Auditados: ${caseData.totalAuthorized} días.`, 20, finalY + 20);

    // IMPORTANTE: Cálculo de reincorporación basado en el final real de la historia clínica
    const returnDateFormatted = formatDisplayDate(getReturnDate(finalEndDate));

    if (caseData.status === 'ALTA_MEDICA') {
      doc.setTextColor(16, 185, 129); // Verde para el alta
      doc.setFont("helvetica", "bold");
      doc.text("ALTA LABORAL OTORGADA - REINCORPORACIÓN: " + returnDateFormatted, 15, finalY + 40);
    } else {
      doc.setTextColor(188, 75, 19); // Naranja para seguimiento
      doc.setFont("helvetica", "bold");
      doc.text("EVENTO EN SEGUIMIENTO - PRÓXIMO CONTROL: " + formatDisplayDate(finalEndDate), 15, finalY + 40);
    }

    // Espacio para Firma
    const footerY = 250;
    doc.setDrawColor(203, 213, 225);
    doc.line(120, footerY, 190, footerY);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("FIRMA Y SELLO MÉDICO AUDITOR", 155, footerY + 5, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.text("Arial Medicina Laboral", 155, footerY + 10, { align: 'center' });
    
    doc.setFontSize(7);
    doc.text(`Documento generado el ${today} - Copia Fiel de Historia Clínica Digital`, 15, 285);

    doc.save(`Reporte_Arial_${p.apellido}_${caseData.id}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Historial Global</h2>
          <p className="text-slate-500 font-medium">Sumatoria total de días auditados por caso</p>
        </div>
        
        <div className="relative w-full md:w-96 group">
          <input 
            type="text" 
            placeholder="Buscar..."
            className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-100 bg-white shadow-xl text-xs font-bold outline-none focus:border-arial-orange transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-5 py-5">Fecha</th>
                <th className="px-5 py-5">Colaborador</th>
                <th className="px-5 py-5">Legajo</th>
                <th className="px-5 py-5">Empresa</th>
                <th className="px-5 py-5">Diagnóstico</th>
                <th className="px-5 py-5 text-center">Estado</th>
                <th className="px-5 py-5 text-center">Días (S / A)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentData.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/30 transition-all group">
                  <td className="px-5 py-5 text-[11px] font-bold text-slate-500 whitespace-nowrap">{c.eventDate.substring(0, 10)}</td>
                  <td className="px-5 py-5">
                    <button onClick={() => onNavigateToPatientHistory(c.patientId)} className="text-[13px] font-black text-arial-orange hover:underline text-left truncate max-w-[160px] block">
                      {c.patient ? `${c.patient.nombre} ${c.patient.apellido}` : '---'}
                    </button>
                  </td>
                  <td className="px-5 py-5">
                    <button onClick={() => setSelectedCaseForModal(c)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 hover:bg-slate-900 hover:text-white transition-all">
                      {c.patient?.legajo || 'S/L'}
                    </button>
                  </td>
                  <td className="px-5 py-5 text-[10px] font-black text-slate-400 uppercase">{c.patient?.empresa}</td>
                  <td className="px-5 py-5 text-[11px] font-bold text-slate-700 truncate max-w-[180px]">{c.latest?.diagnosis}</td>
                  <td className="px-5 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${c.status === 'ALTA_MEDICA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[11px] font-black text-slate-300" title="Sugerido (Certificado Externo)">{c.originalSuggested}</span>
                      <span className="text-slate-200">/</span>
                      <span className="text-[11px] font-black text-arial-orange" title="Auditado Total (Sumatoria)">{c.totalAuthorized}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCaseForModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Historia del Evento</p>
                <h3 className="text-xl font-black text-slate-800 uppercase">Paciente: {selectedCaseForModal.patient?.apellido}, {selectedCaseForModal.patient?.nombre}</h3>
                <p className="text-[10px] font-bold text-arial-orange uppercase mt-1">LEG: {selectedCaseForModal.patient?.legajo} | Total Auditado: {selectedCaseForModal.totalAuthorized} Días</p>
              </div>
              <button onClick={() => setSelectedCaseForModal(null)} className="p-2 text-slate-300 hover:text-slate-800 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-10 space-y-8 overflow-y-auto">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Trazabilidad de Intervenciones Médicas</h4>
                <div className="space-y-3">
                  {selectedCaseForModal.evolutions.filter((ev: any) => !ev.user.includes('Admisión')).map((ev: any) => (
                    <div key={ev.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[11px] font-black text-slate-800">{ev.user}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{ev.timestamp}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-black text-arial-orange">{ev.daysAuthorized} Días</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium italic mt-2 border-t border-slate-100 pt-2">{ev.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-10 border-t border-slate-50 flex justify-end gap-4">
                <button onClick={() => printOfficialCertificate(selectedCaseForModal)} className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all">Generar Reporte Completo</button>
                <button onClick={() => setSelectedCaseForModal(null)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalHistory;
