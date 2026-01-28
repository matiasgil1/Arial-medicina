
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

// NUEVA URL DE PRODUCCIÓN VINCULADA
const API_URL = "https://script.google.com/macros/s/AKfycbxGLZinphqBkFk4o9eK1MK9oGnT-Es5UiiOoySsCvdn04R3ZYwKJjbb25zelAtSSgKYYA/exec"; 
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
      const response = await fetch(`${API_URL}?action=getData&v=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });
      const data = await response.json();
      
      if (data && data.status === 'success') {
        setCases(data.cases || []);
        setPatients(data.patients || []);
        setUsers(data.users || []);
        setCompanies(data.companies || []);
        setApiError(false);
      } else {
        setApiError(true);
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

  const callAPI = async (action: string, payload: any, optimisticUpdate?: () => void) => {
    if (!isApiConfigured) return false;
    if (optimisticUpdate) optimisticUpdate();
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
        addToast("Base de Datos Actualizada");
      }, 1500);
      return true;
    } catch (error) {
      addToast("Error de Escritura", "error");
      fetchData(); 
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
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[500]">
        <div className="w-20 h-20 bg-arial-orange rounded-3xl animate-bounce mb-8 flex items-center justify-center text-white text-4xl font-black italic shadow-2xl">A</div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase mb-4">ARIAL MEDICINA</h2>
        <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-arial-orange animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
        <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Iniciando Protocolos Cloud</p>
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} users={users} apiError={apiError} onRetry={fetchData} isLoading={isLoading} />;

  return (
    <div className="flex flex-col lg:flex-row h-[100svh] w-full bg-slate-50 overflow-hidden font-inter relative select-none">
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
        <header className="lg:hidden bg-white p-5 flex items-center justify-between shadow-sm z-[50] border-b border-slate-100">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-arial-orange">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black italic text-arial-orange tracking-tighter leading-none">ARIAL</h1>
            <p className="text-[7px] font-black uppercase text-slate-300 tracking-[0.3em] mt-1">Sincronizado</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[12px] font-black text-arial-orange uppercase">
            {user.fullName ? user.fullName.charAt(0) : 'U'}
          </div>
        </header>

        {isLoading && !isFirstLoad && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200]">
            <div className="px-6 py-3 bg-white/80 backdrop-blur-md shadow-2xl rounded-full flex items-center gap-4 border border-white/50 animate-in fade-in slide-in-from-top-4">
               <div className="w-4 h-4 border-2 border-arial-orange border-t-transparent rounded-full animate-spin"></div>
               <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] whitespace-nowrap">Sincronizando...</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-5 lg:p-12 relative bg-slate-50 scrollbar-hide">
          <div className="max-w-7xl mx-auto min-h-full">
            {view === 'atencion-dia' && (
              <Dashboard 
                cases={cases} 
                patients={patients} 
                onSelectCase={id => { setSelectedCaseId(id); setView('details'); }} 
                onEditCase={id => { setEditingCaseId(id); setView('new-case'); }} 
                onDeleteCase={id => { callAPI('deleteCase', {id}, () => setCases(prev => prev.filter(c => c.id !== id))); }} 
              />
            )}
            {view === 'agenda' && (
              <ControlAgenda 
                cases={cases} 
                patients={patients} 
                currentUser={user} 
                onSaveCase={async c => { await callAPI('saveCase', c, () => setCases(prev => prev.map(item => item.id === c.id ? c : item))); }} 
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
                onSubmit={async (c: AbsenteeismCase, p?: Patient) => { 
                  if (p) {
                    setPatients(prev => {
                      const exists = prev.some(item => item.id === p.id);
                      return exists ? prev.map(item => item.id === p.id ? p : item) : [p, ...prev];
                    });
                    await callAPI('savePatient', p); 
                  }
                  setCases((prev: AbsenteeismCase[]) => {
                    const exists = prev.some(item => item.id === c.id);
                    return exists ? prev.map(item => item.id === c.id ? c : item) : [c, ...prev];
                  });
                  await callAPI('saveCase', c); 
                  setView('atencion-dia'); 
                }} 
                onCancel={() => setView('atencion-dia')} 
              />
            )}
            {view === 'details' && (
              <CaseDetail 
                allCases={cases}
                caseData={cases.find(c => c.id === selectedCaseId)!} 
                patient={patients.find(p => p.id === cases.find(c => c.id === selectedCaseId)?.patientId)!} 
                currentUser={user} 
                onAddEvolution={async (id, evo, status?: AbsenteeismCase['status']) => { 
                  const target = cases.find(c => c.id === id); 
                  if (target) {
                    const updated: AbsenteeismCase = { ...target, status: status || target.status, evolutions: [...target.evolutions, evo] };
                    await callAPI('saveCase', updated, () => setCases(prev => prev.map(item => item.id === id ? updated : item))); 
                  }
                }} 
                onDeleteCase={id => { callAPI('deleteCase', {id}, () => setCases(prev => prev.filter(c => c.id !== id))); setView('atencion-dia'); }} 
                onBack={() => setView('atencion-dia')} 
              />
            )}
            {view === 'stats' && <Statistics cases={cases} patients={patients} users={users} companies={companies} />}
            {view === 'history' && (
              <HistoryArchive 
                patients={patients} 
                cases={cases} 
                currentUser={user} 
                onAddEvolution={(id, evo, status?: AbsenteeismCase['status']) => { 
                  const target = cases.find(c => c.id === id); 
                  if (target) {
                    const updated: AbsenteeismCase = { ...target, status: status || target.status, evolutions: [...target.evolutions, evo] };
                    callAPI('saveCase', updated, () => setCases(prev => prev.map(item => item.id === id ? updated : item))); 
                  }
                }} 
                onDeleteCase={id => { callAPI('deleteCase', {id}, () => setCases(prev => prev.filter(c => c.id !== id))); }} 
                preselectedPatientId={preselectedPatientId} 
              />
            )}
            {view === 'admin-panel' && user.role === 'admin' && (
              <AdminPanel 
                users={users} 
                onSaveUser={async u => { await callAPI('saveUser', u, () => setUsers(prev => { const exists = prev.some(item => item.id === u.id); return exists ? prev.map(item => item.id === u.id ? u : item) : [u, ...prev]; })); }} 
                onDeleteUser={async id => { await callAPI('deleteUser', {id}, () => setUsers(prev => prev.filter(u => u.id !== id))); }} 
              />
            )}
            {view === 'companies' && (user.role === 'admin' || user.role === 'administrativo') && (
              <CompanyManager 
                companies={companies} 
                onSaveCompany={async c => { await callAPI('saveCompany', c, () => setCompanies(prev => { const exists = prev.some(item => item.id === c.id); return exists ? prev.map(item => item.id === c.id ? c : item) : [c, ...prev]; })); }} 
                onDeleteCompany={async id => { await callAPI('deleteCompany', {id}, () => setCompanies(prev => prev.filter(c => c.id !== id))); }} 
              />
            )}
          </div>
          <div className="fixed bottom-10 right-10 z-[60] flex flex-col gap-4 pointer-events-none">
            {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
