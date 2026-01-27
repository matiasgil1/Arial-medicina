
import React, { useMemo } from 'react';
import { AbsenteeismCase, Patient } from '../types';
import { calculateDaysRemaining, getLatestEvolution, formatDisplayDate } from '../utils';

interface DashboardProps {
  cases: AbsenteeismCase[];
  patients: Patient[];
  onSelectCase: (id: string) => void;
  onEditCase: (id: string) => void;
  onDeleteCase: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ cases, patients, onSelectCase, onEditCase, onDeleteCase }) => {
  const today = new Date().toISOString().split('T')[0];

  const getPatient = (patientId: string) => 
    patients.find(p => p.id === patientId);

  const queueCases = useMemo(() => {
    return cases.filter(c => {
      if (c.status === 'PENDIENTE_AUDITORIA') return true;
      if (c.status === 'EN_SEGUIMIENTO') {
        const latest = getLatestEvolution(c.evolutions);
        return latest && latest.endDate <= today;
      }
      return false;
    }).sort((a, b) => {
      if (a.status === 'PENDIENTE_AUDITORIA' && b.status !== 'PENDIENTE_AUDITORIA') return -1;
      if (a.status !== 'PENDIENTE_AUDITORIA' && b.status === 'PENDIENTE_AUDITORIA') return 1;
      const dateA = getLatestEvolution(a.evolutions)?.endDate || '';
      const dateB = getLatestEvolution(b.evolutions)?.endDate || '';
      return dateA.localeCompare(dateB);
    });
  }, [cases, today]);

  const stats = useMemo(() => ({
    total: queueCases.length,
    newAdmissions: queueCases.filter(c => c.status === 'PENDIENTE_AUDITORIA').length,
    vencidos: queueCases.filter(c => c.status === 'EN_SEGUIMIENTO' && getLatestEvolution(c.evolutions)?.endDate! < today).length
  }), [queueCases, today]);

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Atención del Día</h2>
          <p className="text-slate-400 font-bold uppercase text-[8px] md:text-[10px] tracking-[0.2em] md:tracking-[0.25em]">Fila de trabajo priorizada</p>
        </div>
        <div className="flex gap-2 md:gap-3">
          <div className="flex-1 md:flex-none px-4 md:px-6 py-3 md:py-4 bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex flex-col">
            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">En Fila</span>
            <span className="text-xl md:text-2xl font-black text-slate-800 leading-none mt-1">{stats.total}</span>
          </div>
          <div className="flex-1 md:flex-none px-4 md:px-6 py-3 md:py-4 bg-orange-50 rounded-2xl md:rounded-3xl border border-orange-100 shadow-sm flex flex-col">
            <span className="text-[8px] md:text-[9px] font-black text-arial-orange uppercase tracking-widest">Admisiones</span>
            <span className="text-xl md:text-2xl font-black text-arial-orange leading-none mt-1">{stats.newAdmissions}</span>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[1.5rem] md:rounded-[3.5rem] shadow-xl md:shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/20">
                <th className="px-6 md:px-10 py-5 md:py-7">Colaborador / Empresa</th>
                <th className="px-6 md:px-10 py-5 md:py-7">Diagnóstico</th>
                <th className="px-6 md:px-10 py-5 md:py-7">Condición</th>
                <th className="px-6 md:px-10 py-5 md:py-7">Vencimiento</th>
                <th className="px-6 md:px-10 py-5 md:py-7 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queueCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 md:py-32 text-center">
                    <div className="flex flex-col items-center p-4">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p className="text-slate-400 font-black uppercase text-[10px] md:text-xs tracking-[0.2em]">Agenda al día. No hay pendientes.</p>
                    </div>
                  </td>
                </tr>
              ) : queueCases.map((c) => {
                const latest = getLatestEvolution(c.evolutions);
                if (!latest) return null;
                const patient = getPatient(c.patientId);
                
                const isNew = c.status === 'PENDIENTE_AUDITORIA';
                const isOverdue = !isNew && latest.endDate < today;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => onSelectCase(c.id)}>
                    <td className="px-6 md:px-10 py-5 md:py-7">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-sm uppercase shrink-0 ${isNew ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          {patient?.nombre?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-800 text-xs md:text-sm leading-tight uppercase tracking-tight truncate">
                            {patient ? `${patient.nombre} ${patient.apellido}` : '---'}
                          </div>
                          <div className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5 truncate">
                            {patient?.empresa}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 md:px-10 py-5 md:py-7">
                      <div className="text-[10px] md:text-[11px] text-slate-600 font-bold truncate max-w-[150px] md:max-w-[220px] bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                        {latest.diagnosis}
                      </div>
                    </td>
                    <td className="px-6 md:px-10 py-5 md:py-7">
                      <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                        isNew ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100"
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 md:px-10 py-5 md:py-7">
                      <div className={`text-[10px] md:text-[11px] font-black ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                        {formatDisplayDate(latest.endDate)}
                        {isOverdue && <span className="block md:inline-block md:ml-2 px-2 py-0.5 bg-red-50 text-[7px] md:text-[8px] rounded-lg mt-1 md:mt-0">ATRASADO</span>}
                      </div>
                    </td>
                    <td className="px-6 md:px-10 py-5 md:py-7 text-center">
                      <button className="bg-slate-900 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:bg-arial-orange transition-all shadow-lg active:scale-95 group-hover:-translate-y-0.5 whitespace-nowrap">
                        Auditar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Indicador de scroll para móvil */}
      <div className="lg:hidden text-center text-[8px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
        <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        Deslice para ver más datos
      </div>
    </div>
  );
};

export default Dashboard;
