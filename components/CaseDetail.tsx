
import React, { useState, useRef, useMemo } from 'react';
import { AbsenteeismCase, Patient, EvolutionEntry, User } from '../types';
import { getLatestEvolution, formatDisplayDate, addDaysToDate, getReturnDate, getNextStartDate } from '../utils';

interface CaseDetailProps {
  caseData: AbsenteeismCase;
  patient: Patient;
  currentUser: User;
  onAddEvolution: (caseId: string, evolution: EvolutionEntry, newStatus?: string) => void;
  onDeleteCase: (id: string) => void;
  onBack: () => void;
  isReadOnly?: boolean; 
}

const CaseDetail: React.FC<CaseDetailProps> = ({ caseData, patient, currentUser, onAddEvolution, onBack, isReadOnly = false }) => {
  const latest = getLatestEvolution(caseData.evolutions);
  const isDoctor = currentUser.role === 'médico' || currentUser.role === 'admin';
  const reportRef = useRef<HTMLDivElement>(null);
  
  const needsAction = !isReadOnly && (caseData.status === 'PENDIENTE_AUDITORIA' || caseData.status === 'EN_SEGUIMIENTO');

  const auditStartDate = useMemo(() => {
    if (!latest) return new Date().toISOString().split('T')[0];
    
    if (caseData.status === 'PENDIENTE_AUDITORIA') {
      return latest.startDate;
    }
    
    return getNextStartDate(latest.endDate);
  }, [latest, caseData.status]);

  const [decisionData, setDecisionData] = useState({
    daysAuthorized: latest?.daysSuggested || 1,
    notes: '',
    diagnosis: latest?.diagnosis || '',
    cie10: latest?.cie10 || ''
  });

  const previewEndDate = useMemo(() => {
    return addDaysToDate(auditStartDate, decisionData.daysAuthorized);
  }, [auditStartDate, decisionData.daysAuthorized]);

  const previewReturnDate = useMemo(() => {
    return getReturnDate(previewEndDate);
  }, [previewEndDate]);

  const handleDecision = (action: 'CONTROL' | 'ALTA') => {
    const newStatus = action === 'ALTA' ? 'ALTA_MEDICA' : 'EN_SEGUIMIENTO';
    
    const newEvolution: EvolutionEntry = {
      id: `ev-act-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: `Dr. ${currentUser.fullName}`,
      diagnosis: decisionData.diagnosis,
      cie10: decisionData.cie10 || latest?.cie10 || 'S/D',
      daysSuggested: latest?.daysSuggested || 0,
      daysAuthorized: decisionData.daysAuthorized,
      startDate: auditStartDate,
      endDate: previewEndDate,
      notes: action === 'ALTA' 
        ? `[ALTA MÉDICA] Paciente apto. Finaliza reposo el ${formatDisplayDate(previewEndDate)}. Retorno laboral: ${formatDisplayDate(previewReturnDate)}. ${decisionData.notes}`
        : `[CONTROL MÉDICO] Se valida reposo por ${decisionData.daysAuthorized} días adicionales. ${decisionData.notes}`
    };

    onAddEvolution(caseData.id, newEvolution, newStatus);
    onBack();
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 10,
      filename: `Reporte_${patient.apellido}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    (window as any).html2pdf().set(opt).from(reportRef.current).save();
  };

  const handleWhatsApp = () => {
    const rawPhone = patient.telefono ? String(patient.telefono) : '';
    const phone = rawPhone.replace(/\D/g, '');
    if (phone) {
      const message = `Hola! ${patient.nombre} ${patient.apellido}, nos comunicamos de Arial - Medicina Laboral por tu seguimiento`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const groupedEpisodes = useMemo(() => {
    const sorted = [...caseData.evolutions].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const episodes: EvolutionEntry[][] = [];
    let currentEpisode: EvolutionEntry[] = [];
    
    sorted.forEach((ev) => {
      if (ev.user.includes('Admisión')) {
        if (currentEpisode.length > 0) {
          episodes.push(currentEpisode);
        }
        currentEpisode = [ev];
      } else {
        currentEpisode.push(ev);
      }
    });
    
    if (currentEpisode.length > 0) {
      episodes.push(currentEpisode);
    }
    
    return episodes.reverse();
  }, [caseData.evolutions]);

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <button onClick={onBack} className="w-full md:w-auto text-slate-400 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-slate-600 bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-sm transition-all">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Cerrar Ficha
        </button>
        <button onClick={handlePrint} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 rounded-xl text-[9px] font-black uppercase text-white hover:bg-arial-orange transition-all shadow-lg active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Imprimir Historia
        </button>
      </div>

      <div ref={reportRef} className="print-container">
        <div className="hidden pdf-only mb-10 border-b-4 border-arial-orange pb-8">
            <h1 className="text-5xl font-black text-arial-orange">ARIAL</h1>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría de Ausentismo</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* Tarjeta de paciente adaptada */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-xl p-6 md:p-8 space-y-6 md:space-y-8 sticky top-4">
              <div className="flex flex-row md:flex-col items-center gap-4 md:gap-4 text-left md:text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-slate-900 text-white flex items-center justify-center text-2xl md:text-3xl font-black shadow-xl shrink-0">
                  {patient.nombre?.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-lg md:text-xl leading-tight truncate max-w-[180px] md:max-w-full">{patient.nombre} {patient.apellido}</h4>
                  <p className="text-[9px] md:text-[10px] font-black text-arial-orange uppercase tracking-[0.15em] md:tracking-[0.2em] mt-1">{patient.empresa}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6 md:pt-8">
                <div className="space-y-0.5"><p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase">DNI</p><p className="text-xs font-black text-slate-700">{patient.dni}</p></div>
                <div className="space-y-0.5"><p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase">Edad</p><p className="text-xs font-black text-slate-700">{patient.edad} años</p></div>
                <div className="space-y-0.5"><p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase">Legajo</p><p className="text-xs font-black text-slate-700">{patient.legajo}</p></div>
                <div className="space-y-0.5"><p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase">Teléfono</p><p className="text-xs font-black text-slate-700">{patient.telefono}</p></div>
              </div>

              <button 
                onClick={handleWhatsApp}
                className="w-full mt-2 flex items-center justify-center bg-[#25D366] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all no-print"
              >
                WhatsApp
              </button>
            </div>
          </div>

          {/* Panel de auditoría y timeline */}
          <div className="lg:col-span-8 space-y-8 md:space-y-12">
            {isDoctor && needsAction && (
              <div className="bg-white rounded-3xl md:rounded-[2.5rem] border-2 md:border-4 border-arial-orange shadow-2xl overflow-hidden no-print">
                <div className="px-6 md:px-10 py-4 md:py-5 bg-arial-orange text-white flex flex-col md:flex-row justify-between items-center gap-2">
                  <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">Nueva Auditoría Médica</h3>
                  <span className="text-[8px] md:text-[9px] font-black bg-white/20 px-3 py-1 rounded-full uppercase">Desde: {formatDisplayDate(auditStartDate)}</span>
                </div>
                <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="md:col-span-2">
                      <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Diagnóstico Validado</label>
                      <input type="text" className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-xs outline-none focus:border-arial-orange focus:bg-white transition-all" value={decisionData.diagnosis} onChange={e => setDecisionData({...decisionData, diagnosis: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 text-center">Días</label>
                      <input type="number" min="1" className="w-full px-4 py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-orange-100 bg-orange-50 font-black text-xl md:text-2xl text-arial-orange outline-none text-center" value={decisionData.daysAuthorized} onChange={e => setDecisionData({...decisionData, daysAuthorized: parseInt(e.target.value) || 1})} />
                    </div>
                  </div>
                  
                  <div className="p-4 md:p-6 bg-slate-900 rounded-2xl md:rounded-3xl text-white grid grid-cols-2 gap-4 md:gap-8">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Fin Reposo</p>
                      <p className="text-xs md:text-sm font-black text-orange-400">{formatDisplayDate(previewEndDate)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Retorno</p>
                      <p className="text-xs md:text-sm font-black text-emerald-400">{formatDisplayDate(previewReturnDate)}</p>
                    </div>
                  </div>

                  <textarea rows={3} className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-slate-50 bg-slate-50 font-medium text-xs outline-none focus:border-arial-orange focus:bg-white transition-all" placeholder="Evolución clínica..." value={decisionData.notes} onChange={e => setDecisionData({...decisionData, notes: e.target.value})} />
                  
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-2">
                    <button onClick={() => handleDecision('CONTROL')} className="flex-1 bg-slate-900 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95">Renovar</button>
                    <button onClick={() => handleDecision('ALTA')} className="flex-1 bg-emerald-600 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95">Alta Laboral</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-8 md:space-y-12">
              <div className="flex items-center gap-3 md:gap-4 px-4">
                <div className="h-0.5 flex-1 bg-slate-100"></div>
                <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.4em] text-[8px] md:text-[10px]">Cronología</h3>
                <div className="h-0.5 flex-1 bg-slate-100"></div>
              </div>

              {groupedEpisodes.map((episode, epIdx) => {
                const admission = episode.find(e => e.user.includes('Admisión'));
                const latestInEp = episode[episode.length - 1];
                const isClosed = latestInEp.notes.includes('[ALTA MÉDICA]');

                return (
                  <div key={epIdx} className="bg-white rounded-3xl md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className={`px-6 md:px-10 py-4 md:py-6 border-b border-slate-50 flex justify-between items-center ${isClosed ? 'bg-emerald-50/30' : 'bg-slate-50/30'}`}>
                        <div className="flex items-center gap-2 md:gap-4">
                           <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isClosed ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
                           <h3 className="font-black text-slate-800 uppercase tracking-[0.15em] md:tracking-[0.2em] text-[9px] md:text-[11px]">
                             Episodio: {formatDisplayDate(admission?.startDate)}
                           </h3>
                        </div>
                        <span className={`text-[7px] md:text-[9px] font-black px-2 md:px-4 py-1 rounded-full uppercase tracking-widest border ${isClosed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                          {isClosed ? 'Cerrado' : 'Abierto'}
                        </span>
                    </div>
                    
                    <div className="p-6 md:p-10 space-y-8 md:space-y-12">
                        {[...episode].reverse().map((ev, idx) => {
                          const isAdmission = ev.user.includes('Admisión');
                          const isDischarge = ev.notes.includes('[ALTA MÉDICA]');
                          const statusColor = isAdmission ? "blue" : (isDischarge ? "emerald" : "orange");

                          return (
                            <div key={ev.id} className={`relative pl-8 md:pl-12 border-l-2 border-${statusColor}-100 pb-2 last:pb-0`}>
                                <div className={`absolute -left-[11px] md:-left-[13px] top-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-${statusColor}-500 border-4 border-white shadow-lg flex items-center justify-center`}>
                                  {isAdmission ? <span className="text-[8px] font-black text-white">A</span> : (isDischarge ? <span className="text-[8px] font-black text-white">✓</span> : <span className="text-[8px] font-black text-white">M</span>)}
                                </div>

                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-1 mb-4">
                                    <span className={`self-start text-[7px] md:text-[9px] font-black text-${statusColor}-600 bg-${statusColor}-50 px-2.5 py-1 rounded-full uppercase tracking-widest`}>
                                      {isAdmission ? 'Admisión' : (isDischarge ? 'Alta' : 'Auditoría')}
                                    </span>
                                    <span className="text-[7px] md:text-[9px] font-black text-slate-300 uppercase shrink-0 truncate">{ev.timestamp} | {ev.user}</span>
                                </div>

                                <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-3xl border border-slate-50 shadow-sm">
                                    <div className="flex justify-between items-start mb-3 md:mb-4">
                                      <h5 className="font-black text-slate-800 text-[11px] md:text-sm uppercase tracking-tight leading-tight flex-1 mr-2">{ev.diagnosis}</h5>
                                      {ev.daysAuthorized > 0 && (
                                        <div className="flex flex-col items-end shrink-0">
                                          <span className="text-[10px] md:text-[12px] font-black text-slate-900 uppercase leading-none">{ev.daysAuthorized} d</span>
                                          <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-1">Auditado</span>
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-[10px] md:text-[11px] font-medium text-slate-500 italic leading-relaxed mb-4 md:mb-6 border-l-2 border-slate-100 pl-3 md:pl-4">{ev.notes}</p>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-4 md:pt-6 border-t border-slate-50">
                                       <div className="space-y-0.5">
                                          <p className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase tracking-widest">Desde</p>
                                          <p className="text-[9px] md:text-[10px] font-black text-slate-600">{formatDisplayDate(ev.startDate)}</p>
                                       </div>
                                       <div className="space-y-0.5">
                                          <p className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase tracking-widest">Hasta</p>
                                          <p className="text-[9px] md:text-[10px] font-black text-slate-600">{formatDisplayDate(ev.endDate)}</p>
                                       </div>
                                       {(isDischarge || (idx === episode.length - 1 && isAdmission)) && (
                                          <div className="space-y-0.5 col-span-2">
                                            <p className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase tracking-widest">Reincorporación</p>
                                            <p className={`text-[9px] md:text-[10px] font-black ${isDischarge ? 'text-emerald-500' : 'text-slate-400'}`}>
                                              {formatDisplayDate(getReturnDate(ev.endDate))}
                                            </p>
                                          </div>
                                       )}
                                    </div>
                                </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
