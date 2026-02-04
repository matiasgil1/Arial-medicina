
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Patient, AbsenteeismCase, User, EvolutionEntry } from '../types';
import CaseDetail from './CaseDetail';

interface HistoryArchiveProps {
  patients: Patient[];
  cases: AbsenteeismCase[];
  currentUser: User;
  onAddEvolution: (caseId: string, evolution: EvolutionEntry, status?: AbsenteeismCase['status']) => void;
  onDeleteCase: (id: string) => void;
  preselectedPatientId?: string | null;
}

const HistoryArchive: React.FC<HistoryArchiveProps> = ({ patients, cases, currentUser, onAddEvolution, onDeleteCase, preselectedPatientId }) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(preselectedPatientId || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preselectedPatientId) setSelectedPatientId(preselectedPatientId);
  }, [preselectedPatientId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPatients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term.length < 1) return [];
    return patients.filter(p => 
      `${p.nombre} ${p.apellido} ${p.dni} ${p.legajo}`.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [patients, searchTerm]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  
  const patientCases = useMemo(() => {
    return cases.filter(c => c.patientId === selectedPatientId)
      .sort((a, b) => {
        const dateA = new Date(a.evolutions[0]?.timestamp || 0).getTime();
        const dateB = new Date(b.evolutions[0]?.timestamp || 0).getTime();
        return dateB - dateA;
      });
  }, [cases, selectedPatientId]);

  if (selectedPatientId && selectedPatient) {
    const latestCase = patientCases[0];

    if (!latestCase) {
      return (
        <div className="max-w-2xl mx-auto py-20 animate-in fade-in duration-500">
           <div className="bg-white p-16 rounded-[3.5rem] border-2 border-dashed border-slate-100 text-center shadow-xl">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-slate-200">
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Expediente Vacío</h3>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-10">Este colaborador no registra admisiones en el sistema Arial.</p>
              <button 
                onClick={() => setSelectedPatientId(null)}
                className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-arial-orange transition-all active:scale-95"
              >
                Volver al Buscador
              </button>
           </div>
        </div>
      );
    }

    return (
      <CaseDetail 
        allCases={cases}
        caseData={latestCase}
        patient={selectedPatient}
        currentUser={currentUser}
        onAddEvolution={onAddEvolution}
        onDeleteCase={onDeleteCase}
        isReadOnly={true}
        onBack={() => setSelectedPatientId(null)}
        initialCaseId={null} // <--- NO abrir modal automáticamente en Ficha Clínica
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-20 px-6 animate-in fade-in duration-700">
      <div className="text-center mb-16">
        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex items-center justify-center mx-auto mb-8 border border-slate-50 relative group">
            <div className="absolute inset-0 bg-arial-orange opacity-0 group-hover:opacity-5 rounded-[2rem] transition-opacity"></div>
            <svg className="w-10 h-10 text-arial-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase mb-3">Fichas Clínicas</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em] max-w-sm mx-auto leading-relaxed">Consulte el expediente consolidado y la trazabilidad del colaborador.</p>
      </div>

      <div className="relative" ref={searchRef}>
        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-200">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input 
            type="text" 
            className="w-full pl-16 pr-10 py-7 rounded-[2.5rem] border-2 border-slate-50 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.08)] text-slate-900 focus:border-arial-orange outline-none transition-all font-bold text-xl placeholder:text-slate-200"
            placeholder="DNI, Apellido o Legajo..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
        />
        {showDropdown && filteredPatients.length > 0 && (
            <div className="absolute z-[100] left-0 right-0 mt-6 bg-white border border-slate-50 rounded-[3rem] shadow-[0_40px_120px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                {filteredPatients.map(p => (
                    <button 
                        key={p.id} 
                        className="w-full text-left px-12 py-6 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 group flex justify-between items-center"
                        onClick={() => { setSelectedPatientId(p.id); setShowDropdown(false); }}
                    >
                        <div>
                            <p className="text-base font-black text-slate-800 group-hover:text-arial-orange transition-colors uppercase tracking-tight">{p.nombre} {p.apellido}</p>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1.5">DNI {p.dni} • <span className="text-arial-orange/40 group-hover:text-arial-orange transition-colors">{p.empresa}</span></p>
                        </div>
                        <svg className="w-6 h-6 text-slate-100 group-hover:text-arial-orange transition-all transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default HistoryArchive;
