
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

const API_URL = "https://script.google.com/macros/s/AKfycbwuxxUytaR0-6_r7VddzU5yjfQqfG05p6Q6TPs_YjRylpxz_R1bmb71C_egtvajQ5tcUg/exec"; 
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
  };

  if (isFirstLoad && user) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-[500] animate-in fade-in duration-300">
        <div className="w-24 h-24 bg-arial-orange rounded-[2.5rem] shadow-2xl flex items-center justify-center animate-bounce mb-8">
          <span className="text-white text-4xl font-black italic">A</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase mb-2">ARIAL MEDICINA</h2>
        <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-arial-orange animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
        <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sincronizando Base de Datos...</p>
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-inter">
      {isLoading && !isFirstLoad && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200]">
          <div className="px-8 py-4 bg-white/95 backdrop-blur-xl shadow-2xl rounded-[2rem] flex items-center gap-5 border border-slate-100 animate-in fade-in slide-in-from-top-2">
             <div className="w-5 h-5 border-[3px] border-arial-orange border-t-transparent rounded-full animate-spin"></div>
             <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Enviando a la Nube...</span>
          </div>
        </div>
      )}

      <Sidebar 
        currentView={view} 
        setView={setView} 
        currentUser={user} 
        onLogout={() => setUser(null)} 
        onNavigate={() => { setSelectedCaseId(null); setEditingCaseId(null); setPreselectedPatientId(null); }}
      />
      
      <main className="flex-1 overflow-y-auto p-8 relative scroll-smooth">
        <div className="max-w-7xl mx-auto">
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
        
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}
        </div>
      </main>
    </div>
  );
};

export default App;
