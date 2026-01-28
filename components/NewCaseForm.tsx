
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Patient, AbsenteeismCase, EvolutionEntry, User, Company } from '../types';
import { getLatestEvolution, addDaysToDate } from '../utils';
import { CIE10_COMMON_LIST } from '../constants';

interface NewCaseFormProps {
  patients: Patient[];
  companies: Company[];
  editingCase?: AbsenteeismCase | null;
  currentUser: User;
  onSubmit: (newCase: AbsenteeismCase, newPatient?: Patient) => void;
  onCancel: () => void;
}

const NewCaseForm: React.FC<NewCaseFormProps> = ({ patients, companies, editingCase, currentUser, onSubmit, onCancel }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  
  const [patientData, setPatientData] = useState({ 
    nombre: '', apellido: '', edad: '', dni: '', mail: '', empresa: '', telefono: '', legajo: '', fecha: '' 
  });
  
  const [formData, setFormData] = useState({ 
    diagnosis: '', 
    cie10: '', 
    daysSuggested: 1, 
    startDate: new Date().toISOString().split('T')[0], 
    notes: '' 
  });

  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);

  const [cieSearch, setCieSearch] = useState('');
  const [showCieDropdown, setShowCieDropdown] = useState(false);
  const cieRef = useRef<HTMLDivElement>(null);

  const [conflict, setConflict] = useState<{ type: 'ERROR' | 'WARNING'; patient: Patient } | null>(null);

  // LÓGICA DE BÚSQUEDA CORREGIDA
  const filteredPatients = useMemo(() => {
    const term = patientSearch.toLowerCase().trim();
    if (!term || isFormVisible) return [];
    
    return patients.filter(p => {
        const fullSearch = `${p.nombre} ${p.apellido} ${p.dni}`.toLowerCase();
        const cleanDni = String(p.dni || '').replace(/\D/g, '');
        const cleanTerm = term.replace(/\D/g, '');
        
        return fullSearch.includes(term) || (cleanTerm && cleanDni.includes(cleanTerm));
      }).slice(0, 6);
  }, [patients, patientSearch, isFormVisible]);

  const filteredCie = useMemo(() => {
    if (cieSearch.length === 0) return CIE10_COMMON_LIST;
    return CIE10_COMMON_LIST.filter(item => 
        item.code.toLowerCase().includes(cieSearch.toLowerCase()) || 
        item.description.toLowerCase().includes(cieSearch.toLowerCase())
    ).slice(0, 50);
  }, [cieSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cieRef.current && !cieRef.current.contains(event.target as Node)) setShowCieDropdown(false);
      if (patientSearchRef.current && !patientSearchRef.current.contains(event.target as Node)) setShowPatientDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectExisting = (p: Patient) => {
    setPatientId(p.id);
    setConflict(null); 
    setPatientData({ ...p, fecha: p.fecha || '' });
    setPatientSearch(`${p.nombre} ${p.apellido}`);
    setShowPatientDropdown(false);
    setIsFormVisible(true);
  };

  const handleCreateNew = () => {
    setPatientId(null);
    setPatientData({ nombre: '', apellido: '', edad: '', dni: '', mail: '', empresa: '', telefono: '', legajo: '', fecha: '' });
    setPatientSearch('');
    setIsFormVisible(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDni = String(patientData.dni).replace(/\D/g, '');
    const cleanEmpresa = patientData.empresa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
    const finalPatientId = patientId || `PAT-${cleanDni}-${cleanEmpresa}`;
    const patientToSave: Patient = { ...patientData, id: finalPatientId, dni: cleanDni, fecha: patientData.fecha || new Date().toLocaleString() };
    
    const evolution: EvolutionEntry = {
      id: `adm-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: `${currentUser.fullName} (Admisión)`,
      diagnosis: formData.diagnosis || cieSearch || "Consulta Administrativa",
      cie10: formData.cie10 || "S/D",
      daysSuggested: formData.daysSuggested,
      daysAuthorized: 0,
      startDate: formData.startDate,
      endDate: addDaysToDate(formData.startDate, formData.daysSuggested),
      notes: formData.notes || "Apertura de caso."
    };
    onSubmit({ id: editingCase ? editingCase.id : `AUS-${cleanDni}-${Math.floor(Math.random() * 9000)}`, patientId: finalPatientId, status: 'PENDIENTE_AUDITORIA', evolutions: editingCase ? [...editingCase.evolutions, evolution] : [evolution] }, patientToSave);
  };

  const inputClasses = "w-full px-5 py-3 rounded-xl border border-slate-100 bg-white text-slate-800 focus:border-arial-orange outline-none transition-all font-bold text-xs shadow-sm";
  const labelClasses = "text-[7px] font-black text-slate-400 uppercase mb-1 block ml-1 tracking-[0.2em]";

  return (
    <div className="max-w-4xl mx-auto py-2 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-50 overflow-hidden min-h-[500px]">
        
        {/* HEADER */}
        <div className="px-8 py-5 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-arial-orange rounded-full"></div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">Admisión de Ausentismo</h2>
                <p className="text-white/30 text-[7px] font-black uppercase tracking-[0.3em]">Protocolo de Identificación Cloud</p>
              </div>
            </div>
            {isFormVisible && (
              <button type="button" onClick={() => { setIsFormVisible(false); setPatientId(null); setPatientSearch(''); }} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">Cancelar</button>
            )}
        </div>

        {!isFormVisible ? (
          /* PANTALLA DE IDENTIFICACIÓN REFINADA */
          <div className="p-8 md:p-16 flex flex-col items-center justify-center space-y-12 h-full">
            <div className="w-full max-w-md relative" ref={patientSearchRef}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 text-center">Identificar Colaborador</h3>
              
              <div className="relative z-[100]">
                <input 
                  type="text" 
                  autoFocus
                  className="w-full px-8 py-5 rounded-full border-2 border-slate-100 bg-white focus:border-arial-orange outline-none transition-all font-bold text-base placeholder:text-slate-300 shadow-xl pr-16"
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                  placeholder="DNI o Apellido del trabajador..."
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                {/* DROPDOWN RESULTADOS */}
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] p-2 text-left animate-in fade-in slide-in-from-top-2 duration-300">
                    {filteredPatients.map(p => (
                      <button key={p.id} type="button" className="w-full text-left px-7 py-4 hover:bg-slate-50 rounded-2xl transition-all border-b border-slate-50 last:border-0 group flex items-center justify-between" onClick={() => handleSelectExisting(p)}>
                        <div>
                          <p className="font-black text-slate-800 text-xs uppercase group-hover:text-arial-orange transition-colors">{p.nombre} {p.apellido}</p>
                          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{p.empresa}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-black text-slate-300 group-hover:text-slate-500">DNI {p.dni}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BOTÓN NUEVO INGRESO (MÁS FINO Y ELEGANTE) */}
            <div className="w-full max-w-xs flex flex-col items-center gap-6">
              <div className="w-12 h-px bg-slate-100"></div>
              <button 
                type="button" 
                onClick={handleCreateNew} 
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.25em] shadow-xl hover:bg-arial-orange active:scale-95 transition-all flex items-center justify-center gap-4 group"
              >
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                Registrar Nuevo Ingreso
              </button>
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest italic text-center leading-relaxed">Solo si el colaborador no figura<br/>en los servidores centrales.</p>
            </div>
          </div>
        ) : (
          /* FORMULARIO DE CARGA */
          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-10 animate-in fade-in duration-500">
            <section className="space-y-6">
              <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-50 pb-2">Datos del Colaborador</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-6 bg-slate-50/40 rounded-[2rem] border border-slate-50">
                <div className="col-span-1 md:col-span-2"><label className={labelClasses}>DNI</label><input type="text" className={inputClasses} value={patientData.dni} onChange={e => setPatientData({...patientData, dni: e.target.value.replace(/\D/g, '')})} required disabled={!!patientId && !editingCase} /></div>
                <div className="col-span-2 md:col-span-2"><label className={labelClasses}>Empresa</label><select className={inputClasses} value={patientData.empresa} onChange={e => setPatientData({...patientData, empresa: e.target.value})} required disabled={!!patientId && !editingCase}><option value="">---</option>{companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div className="col-span-1 md:col-span-2"><label className={labelClasses}>Legajo</label><input type="text" className={inputClasses} value={patientData.legajo} onChange={e => setPatientData({...patientData, legajo: e.target.value})} disabled={!!patientId && !editingCase} /></div>
                <div className="col-span-3"><label className={labelClasses}>Nombres</label><input type="text" className={inputClasses} value={patientData.nombre} onChange={e => setPatientData({...patientData, nombre: e.target.value.toUpperCase()})} required disabled={!!patientId && !editingCase} /></div>
                <div className="col-span-3"><label className={labelClasses}>Apellidos</label><input type="text" className={inputClasses} value={patientData.apellido} onChange={e => setPatientData({...patientData, apellido: e.target.value.toUpperCase()})} required disabled={!!patientId && !editingCase} /></div>
                <div className="col-span-1 md:col-span-2"><label className={labelClasses}>Edad</label><input type="number" className={inputClasses} value={patientData.edad} onChange={e => setPatientData({...patientData, edad: e.target.value})} required disabled={!!patientId && !editingCase} /></div>
                <div className="col-span-2 md:col-span-4"><label className={labelClasses}>Teléfono Móvil</label><input type="tel" className={inputClasses} value={patientData.telefono} onChange={e => setPatientData({...patientData, telefono: e.target.value})} required disabled={!!patientId && !editingCase} /></div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-50 pb-2">Declaración Médica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative" ref={cieRef}>
                  <label className={labelClasses}>Diagnóstico Externo</label>
                  <input type="text" className={inputClasses} value={cieSearch} onFocus={() => setShowCieDropdown(true)} onChange={e => { setCieSearch(e.target.value); setShowCieDropdown(true); }} placeholder="CIE-10 o síntoma..." />
                  {showCieDropdown && (
                    <div className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 max-h-[200px] overflow-y-auto">
                      {filteredCie.map(item => (
                        <button key={item.code} type="button" className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl transition-all border-b border-slate-50 last:border-0" onClick={() => { setFormData({...formData, diagnosis: item.description, cie10: item.code}); setCieSearch(item.code); setShowCieDropdown(false); }}>
                          <div className="flex items-center gap-3"><span className="font-black text-[9px] text-arial-orange bg-orange-100 px-2 py-0.5 rounded-md">{item.code}</span><p className="text-[9px] font-black text-slate-700 uppercase truncate">{item.description}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClasses}>Fecha Inicio</label><input type="date" className={inputClasses} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} /></div>
                  <div><label className={labelClasses}>Días Sugeridos</label><input type="number" min="1" className={inputClasses} value={formData.daysSuggested} onChange={e => setFormData({...formData, daysSuggested: parseInt(e.target.value) || 1})} /></div>
                </div>
              </div>
              <textarea rows={2} className={inputClasses} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Detalles de la patología o derivación..." />
            </section>

            <div className="pt-8 flex flex-col md:flex-row justify-end gap-4 border-t border-slate-50">
              <button type="button" onClick={() => setIsFormVisible(false)} className="px-8 py-4 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-slate-600 transition-colors">Volver</button>
              <button type="submit" className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.25em] shadow-xl hover:bg-arial-orange active:scale-95 transition-all">Finalizar Ingreso</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewCaseForm;
