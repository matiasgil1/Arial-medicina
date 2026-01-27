
import React from 'react';
import { ViewType, User } from '../types';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentView: ViewType;
  setView: (view: ViewType) => void;
  currentUser: User;
  onLogout: () => void;
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentView, setView, currentUser, onLogout, onNavigate }) => {
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
    <aside className={`
      fixed inset-y-0 left-0 lg:static lg:block
      w-72 md:w-80 bg-arial-orange text-white flex flex-col shadow-[15px_0_40px_rgba(188,75,19,0.15)] z-[60] 
      transition-transform duration-300 ease-in-out border-r border-white/5
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Botón cerrar para móvil */}
      <button 
        onClick={onClose}
        className="lg:hidden absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      <div className="p-8 md:p-10 border-b border-white/5 bg-black/10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic leading-none">ARIAL</h1>
        <p className="text-[9px] md:text-[10px] text-white/40 font-black uppercase tracking-[0.4em] mt-1.5">Gestión Médica 2.0</p>
      </div>
      
      <nav className="flex-1 mt-6 md:mt-10 px-4 md:px-5 overflow-y-auto scrollbar-hide">
        <ul className="space-y-2 md:space-y-4">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id as ViewType)}
                className={`w-full flex items-center space-x-4 md:space-x-5 px-6 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-[2rem] transition-all duration-300 relative overflow-hidden group ${
                  currentView === item.id 
                    ? 'bg-white text-arial-orange shadow-[0_10px_20px_rgba(0,0,0,0.1)] scale-[1.02] font-black' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {currentView === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 md:w-1.5 md:h-6 bg-arial-orange rounded-r-full"></div>
                )}
                <div className={`${currentView === item.id ? 'text-arial-orange' : 'text-white/30 group-hover:text-white'} transition-colors`}>
                  {item.icon}
                </div>
                <span className="text-[10px] md:text-[11px] uppercase tracking-widest font-black text-left">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* TARJETA DE USUARIO REDISEÑADA: Más pequeña y sofisticada */}
      <div className="p-5 md:p-6 border-t border-white/10 bg-black/10 mx-4 md:mx-5 my-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 backdrop-blur-sm shadow-lg">
        <div className="flex items-center space-x-3 md:space-x-4 mb-4">
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white text-arial-orange flex items-center justify-center text-base md:text-lg font-black shadow-inner uppercase shrink-0 border-2 border-white/20 ring-2 ring-white/5">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-arial-orange rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] md:text-xs font-black text-white truncate uppercase tracking-tight leading-tight">{currentUser.fullName}</p>
            <p className="text-[8px] md:text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">{currentUser.role}</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/80 text-white/40 hover:text-white transition-all duration-300 text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-white/5 hover:border-red-400/50 group/btn"
          >
            <svg className="w-3.5 h-3.5 opacity-40 group-hover/btn:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Cerrar Sesión</span>
          </button>
          <div className="text-center pt-2">
            <p className="text-[6px] md:text-[7px] font-black text-white/10 uppercase tracking-[0.6em]">Arial v2.2.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
