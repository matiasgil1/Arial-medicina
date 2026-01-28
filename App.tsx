
import React, { useState, useMemo, useEffect } from 'react';
import { ViewType, AbsenteeismCase, Patient, User, Company } from './types';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import NewCaseForm from './components/NewCaseForm';
import CaseDetail from './components/CaseDetail';
import Statistics from './components/Statistics';
import HistoryArchive from './components/HistoryArchive';
import GlobalHistory from './components/GlobalHistory';
import AdminPanel from './components/AdminPanel';
import ControlAgenda from './components/ControlAgenda';
import CompanyManager from './components/CompanyManager';
import Toast from './components/Toast';
import Login from './components/Login';
import { Analytics } from '@vercel/analytics/react';

const API_URL = (import.meta as any).env?.VITE_API_URL || "https://script.google.com/macros/s/AKfycbwuxxUytaR0-6_r7VddzU5yjfQqfG05p6Q6TPs_YjRylpxz_R1bmb71C_egtvajQ5tcUg/exec"; 
const STORAGE_KEY_USER = 'arial_current_user';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY_USER);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [view, setView] = useState<ViewType>('atencion-dia');
  const [cases, setCases] = useState<AbsenteeismCase[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [apiError, setApiError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isApiConfigured = useMemo(() => API_URL && API_URL.includes("exec"), []);

  useEffect(() => {
    if (isApiConfigured) fetchData();
  }, [isApiConfigured]);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY_USER);
  }, [user]);

  const fetchData = async () => {
    if (!isApiConfigured) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=getData&v=${Date.now()}`);
      const data = await response.json();
      if (data && data.status === 'success') {
        setCases(data.cases || []);
        setPatients(data.patients || []);
        setUsers(data.users || []);
        setCompanies(data.companies || []);
      }
    } catch (error) {
      setApiError(true);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsFirstLoad(false), 800);
    }
  };

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const callAPI = async (action: string, payload: any) => {
    if (!isApiConfigured) return false;
    setIsLoading(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, payload })
      });
      setTimeout(() => {
        fetchData();
        addToast("Gestión procesada correctamente");
      }, 1500);
      return true;
    } catch (error) {
      addToast("Error de conexión", "error");
      return false;
    } finally {
      setTimeout(() => setIsLoading(false), 1200);
    }
  };

  const handlePatientNavigate = (patientId: string) => {
    setPreselectedPatientId(patientId);
    setView('history');
    setIsSidebarOpen(false);
  };

  if (isFirstLoad && user) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-[500] animate-in fade-in duration-300">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-arial-orange rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex items-center justify-center animate-bounce mb-8">
          <span className="text-white text-3xl md:text-4xl font-black italic">A</span>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter uppercase mb-2">ARIAL MEDICINA</h2>
        <div className="w-40 md:w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-arial-orange animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
        <p className="mt-6 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sincronizando Base de Datos...</p>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} users={users} apiError={apiError} onRetry={fetchData} isLoading={isLoading} />;

  return (
    <div className="flex flex-col lg:flex-row h-[100svh] w-full bg-slate-50 overflow-hidden font-inter relative select-none">
      {/* Sidebar con soporte móvil */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentView={view} 
        setView={(v) => { setView(v); setIsSidebarOpen(false); }} 
        currentUser={user} 
        onLogout={() => setUser(null)} 
        onNavigate={() => { setSelectedCaseId(null); setEditingCaseId(null); setPreselectedPatientId(null); }}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Header móvil mejorado */}
        <header className="lg:hidden bg-white text-slate-800 p-4 flex items-center justify-between shadow-sm z-[50] border-b border-slate-100">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 -ml-2 text-arial-orange active:scale-95 transition-transform"
            aria-label="Menu"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black tracking-tighter italic text-arial-orange">ARIAL</h1>
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 -mt-1">Gestión Médica</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-arial-orange uppercase">
            {user.fullName.charAt(0)}
          </div>
        </header>

        {/* Loading Indicator flotante */}
        {isLoading && !isFirstLoad && (
          <div className="fixed top-4 md:top-8 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-xs">
            <div className="px-6 py-3 bg-white/95 backdrop-blur-xl shadow-2xl rounded-full flex items-center justify-center gap-4 border border-slate-100 animate-in fade-in slide-in-from-top-2">
               <div className="w-4 h-4 border-[3px] border-arial-orange border-t-transparent rounded-full animate-spin"></div>
               <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Sincronizando...</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative scroll-smooth bg-slate-50 scrollbar-hide">
          <div className="max-w-7xl mx-auto min-h-full">
            {view === 'atencion-dia' && (
              <Dashboard 
                cases={cases} 
                patients={patients} 
                onSelectCase={id => { setSelectedCaseId(id); setView('details'); }} 
                onEditCase={id => { setEditingCaseId(id); setView('new-case'); }} 
                onDeleteCase={id => { callAPI('deleteCase', {id}); }} 
              />
            )}
            
            {view === 'agenda' && (
              <ControlAgenda 
                cases={cases} 
                patients={patients} 
                currentUser={user} 
                onSaveCase={async c => { await callAPI('saveCase', c); }} 
                onOpenEvolution={id => { setSelectedCaseId(id); setView('details'); }} 
              />
            )}
            
            {view === 'history-global' && (
              <GlobalHistory 
                cases={cases} 
                patients={patients} 
                onNavigateToPatientHistory={handlePatientNavigate} 
              />
            )}
            
            {view === 'new-case' && (
              <NewCaseForm 
                patients={patients} 
                companies={companies} 
                editingCase={cases.find(c => c.id === editingCaseId)} 
                currentUser={user} 
                onSubmit={async (c, p) => { 
                  if (p) await callAPI('savePatient', p); 
                  await callAPI('saveCase', c); 
                  setView('atencion-dia'); 
                }} 
                onCancel={() => setView('atencion-dia')} 
              />
            )}
            
            {view === 'details' && (
              <CaseDetail 
                caseData={cases.find(c => c.id === selectedCaseId)!} 
                patient={patients.find(p => p.id === cases.find(c => c.id === selectedCaseId)?.patientId)!} 
                currentUser={user} 
                onAddEvolution={async (id, evo, status) => { 
                  const target = cases.find(c => c.id === id); 
                  if (target) await callAPI('saveCase', { ...target, status: status || target.status, evolutions: [...target.evolutions, evo] }); 
                }} 
                onDeleteCase={id => { callAPI('deleteCase', {id}); setView('atencion-dia'); }} 
                onBack={() => setView('atencion-dia')} 
              />
            )}
            
            {view === 'stats' && <Statistics cases={cases} patients={patients} users={users} companies={companies} />}
            
            {view === 'history' && (
              <HistoryArchive 
                patients={patients} 
                cases={cases} 
                currentUser={user} 
                onAddEvolution={(id, evo, status) => { 
                  const target = cases.find(c => c.id === id); 
                  if (target) callAPI('saveCase', { ...target, status: status || target.status, evolutions: [...target.evolutions, evo] }); 
                }} 
                onDeleteCase={id => { callAPI('deleteCase', {id}); }} 
                preselectedPatientId={preselectedPatientId} 
              />
            )}
            
            {view === 'admin-panel' && user.role === 'admin' && (
              <AdminPanel 
                users={users} 
                onSaveUser={async u => { await callAPI('saveUser', u); }} 
                onDeleteUser={async id => { await callAPI('deleteUser', {id}); }} 
              />
            )}

            {view === 'companies' && (user.role === 'admin' || user.role === 'administrativo') && (
              <CompanyManager 
                companies={companies} 
                onSaveCompany={async c => { await callAPI('saveCompany', c); }} 
                onDeleteCompany={async id => { await callAPI('deleteCompany', {id}); }} 
              />
            )}
          </div>
          
          <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
            {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}
          </div>
        </main>
      </div>
      <Analytics />
    </div>
  );
};

export default App;
