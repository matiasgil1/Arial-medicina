
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

const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    'ALTA_MEDICA': { 
      bg: 'bg-emerald-50', 
      text: 'text-emerald-700', 
      border: 'border-emerald-200',
      accent: 'bg-emerald-500',
      labelTop: 'ALTA',
      labelBottom: 'MÉDICA'
    },
    'EN_SEGUIMIENTO': { 
      bg: 'bg-orange-50', 
      text: 'text-orange-700', 
      border: 'border-orange-200',
      accent: 'bg-orange-500',
      labelTop: 'EN',
      labelBottom: 'SEGUIMIENTO'
    },
    'PENDIENTE_AUDITORIA': { 
      bg: 'bg-blue-50', 
      text: 'text-blue-700', 
      border: 'border-blue-200',
      accent: 'bg-blue-500',
      labelTop: 'PENDIENTE',
      labelBottom: 'AUDITORÍA'
    }
  }[status] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', accent: 'bg-slate-400', labelTop: '---', labelBottom: '---' };

  return (
    <div className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border ${config.bg} ${config.border} shadow-sm relative overflow-hidden group min-w-[85px]`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${config.accent}`}></div>
      <span className={`text-[7px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 ${config.text} opacity-60`}>{config.labelTop}</span>
      <span className={`text-[8px] font-black uppercase tracking-tight leading-none ${config.text}`}>{config.labelBottom}</span>
    </div>
  );
};

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
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Atención del Día</h2>
          <p className="text-slate-400 font-bold uppercase text-[9px] lg:text-[10px] tracking-[0.25em]">Fila de trabajo priorizada</p>
        </div>
        <div className="flex gap-2 lg:gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none min-w-[120px] px-5 py-3 lg:py-4 bg-white rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
            <span className="text-[8px] lg:text-[9px] font-black text-slate-400 uppercase tracking-widest">En Fila</span>
            <span className="text-xl lg:text-2xl font-black text-slate-800 leading-none mt-1">{stats.total}</span>
          </div>
          <div className="flex-1 md:flex-none min-w-[120px] px-5 py-3 lg:py-4 bg-orange-50 rounded-2xl lg:rounded-3xl border border-orange-100 shadow-sm flex flex-col justify-center">
            <span className="text-[8px] lg:text-[9px] font-black text-arial-orange uppercase tracking-widest">Admisiones</span>
            <span className="text-xl lg:text-2xl font-black text-arial-orange leading-none mt-1">{stats.newAdmissions}</span>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[1.5rem] lg:rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/30">
                <th className="px-6 lg:px-10 py-5 lg:py-6">Colaborador / Empresa</th>
                <th className="px-6 lg:px-10 py-5 lg:py-6">Diagnóstico</th>
                <th className="px-6 lg:px-10 py-5 lg:py-6 text-center">Condición</th>
                <th className="px-6 lg:px-10 py-5 lg:py-6">Vencimiento</th>
                <th className="px-6 lg:px-10 py-5 lg:py-6 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queueCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 lg:w-10 lg:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-slate-400 font-black uppercase text-[10px] lg:text-xs tracking-[0.2em]">Todo el ausentismo auditado.</p>
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
                  <tr 
                    key={c.id} 
                    className="hover:bg-slate-50/80 transition-all group cursor-pointer active:bg-slate-100" 
                    onClick={() => onSelectCase(c.id)}
                  >
                    <td className="px-6 lg:px-10 py-5 lg:py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 shadow-sm ${isNew ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          {patient?.nombre?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-800 text-sm leading-tight uppercase tracking-tight truncate">
                            {patient ? `${patient.nombre} ${patient.apellido}` : '---'}
                          </div>
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5 truncate">
                            {patient?.empresa}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 lg:px-10 py-5 lg:py-6">
                      <div className="text-[10px] lg:text-[11px] text-slate-600 font-bold truncate max-w-[180px] lg:max-w-[250px] bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                        {latest.diagnosis}
                      </div>
                    </td>
                    <td className="px-6 lg:px-10 py-5 lg:py-6 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 lg:px-10 py-5 lg:py-6">
                      <div className={`text-[10px] lg:text-[11px] font-black ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                        {formatDisplayDate(latest.endDate)}
                        {isOverdue && <span className="block text-[7px] uppercase text-red-400 mt-1">Vencido</span>}
                      </div>
                    </td>
                    <td className="px-6 lg:px-10 py-5 lg:py-6 text-center">
                      <button className="bg-slate-900 text-white px-5 py-3 rounded-xl lg:rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-arial-orange transition-all shadow-lg active:scale-95 whitespace-nowrap">
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
      
      {/* Mobile-only scroll hint */}
      <div className="lg:hidden flex justify-center py-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-200/50 rounded-full">
           <svg className="w-3 h-3 text-slate-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Desliza para ver más</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
