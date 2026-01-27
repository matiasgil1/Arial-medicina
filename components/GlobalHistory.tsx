
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
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const itemsPerPage = 15;

  const allEvents = useMemo(() => {
    return cases.map(c => {
      const patient = patients.find(p => p.id === c.patientId);
      const latest = getLatestEvolution(c.evolutions);
      
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
      const legajo = (ev.patient?.legajo || '').toLowerCase();
      
      return patientName.includes(term) || 
             company.includes(term) || 
             diagnosis.includes(term) || 
             legajo.includes(term);
    });
  }, [allEvents, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const currentData = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // LÓGICA DE EXPORTACIÓN EXCEL
  const handleExportExcel = () => {
    const dataToExport = filteredEvents.map(ev => ({
      Fecha: ev.eventDate.substring(0, 10),
      Colaborador: ev.patient ? `${ev.patient.apellido}, ${ev.patient.nombre}` : '---',
      Legajo: ev.patient?.legajo || 'S/L',
      Empresa: ev.patient?.empresa || 'S/E',
      Diagnostico: ev.latest?.diagnosis || 'S/D',
      Estado: ev.status,
      Dias_Solicitados: ev.originalSuggested,
      Dias_Auditados: ev.totalAuthorized
    }));

    const ws = (window as any).XLSX.utils.json_to_sheet(dataToExport);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Historial_Global");
    (window as any).XLSX.writeFile(wb, `Arial_Historial_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // LÓGICA DE EXPORTACIÓN PDF (TABLA GENERAL)
  const handleExportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text("Arial - Historial Global de Auditoría", 14, 20);
    doc.setFontSize(10);
    doc.text(`Reporte generado el ${new Date().toLocaleString()}`, 14, 28);

    const tableData = filteredEvents.map(ev => [
      ev.eventDate.substring(0, 10),
      ev.patient ? `${ev.patient.apellido}, ${ev.patient.nombre}` : '---',
      ev.patient?.legajo || 'S/L',
      ev.patient?.empresa || 'S/E',
      ev.latest?.diagnosis || 'S/D',
      ev.status.replace('_', ' '),
      `${ev.originalSuggested} / ${ev.totalAuthorized}`
    ]);

    (doc as any).autoTable({
      startY: 35,
      head: [['Fecha', 'Colaborador', 'Legajo', 'Empresa', 'Diagnóstico', 'Estado', 'Días (S/A)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [188, 75, 19] },
      styles: { fontSize: 8 }
    });

    doc.save(`Arial_Reporte_Global_${Date.now()}.pdf`);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      'ALTA_MEDICA': { 
        bg: 'bg-emerald-50', 
        text: 'text-emerald-700', 
        border: 'border-emerald-200',
        accent: 'bg-emerald-500',
        labelTop: 'ALTA',
        labelBottom: 'MÉDICA'
      },
      'EN_SEGUIMIENTO': { 
        bg: 'bg-orange-50', 
        text: 'text-orange-700', 
        border: 'border-orange-200',
        accent: 'bg-orange-500',
        labelTop: 'EN',
        labelBottom: 'SEGUIMIENTO'
      },
      'PENDIENTE_AUDITORIA': { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        accent: 'bg-blue-500',
        labelTop: 'PENDIENTE',
        labelBottom: 'AUDITORÍA'
      }
    }[status] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', accent: 'bg-slate-400', labelTop: '---', labelBottom: '---' };

    return (
      <div className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border ${config.bg} ${config.border} shadow-sm relative overflow-hidden group min-w-[85px]`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${config.accent}`}></div>
        <span className={`text-[7px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 ${config.text} opacity-60`}>{config.labelTop}</span>
        <span className={`text-[8px] font-black uppercase tracking-tight leading-none ${config.text}`}>{config.labelBottom}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-inter -mx-4 md:mx-0">
      {/* HEADER FIJO (DESKTOP) */}
      <div className="hidden lg:block bg-white/80 backdrop-blur-xl sticky top-[-2rem] z-40 border-b border-slate-100 shadow-sm px-8 py-6 mb-8">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-10">
          <div className="flex-1">
             <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none mb-1">Historial Global</h2>
             <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">Registro consolidado de eventos</p>
          </div>
          
          <div className="flex-1 relative group">
            <input 
              type="text" 
              placeholder="Buscar por colaborador, legajo, empresa..."
              className="w-full pl-12 pr-6 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-inner text-[11px] font-bold outline-none focus:border-arial-orange transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-arial-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <div className="flex gap-2">
            <button onClick={handleExportExcel} className="bg-emerald-600 text-white h-[48px] px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Excel
            </button>
            <button onClick={handleExportPDF} className="bg-slate-900 text-white h-[48px] px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* FAB (MOBILE) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        <button onClick={handleExportExcel} className="w-12 h-12 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform border-4 border-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </button>
        <button onClick={() => setIsMobilePanelOpen(true)} className="w-14 h-14 bg-arial-orange text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform ring-4 ring-orange-500/20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>
      </div>

      {/* PANEL BÚSQUEDA MÓVIL */}
      {isMobilePanelOpen && (
        <div className="lg:hidden fixed inset-0 z-[120] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobilePanelOpen(false)}></div>
          <div className="relative bg-white rounded-t-[2.5rem] p-8 space-y-6 animate-in slide-in-from-bottom-full duration-500">
             <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Buscar en Historial</h3>
                <button onClick={() => setIsMobilePanelOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <input 
              autoFocus
              type="text" 
              placeholder="DNI, Nombre, Empresa..."
              className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm outline-none focus:border-arial-orange transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button onClick={() => setIsMobilePanelOpen(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest">Ver Resultados</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-0 mt-4 pb-20">
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/30">
                  <th className="px-8 py-6">Fecha</th>
                  <th className="px-8 py-6">Colaborador</th>
                  <th className="px-8 py-6">Legajo</th>
                  <th className="px-8 py-6">Empresa</th>
                  <th className="px-8 py-6">Diagnóstico</th>
                  <th className="px-8 py-6 text-center">Estado</th>
                  <th className="px-8 py-6 text-center">Días (S / A)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentData.length === 0 ? (
                  <tr><td colSpan={7} className="py-32 text-center text-slate-300 font-black uppercase italic">Sin registros que coincidan</td></tr>
                ) : currentData.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6 text-[10px] font-black text-slate-400 whitespace-nowrap">{c.eventDate.substring(0, 10)}</td>
                    <td className="px-8 py-6">
                      <button onClick={() => onNavigateToPatientHistory(c.patientId)} className="text-[12px] font-black text-arial-orange hover:text-slate-900 transition-colors text-left uppercase tracking-tight">
                        {c.patient ? `${c.patient.apellido}, ${c.patient.nombre}` : '---'}
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <button onClick={() => setSelectedCaseForModal(c)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 hover:bg-slate-900 hover:text-white transition-all uppercase">
                        {c.patient?.legajo || 'S/L'}
                      </button>
                    </td>
                    <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[180px]">{c.patient?.empresa}</td>
                    <td className="px-8 py-6 text-[11px] font-bold text-slate-600 truncate max-w-[200px]">{c.latest?.diagnosis}</td>
                    <td className="px-8 py-6 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[12px] font-black text-slate-300" title="Solicitado">{c.originalSuggested}</span>
                        <span className="text-slate-100">/</span>
                        <span className="text-[12px] font-black text-arial-orange" title="Auditado">{c.totalAuthorized}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase disabled:opacity-30 active:scale-95 transition-all"
                >
                  Anterior
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase disabled:opacity-30 active:scale-95 transition-all shadow-lg"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE TRAZABILIDAD (Mantenido igual) */}
      {selectedCaseForModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Detalle del Evento</p>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                  {selectedCaseForModal.patient?.apellido}, {selectedCaseForModal.patient?.nombre}
                </h3>
              </div>
              <button onClick={() => setSelectedCaseForModal(null)} className="p-2 text-slate-300 hover:text-slate-800 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-10 space-y-8 overflow-y-auto scrollbar-hide flex-1">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Evoluciones Médicas</h4>
                <div className="space-y-3">
                  {selectedCaseForModal.evolutions.filter((ev: any) => !ev.user.includes('Admisión')).map((ev: any) => (
                    <div key={ev.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-arial-orange/20"></div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-[11px] font-black text-slate-800 uppercase">{ev.user}</p>
                          <p className="text-[9px] font-bold text-slate-400">{ev.timestamp}</p>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-xl border border-slate-100">
                          <p className="text-[12px] font-black text-arial-orange leading-none">{ev.daysAuthorized} Días</p>
                          <p className="text-[7px] font-bold text-slate-300 uppercase mt-1">Auditado</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium italic leading-relaxed border-t border-slate-100 pt-3">{ev.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-10 border-t border-slate-50 bg-slate-50/30 flex justify-end gap-3">
                <button onClick={() => setSelectedCaseForModal(null)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Cerrar Detalle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalHistory;
