
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AbsenteeismCase, Patient } from '../types';
import { formatDisplayDate, getLatestEvolution, generateLegalCertificatePDF } from '../utils';

interface GlobalHistoryProps {
  cases: AbsenteeismCase[];
  patients: Patient[];
  onNavigateToPatientHistory: (patientId: string) => void;
  onSelectCase: (caseId: string) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  currentPage: number;
  setCurrentPage: (val: number) => void;
}

const GlobalHistory: React.FC<GlobalHistoryProps> = ({ 
  cases, 
  patients, 
  onNavigateToPatientHistory, 
  onSelectCase,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage
}) => {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [isScrolling, setIsScrolling] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 15;

  // Debouncing para búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const allEvents = useMemo(() => {
    return cases.map(c => {
      let patient = patients.find(p => p.id === c.patientId);
      
      if (!patient && c.patientId) {
        const possibleDni = String(c.patientId || '').replace(/\D/g, '');
        patient = patients.find(p => String(p.dni || '').replace(/\D/g, '') === possibleDni);
      }

      const latest = getLatestEvolution(c.evolutions);
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
        originalSuggested,
        totalAuthorized,
        eventDate: admission?.timestamp || latest?.timestamp || '---',
        dateObject: new Date(admission?.timestamp || latest?.timestamp || 0)
      };
    }).sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());
  }, [cases, patients]);

  const filteredEvents = useMemo(() => {
    if (!debouncedSearch.trim()) return allEvents;
    const term = debouncedSearch.toLowerCase().trim();
    
    return allEvents.filter(ev => {
      const patientName = `${ev.patient?.nombre || ''} ${ev.patient?.apellido || ''}`.toLowerCase();
      const company = (ev.patient?.empresa || '').toLowerCase();
      const diagnosis = (ev.latest?.diagnosis || '').toLowerCase();
      const legajo = (ev.patient?.legajo || '').toLowerCase();
      const dni = String(ev.patient?.dni || '').toLowerCase();
      
      return patientName.includes(term) || 
             company.includes(term) || 
             diagnosis.includes(term) || 
             legajo.includes(term) ||
             dni.includes(term);
    });
  }, [allEvents, debouncedSearch]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const currentData = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Resetear página solo si cambia el término de búsqueda de forma manual
  useEffect(() => {
    if (debouncedSearch !== searchTerm && searchTerm === '') {
        setCurrentPage(1);
    }
  }, [searchTerm]);

  const handleScroll = () => {
    if (tableContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
        setIsScrolling(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [currentData]);

  const handleExportExcel = () => {
    const dataToExport = filteredEvents.map(ev => ({
      Fecha: ev.eventDate.substring(0, 10),
      Colaborador: ev.patient ? `${ev.patient.apellido}, ${ev.patient.nombre}` : 'NO IDENTIFICADO',
      DNI: ev.patient?.dni || 'S/D',
      Legajo: ev.patient?.legajo || 'S/L',
      Empresa: ev.patient?.empresa || 'S/E',
      Diagnostico: ev.latest?.diagnosis || 'S/D',
      Estado: ev.status,
      Solicitados: ev.originalSuggested,
      Auditados: ev.totalAuthorized
    }));

    const ws = (window as any).XLSX.utils.json_to_sheet(dataToExport);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Historial_Global");
    (window as any).XLSX.utils.book_export(wb, `Arial_Historial_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDirectPrint = async (e: React.MouseEvent, ev: any) => {
    e.stopPropagation();
    if (!ev.patient || !ev.latest) return;
    setPrintingId(ev.id);
    try {
      await generateLegalCertificatePDF(ev.patient, ev.id, ev.latest, ev.status);
    } catch (err) {
      console.error("Error al imprimir:", err);
    } finally {
      setPrintingId(null);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      'ALTA_MEDICA': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500', labelTop: 'ALTA', labelBottom: 'MÉDICA' },
      'EN_SEGUIMIENTO': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-500', labelTop: 'EN', labelBottom: 'SEGUIMIENTO' },
      'PENDIENTE_AUDITORIA': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-500', labelTop: 'PENDIENTE', labelBottom: 'AUDITORÍA' }
    }[status] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', accent: 'bg-slate-400', labelTop: '---', labelBottom: '---' };

    return (
      <div className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border ${config.bg} ${config.border} shadow-sm relative overflow-hidden min-w-[85px]`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${config.accent}`}></div>
        <span className={`text-[7px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 ${config.text} opacity-60`}>{config.labelTop}</span>
        <span className={`text-[8px] font-black uppercase tracking-tight leading-none ${config.text}`}>{config.labelBottom}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-inter -mx-4 md:mx-0">
      <div className="hidden lg:block bg-white/80 backdrop-blur-xl sticky top-[-2rem] z-40 border-b border-slate-100 shadow-sm px-8 py-6 mb-8">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-10">
          <div className="flex-1">
             <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none mb-1">Historial General</h2>
             <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">Registro consolidado y trazable</p>
          </div>
          <div className="flex-1 relative group">
            <input 
              type="text" 
              placeholder="Buscar por colaborador, DNI o empresa..."
              className="w-full pl-12 pr-6 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-inner text-[11px] font-bold outline-none focus:border-arial-orange transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-arial-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportExcel} className="bg-emerald-600 text-white h-[48px] px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2">Excel</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-0 mt-4 pb-20">
        <div className={`bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden relative table-scroll-container ${isScrolling ? 'has-scroll' : ''}`}>
          <div 
            ref={tableContainerRef}
            onScroll={handleScroll}
            className="overflow-x-auto"
          >
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/30">
                  <th className="px-8 py-6">Fecha</th>
                  <th className="px-8 py-6">Colaborador</th>
                  <th className="px-8 py-6">DNI</th>
                  <th className="px-8 py-6">Empresa</th>
                  <th className="px-8 py-6">Diagnóstico</th>
                  <th className="px-8 py-6 text-center">Estado</th>
                  <th className="px-8 py-6 text-center">Auditado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentData.length === 0 ? (
                  <tr><td colSpan={7} className="py-32 text-center text-slate-300 font-black uppercase italic">Sin registros</td></tr>
                ) : currentData.map((c) => (
                  <tr 
                    key={c.id} 
                    className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                    onClick={() => onSelectCase(c.id)}
                  >
                    <td className="px-8 py-6 text-[10px] font-black text-slate-400">{c.eventDate.substring(0, 10)}</td>
                    <td className="px-8 py-6">
                      <span className="text-[12px] font-black text-arial-orange hover:text-slate-900 transition-colors uppercase tracking-tight">
                        {c.patient ? `${c.patient.apellido}, ${c.patient.nombre}` : 'CARGA MANUAL'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-[10px] font-black text-slate-500">{c.patient?.dni || 'S/D'}</td>
                    <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase truncate max-w-[180px]">{c.patient?.empresa}</td>
                    <td className="px-8 py-6 text-[11px] font-bold text-slate-600 truncate max-w-[200px]">{c.latest?.diagnosis}</td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <StatusBadge status={c.status} />
                        <button 
                          onClick={(e) => handleDirectPrint(e, c)}
                          disabled={printingId === c.id}
                          className="p-2 bg-slate-50 hover:bg-arial-orange hover:text-white text-slate-400 rounded-xl transition-all shadow-sm border border-slate-100 disabled:opacity-50"
                          title="Imprimir Certificado Directamente"
                        >
                          {printingId === c.id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center font-black text-slate-700">{c.totalAuthorized} d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
            <div className="flex justify-center mt-10 gap-2">
                <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-3 bg-white rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:text-arial-orange transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button 
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-11 h-11 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-arial-orange text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-400'}`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
                <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-3 bg-white rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:text-arial-orange transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default GlobalHistory;
