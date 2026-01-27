
import React, { useState, useMemo } from 'react';
import { User } from '../types';

interface AdminPanelProps {
  users: User[];
  onSaveUser: (userData: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onSaveUser, onDeleteUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<User>({
    id: '',
    username: '',
    fullName: '',
    password: '',
    role: 'administrativo'
  });

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      id: `usr-${Date.now()}`,
      username: '',
      fullName: '',
      password: '',
      role: 'administrativo'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    // IMPORTANTE: Al editar, mostramos el campo de contraseña vacío por seguridad
    setFormData({ ...user, password: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.username) return;

    let userToSave = { ...formData };
    
    // Si estamos editando y la contraseña está vacía, mantenemos la anterior
    if (editingUser && !formData.password) {
        userToSave.password = editingUser.password;
    }

    await onSaveUser(userToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-arial-orange rounded-full"></div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Gestión de Identidades</h2>
          </div>
          <p className="text-slate-500 font-medium ml-5 uppercase text-[10px] tracking-[0.2em]">Panel de Control de Acceso</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-arial-orange transition-all active:scale-95 flex items-center gap-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Registrar Personal
        </button>
      </header>

      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
          <input 
            type="text" 
            placeholder="Buscar por nombre o usuario..." 
            className="w-full md:w-96 pl-6 pr-6 py-4 rounded-2xl border border-slate-200 bg-white font-bold text-xs outline-none focus:border-arial-orange transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
              <th className="px-10 py-6">Personal</th>
              <th className="px-10 py-6">Rol</th>
              <th className="px-10 py-6 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase">
                      {u.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{u.fullName}</p>
                      <p className="text-[10px] font-bold text-slate-400">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <span className="px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border-slate-100">
                    {u.role}
                  </span>
                </td>
                <td className="px-10 py-6">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleOpenEdit(u)} className="p-2 text-slate-400 hover:text-arial-orange">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setDeleteConfirmId(u.id)} className="p-2 text-slate-400 hover:text-red-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-12 border-b border-slate-50 flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-[#1e293b] uppercase tracking-tighter leading-none">
                  {editingUser ? 'EDITAR PERSONAL' : 'ALTA DE PERSONAL'}
                </h3>
                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.2em]">INFORMACIÓN BÁSICA Y ROL</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#cbd5e1] hover:text-[#94a3b8] transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-12 space-y-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.15em] ml-1">NOMBRE COMPLETO</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-5 rounded-[1.5rem] border border-[#f1f5f9] bg-[#f8fafc] font-bold text-sm outline-none focus:border-arial-orange focus:bg-white transition-all shadow-sm"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.15em] ml-1">USERNAME</label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-5 rounded-[1.5rem] border border-[#f1f5f9] bg-[#f8fafc] font-bold text-sm outline-none focus:border-arial-orange focus:bg-white transition-all shadow-sm"
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.15em] ml-1">ROL ASIGNADO</label>
                    <div className="relative">
                      <select 
                        className="w-full px-6 py-5 rounded-[1.5rem] border border-[#f1f5f9] bg-[#f8fafc] font-bold text-sm outline-none focus:border-arial-orange focus:bg-white appearance-none cursor-pointer pr-12 transition-all shadow-sm"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as any})}
                      >
                        <option value="administrativo">Administrativo</option>
                        <option value="médico">Médico Auditor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.15em] ml-1">
                    {editingUser ? 'NUEVA CONTRASEÑA (DEJAR VACÍO PARA MANTENER)' : 'CONTRASEÑA INICIAL'}
                  </label>
                  <input 
                    type="password" 
                    placeholder="•••••"
                    className="w-full px-6 py-5 rounded-[1.5rem] border border-[#f1f5f9] bg-[#f8fafc] font-bold text-sm outline-none focus:border-arial-orange focus:bg-white transition-all shadow-sm"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-[10px] font-black text-[#94a3b8] uppercase tracking-widest hover:text-[#64748b] transition-colors"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit" 
                  className="px-10 py-5 bg-[#BC4B13] text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-[0_15px_30px_rgba(188,75,19,0.3)] hover:opacity-95 active:scale-95 transition-all"
                >
                  GUARDAR CAMBIOS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-sm w-full p-12 text-center border-b-8 border-red-500">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">¿Revocar Acceso?</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10">El usuario ya no podrá ingresar al sistema Arial.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={async () => {
                  await onDeleteUser(deleteConfirmId);
                  setDeleteConfirmId(null);
                }} 
                className="w-full py-5 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
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
