
import React, { useState, useMemo } from 'react';
import { Company } from '../types';

interface CompanyManagerProps {
  companies: Company[];
  onSaveCompany: (company: Company) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
}

const CompanyManager: React.FC<CompanyManagerProps> = ({ companies, onSaveCompany, onDeleteCompany }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Company>({
    id: '',
    name: '',
    cuit: '',
    contactEmail: '',
    contactPhone: '',
    address: ''
  });

  const filteredCompanies = useMemo(() => {
    return (companies || []).filter(c => 
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      String(c.cuit || '').includes(searchTerm)
    ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [companies, searchTerm]);

  const handleOpenAdd = () => {
    setEditingCompany(null);
    setValidationError(null);
    setFormData({
      id: `comp-${Date.now()}`,
      name: '',
      cuit: '',
      contactEmail: '',
      contactPhone: '',
      address: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comp: Company) => {
    setEditingCompany(comp);
    setValidationError(null);
    // Aseguramos que el cuit sea string al editar
    setFormData({ ...comp, cuit: String(comp.cuit || '') });
    setIsModalOpen(true);
  };

  const handleCuitChange = (val: string) => {
    // Bloqueo estricto: solo números y máximo 11 caracteres
    const cleaned = val.replace(/\D/g, '').slice(0, 11);
    setFormData({ ...formData, cuit: cleaned });
    if (validationError) setValidationError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanCuit = String(formData.cuit || '').trim();

    if (!formData.name.trim()) {
      setValidationError("La Razón Social es obligatoria.");
      return;
    }

    if (cleanCuit.length > 0 && cleanCuit.length !== 11) {
      setValidationError("El CUIT debe tener exactamente 11 dígitos numéricos.");
      return;
    }

    // Validación de CUIT único
    if (cleanCuit.length === 11) {
      const isDuplicate = companies.some(c => String(c.cuit) === cleanCuit && c.id !== formData.id);
      if (isDuplicate) {
        setValidationError("Este CUIT ya se encuentra registrado por otra empresa.");
        return;
      }
    }

    await onSaveCompany({ ...formData, cuit: cleanCuit });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-10 bg-arial-orange rounded-full shadow-[0_0_15px_rgba(188,75,19,0.3)]"></div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Directorio de Empresas</h2>
          </div>
          <p className="text-slate-500 font-bold ml-5 uppercase text-[10px] tracking-[0.2em]">Gestión centralizada de clientes y entidades</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-slate-900 text-white px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-arial-orange hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Registrar Nueva
        </button>
      </header>

      <div className="bg-white rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="p-10 border-b border-slate-50 bg-slate-50/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative group flex-1 max-w-md">
            <input 
              type="text" 
              placeholder="Buscar por nombre o CUIT..." 
              className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 bg-white font-bold text-xs outline-none focus:border-arial-orange focus:ring-4 focus:ring-arial-orange/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-arial-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {filteredCompanies.length} Empresas Registradas
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] border-b border-slate-50">
                <th className="px-10 py-7">Empresa / Razón Social</th>
                <th className="px-10 py-7">Identificación (CUIT)</th>
                <th className="px-10 py-7">Canales de Contacto</th>
                <th className="px-10 py-7 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-32 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <p className="text-slate-300 font-black uppercase italic text-xs tracking-widest">No se encontraron empresas</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCompanies.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900/5 flex items-center justify-center font-black text-slate-400 text-lg uppercase group-hover:bg-arial-orange/10 group-hover:text-arial-orange transition-all">
                        {String(c.name || 'E').charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{c.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate max-w-[250px] uppercase mt-1">
                          {c.address || 'Domicilio no registrado'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="inline-flex items-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-600 text-[11px] tracking-wider">
                        {c.cuit ? String(c.cuit).replace(/^(\d{2})(\d{8})(\d{1})$/, '$1-$2-$3') : 'S/C'}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-700">{c.contactEmail || 'Sin email'}</p>
                      <p className="text-[10px] font-bold text-slate-400">{c.contactPhone || 'Sin teléfono'}</p>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex justify-center gap-3">
                      <button 
                        onClick={() => handleOpenEdit(c)} 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-arial-orange hover:bg-orange-50 transition-all"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(c.id)} 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Eliminar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-12 border-b border-slate-50 flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-3xl font-black text-[#1e293b] uppercase tracking-tighter leading-none">
                  {editingCompany ? 'EDITAR EMPRESA' : 'NUEVA EMPRESA'}
                </h3>
                <p className="text-[11px] font-bold text-arial-orange uppercase tracking-[0.25em]">Información Legal y Contacto</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-[#cbd5e1] hover:text-slate-900 hover:bg-slate-100 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-12 space-y-10">
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] ml-2">RAZÓN SOCIAL (OBLIGATORIO)</label>
                  <input 
                    type="text" 
                    className="w-full px-8 py-5 rounded-[1.5rem] border-2 border-[#f1f5f9] bg-[#f8fafc] font-black text-sm outline-none focus:border-arial-orange focus:bg-white transition-all"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    placeholder="Escriba la razón social completa"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] ml-2">CUIT (11 DÍGITOS)</label>
                    <input 
                      type="text" 
                      className="w-full px-8 py-5 rounded-[1.5rem] border-2 border-[#f1f5f9] bg-[#f8fafc] font-black text-sm outline-none focus:border-arial-orange focus:bg-white transition-all text-center tracking-widest"
                      value={formData.cuit}
                      onChange={e => handleCuitChange(e.target.value)}
                      placeholder="XXXXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] ml-2">TELÉFONO</label>
                    <input 
                      type="tel" 
                      className="w-full px-8 py-5 rounded-[1.5rem] border-2 border-[#f1f5f9] bg-[#f8fafc] font-black text-sm outline-none focus:border-arial-orange focus:bg-white transition-all"
                      value={formData.contactPhone}
                      onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                      placeholder="Número de contacto"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] ml-2">EMAIL CORPORATIVO</label>
                  <input 
                    type="email" 
                    className="w-full px-8 py-5 rounded-[1.5rem] border-2 border-[#f1f5f9] bg-[#f8fafc] font-black text-sm outline-none focus:border-arial-orange focus:bg-white transition-all"
                    value={formData.contactEmail}
                    onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                    placeholder="email@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] ml-2">DIRECCIÓN</label>
                  <input 
                    type="text" 
                    className="w-full px-8 py-5 rounded-[1.5rem] border-2 border-[#f1f5f9] bg-[#f8fafc] font-black text-sm outline-none focus:border-arial-orange focus:bg-white transition-all"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Calle, Ciudad, Provincia"
                  />
                </div>

                {validationError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in shake duration-300">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-tight">{validationError}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-12 py-5 bg-slate-900 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-arial-orange hover:-translate-y-1 active:scale-95 transition-all"
                >
                  Guardar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[4rem] shadow-2xl max-w-sm w-full p-16 text-center border-b-[12px] border-red-500">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">¿Eliminar Registro?</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-12">Esta acción no se puede deshacer y la empresa dejará de estar disponible para nuevos ingresos.</p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={async () => {
                  await onDeleteCompany(deleteConfirmId);
                  setDeleteConfirmId(null);
                }} 
                className="w-full py-5 bg-red-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
              >
                Confirmar Eliminación
              </button>
              <button onClick={() => setDeleteConfirmId(null)} className="w-full py-4 text-[11px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-600 transition-colors">Mantener Registro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManager;
