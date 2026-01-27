
import React, { useState, useRef, useMemo } from 'react';
import { AbsenteeismCase, Patient, EvolutionEntry, User } from '../types';
import { getLatestEvolution, formatDisplayDate, addDaysToDate, getReturnDate, getNextStartDate, numberToSpanishText } from '../utils';

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
  const certificateRef = useRef<HTMLDivElement>(null);
  const [selectedEvoForCert, setSelectedEvoForCert] = useState<EvolutionEntry | null>(null);
  
  const needsAction = !isReadOnly && (caseData.status === 'PENDIENTE_AUDITORIA' || caseData.status === 'EN_SEGUIMIENTO');

  const auditStartDate = useMemo(() => {
    if (!latest) return new Date().toISOString().split('T')[0];
    return caseData.status === 'PENDIENTE_AUDITORIA' ? latest.startDate : getNextStartDate(latest.endDate);
  }, [latest, caseData.status]);

  const [decisionData, setDecisionData] = useState({
    daysAuthorized: latest?.daysSuggested || 1,
    notes: '',
    diagnosis: latest?.diagnosis || '',
    cie10: latest?.cie10 || ''
  });

  const previewEndDate = useMemo(() => addDaysToDate(auditStartDate, decisionData.daysAuthorized), [auditStartDate, decisionData.daysAuthorized]);
  const previewReturnDate = useMemo(() => getReturnDate(previewEndDate), [previewEndDate]);

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
        ? `[ALTA MÉDICA] Paciente apto. Retorno laboral: ${formatDisplayDate(previewReturnDate)}. ${decisionData.notes}`
        : `[CONTROL MÉDICO] Se valida reposo por ${decisionData.daysAuthorized} días adicionales. ${decisionData.notes}`
    };
    onAddEvolution(caseData.id, newEvolution, newStatus);
    onBack();
  };

  const exportCertificatePDF = (evo: EvolutionEntry) => {
    setSelectedEvoForCert(evo);
    setTimeout(() => {
      if (!certificateRef.current) return;
      const opt = {
        margin: 0,
        filename: `Certificado_${patient.apellido}_${evo.timestamp.split(' ')[0]}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 4, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a5', orientation: 'landscape' }
      };
      (window as any).html2pdf().set(opt).from(certificateRef.current).save().then(() => {
        setSelectedEvoForCert(null);
      });
    }, 200);
  };

  const handlePrintHistory = () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 10,
      filename: `Historia_Clinica_${patient.apellido}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    (window as any).html2pdf().set(opt).from(reportRef.current).save();
  };

  const groupedEpisodes = useMemo(() => {
    const sorted = [...caseData.evolutions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const episodes: EvolutionEntry[][] = [];
    let currentEpisode: EvolutionEntry[] = [];
    sorted.forEach((ev) => {
      if (ev.user.includes('Admisión')) {
        if (currentEpisode.length > 0) episodes.push(currentEpisode);
        currentEpisode = [ev];
      } else {
        currentEpisode.push(ev);
      }
    });
    if (currentEpisode.length > 0) episodes.push(currentEpisode);
    return episodes.reverse();
  }, [caseData.evolutions]);

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <button onClick={onBack} className="w-full md:w-auto text-slate-400 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-slate-600 bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-sm transition-all">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Cerrar Ficha
        </button>
        <button onClick={handlePrintHistory} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 rounded-xl text-[9px] font-black uppercase text-white hover:bg-arial-orange transition-all shadow-lg active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Exportar Historia Completa
        </button>
      </div>

      {/* RENDER CERTIFICADO A5 HORIZONTAL (MITAD DE A4) */}
      {selectedEvoForCert && (
        <div className="fixed left-[-9999px] top-0">
          <div ref={certificateRef} className="bg-white p-6 font-serif border-[0.5mm] border-slate-200" style={{ width: '210mm', height: '148.5mm', color: '#000', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* CABECERA */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-[#BC4B13] rounded-lg flex items-center justify-center text-white font-black italic text-xl">A</div>
                   <div className="flex flex-col">
                     <span className="text-xl font-black tracking-tighter leading-none" style={{color: '#BC4B13'}}>ARIAL</span>
                     <span className="text-[7px] font-bold uppercase tracking-[0.3em] text-slate-500">Medicina Laboral</span>
                   </div>
                </div>
              </div>
              <div className="text-center border-[0.3mm] border-black py-1.5 px-6">
                <h1 className="text-base font-black uppercase tracking-tight">Control Médico Laboral</h1>
              </div>
              <div className="text-right">
                 <div className="border-[0.3mm] border-black inline-block px-4 py-1.5 bg-slate-50">
                    <p className="text-xs font-bold">Nº {selectedEvoForCert.id.split('-')[1]?.substring(0,8) || '335833'}</p>
                 </div>
              </div>
            </div>

            {/* CUERPO - DATOS PERSONALES */}
            <div className="grid grid-cols-12 gap-x-2 gap-y-2 text-[9px] mb-4">
              <div className="col-span-1 flex items-center uppercase font-bold">Empresa</div>
              <div className="col-span-5 border-[0.3mm] border-black px-2 py-1.5 font-bold uppercase bg-white truncate">{patient.empresa}</div>
              <div className="col-span-1 flex items-center pl-2 uppercase font-bold">Empleado</div>
              <div className="col-span-5 border-[0.3mm] border-black px-2 py-1.5 font-bold uppercase bg-white truncate">{patient.apellido}, {patient.nombre}</div>
              
              <div className="col-span-1 flex items-center uppercase font-bold">DNI Nº</div>
              <div className="col-span-3 border-[0.3mm] border-black px-2 py-1.5 font-bold bg-white text-center">{patient.dni}</div>
              <div className="col-span-2 flex items-center pl-2 uppercase font-bold">Ocupación</div>
              <div className="col-span-6 border-[0.3mm] border-black px-2 py-1.5 font-bold bg-white">SIN DEFINIR</div>
            </div>

            {/* FILA DE ATENCIÓN */}
            <div className="flex items-center gap-4 text-[9px] mb-4">
              <span className="font-bold uppercase">Informe: Fecha de atención</span>
              <div className="border-[0.3mm] border-black px-3 py-1 font-bold bg-white">{selectedEvoForCert.timestamp.split(' ')[0]}</div>
              <span className="font-bold uppercase">Hora</span>
              <div className="border-[0.3mm] border-black px-3 py-1 font-bold bg-white">{selectedEvoForCert.timestamp.split(' ')[1]}</div>
              <div className="flex items-center gap-4 ml-auto font-bold uppercase">
                <span>Lugar:</span>
                <div className="flex items-center gap-1">Consultorio <div className="border-[0.3mm] border-black w-4 h-4 flex items-center justify-center font-bold">X</div></div>
                <div className="flex items-center gap-1">Domicilio <div className="border-[0.3mm] border-black w-4 h-4"></div></div>
              </div>
            </div>

            {/* RESOLUCIÓN MÉDICA */}
            <div className="space-y-2 text-[10px] mb-4 border-y-[0.3mm] border-black py-3">
               <div className="flex items-center gap-10">
                  <span className="font-bold uppercase">De acuerdo al examen y diagnóstico se resuelve: <strong>Inasistencia Justificada:</strong></span>
                  <div className="flex items-center gap-4 font-bold">
                    <span>SI</span> <div className="border-[0.3mm] border-black w-5 h-5 flex items-center justify-center font-bold">{selectedEvoForCert.daysAuthorized > 0 ? 'X' : ''}</div>
                    <span>NO</span> <div className="border-[0.3mm] border-black w-5 h-5 flex items-center justify-center font-bold">{selectedEvoForCert.daysAuthorized === 0 ? 'X' : ''}</div>
                  </div>
               </div>
               <div className="flex items-center gap-10">
                  <span className="font-bold uppercase">En condiciones de prestar servicios (APTO):</span>
                  <div className="flex items-center gap-4 font-bold">
                    <span>SI</span> <div className="border-[0.3mm] border-black w-5 h-5 flex items-center justify-center font-bold">{selectedEvoForCert.notes.includes('ALTA') ? 'X' : ''}</div>
                    <span>NO</span> <div className="border-[0.3mm] border-black w-5 h-5 flex items-center justify-center font-bold">{!selectedEvoForCert.notes.includes('ALTA') ? 'X' : ''}</div>
                  </div>
               </div>
            </div>

            {/* PERIODO DE LICENCIA */}
            <div className="grid grid-cols-4 gap-4 text-[10px] mb-4">
              <div>
                <span className="font-bold uppercase block mb-1">Desde:</span>
                <div className="border-[0.3mm] border-black px-2 py-1.5 font-bold text-center bg-white">{formatDisplayDate(selectedEvoForCert.startDate)}</div>
              </div>
              <div>
                <span className="font-bold uppercase block mb-1">Días Otorgados:</span>
                <div className="border-[0.3mm] border-black px-2 py-1.5 font-bold text-center bg-white">{selectedEvoForCert.daysAuthorized} ({numberToSpanishText(selectedEvoForCert.daysAuthorized)})</div>
              </div>
              <div>
                <span className="font-bold uppercase block mb-1">Hasta:</span>
                <div className="border-[0.3mm] border-black px-2 py-1.5 font-bold text-center bg-white">{formatDisplayDate(selectedEvoForCert.endDate)}</div>
              </div>
              <div>
                <span className="font-bold uppercase block mb-1">Nuevo Control / Reintegro:</span>
                <div className="border-[0.3mm] border-black px-2 py-1.5 font-bold text-center bg-white">{formatDisplayDate(getReturnDate(selectedEvoForCert.endDate))}</div>
              </div>
            </div>

            {/* DIAGNÓSTICO Y OBSERVACIONES */}
            <div className="text-[10px] space-y-2 mb-4">
              <div className="flex gap-2">
                <span className="font-bold uppercase shrink-0">Diagnóstico Presuntivo:</span>
                <span className="font-bold">{selectedEvoForCert.diagnosis}</span>
              </div>
              <div className="border-[0.3mm] border-black p-3 min-h-[50px] text-[9px] relative bg-slate-50/20">
                <strong className="uppercase">Observaciones Médicas:</strong> <br/>
                {selectedEvoForCert.notes}
              </div>
            </div>

            {/* FIRMAS Y PIE */}
            <div className="absolute bottom-6 left-6 right-6">
               <div className="grid grid-cols-3 gap-8 text-[8px] font-black uppercase text-center items-end">
                  <div className="border-t-[0.3mm] border-black pt-1">Firma del empleado</div>
                  <div className="border-t-[0.3mm] border-black pt-1">Aclaración y DNI</div>
                  <div className="relative">
                    <div className="absolute bottom-5 left-0 right-0 text-center flex flex-col items-center">
                       <span className="text-[10px] text-arial-orange font-black italic mb-0.5">Dr. {currentUser.fullName}</span>
                       <span className="text-[7px] text-slate-500 font-bold">Médico Auditor Arial</span>
                    </div>
                    <div className="border-t-[0.3mm] border-black pt-1">Firma Médico de Arial</div>
                  </div>
               </div>
               <div className="flex justify-between mt-4 text-[7px] font-black text-slate-300 tracking-[0.4em] uppercase">
                 <span>Original Empresa</span>
                 <span>Duplicado Arial</span>
               </div>
            </div>
          </div>
        </div>
      )}

      <div ref={reportRef} className="print-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
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
              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6 md:pt-8 text-center md:text-left">
                <div className="space-y-0.5"><p className="text-[8px] font-black text-slate-300 uppercase">DNI</p><p className="text-xs font-black text-slate-700">{patient.dni}</p></div>
                <div className="space-y-0.5"><p className="text-[8px] font-black text-slate-300 uppercase">Edad</p><p className="text-xs font-black text-slate-700">{patient.edad} años</p></div>
                <div className="space-y-0.5"><p className="text-[8px] font-black text-slate-300 uppercase">Legajo</p><p className="text-xs font-black text-slate-700">{patient.legajo}</p></div>
                <div className="space-y-0.5"><p className="text-[8px] font-black text-slate-300 uppercase">Teléfono</p><p className="text-xs font-black text-slate-700">{patient.telefono}</p></div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8 md:space-y-12">
            {isDoctor && needsAction && (
              <div className="bg-white rounded-3xl md:rounded-[2.5rem] border-2 md:border-4 border-arial-orange shadow-2xl overflow-hidden no-print">
                <div className="px-6 md:px-10 py-4 md:py-5 bg-arial-orange text-white flex flex-col md:flex-row justify-between items-center gap-2">
                  <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">Auditoría Médica de Control</h3>
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
                  <textarea rows={3} className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-slate-50 bg-slate-50 font-medium text-xs outline-none focus:border-arial-orange focus:bg-white transition-all" placeholder="Evolución clínica..." value={decisionData.notes} onChange={e => setDecisionData({...decisionData, notes: e.target.value})} />
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-2">
                    <button onClick={() => handleDecision('CONTROL')} className="flex-1 bg-slate-900 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95">Renovar Seguimiento</button>
                    <button onClick={() => handleDecision('ALTA')} className="flex-1 bg-emerald-600 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95">Alta de Servicios</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-8 md:space-y-12">
              {groupedEpisodes.map((episode, epIdx) => {
                const isClosed = episode[episode.length - 1].notes.includes('[ALTA MÉDICA]');
                return (
                  <div key={epIdx} className="bg-white rounded-3xl md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className={`px-6 md:px-10 py-4 md:py-6 border-b border-slate-50 flex justify-between items-center ${isClosed ? 'bg-emerald-50/30' : 'bg-slate-50/30'}`}>
                        <div className="flex items-center gap-2 md:gap-4">
                           <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isClosed ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
                           <h3 className="font-black text-slate-800 uppercase tracking-[0.15em] text-[9px] md:text-[11px]">Caso: {formatDisplayDate(episode.find(e => e.user.includes('Admisión'))?.startDate)}</h3>
                        </div>
                    </div>
                    <div className="p-6 md:p-10 space-y-8">
                        {[...episode].reverse().map((ev) => {
                          const isAdm = ev.user.includes('Admisión');
                          const isDis = ev.notes.includes('[ALTA MÉDICA]');
                          return (
                            <div key={ev.id} className="relative pl-8 md:pl-12 border-l-2 border-slate-100 pb-2">
                                <div className={`absolute -left-[11px] md:-left-[13px] top-0 w-5 h-5 md:w-6 md:h-6 rounded-full ${isAdm ? 'bg-blue-500' : (isDis ? 'bg-emerald-500' : 'bg-orange-500')} border-4 border-white shadow-lg`}></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                      <span className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{ev.timestamp} | {ev.user}</span>
                                    </div>
                                    {!isAdm && (
                                      <button 
                                        onClick={() => exportCertificatePDF(ev)}
                                        className="no-print p-2 bg-slate-100 rounded-lg text-slate-400 hover:bg-arial-orange hover:text-white transition-all flex items-center gap-2"
                                        title="Generar Certificado A5 Horizontal"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span className="hidden md:block text-[8px] font-black uppercase">Certificado A5</span>
                                      </button>
                                    )}
                                </div>
                                <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-3xl border border-slate-50 shadow-sm">
                                    <h5 className="font-black text-slate-800 text-[11px] md:text-sm uppercase mb-3">{ev.diagnosis}</h5>
                                    <p className="text-[10px] md:text-[11px] font-medium text-slate-500 italic leading-relaxed mb-4">{ev.notes}</p>
                                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-50">
                                       <div className="space-y-0.5"><p className="text-[7px] font-black text-slate-300 uppercase">Desde</p><p className="text-[9px] font-black text-slate-600">{formatDisplayDate(ev.startDate)}</p></div>
                                       <div className="space-y-0.5"><p className="text-[7px] font-black text-slate-300 uppercase">Días</p><p className="text-[9px] font-black text-arial-orange">{ev.daysAuthorized}</p></div>
                                       <div className="space-y-0.5"><p className="text-[7px] font-black text-slate-300 uppercase">Hasta</p><p className="text-[9px] font-black text-slate-600">{formatDisplayDate(ev.endDate)}</p></div>
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
