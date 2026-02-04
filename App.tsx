
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

const API_URL = "https://script.google.com/macros/s/AKfycbxGLZinphqBkFk4o9eK1MK9oGnT-Es5UiiOoySsCvdn04R3ZYwKJjbb25zelAtSSgKYYA/exec"; 
const STORAGE_KEY_USER = 'arial_current_user';
const STORAGE_KEY_VIEW = 'arial_current_view';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY_USER);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [view, setView] = useState<ViewType>(() => {
    const savedView = localStorage.getItem(STORAGE_KEY_VIEW);
    return (savedView as ViewType) || 'atencion-dia';
  });
  
  // Estados persistentes para Historial General
  const [globalHistorySearch, setGlobalHistorySearch] = useState('');
  const [globalHistoryPage, setGlobalHistoryPage] = useState(1);
  
  // Estado para recordar a qué vista volver después de ver detalles
  const [detailsReturnView, setDetailsReturnView] = useState<ViewType>('atencion-dia');
  
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

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_VIEW, view);
    }
  }, [view, user]);

  const isApiConfigured = useMemo(() => API_URL && API_URL.includes("exec"), []);

  useEffect(() => {
    if (isApiConfigured) fetchData();
  }, [isApiConfigured]);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    else {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_VIEW);
    }
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
      addToast("Error de conexión", "error");
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
    const prevCases = [...cases];
    const prevPatients = [...patients];
    const prevUsers = [...users];
    const prevCompanies = [...companies];
    if (optimisticUpdate) optimisticUpdate();
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
      });
      const result = await response.json();
      if (result.status === 'success') {
        addToast("Base Sincronizada");
        fetchData(); 
        return true;
      } else {
        throw new Error(result.message || "Error");
      }
    } catch (error) {
      addToast("Fallo Sincronización", "error");
      setCases(prevCases);
      setPatients(prevPatients);
      setUsers(prevUsers);
      setCompanies(prevCompanies);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función helper para abrir detalles recordando de dónde venimos
  const handleOpenDetails = (caseId: string, fromView: ViewType) => {
    setDetailsReturnView(fromView);
    setSelectedCaseId(caseId);
    setView('details');
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
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-arial-orange"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
          <h1 className="text-2xl font-black italic text-arial-orange tracking-tighter">ARIAL</h1>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[12px] font-black text-arial-orange uppercase">{user.fullName.charAt(0)}</div>
        </header>
        {isLoading && !isFirstLoad && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200]">
            <div className="px-6 py-3 bg-white/80 backdrop-blur-md shadow-2xl rounded-full flex items-center gap-4 border border-white/50 animate-in fade-in slide-in-from-top-4">
               <div className="w-4 h-4 border-2 border-arial-orange border-t-transparent rounded-full animate-spin"></div>
               <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] whitespace-nowrap">Auditando...</span>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-5 lg:p-12 relative bg-slate-50">
          <div className="max-w-7xl mx-auto min-h-full">
            {view === 'atencion-dia' && (
              <Dashboard cases={cases} patients={patients} onSelectCase={id => handleOpenDetails(id, 'atencion-dia')} onEditCase={id => { setEditingCaseId(id); setView('new-case'); }} onDeleteCase={id => { callAPI('deleteCase', {id}, () => setCases(prev => prev.filter(c => c.id !== id))); }} />
            )}
            {view === 'agenda' && (
              <ControlAgenda cases={cases} patients={patients} currentUser={user} onSaveCase={async c => { await callAPI('saveCase', c, () => setCases(prev => prev.map(item => item.id === c.id ? c : item))); }} onOpenEvolution={id => handleOpenDetails(id, 'agenda')} />
            )}
            {view === 'history-global' && (
              <GlobalHistory 
                cases={cases} 
                patients={patients} 
                onNavigateToPatientHistory={handlePatientNavigate} 
                onSelectCase={id => handleOpenDetails(id, 'history-global')}
                searchTerm={globalHistorySearch}
                setSearchTerm={setGlobalHistorySearch}
                currentPage={globalHistoryPage}
                setCurrentPage={setGlobalHistoryPage}
              />
            )}
            {view === 'new-case' && (
              <NewCaseForm patients={patients} companies={companies} editingCase={cases.find(c => c.id === editingCaseId)} currentUser={user} onSubmit={async (c: AbsenteeismCase, p?: Patient) => { 
                if (p) { await callAPI('savePatient', p); }
                await callAPI('saveCase', c); 
                setView('atencion-dia'); 
              }} onCancel={() => setView('atencion-dia')} />
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
                    await callAPI('saveCase', updated); 
                  }
                }} 
                onDeleteCase={id => { callAPI('deleteCase', {id}); setView(detailsReturnView); }} 
                onBack={() => setView(detailsReturnView)}
                initialCaseId={selectedCaseId}
                backLabel={detailsReturnView === 'history-global' ? 'Volver al Historial' : 'Cerrar Ficha'}
              />
            )}
            {view === 'stats' && <Statistics cases={cases} patients={patients} users={users} companies={companies} />}
            {view === 'history' && (
              <HistoryArchive patients={patients} cases={cases} currentUser={user} onAddEvolution={(id, evo, status?: AbsenteeismCase['status']) => { 
                  const target = cases.find(c => c.id === id); 
                  if (target) {
                    const updated: AbsenteeismCase = { ...target, status: status || target.status, evolutions: [...target.evolutions, evo] };
                    callAPI('saveCase', updated); 
                  }
                }} onDeleteCase={id => { callAPI('deleteCase', {id}); }} preselectedPatientId={preselectedPatientId} />
            )}
            {view === 'admin-panel' && user.role === 'admin' && (
              <AdminPanel users={users} onSaveUser={async u => { await callAPI('saveUser', u); }} onDeleteUser={async id => { await callAPI('deleteUser', {id}); }} />
            )}
            {view === 'companies' && (user.role === 'admin' || user.role === 'administrativo') && (
              <CompanyManager companies={companies} onSaveCompany={async c => { await callAPI('saveCompany', c); }} onDeleteCompany={async id => { await callAPI('deleteCompany', {id}); }} />
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
