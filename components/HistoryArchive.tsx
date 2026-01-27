
import React, { useState, useRef, useEffect } from 'react';
import { Patient, AbsenteeismCase, User, EvolutionEntry } from '../types';
import CaseDetail from './CaseDetail';

interface HistoryArchiveProps {
  patients: Patient[];
  cases: AbsenteeismCase[];
  currentUser: User;
  // Fix: added optional status parameter to match CaseDetail and resolve argument mismatch in App.tsx
  onAddEvolution: (caseId: string, evolution: EvolutionEntry, status?: string) => void;
  onDeleteCase: (id: string) => void;
  preselectedPatientId?: string | null;
}

const HistoryArchive: React.FC<HistoryArchiveProps> = ({ patients, cases, currentUser, onAddEvolution, onDeleteCase, preselectedPatientId }) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(preselectedPatientId || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Efecto para capturar navegación externa
  useEffect(() => {
    if (preselectedPatientId) {
      setSelectedPatientId(preselectedPatientId);
    }
  }, [preselectedPatientId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPatients = searchTerm.length >= 1
    ? patients.filter(p => {
        const term = searchTerm.toLowerCase();
        const name = String(p.nombre || '').toLowerCase();
        const lastName = String(p.apellido || '').toLowerCase();
        const dni = String(p.dni || '').toLowerCase();
        const legajo = String(p.legajo || '').toLowerCase();
        
        return name.includes(term) || 
               lastName.includes(term) ||
               dni.includes(term) || 
               legajo.includes(term);
      }).slice(0, 8)
    : [];

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const patientCases = cases.filter(c => c.patientId === selectedPatientId);
  
  const consolidatedCase: AbsenteeismCase | null = selectedPatientId ? {
    id: 'HIST-CONSOLIDATED',
    patientId: selectedPatientId,
    status: 'EN_SEGUIMIENTO',
    evolutions: patientCases.flatMap(c => c.evolutions).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  } : null;

  if (selectedPatientId && consolidatedCase && selectedPatient) {
    return (
      <CaseDetail 
        caseData={consolidatedCase}
        patient={selectedPatient}
        currentUser={currentUser}
        onAddEvolution={onAddEvolution}
        onDeleteCase={onDeleteCase}
        isReadOnly={true}
        onBack={() => {
            setSelectedPatientId(null);
            setSearchTerm('');
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 animate-in fade-in duration-700">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4 border border-slate-50">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Buscador de Historias Clínicas</h2>
        <p className="text-slate-500 font-medium text-xs max-w-md mx-auto leading-relaxed">
            Consulte el expediente consolidado y trazabilidad legal de cada colaborador.
        </p>
      </div>

      <div className="relative" ref={searchRef}>
        <div className="relative group">
            <input 
                type="text" 
                className="w-full px-8 py-5 rounded-3xl border border-slate-200 bg-white shadow-xl text-slate-900 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none transition-all font-bold text-base placeholder:text-slate-300"
                placeholder="Nombre, legajo o DNI..."
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-orange-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
        </div>

        {showDropdown && filteredPatients.length > 0 && (
            <div className="absolute z-[100] left-0 right-0 mt-4 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-[400px] overflow-hidden overflow-y-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-300">
                {filteredPatients.map(p => (
                    <button 
                        key={p.id} 
                        className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 group outline-none"
                        onClick={() => {
                            setSelectedPatientId(p.id);
                            setShowDropdown(false);
                        }}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-black text-slate-800 group-hover:text-arial-orange transition-colors">
                              {p.nombre} {p.apellido}
                            </span>
                            <span className="px-2 py-0.5 bg-orange-50 text-arial-orange text-[8px] font-black rounded border border-orange-100 uppercase tracking-widest">{p.empresa}</span>
                        </div>
                        <div className="flex gap-3 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>DNI: {p.dni}</span>
                            <span>LEG: {p.legajo}</span>
                        </div>
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default HistoryArchive;
