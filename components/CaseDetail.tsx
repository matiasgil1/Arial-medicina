
import React, { useState, useRef, useMemo } from 'react';
import { AbsenteeismCase, Patient, EvolutionEntry, User } from '../types';
import { getLatestEvolution, formatDisplayDate, addDaysToDate, getReturnDate, getNextStartDate } from '../utils';

interface CaseDetailProps {
  allCases: AbsenteeismCase[];
  caseData: AbsenteeismCase;
  patient: Patient;
  currentUser: User;
  onAddEvolution: (caseId: string, evolution: EvolutionEntry, newStatus?: AbsenteeismCase['status']) => void;
  onDeleteCase: (id: string) => void;
  onBack: () => void;
  isReadOnly?: boolean; 
}

const CaseDetail: React.FC<CaseDetailProps> = ({ allCases, caseData, patient, currentUser, onAddEvolution, onBack, isReadOnly = false }) => {
  const latest = getLatestEvolution(caseData.evolutions);
  const isDoctor = currentUser.role === 'médico' || currentUser.role === 'admin';
  const fullReportRef = useRef<HTMLDivElement>(null); 
  
  const [viewingEpisode, setViewingEpisode] = useState<EvolutionEntry[] | null>(null);
  const [activeStepInModal, setActiveStepInModal] = useState(0);
  const [filters, setFilters] = useState({ desde: '', hasta: '' });

  const isAdmissionEntry = (user: string) => String(user || '').toLowerCase().includes('adm');
  const isAltaEntry = (notes: string) => String(notes || '').includes('[ALTA MÉDICA]');

  // Consolidación de Historial para el resumen inteligente
  const filteredEpisodes = useMemo(() => {
    const patientEvolutions = allCases
      .filter(c => c.patientId === patient.id)
      .flatMap(c => c.evolutions);

    const sorted = [...patientEvolutions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const episodes: EvolutionEntry[][] = [];
    let currentEpisode: EvolutionEntry[] = [];
    
    sorted.forEach((ev) => {
      if (isAdmissionEntry(ev.user)) {
        if (currentEpisode.length > 0) episodes.push(currentEpisode);
        currentEpisode = [ev];
      } else {
        currentEpisode.push(ev);
      }
    });
    if (currentEpisode.length > 0) episodes.push(currentEpisode);

    return episodes.filter(ep => {
      const startDate = ep[0].startDate;
      if (filters.desde && startDate < filters.desde) return false;
      if (filters.hasta && startDate > filters.hasta) return false;
      return true;
    }).reverse();
  }, [allCases, patient.id, filters]);

  // Inteligencia de Resumen Clínico
  const stats = useMemo(() => {
    const totalDays = filteredEpisodes.reduce((acc, ep) => acc + ep.reduce((a, ev) => a + (ev.daysAuthorized || 0), 0), 0);
    const totalEpisodes = filteredEpisodes.length;
    
    const diagMap: Record<string, number> = {};
    filteredEpisodes.forEach(ep => {
        const d = ep[0]?.diagnosis || 'Sin Diagnóstico';
        diagMap[d] = (diagMap[d] || 0) + 1;
    });
    
    let maxFreq = 0;
    let recurrentDiag = 'Ninguna registrada';
    Object.entries(diagMap).forEach(([diag, count]) => {
        if (count >= maxFreq) {
            maxFreq = count;
            recurrentDiag = diag;
        }
    });

    return { totalDays, totalEpisodes, recurrentDiag, maxFreq };
  }, [filteredEpisodes]);

  const auditStartDate = useMemo(() => {
    if (!latest) return new Date().toISOString().split('T')[0];
    return caseData.status === 'PENDIENTE_AUDITORIA' ? latest.startDate : getNextStartDate(latest.endDate);
  }, [latest, caseData.status]);

  const needsAction = useMemo(() => {
    if (isReadOnly) return false;
    if (caseData.status === 'PENDIENTE_AUDITORIA') return true;
    if (caseData.status === 'EN_SEGUIMIENTO') return true; 
    return false;
  }, [caseData.status, isReadOnly]);

  const [decisionData, setDecisionData] = useState({
    daysAuthorized: latest?.daysSuggested || 1,
    notes: '',
    diagnosis: latest?.diagnosis || '',
    cie10: latest?.cie10 || ''
  });

  const previewEndDate = useMemo(() => addDaysToDate(auditStartDate, decisionData.daysAuthorized), [auditStartDate, decisionData.daysAuthorized]);
  const previewReturnDate = useMemo(() => getReturnDate(previewEndDate), [previewEndDate]);

  // FUNCIÓN WHATSAPP REVISADA Y FUNCIONAL
  const handleWhatsApp = () => {
    if (!patient.telefono) {
      alert("No hay número de teléfono registrado.");
      return;
    }
    // Limpieza estricta de caracteres no numéricos
    const cleanNumber = patient.telefono.replace(/\D/g, '');
    // Asegurar prefijo internacional para Argentina
    const finalNumber = cleanNumber.startsWith('54') ? cleanNumber : `54${cleanNumber}`;
    const message = encodeURIComponent(`Hola ${patient.nombre}, te contacto desde el equipo médico de Arial en relación a tu seguimiento de ausentismo.`);
    
    const waUrl = `https://wa.me/${finalNumber}?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const handleDecision = (action: 'CONTROL' | 'ALTA') => {
    const newStatus: AbsenteeismCase['status'] = action === 'ALTA' ? 'ALTA_MEDICA' : 'EN_SEGUIMIENTO';
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

  const handlePrintFilteredHistory = () => {
    if (!fullReportRef.current) return;
    const opt = {
      margin: 15,
      filename: `Ficha_Clinica_${patient.apellido}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    (window as any).html2pdf().set(opt).from(fullReportRef.current).save();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto px-1 md:px-0">
      
      {/* NAVEGACIÓN SUPERIOR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print px-4 md:px-0">
        <button onClick={onBack} className="w-full md:w-auto text-slate-400 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-slate-600 bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm transition-all active:scale-95">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Cerrar Ficha
        </button>
        <button onClick={handlePrintFilteredHistory} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 rounded-xl text-[10px] font-black uppercase text-white hover:bg-arial-orange transition-all shadow-xl active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Exportar Trazabilidad PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
          
          {/* PERFIL IZQUIERDA (MODERNO) */}
          <div className="lg:col-span-4 no-print px-4 md:px-0">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 flex flex-col items-center text-center space-y-6 h-full">
              <div className="w-20 h-20 rounded-[1.5rem] bg-slate-900 text-white flex items-center justify-center text-3xl font-black shadow-2xl border-4 border-slate-50 shrink-0 uppercase">
                {patient.nombre?.charAt(0)}
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 text-xl leading-none uppercase tracking-tighter">{patient.nombre} {patient.apellido}</h4>
                <p className="text-[10px] font-black text-arial-orange uppercase tracking-[0.25em]">{patient.empresa}</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-y-6 gap-x-4 border-t border-slate-50 pt-6">
                <div className="space-y-1"><p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Identificación</p><p className="text-[10px] font-black text-slate-700">{patient.dni}</p></div>
                <div className="space-y-1"><p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Edad Actual</p><p className="text-[10px] font-black text-slate-700">{patient.edad} años</p></div>
                <div className="space-y-1"><p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Nº Legajo</p><p className="text-[10px] font-black text-slate-700">{patient.legajo}</p></div>
                <div className="space-y-1"><p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Teléfono</p><p className="text-[10px] font-black text-slate-700">{patient.telefono}</p></div>
              </div>
              <div className="w-full pt-4">
                <button onClick={handleWhatsApp} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-3">
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                   WhatsApp Colaborador
                </button>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA INDICADORES (FINA Y ELEGANTE) */}
          <div className="lg:col-span-8 no-print px-4 md:px-0">
            {isDoctor && needsAction ? (
              /* FORMULARIO AUDITORÍA MÉDICA */
              <div className="bg-white rounded-[2.5rem] border-2 border-arial-orange shadow-2xl overflow-hidden h-full flex flex-col animate-in slide-in-from-right-10 duration-500">
                <div className="px-8 py-4 bg-arial-orange text-white flex justify-between items-center shrink-0">
                  <h3 className="text-[8px] font-black uppercase tracking-[0.25em]">Gestión de Auditoría Médica</h3>
                  <span className="text-[8px] font-black bg-white/20 px-3 py-1 rounded-full uppercase">Sugerido: {formatDisplayDate(auditStartDate)}</span>
                </div>
                <div className="p-8 md:p-10 space-y-6 flex-1 flex flex-col justify-center">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Diagnóstico Final Validado</label>
                      <input type="text" className="w-full px-5 py-3.5 rounded-xl border border-slate-100 bg-slate-50 font-bold text-xs outline-none focus:border-arial-orange focus:bg-white transition-all shadow-inner" value={decisionData.diagnosis} onChange={e => setDecisionData({...decisionData, diagnosis: e.target.value})} />
                    </div>
                    <div className="space-y-1.5 text-center">
                      <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Días Reposo</label>
                      <input type="number" min="1" className="w-full px-4 py-3.5 rounded-xl border border-orange-100 bg-orange-50 font-black text-xl text-arial-orange outline-none text-center shadow-inner" value={decisionData.daysAuthorized} onChange={e => setDecisionData({...decisionData, daysAuthorized: parseInt(e.target.value) || 1})} />
                    </div>
                  </div>
                  <textarea rows={2} className="w-full px-5 py-4 rounded-xl border border-slate-100 bg-slate-50 font-medium text-xs outline-none focus:border-arial-orange focus:bg-white transition-all shadow-inner" placeholder="Evolución clínica detallada..." value={decisionData.notes} onChange={e => setDecisionData({...decisionData, notes: e.target.value})} />
                  <div className="flex gap-4 pt-2">
                    <button onClick={() => handleDecision('CONTROL')} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Siguiente Control</button>
                    <button onClick={() => handleDecision('ALTA')} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Otorgar Alta Médica</button>
                  </div>
                </div>
              </div>
            ) : (
              /* DASHBOARD INDICADORES (ESTILO FINO) */
              <div className="flex flex-col gap-4 h-full animate-in fade-in duration-700">
                 
                 {/* 1. RECTÁNGULO HORIZONTAL ARRIBA: PATOLOGÍA */}
                 <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-5 transition-all hover:shadow-md">
                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.727 2.903a2 2 0 01-3.568.715l-1.424-2.848a2 2 0 00-1.554-1.11l-3.107-.444a2 2 0 01-1.688-2.63l1.526-2.543a2 2 0 00.176-1.898l-.944-2.833a2 2 0 012.28-2.658l2.946.589a2 2 0 001.766-.634l2.122-2.122a2 2 0 013.292 1.341l.342 3.081a2 2 0 001.11 1.554l2.848 1.424a2 2 0 01.715 3.568l-2.903.727a2 2 0 00-1.414 1.96l.477 2.387a2 2 0 00.547 1.022z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Patología Prevalente</p>
                       <h5 className="text-[10px] font-black text-slate-700 uppercase leading-none mt-1 truncate">
                         {stats.maxFreq > 1 ? stats.recurrentDiag : 'Sin recurrencia detectada'}
                       </h5>
                       {stats.maxFreq > 1 && (
                         <p className="text-[6px] font-black text-arial-orange uppercase mt-0.5 tracking-tighter">
                           Incidencia histórica: {stats.maxFreq} episodios registrados
                         </p>
                       )}
                    </div>
                 </div>

                 {/* 2. GRILLA CENTRAL: DOS CUADRADOS (DÍAS Y EPISODIOS) */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-2 aspect-square md:aspect-auto">
                       <div className="w-10 h-10 bg-orange-50/50 text-arial-orange rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       </div>
                       <div>
                          <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Días Totales</p>
                          <h5 className="text-2xl font-black text-slate-800 tracking-tighter mt-1">
                            {stats.totalDays} <span className="text-[8px] font-bold opacity-30">días</span>
                          </h5>
                       </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-2 aspect-square md:aspect-auto">
                       <div className="w-10 h-10 bg-slate-50/50 text-slate-400 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       </div>
                       <div>
                          <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Episodios</p>
                          <h5 className="text-2xl font-black text-slate-800 tracking-tighter mt-1">
                            {stats.totalEpisodes}
                          </h5>
                       </div>
                    </div>
                 </div>

                 {/* 3. RECTÁNGULO HORIZONTAL ABAJO: ESTADO */}
                 <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-5 transition-all hover:shadow-md">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 ${caseData.status !== 'ALTA_MEDICA' ? 'border-orange-500 bg-orange-50 text-orange-600 animate-pulse' : 'border-emerald-500 bg-emerald-50 text-emerald-600'}`}>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={caseData.status !== 'ALTA_MEDICA' ? "M12 8v4l3 3" : "M5 13l4 4L19 7"} /></svg>
                    </div>
                    <div>
                       <h6 className="text-[9px] font-black text-slate-800 uppercase tracking-tight leading-none">
                         {caseData.status !== 'ALTA_MEDICA' ? 'Control Activo bajo Auditoría' : 'Expediente Cerrado (Alta)'}
                       </h6>
                       <p className="text-[7px] font-medium text-slate-400 uppercase tracking-widest mt-1.5 leading-none italic">
                         Última sincronización con protocolos Cloud Arial.
                       </p>
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* HISTORIAL INFERIOR */}
          <div className="lg:col-span-12 no-print px-4 md:px-0">
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 bg-arial-orange rounded-full"></div>
                   <h3 className="font-black text-slate-800 uppercase tracking-[0.25em] text-[9px]">Línea de Vida Clínica</h3>
                 </div>
                 
                 <div className="flex items-center gap-3 bg-white px-4 py-1.5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Desde</span>
                      <input type="date" className="text-[8px] font-black text-slate-600 outline-none p-0.5 bg-slate-50 rounded-lg" value={filters.desde} onChange={e => setFilters({...filters, desde: e.target.value})} />
                    </div>
                    <div className="w-px h-3 bg-slate-100 mx-1"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Hasta</span>
                      <input type="date" className="text-[8px] font-black text-slate-600 outline-none p-0.5 bg-slate-50 rounded-lg" value={filters.hasta} onChange={e => setFilters({...filters, hasta: e.target.value})} />
                    </div>
                 </div>
              </div>

              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="text-slate-400 text-[8px] font-black uppercase tracking-[0.25em] border-b border-slate-50">
                      <th className="px-8 py-5">Registro</th>
                      <th className="px-6 py-5">Diagnóstico del Periodo</th>
                      <th className="px-6 py-5">Estado</th>
                      <th className="px-6 py-5 text-center">Días</th>
                      <th className="px-8 py-5 text-center">Auditado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredEpisodes.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-black uppercase text-[9px] tracking-widest italic">Sin registros históricos detectados</td></tr>
                    ) : filteredEpisodes.map((episode, epIdx) => {
                      const admission = episode[0];
                      const totalAuthorized = episode.reduce((acc, ev) => acc + (ev.daysAuthorized || 0), 0);
                      const isClosed = episode.some(ev => isAltaEntry(ev.notes));
                      return (
                        <tr key={epIdx} onClick={() => { setViewingEpisode(episode); setActiveStepInModal(0); }} className="hover:bg-slate-50 cursor-pointer group transition-all">
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400">{formatDisplayDate(admission.startDate)}</span>
                              <span className="text-[6px] font-black text-blue-400 uppercase tracking-widest">Admisión Inicial</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-700 uppercase truncate max-w-[300px]">{admission.diagnosis}</span>
                              <span className="text-[7px] font-black text-slate-300 uppercase mt-1.5">{episode.length} Evoluciones Clínicas</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${isClosed ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                               <div className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
                               <span className="text-[8px] font-black uppercase tracking-widest">{isClosed ? 'Cerrado' : 'Abierto'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center font-black text-arial-orange text-[11px]">{totalAuthorized} d</td>
                          <td className="px-8 py-5 text-center">
                            <button className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg transform group-hover:scale-110 transition-all">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      </div>

      {/* MODAL DETALLE EVOLUCIÓN */}
      {viewingEpisode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
             <div className="p-7 border-b border-slate-50 bg-slate-50/30 flex justify-between items-start">
               <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">Visión Evolutiva</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Primer registro: {formatDisplayDate(viewingEpisode[0].startDate)}</p>
               </div>
               <button onClick={() => setViewingEpisode(null)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-slate-200 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             <div className="bg-slate-50/50 px-7 py-4 border-b border-slate-100 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-4 min-w-max">
                  {viewingEpisode.map((ev, idx) => (
                    <button key={ev.id} onClick={() => setActiveStepInModal(idx)} className={`relative flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${activeStepInModal === idx ? 'bg-white border-arial-orange shadow-md scale-105' : 'bg-white/50 border-slate-100 text-slate-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isAltaEntry(ev.notes) ? 'bg-emerald-500' : isAdmissionEntry(ev.user) ? 'bg-blue-400' : 'bg-orange-500'}`}></div>
                      <div className="text-left">
                        <p className={`text-[6px] font-black uppercase tracking-widest ${activeStepInModal === idx ? 'text-arial-orange' : 'text-slate-400'}`}>
                           {isAltaEntry(ev.notes) ? 'Alta' : isAdmissionEntry(ev.user) ? 'Origen' : `Seg. ${idx}`}
                        </p>
                        <p className={`text-[8px] font-black ${activeStepInModal === idx ? 'text-slate-800' : 'text-slate-400'}`}>{ev.timestamp.substring(5, 10)}</p>
                      </div>
                    </button>
                  ))}
                </div>
             </div>

             <div className="p-7 space-y-6" key={activeStepInModal}>
                <div className="grid grid-cols-3 gap-4">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[6px] font-black text-slate-300 uppercase tracking-widest mb-1">Periodo</p>
                      <p className="text-[9px] font-black text-slate-700 leading-tight">{formatDisplayDate(viewingEpisode[activeStepInModal].startDate)} al {formatDisplayDate(viewingEpisode[activeStepInModal].endDate)}</p>
                   </div>
                   <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
                      <p className="text-[6px] font-black text-arial-orange uppercase tracking-widest mb-1">Auditado</p>
                      <p className="text-[10px] font-black text-arial-orange">
                        {isAdmissionEntry(viewingEpisode[activeStepInModal].user) ? viewingEpisode[activeStepInModal].daysSuggested : viewingEpisode[activeStepInModal].daysAuthorized} d
                      </p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <p className="text-[6px] font-black text-slate-300 uppercase tracking-widest mb-1">CIE-10</p>
                      <p className="text-[10px] font-black text-slate-700">{viewingEpisode[activeStepInModal].cie10}</p>
                   </div>
                </div>
                <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-inner min-h-[120px] text-[10px] font-medium text-slate-500 italic leading-relaxed">
                  {viewingEpisode[activeStepInModal].notes}
                </div>
             </div>
             <div className="px-7 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button onClick={() => setViewingEpisode(null)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Cerrar</button>
             </div>
          </div>
        </div>
      )}

      {/* REPORTE INVISIBLE EXPORTACIÓN */}
      <div className="hidden">
         <div ref={fullReportRef} className="p-10 font-inter text-slate-900 bg-white" style={{ minHeight: '297mm' }}>
            {/* Header del Reporte */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#BC4B13] rounded-xl flex items-center justify-center text-white font-black italic text-3xl">A</div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tighter" style={{color: '#BC4B13'}}>ARIAL</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Medicina Laboral</p>
                  </div>
               </div>
               <div className="text-right">
                  <h2 className="text-xl font-black uppercase tracking-widest">Ficha Clínica Consolidada</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocolo de Auditoría Cloud</p>
               </div>
            </div>
            {/* Contenido Dinámico del PDF */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 mb-10 grid grid-cols-2 gap-8">
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                  <p className="text-lg font-black uppercase">{patient.apellido}, {patient.nombre}</p>
                  <p className="text-xs font-bold text-slate-600">DNI: {patient.dni} | Legajo: {patient.legajo}</p>
               </div>
               <div className="text-right space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entidad / Empresa</p>
                  <p className="text-lg font-black uppercase" style={{color: '#BC4B13'}}>{patient.empresa}</p>
               </div>
            </div>
            {/* Listado de Episodios en PDF */}
            <div className="space-y-12">
               {filteredEpisodes.map((episode, epIdx) => (
                 <div key={epIdx} className="relative">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Episodio {formatDisplayDate(episode[0].startDate)}</div>
                       <div className="h-[2px] flex-1 bg-slate-100"></div>
                    </div>
                    <div className="space-y-6 pl-6 border-l-4 border-slate-100">
                       {episode.map((ev) => (
                         <div key={ev.id} className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{ev.timestamp} | {ev.user}</p>
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                               <h4 className="text-sm font-black text-slate-800 uppercase mb-2">{ev.diagnosis} (CIE: {ev.cie10})</h4>
                               <p className="text-xs font-medium text-slate-600 leading-relaxed italic mb-4">"{ev.notes}"</p>
                               <div className="flex gap-10 border-t border-slate-50 pt-4">
                                  <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Desde</p><p className="text-[10px] font-black text-slate-700">{formatDisplayDate(ev.startDate)}</p></div>
                                  <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Días</p><p className="text-[10px] font-black text-[#BC4B13]">{isAdmissionEntry(ev.user) ? ev.daysSuggested : ev.daysAuthorized}</p></div>
                                  <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Hasta</p><p className="text-[10px] font-black text-slate-700">{formatDisplayDate(ev.endDate)}</p></div>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default CaseDetail;
