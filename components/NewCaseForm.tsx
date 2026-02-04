
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
    nombre: '', apellido: '', edad: '', dni: '', mail: '', empresa: '', telefono: '', legajo: '' 
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

  const filteredPatients = patientSearch.length >= 1 && !isFormVisible
    ? patients.filter(p => {
        const searchTerm = patientSearch.toLowerCase();
        return String(p.nombre || '').toLowerCase().includes(searchTerm) || 
               String(p.apellido || '').toLowerCase().includes(searchTerm) ||
               String(p.dni || '').toLowerCase().includes(searchTerm);
      }).slice(0, 8)
    : [];

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

  useEffect(() => {
    if (editingCase) {
      const latest = getLatestEvolution(editingCase.evolutions);
      const patient = patients.find(p => p.id === editingCase.patientId);
      setPatientId(editingCase.patientId);
      if (patient) setPatientData({ ...patient });
      setFormData({
        diagnosis: latest?.diagnosis || '',
        cie10: latest?.cie10 || '',
        daysSuggested: latest?.daysSuggested || 1,
        startDate: latest?.startDate || new Date().toISOString().split('T')[0],
        notes: latest?.notes || ''
      });
      setCieSearch(latest?.cie10 || '');
      setIsFormVisible(true);
    }
  }, [editingCase, patients]);

  const handleSelectExisting = (p: Patient) => {
    setPatientId(p.id);
    setPatientData({ ...p });
    setPatientSearch(`${p.nombre} ${p.apellido}`);
    setShowPatientDropdown(false);
    setIsFormVisible(true);
  };

  const handleCreateNew = () => {
    setPatientId(null);
    setPatientData({ nombre: '', apellido: '', edad: '', dni: '', mail: '', empresa: '', telefono: '', legajo: '' });
    setPatientSearch('');
    setIsFormVisible(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalPatientId = patientId || `PAT-${Date.now()}`;
    
    const patientToSave: Patient = {
      ...patientData,
      id: finalPatientId,
      fecha: new Date().toLocaleString(),
      legajo: patientData.legajo || `LEG-${Math.floor(1000 + Math.random() * 9000)}`
    };

    const finalDiagnosis = formData.diagnosis || (cieSearch.trim() !== '' ? cieSearch.trim() : 'PENDIENTE DE DIAGNÓSTICO');
    const finalCie10 = formData.cie10 || (formData.diagnosis ? CIE10_COMMON_LIST.find(i => i.description === formData.diagnosis)?.code : 'S/D') || 'S/D';

    const evolution: EvolutionEntry = {
      id: `adm-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: `${currentUser.fullName} (Admisión)`,
      diagnosis: finalDiagnosis,
      cie10: finalCie10,
      daysSuggested: formData.daysSuggested,
      daysAuthorized: 0,
      startDate: formData.startDate,
      endDate: addDaysToDate(formData.startDate, formData.daysSuggested),
      notes: formData.notes
    };

    const payload: AbsenteeismCase = {
      id: editingCase ? editingCase.id : `AUS-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: finalPatientId,
      status: 'PENDIENTE_AUDITORIA',
      evolutions: editingCase ? [...editingCase.evolutions, evolution] : [evolution]
    };

    onSubmit(payload, patientToSave);
  };

  const inputClasses = "w-full px-4 py-3 md:py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-4 focus:ring-arial-orange/10 focus:border-arial-orange outline-none transition-all font-bold text-xs md:text-sm shadow-sm";
  const labelClasses = "text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-1.5 block ml-1 tracking-widest";

  return (
    <div className="max-w-4xl mx-auto py-2 md:py-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 md:px-10 py-5 md:py-6 bg-slate-900 text-white">
            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">Admisión Administrativa</h2>
            <p className="text-white/40 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mt-1">Apertura de caso</p>
        </div>

        {!isFormVisible ? (
          <div className="p-8 md:p-16 space-y-6 md:space-y-8 text-center">
            <div className="max-w-md mx-auto relative" ref={patientSearchRef}>
              <h3 className="text-[10px] md:text-xs font-black text-slate-800 uppercase tracking-widest mb-4 md:mb-6">Identificar Colaborador</h3>
              <div className="relative group">
                <input 
                  type="text" 
                  className="w-full px-6 md:px-8 py-4 md:py-5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-arial-orange outline-none transition-all font-bold text-base md:text-lg placeholder:text-slate-300 shadow-inner"
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                  placeholder="DNI, Nombre o Apellido..."
                />
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute z-[70] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 text-left max-h-60 md:max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    {filteredPatients.map(p => (
                      <button key={p.id} type="button" className="w-full text-left px-4 md:px-5 py-3 md:py-4 hover:bg-orange-50 rounded-xl transition-all border-b border-slate-50 last:border-0" onClick={() => handleSelectExisting(p)}>
                        <p className="font-black text-slate-800 text-xs md:text-sm">{p.nombre} {p.apellido}</p>
                        <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 truncate">{p.empresa} | DNI: {p.dni}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-slate-100 flex flex-col items-center">
                <button type="button" onClick={handleCreateNew} className="w-full md:w-auto px-8 md:px-10 py-4 bg-white text-arial-orange rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] border-2 border-arial-orange/10 hover:bg-arial-orange hover:text-white transition-all shadow-xl active:scale-95">
                  + Nuevo Registro de Paciente
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 md:space-y-10">
            <section className="space-y-4 md:space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-[9px] md:text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Datos del Colaborador</h3>
                <button type="button" onClick={() => setIsFormVisible(false)} className="text-[8px] md:text-[9px] font-black text-arial-orange bg-orange-50 px-3 py-1 rounded-full uppercase hover:bg-arial-orange hover:text-white transition-all">Cambiar</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 p-4 md:p-8 bg-slate-50/50 rounded-2xl md:rounded-[2rem] border border-slate-100">
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClasses}>Nombre</label>
                  <input type="text" className={inputClasses} value={patientData.nombre} onChange={e => setPatientData({...patientData, nombre: e.target.value})} required />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClasses}>Apellido</label>
                  <input type="text" className={inputClasses} value={patientData.apellido} onChange={e => setPatientData({...patientData, apellido: e.target.value})} required />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClasses}>DNI</label>
                  <input type="text" className={inputClasses} value={patientData.dni} onChange={e => setPatientData({...patientData, dni: e.target.value})} required />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClasses}>Edad</label>
                  <input type="number" className={inputClasses} value={patientData.edad} onChange={e => setPatientData({...patientData, edad: e.target.value})} required />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClasses}>Legajo</label>
                  <input type="text" className={inputClasses} value={patientData.legajo} onChange={e => setPatientData({...patientData, legajo: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-2">
                  <label className={labelClasses}>Empresa</label>
                  <select 
                    className={inputClasses} 
                    value={patientData.empresa} 
                    onChange={e => setPatientData({...patientData, empresa: e.target.value})} 
                    required
                  >
                    <option value="">Seleccione...</option>
                    {companies.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className={labelClasses}>Email</label>
                  <input type="email" className={inputClasses} value={patientData.mail} onChange={e => setPatientData({...patientData, mail: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className={labelClasses}>Teléfono</label>
                  <input type="tel" className={inputClasses} value={patientData.telefono} onChange={e => setPatientData({...patientData, telefono: e.target.value})} required />
                </div>
              </div>
            </section>

            <section className="space-y-4 md:space-y-6">
              <h3 className="text-[9px] md:text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Certificado Externo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="relative" ref={cieRef}>
                  <label className={labelClasses}>Diagnóstico Sugerido (Opcional)</label>
                  <input 
                    type="text" 
                    className={inputClasses} 
                    value={cieSearch} 
                    onFocus={() => setShowCieDropdown(true)} 
                    onChange={e => { setCieSearch(e.target.value); setShowCieDropdown(true); }} 
                    placeholder="Escriba o busque diagnóstico..." 
                  />
                  {showCieDropdown && (
                    <div className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 max-h-[200px] md:max-h-[250px] overflow-y-auto">
                      {filteredCie.map(item => (
                        <button key={item.code} type="button" className="w-full text-left px-3 md:px-4 py-2.5 md:py-3 hover:bg-orange-50 rounded-xl transition-all border-b border-slate-50 last:border-0" onClick={() => { 
                          setFormData({...formData, diagnosis: item.description, cie10: item.code}); 
                          setCieSearch(item.code); 
                          setShowCieDropdown(false); 
                        }}>
                          <div className="flex items-center gap-2 md:gap-3">
                            <span className="font-black text-[9px] text-arial-orange bg-orange-100 px-2 py-0.5 rounded min-w-[45px] text-center shrink-0">{item.code}</span>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-700 uppercase truncate">{item.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className={labelClasses}>Fecha Certificado Externo</label>
                    <input type="date" className={inputClasses} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClasses}>Días Solicitados</label>
                    <input type="number" min="1" className={inputClasses} value={formData.daysSuggested} onChange={e => setFormData({...formData, daysSuggested: parseInt(e.target.value) || 1})} />
                  </div>
                </div>
              </div>
              <textarea rows={3} className={inputClasses} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Observaciones administrativas..." />
            </section>

            <div className="pt-6 md:pt-8 flex flex-col md:flex-row justify-end gap-3 md:gap-4 border-t border-slate-100">
              <button type="button" onClick={onCancel} className="order-2 md:order-1 px-8 py-3.5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Descartar</button>
              <button type="submit" className="order-1 md:order-2 px-10 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] md:text-[11px] uppercase shadow-2xl hover:bg-arial-orange transition-all tracking-widest active:scale-95">
                Enviar a Auditoría
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewCaseForm;
