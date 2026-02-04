
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  apiError?: boolean;
  onRetry?: () => void;
  isLoading?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, apiError, onRetry, isLoading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const inputUser = String(username || '').toLowerCase().trim();
    const inputPass = String(password || '').trim();

    if (users.length === 0) {
      if (isLoading) {
        setError("Sincronizando base de datos... aguarde unos segundos.");
      } else {
        setError("Base de datos no disponible. Intente sincronizar.");
      }
      return;
    }

    // Busqueda normalizada en la base de datos real
    const found = users.find(u => {
      const uName = String(u.username || '').toLowerCase().trim();
      const uPass = String(u.password || '').trim();
      return uName === inputUser && uPass === inputPass;
    });

    if (found) {
      onLogin(found);
    } else {
      setError("Credenciales inválidas. Verifique sus datos.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#BC4B13] p-6 relative overflow-hidden">
      <div className="absolute top-[-5%] left-[-5%] w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30rem] h-[30rem] bg-black/10 rounded-full blur-3xl"></div>

      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95 duration-500 relative z-10">
        <div className="p-10 md:p-14">
          <div className="text-center mb-10">
            <h1 className="text-6xl font-black text-arial-orange tracking-tighter italic leading-none">ARIAL</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-4">Gestión de Ausentismo</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-arial-orange outline-none transition-all font-black text-slate-800 text-sm"
                placeholder="ej: mgil"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-arial-orange outline-none transition-all font-black text-slate-800 text-sm"
                placeholder="••••"
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-[10px] font-black text-center border border-red-100 uppercase tracking-tight leading-relaxed animate-in shake duration-300">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-arial-orange text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-arial-orange/30 hover:brightness-110 active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {isLoading ? "Validando..." : "Entrar al Sistema"}
            </button>
          </form>
          
          {(apiError || (users.length === 0 && !isLoading)) && (
            <div className="mt-8 text-center space-y-2">
              <button onClick={onRetry} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-arial-orange border-b border-slate-200">
                Sincronizar Manualmente
              </button>
            </div>
          )}
        </div>
        
        <div className="px-12 py-6 bg-slate-50 border-t border-slate-50 text-center">
          <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.4em]">© 2026 ARIAL - CLOUD AUDIT</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
