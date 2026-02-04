
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User } from '../types';

interface AdminPanelProps {
  users: User[];
  onSaveUser: (userData: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

const RoleSelector: React.FC<{ 
  value: User['role']; 
  onChange: (role: User['role']) => void 
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const roles: { value: User['role']; label: string; icon: React.ReactNode }[] = [
    { 
      value: 'administrativo', 
      label: 'Administrativo', 
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> 
    },
    { 
      value: 'médico', 
      label: 'Médico Auditor', 
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> 
    },
    { 
      value: 'admin', 
      label: 'Administrador', 
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> 
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentRole = roles.find(r => r.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 rounded-[1.5rem] border-2 border-[#f1f5f9] bg-[#f8fafc] font-black text-xs text-slate-700 flex justify-between items-center transition-all hover:border-arial-orange outline-none"
      >
        <div className="flex items-center gap-3 uppercase tracking-widest">
           <span className="text-arial-orange">{currentRole?.icon}</span>
           {currentRole?.label}
        </div>
        <svg className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="absolute z-[120] mt-2 w-full bg-white border border-slate-100 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {roles.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => { onChange(role.value); setIsOpen(false); }}
              className={`w-full text-left px-7 py-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest transition-all border-b border-slate-50 last:border-0 ${value === role.value ? 'bg-orange-50 text-arial-orange' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              <span className={value === role.value ? 'text-arial-orange' : 'text-slate-300'}>{role.icon}</span>
              {role.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onSaveUser, onDeleteUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<User>({
    id: '', username: '', fullName: '', password: '', role: 'administrativo'
  });

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [users, searchTerm]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ id: `usr-${Date.now()}`, username: '', fullName: '', password: '', role: 'administrativo' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user, password: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.username) return;
    let userToSave = { ...formData };
    if (editingUser && !formData.password) userToSave.password = editingUser.password;
    await onSaveUser(userToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-arial-orange rounded-full"></div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Gestión de Personal</h2>
          </div>
          <p className="text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] ml-5">Panel de Identidades Cloud</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-arial-orange transition-all active:scale-95 flex items-center gap-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Registrar Usuario
        </button>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative group flex-1 max-w-md">
            <input 
              type="text" 
              placeholder="Buscar por nombre o usuario..." 
              className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 bg-white font-black text-[11px] outline-none focus:border-arial-orange transition-all shadow-sm"
              style={{ backgroundColor: '#ffffff' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-arial-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{filteredUsers.length} Activos</span>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                <th className="px-10 py-6">Personal</th>
                <th className="px-10 py-6">Rol Asignado</th>
                <th className="px-10 py-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase text-sm border border-slate-50 shadow-inner group-hover:bg-white transition-colors">
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-[13px] uppercase tracking-tight">{u.fullName}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border border-slate-100 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <div className={`w-1.5 h-1.5 rounded-full ${u.role === 'admin' ? 'bg-arial-orange' : u.role === 'médico' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                      {u.role}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleOpenEdit(u)} className="p-2.5 text-slate-300 hover:text-arial-orange hover:bg-orange-50 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => setDeleteConfirmId(u.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
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

      {/* MODAL REDISEÑADO CON SELECTOR PERSONALIZADO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-400 border border-white/20">
            <div className="p-10 md:p-12 border-b border-slate-50 flex justify-between items-start bg-slate-50/20">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                  {editingUser ? 'Actualizar Ficha' : 'Alta de Personal'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Información básica y rol</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white rounded-2xl text-slate-300 hover:text-slate-800 transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 md:p-12 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-5 rounded-[1.5rem] border-2 border-[#f1f5f9] bg-[#f8fafc] font-black text-sm outline-none focus:border-arial-orange focus:bg-white transition-all shadow-sm"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">Username / ID</label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-5 rounded-[1.5rem] border-2 border-[#f1f5f9] bg-[#f8fafc] font-black text-sm outline-none focus:border-arial-orange focus:bg-white transition-all shadow-sm"
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">Rol Asignado</label>
                    <RoleSelector value={formData.role} onChange={role => setFormData({...formData, role})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">
                    {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial'}
                  </label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full px-6 py-5 rounded-[1.5rem] border-2 border-[#f1f5f9] bg-[#f8fafc] font-black text-sm outline-none focus:border-arial-orange focus:bg-white transition-all shadow-sm"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-12 py-5 bg-arial-orange text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(188,75,19,0.3)] hover:brightness-110 active:scale-95 transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-sm w-full p-12 text-center border-b-[10px] border-red-500">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">¿Revocar Acceso?</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 uppercase text-[10px] tracking-widest">Esta acción es irreversible y bloqueará al usuario.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={async () => { await onDeleteUser(deleteConfirmId!); setDeleteConfirmId(null); }} 
                className="w-full py-5 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              >
                Eliminar Permanentemente
              </button>
              <button onClick={() => setDeleteConfirmId(null)} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
