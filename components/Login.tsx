
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  apiError?: boolean;
  onRetry?: () => void;
  isLoading?: boolean;
  apiUrl?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, apiError, onRetry, isLoading, apiUrl }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const lowerUsername = username.toLowerCase().trim();
    const inputPwd = password.trim();

    // LÓGICA DE EMERGENCIA: Acceso local si la nube falla o no hay usuarios
    if (apiError || users.length === 0) {
      if (lowerUsername === 'admin' && inputPwd === 'admin123') {
        onLogin({ id: 'emergency', username: 'admin', fullName: 'Administrador (Modo Local)', role: 'admin' });
        return;
      }
    }

    // Buscamos al usuario comparando strings para evitar errores con números
    const user = users.find(u => {
      const storedUsername = String(u.username || '').toLowerCase().trim();
      const storedPassword = String(u.password || '').trim();
      return storedUsername === lowerUsername && storedPassword === inputPwd;
    });

    if (user) {
      onLogin(user);
    } else {
      setError(apiError 
        ? 'Error de conexión. Verifique su internet.' 
        : 'Usuario o contraseña incorrectos.'
      );
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-arial-orange to-[#7C2D12] p-6">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-arial-orange tracking-tighter">ARIAL</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Ausentismo & Auditoría</p>
          </div>

          {isLoading && users.length === 0 && (
            <div className="mb-6 p-4 bg-orange-50 rounded-2xl flex items-center justify-center gap-3 animate-pulse border border-orange-100">
              <div className="w-3 h-3 bg-arial-orange rounded-full animate-bounce"></div>
              <span className="text-[10px] font-black text-arial-orange uppercase tracking-widest">Sincronizando usuarios...</span>
            </div>
          )}

          {apiError && (
            <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-[2rem] text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Falla de Red</p>
              <button onClick={onRetry} disabled={isLoading} className="w-full px-6 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all">
                {isLoading ? 'Reintentando...' : 'Reintentar Conexión'}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-arial-orange/10 focus:border-arial-orange outline-none transition-all font-medium"
                placeholder="Nombre de usuario"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-arial-orange/10 focus:border-arial-orange outline-none transition-all font-medium"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-xs font-bold text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading && users.length === 0}
              className="w-full bg-arial-orange text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-arial-orange/30 hover:opacity-90 active:scale-95 transition-all mt-4 disabled:opacity-50"
            >
              Entrar al Sistema
            </button>
          </form>
        </div>
        
        <div className="px-12 py-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">© 2026 ARIAL - TODOS LOS DERECHOS RESERVADOS</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
