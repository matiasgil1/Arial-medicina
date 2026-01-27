
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
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Atención del Día</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.25em] ml-1">Fila de trabajo priorizada en tiempo real</p>
        </div>
        <div className="flex gap-3">
          <div className="px-6 py-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">En Fila</span>
            <span className="text-2xl font-black text-slate-800 leading-none mt-1">{stats.total}</span>
          </div>
          <div className="px-6 py-4 bg-orange-50 rounded-3xl border border-orange-100 shadow-sm flex flex-col">
            <span className="text-[9px] font-black text-arial-orange uppercase tracking-widest">Admisiones</span>
            <span className="text-2xl font-black text-arial-orange leading-none mt-1">{stats.newAdmissions}</span>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] border-b border-slate-50 bg-slate-50/20">
                <th className="px-10 py-7">Colaborador / Empresa</th>
                <th className="px-10 py-7">Diagnóstico Presuntivo</th>
                <th className="px-10 py-7">Condición</th>
                <th className="px-10 py-7">Vencimiento</th>
                <th className="px-10 py-7 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queueCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Agenda al día. No hay pendientes.</p>
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
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm uppercase ${isNew ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          {patient?.nombre?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 text-sm leading-tight uppercase tracking-tight">
                            {patient ? `${patient.nombre} ${patient.apellido}` : '---'}
                          </div>
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                            {patient?.empresa}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <div className="text-[11px] text-slate-600 font-bold truncate max-w-[220px] bg-slate-50 px-4 py-2 rounded-xl inline-block border border-slate-100 group-hover:bg-white transition-colors">
                        {latest.diagnosis}
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                        isNew ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100"
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-10 py-7">
                      <div className={`text-[11px] font-black ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                        {formatDisplayDate(latest.endDate)}
                        {isOverdue && <span className="ml-2 px-2 py-0.5 bg-red-50 text-[8px] rounded-lg">ATRASADO</span>}
                      </div>
                    </td>
                    <td className="px-10 py-7 text-center">
                      <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-arial-orange transition-all shadow-lg active:scale-95 group-hover:-translate-y-1">
                        Auditar Ahora
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
