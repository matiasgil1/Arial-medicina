
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AbsenteeismCase, Patient, EvolutionEntry, User } from '../types';
import { getLatestEvolution, formatDisplayDate, addDaysToDate, getReturnDate, generateLegalCertificatePDF, generateFullClinicalHistoryPDF, generateUniqueId, diffDaysBetweenDates } from '../utils';
import { CIE10_COMMON_LIST } from '../constants';

interface CaseDetailProps {
  allCases: AbsenteeismCase[];
  caseData: AbsenteeismCase;
  patient: Patient;
  currentUser: User;
  onAddEvolution: (caseId: string, evolution: EvolutionEntry, newStatus?: AbsenteeismCase['status']) => void;
  onDeleteCase: (id: string) => void;
  onBack: () => void;
  isReadOnly?: boolean; 
  initialCaseId?: string | null;
  backLabel?: string;
}

const CaseDetail: React.FC<CaseDetailProps> = ({ 
  allCases, 
  caseData, 
  patient, 
  currentUser, 
  onAddEvolution, 
  onBack, 
  isReadOnly = false,
  initialCaseId = null,
  backLabel = 'Cerrar Ficha'
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId);
  const [activeEvoId, setActiveEvoId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingHistory, setIsExportingHistory] = useState(false);
  const [isPrintingFull, setIsPrintingFull] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  
  const admissionEntry = useMemo(() => caseData.evolutions[0], [caseData]);
  const latestEvo = useMemo(() => getLatestEvolution(caseData.evolutions), [caseData.evolutions]);
  
  const absoluteMaxControlDate = useMemo(() => {
    if (!admissionEntry) return '';
    return addDaysToDate(admissionEntry.startDate, admissionEntry.daysSuggested);
  }, [admissionEntry]);

  const [evoData, setEvoData] = useState({
    diagnosis: '',
    cie10: '',
    daysAuthorized: 0,
    startDate: '', 
    endDate: '', 
    notes: ''
  });
  
  const [cieSearch, setCieSearch] = useState('');
  const [showCieDropdown, setShowCieDropdown] = useState(false);
  const cieRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (admissionEntry) {
      const start = (caseData.status !== 'PENDIENTE_AUDITORIA' && latestEvo) 
        ? latestEvo.endDate 
        : admissionEntry.startDate;

      const remainingDays = diffDaysBetweenDates(start, absoluteMaxControlDate);
      const safeDefaultDays = remainingDays > 0 ? remainingDays : 1;
      const defaultEnd = addDaysToDate(start, safeDefaultDays);

      setEvoData(prev => ({
        ...prev,
        diagnosis: latestEvo?.diagnosis || admissionEntry.diagnosis,
        cie10: latestEvo?.cie10 || admissionEntry.cie10,
        startDate: start,
        daysAuthorized: safeDefaultDays, 
        endDate: defaultEnd
      }));
      setCieSearch(latestEvo?.cie10 || admissionEntry.cie10);
    }
  }, [caseData.id, admissionEntry, latestEvo, absoluteMaxControlDate]);

  const handleDaysChange = (val: number) => {
    const maxPossible = diffDaysBetweenDates(evoData.startDate, absoluteMaxControlDate);
    const safeVal = val > maxPossible ? maxPossible : val;
    const newEnd = addDaysToDate(evoData.startDate, safeVal);
    setEvoData(prev => ({ ...prev, daysAuthorized: safeVal, endDate: newEnd }));
  };

  const handleControlDateChange = (date: string) => {
    if (date > absoluteMaxControlDate) {
      handleDaysChange(diffDaysBetweenDates(evoData.startDate, absoluteMaxControlDate));
      return;
    }
    const newDays = diffDaysBetweenDates(evoData.startDate, date);
    setEvoData(prev => ({ ...prev, endDate: date, daysAuthorized: newDays }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cieRef.current && !cieRef.current.contains(event.target as Node)) setShowCieDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCie = useMemo(() => {
    if (!cieSearch) return CIE10_COMMON_LIST.slice(0, 10);
    return CIE10_COMMON_LIST.filter(item => 
        item.code.toLowerCase().includes(cieSearch.toLowerCase()) || 
        item.description.toLowerCase().includes(cieSearch.toLowerCase())
    ).slice(0, 50);
  }, [cieSearch]);

  const kpis = useMemo(() => {
    const patientCases = allCases.filter(c => c.patientId === patient.id);
    let totalSuggested = 0;
    let totalAuthorized = 0;
    patientCases.forEach(c => {
      c.evolutions.forEach(ev => {
        if (ev.user.includes('Admisión')) totalSuggested += (ev.daysSuggested || 0);
        else totalAuthorized += (ev.daysAuthorized || 0);
      });
    });
    const diagCounts: Record<string, number> = {};
    patientCases.forEach(c => {
        const d = getLatestEvolution(c.evolutions)?.diagnosis || 'S/D';
        diagCounts[d] = (diagCounts[d] || 0) + 1;
    });
    const prevalent = Object.entries(diagCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'SIN REGISTROS';
    return { totalSuggested, totalAuthorized, prevalent, totalIncidences: patientCases.length };
  }, [allCases, patient.id]);

  const patientCasesList = useMemo(() => {
    return allCases.filter(c => c.patientId === patient.id)
      .sort((a, b) => {
        const dateA = new Date(a.evolutions[0]?.timestamp || 0).getTime();
        const dateB = new Date(b.evolutions[0]?.timestamp || 0).getTime();
        return dateB - dateA;
      });
  }, [allCases, patient.id]);

  const casesSummary = useMemo(() => {
    return patientCasesList.map(c => {
        const admission = c.evolutions[0];
        const latest = getLatestEvolution(c.evolutions);
        const totalDays = c.evolutions.reduce((acc, ev) => acc + (ev.daysAuthorized || 0), 0);
        return {
          id: c.id,
          date: admission?.timestamp.split(' ')[0] || '---',
          diagnosis: latest?.diagnosis || 'S/D',
          status: c.status,
          days: c.status === 'PENDIENTE_AUDITORIA' ? (admission?.daysSuggested || 0) : totalDays,
          evolutions: c.evolutions
        };
      });
  }, [patientCasesList]);

  const selectedCaseData = useMemo(() => {
    return allCases.find(c => c.id === selectedCaseId);
  }, [allCases, selectedCaseId]);

  const handlePrintFullHistory = async () => {
    setIsPrintingFull(true);
    try {
      await generateFullClinicalHistoryPDF(patient, patientCasesList);
    } finally {
      setIsPrintingFull(false);
    }
  };

  const exportarHistorialPDF = async () => {
    setIsExportingHistory(true);
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Historial de Episodios: ${patient.apellido}, ${patient.nombre}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`DNI: ${patient.dni} | Empresa: ${patient.empresa}`, 14, 28);
      if ((doc as any).autoTable) {
        (doc as any).autoTable({
          startY: 35,
          head: [['Fecha', 'Diagnóstico', 'Estado', 'Días']],
          body: casesSummary.map(c => [c.date, c.diagnosis, c.status, c.days]),
          theme: 'grid',
          headStyles: { fillColor: [188, 75, 19] }
        });
      }
      doc.save(`Resumen_Episodios_${patient.apellido}.pdf`);
    } finally {
      setIsExportingHistory(false);
    }
  };

  const handleDirectPrint = async (e: React.MouseEvent, c: any) => {
    e.stopPropagation();
    const latest = getLatestEvolution(c.evolutions);
    if (!latest) return;
    setPrintingId(c.id);
    try {
      await generateLegalCertificatePDF(patient, c.id, latest, c.status);
    } finally {
      setPrintingId(null);
    }
  };

  const imprimirCertificadoLegal = async (ev: EvolutionEntry) => {
    if (!selectedCaseData) return;
    setIsGeneratingPdf(true);
    try {
      await generateLegalCertificatePDF(patient, selectedCaseData.id, ev, selectedCaseData.status);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleProcessSubmit = async (status: AbsenteeismCase['status']) => {
    if (!evoData.diagnosis) {
      alert("Por favor, seleccione un diagnóstico.");
      return;
    }
    
    const maxPossible = diffDaysBetweenDates(evoData.startDate, absoluteMaxControlDate);
    if (evoData.daysAuthorized > maxPossible) {
      alert(`Error: No puede otorgar más de ${maxPossible} días adicionales (techo de solicitud original).`);
      return;
    }

    const newEvolution: EvolutionEntry = {
      id: generateUniqueId('EVO'),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: `Dr. ${currentUser.fullName}`,
      diagnosis: evoData.diagnosis,
      cie10: evoData.cie10,
      daysSuggested: 0,
      daysAuthorized: evoData.daysAuthorized,
      startDate: evoData.startDate,
      endDate: evoData.endDate,
      notes: evoData.notes
    };

    onAddEvolution(caseData.id, newEvolution, status);
    onBack();
  };

  const handleWhatsAppContact = () => {
    const cleanPhone = patient.telefono.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${patient.apellido} ${patient.nombre} nos comunicamos de Arial Medicina Laboral respecto a tu seguimiento`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const maxAvailableDays = diffDaysBetweenDates(evoData.startDate, absoluteMaxControlDate);
  const isExceeded = evoData.daysAuthorized > maxAvailableDays;

  const getStatusLabel = (s: string) => {
    if (s === 'ALTA_MEDICA') return 'ALTA MÉDICA';
    if (s === 'EN_SEGUIMIENTO') return 'EN SEGUIMIENTO';
    if (s === 'PENDIENTE_AUDITORIA') return 'PENDIENTE AUDITORÍA';
    return s;
  };

  const isCaseClosed = caseData.status === 'ALTA_MEDICA';

  return (
    <div className="space-y-6 md:space-y-8 pb-24 px-2 md:px-4 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* HEADER ACCIONES */}
      <div className="flex justify-between items-center no-print">
        <button onClick={onBack} className="flex items-center gap-2 px-4 md:px-6 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-slate-800 shadow-sm transition-all">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          {backLabel}
        </button>
      </div>

      {/* TARJETA PACIENTE CON BOTÓN WHATSAPP RESPONSIVE */}
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-12 w-full relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[5rem] -mr-16 -mt-16 opacity-0 md:group-hover:opacity-100 transition-all duration-700"></div>
        
        <div className="w-20 h-20 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2.5rem] bg-slate-900 text-white flex items-center justify-center text-3xl md:text-5xl font-black shadow-2xl uppercase shrink-0">
          {patient.nombre.charAt(0)}
        </div>
        
        <div className="flex-1 text-center md:text-left z-10 w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
            <h2 className="text-2xl md:text-4xl font-black text-slate-800 uppercase tracking-tighter leading-none">{patient.apellido}, {patient.nombre}</h2>
            <button 
              onClick={handleWhatsAppContact}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 md:py-2.5 bg-[#25D366] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all self-center md:self-auto w-full md:w-auto"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Contactar por WhatsApp
            </button>
          </div>
          <p className="text-[12px] font-black text-arial-orange uppercase tracking-[0.2em]">{patient.empresa}</p>
          <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>DNI: <span className="text-slate-700">{patient.dni}</span></span>
            <span>Legajo: <span className="text-slate-700">{patient.legajo}</span></span>
            <span>Tel: <span className="text-slate-700">{patient.telefono}</span></span>
          </div>
        </div>
      </div>

      {/* BLOQUE KPI ADAPTABLE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full">
        <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Patología Prevalente</p>
          <h4 className="text-sm font-black text-slate-800 uppercase leading-snug truncate">{kpis.prevalent}</h4>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Auditados / Solicitados</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl md:text-4xl font-black text-arial-orange tracking-tighter">{kpis.totalAuthorized}</p>
            <span className="text-xl font-black text-slate-200 italic">/</span>
            <p className="text-xl font-black text-slate-400">{kpis.totalSuggested}</p>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center sm:col-span-2 md:col-span-1">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Episodios</p>
          <p className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter">{kpis.totalIncidences}</p>
        </div>
      </div>

      {/* FORMULARIO DE PROCESO MÉDICO CON LÓGICA CORRELATIVA - BLOQUEADO SI ES ALTA */}
      {!isReadOnly && !isCaseClosed && (
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-100 animate-in slide-in-from-top-4 duration-700">
          <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-50 bg-slate-50/20">
            <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
              <span className="w-1.5 h-6 bg-arial-orange rounded-full"></span>
              {caseData.status === 'PENDIENTE_AUDITORIA' ? 'AUDITORÍA INICIAL' : 'SEGUIMIENTO CORRELATIVO'}
            </h3>
          </div>
          
          <div className="p-6 md:p-10 space-y-8 md:space-y-10">
            {/* FILA SUPERIOR: REFERENCIA DE ADMISIÓN / ANTERIOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">
                  {caseData.status === 'PENDIENTE_AUDITORIA' ? 'Fecha Inicio (Externo)' : 'Fecha Inicio (Desde control anterior)'}
                </label>
                <div className="w-full px-6 py-4 rounded-[1.2rem] bg-slate-50 border border-slate-100 text-slate-800 font-black text-sm cursor-not-allowed">
                  {formatDisplayDate(evoData.startDate)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">Techo Solicitado (Admisión Original)</label>
                <div className="w-full px-6 py-4 rounded-[1.2rem] bg-slate-50 border border-slate-100 text-slate-400 font-black text-sm cursor-not-allowed">
                  {formatDisplayDate(absoluteMaxControlDate)} ({admissionEntry.daysSuggested} días totales)
                </div>
              </div>
            </div>

            {/* FILA DE ACCIÓN: DÍAS A OTORGAR / FECHA CONTROL */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border transition-all ${isExceeded ? 'bg-red-50 border-red-200 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-orange-50/20 border-orange-100/50'}`}>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-2">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isExceeded ? 'text-red-600' : 'text-arial-orange'}`}>Días Auditados (A otorgar)</label>
                  {isExceeded && <span className="text-[8px] font-black text-red-500 uppercase">Máximo: {maxAvailableDays} días</span>}
                </div>
                <input 
                  type="number" 
                  max={maxAvailableDays}
                  className={`w-full px-6 md:px-8 py-4 md:py-5 rounded-[1.2rem] md:rounded-[1.5rem] bg-white border-2 font-black text-xl md:text-2xl text-center outline-none shadow-xl transition-all ${isExceeded ? 'border-red-500 text-red-600' : 'border-orange-100 text-arial-orange focus:border-arial-orange'}`}
                  value={evoData.daysAuthorized}
                  onChange={e => handleDaysChange(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-arial-orange uppercase tracking-widest ml-2">Fecha Próximo Control</label>
                <input 
                  type="date" 
                  className={`w-full px-6 md:px-8 py-4 md:py-5 rounded-[1.2rem] md:rounded-[1.5rem] bg-white border-2 text-slate-800 font-black text-sm outline-none shadow-xl transition-all ${isExceeded ? 'border-red-500' : 'border-orange-100 focus:border-arial-orange'}`}
                  value={evoData.endDate}
                  min={evoData.startDate}
                  max={absoluteMaxControlDate}
                  onChange={e => handleControlDateChange(e.target.value)}
                />
              </div>
            </div>

            {/* FILA DIAGNÓSTICO Y NOTAS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
              <div className="lg:col-span-5 space-y-6">
                <div className="relative" ref={cieRef}>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Diagnóstico Médico (CIE-10)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className="w-full pl-12 pr-4 py-4 rounded-[1.2rem] md:rounded-[1.5rem] bg-slate-50 border border-transparent text-slate-800 font-black text-sm focus:bg-white focus:border-arial-orange/30 outline-none transition-all shadow-inner"
                      value={cieSearch}
                      onFocus={() => setShowCieDropdown(true)}
                      onChange={e => { setCieSearch(e.target.value); setShowCieDropdown(true); }}
                      placeholder="Escriba código o patología..."
                    />
                    <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  
                  {evoData.diagnosis && (
                    <div className="mt-3 ml-2 animate-in slide-in-from-left-2 duration-300 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-700 uppercase leading-snug">
                        <span className="text-arial-orange mr-1">»</span> {evoData.diagnosis}
                      </p>
                    </div>
                  )}

                  {showCieDropdown && (
                    <div className="absolute z-[110] left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto border border-slate-100">
                      {filteredCie.map(item => (
                        <button key={item.code} type="button" className="w-full text-left px-5 py-3 hover:bg-orange-50 border-b border-slate-50 last:border-0 transition-colors" onClick={() => { 
                          setEvoData({...evoData, diagnosis: item.description, cie10: item.code}); 
                          setCieSearch(item.code); 
                          setShowCieDropdown(false); 
                        }}>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[9px] text-arial-orange bg-orange-100 px-2 py-0.5 rounded shrink-0">{item.code}</span>
                            <span className="text-[11px] font-black text-slate-700 uppercase truncate">{item.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Notas de Evolución Clínica</label>
                  <textarea 
                    rows={4} 
                    className="w-full px-6 md:px-8 py-5 md:py-6 rounded-[1.5rem] md:rounded-[2rem] bg-slate-50 border border-transparent text-slate-700 font-bold text-sm focus:bg-white focus:border-arial-orange/30 outline-none resize-none shadow-inner"
                    value={evoData.notes}
                    onChange={e => setEvoData({...evoData, notes: e.target.value})}
                    placeholder="Observaciones de la consulta..."
                  ></textarea>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button 
                    onClick={() => handleProcessSubmit('EN_SEGUIMIENTO')}
                    disabled={isExceeded}
                    className="flex-1 bg-[#0f172a] text-white px-14 py-7 rounded-[1.5rem] text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Siguiente Control
                  </button>
                  <button 
                    onClick={() => handleProcessSubmit('ALTA_MEDICA')}
                    disabled={isExceeded}
                    className="flex-1 bg-[#10b981] text-white px-14 py-7 rounded-[1.5rem] text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    Alta Médica
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL CLÍNICO CONSOLIDADO RESPONSIVE */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden w-full">
        <div className="px-6 md:px-10 py-8 md:py-10 border-b border-slate-50 bg-slate-50/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-slate-800 rounded-full"></div>
            <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.4em]">Historial de Episodios</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
              onClick={handlePrintFullHistory}
              disabled={isPrintingFull}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-arial-orange transition-all flex items-center justify-center gap-2"
            >
              {isPrintingFull ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>}
              Historia Clínica Completa
            </button>
            <button 
              onClick={exportarHistorialPDF}
              disabled={isExportingHistory}
              className="px-6 py-3 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              Resumen Episodios
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50/40 border-b border-slate-50">
                <th className="px-10 py-6">Episodio</th>
                <th className="px-10 py-6">Apertura</th>
                <th className="px-10 py-6">Diagnóstico Principal</th>
                <th className="px-10 py-6 text-center">Estado</th>
                <th className="px-10 py-6 text-center">Auditado</th>
                <th className="px-10 py-6 text-center">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {casesSummary.map((c, idx) => (
                <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${selectedCaseId === c.id ? 'bg-orange-50/30' : ''}`} onClick={() => { setSelectedCaseId(c.id); }}>
                  <td className="px-10 py-6"><p className="text-[10px] font-black text-slate-400">#{casesSummary.length - idx}</p></td>
                  <td className="px-10 py-6"><p className="text-[12px] font-black text-slate-800">{c.date.split('-').reverse().join('/')}</p></td>
                  <td className="px-10 py-6"><p className="text-[11px] font-black text-slate-700 uppercase truncate max-w-[300px]">{c.diagnosis}</p></td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase border ${c.status === 'ALTA_MEDICA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                        {getStatusLabel(c.status)}
                      </span>
                      <button 
                        onClick={(e) => handleDirectPrint(e, c)}
                        disabled={printingId === c.id}
                        className="p-2 bg-slate-50 hover:bg-arial-orange hover:text-white text-slate-300 rounded-xl transition-all shadow-sm border border-slate-100 disabled:opacity-50"
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
                  <td className="px-10 py-6 text-center font-black text-slate-800">{c.days} d</td>
                  <td className="px-10 py-6 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto group-hover:bg-arial-orange shadow-lg transition-all transform group-hover:scale-110">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL VISIÓN EVOLUTIVA - COLORES ACTUALIZADOS Y MENSAJE DE ESTADO */}
      {selectedCaseId && selectedCaseData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border border-slate-100 animate-in zoom-in-95 duration-300">
            <button onClick={() => setSelectedCaseId(null)} className="absolute top-6 md:top-10 right-6 md:right-10 p-2.5 bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-800 transition-all z-10 border border-slate-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-black text-[#1e293b] uppercase tracking-tighter mb-1">Visión Evolutiva</h2>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Episodio Ref: {selectedCaseId.split('-').pop()}</p>
              
              <div className="flex gap-3 mt-10 md:mt-12 overflow-x-auto pb-6 scrollbar-hide px-2">
                {selectedCaseData.evolutions.map((ev, idx) => {
                  const isActive = ev.id === activeEvoId || (idx === 0 && !activeEvoId);
                  const isAdm = ev.user.includes('Admisión');
                  const isLast = idx === selectedCaseData.evolutions.length - 1;
                  const isAlta = (isLast && selectedCaseData.status === 'ALTA_MEDICA');
                  
                  let label = isAdm ? 'ADMISIÓN' : isAlta ? 'ALTA MÉDICA' : `CONTROL ${idx}`;
                  
                  // LÓGICA DE COLORES POR ESTADO (Azul, Naranja, Verde)
                  let activeBorder = 'border-arial-orange bg-orange-50/30';
                  let activeLabelColor = 'text-arial-orange';
                  
                  if (isAdm) {
                    activeBorder = 'border-blue-600 bg-blue-50/50';
                    activeLabelColor = 'text-blue-600';
                  } else if (isAlta) {
                    activeBorder = 'border-emerald-600 bg-emerald-50/50';
                    activeLabelColor = 'text-emerald-600';
                  }

                  return (
                    <button 
                      key={ev.id} 
                      onClick={() => setActiveEvoId(ev.id)} 
                      className={`flex flex-col items-start gap-1 px-5 py-3.5 rounded-[1.2rem] border-2 transition-all shrink-0 min-w-[130px] ${isActive ? `${activeBorder} shadow-lg scale-105` : 'text-slate-300 border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                      <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isActive ? activeLabelColor : 'text-slate-300'}`}>{label}</p>
                      <p className={`text-[12px] font-black ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{ev.startDate.split('-').reverse().join('/')}</p>
                    </button>
                  );
                })}
              </div>

              {selectedCaseData.evolutions.length > 0 && (
                <div className="mt-8 space-y-6 animate-in fade-in duration-500">
                   {(() => {
                     const ev = selectedCaseData.evolutions.find(e => e.id === activeEvoId) || selectedCaseData.evolutions[0];
                     const isAdm = ev.user.includes('Admisión');
                     const isLast = selectedCaseData.evolutions.indexOf(ev) === selectedCaseData.evolutions.length - 1;
                     const isAltaItem = (isLast && selectedCaseData.status === 'ALTA_MEDICA');
                     
                     const daysNum = isAdm ? ev.daysSuggested : ev.daysAuthorized;
                     const labelDays = isAdm ? 'SOLICITADO' : 'AUDITADO';

                     // COLORES PARA TARJETAS DE CONTENIDO
                     const cardAccent = isAdm ? 'text-blue-600' : isAltaItem ? 'text-emerald-600' : 'text-arial-orange';
                     const cardBg = isAdm ? 'bg-blue-50/40' : isAltaItem ? 'bg-emerald-50/40' : 'bg-orange-50/50';
                     const cardBorder = isAdm ? 'border-blue-100' : isAltaItem ? 'border-emerald-100' : 'border-orange-100';

                     return (
                       <>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div className="bg-slate-50/50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center text-center">
                               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3">Periodo</p>
                               <p className="text-[13px] font-black text-slate-700 tracking-tight">
                                 {ev.startDate.split('-').reverse().join('/')} <span className="text-slate-300 mx-1 md:mx-2">al</span> {ev.endDate.split('-').reverse().join('/')}
                               </p>
                            </div>
                            <div className={`${cardBg} p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border ${cardBorder} flex flex-col items-center justify-center text-center`}>
                               <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-1 ${cardAccent}`}>{labelDays}</p>
                               <div className="flex items-baseline gap-1">
                                  <p className={`text-3xl md:text-4xl font-black tracking-tighter ${cardAccent}`}>{daysNum}</p>
                                  <span className={`text-lg font-black ${cardAccent}`}>d</span>
                               </div>
                            </div>
                         </div>

                         {/* MENSAJE DE ESTADO DE SEGUIMIENTO */}
                         {isLast && selectedCaseData.status === 'ALTA_MEDICA' && (
                           <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center gap-3">
                              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-[0.2em]">Sin seguimiento activo / Caso finalizado con Alta Médica</span>
                         </div>
                         )}

                         <div className="p-6 md:p-8 bg-slate-50/40 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-50 min-h-[120px] relative overflow-hidden">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">Nota de Evolución</p>
                            <p className="text-slate-600 text-[14px] font-medium italic leading-relaxed relative z-10">{ev.notes || 'Apertura administrativa del caso.'}</p>
                         </div>

                         <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
                            <div className="text-center md:text-left">
                               <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-tight">ATENDIDO POR:<br/> {ev.user.toUpperCase()}</p>
                               {isAdm && <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">(ADMISIÓN ADMINISTRATIVA)</p>}
                            </div>
                            <button 
                              onClick={() => imprimirCertificadoLegal(ev)} 
                              className="w-full md:w-auto bg-[#0f172a] text-white px-8 md:px-10 py-5 rounded-[1.2rem] md:rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-arial-orange transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                               {isGeneratingPdf ? (
                                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                               ) : (
                                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16L16 12H13V4H11V12H8L12 16ZM4 18H20V20H4V18Z"/></svg>
                               )}
                               Certificado Legal PDF
                            </button>
                         </div>
                       </>
                     );
                   })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDetail;
