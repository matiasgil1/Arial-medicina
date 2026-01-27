
import React from 'react';
import { ViewType, User } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  currentUser: User;
  onLogout: () => void;
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, currentUser, onLogout, onNavigate }) => {
  const allItems = [
    { 
      id: 'atencion-dia', 
      label: 'Atención del Día', 
      roles: ['admin', 'médico', 'administrativo'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>
      )
    },
    { 
      id: 'agenda', 
      label: 'Agenda de Control', 
      roles: ['admin', 'médico'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      )
    },
    { 
      id: 'history-global', 
      label: 'Historial General', 
      roles: ['admin', 'médico', 'administrativo'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
      )
    },
    { 
      id: 'new-case', 
      label: 'Nuevo Ingreso', 
      roles: ['admin', 'administrativo'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
      )
    },
    { 
      id: 'companies', 
      label: 'Directorio Empresas', 
      roles: ['admin', 'administrativo'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      )
    },
    { 
      id: 'history', 
      label: 'Ficha Clínica', 
      roles: ['admin', 'médico'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      )
    },
    { 
      id: 'stats', 
      label: 'Estadísticas', 
      roles: ['admin', 'administrativo'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
      )
    },
    { 
      id: 'admin-panel', 
      label: 'Administrador', 
      roles: ['admin'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
      )
    },
  ];

  const navItems = allItems.filter(item => item.roles.includes(currentUser.role));

  const handleNavClick = (view: ViewType) => {
    if (onNavigate) onNavigate();
    setView(view);
  };

  return (
    <aside className="w-80 bg-arial-orange text-white flex flex-col shadow-[15px_0_40px_rgba(188,75,19,0.15)] z-50 relative border-r border-white/5">
      <div className="p-10 border-b border-white/5 bg-black/10">
        <h1 className="text-4xl font-black tracking-tighter italic">ARIAL</h1>
        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em] mt-1">Gestión Médica 2.0</p>
      </div>
      
      <nav className="flex-1 mt-10 px-5 overflow-y-auto scrollbar-hide">
        <ul className="space-y-4">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id as ViewType)}
                className={`w-full flex items-center space-x-5 px-8 py-5 rounded-[2rem] transition-all duration-500 relative overflow-hidden group ${
                  currentView === item.id 
                    ? 'bg-white text-arial-orange shadow-[0_15px_30px_rgba(0,0,0,0.1)] scale-105 font-black' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {currentView === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-arial-orange rounded-r-full"></div>
                )}
                <div className={`${currentView === item.id ? 'text-arial-orange' : 'text-white/30 group-hover:text-white'} transition-colors`}>
                  {item.icon}
                </div>
                <span className="text-[11px] uppercase tracking-widest font-black">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-10 border-t border-white/5 space-y-8 bg-black/5">
        <div className="flex items-center space-x-5">
          <div className="w-14 h-14 rounded-[1.5rem] bg-white text-arial-orange flex items-center justify-center text-xl font-black shadow-xl uppercase border-4 border-white/10">
            {currentUser.fullName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate leading-none uppercase tracking-tight">{currentUser.fullName}</p>
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">{currentUser.role}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-3 py-4 rounded-[1.5rem] bg-black/20 text-white/50 hover:text-white hover:bg-red-500 transition-all text-[10px] font-black uppercase tracking-widest border border-white/5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Cerrar Sesión</span>
          </button>
          <div className="text-center pt-2">
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">v2.1.0-PROD</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
