
import React, { useMemo, useState } from 'react';
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
    'ALTA_MEDICA': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', accent: 'bg-emerald-500', labelTop: 'ALTA', labelBottom: 'MÉDICA' },
    'EN_SEGUIMIENTO': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', accent: 'bg-orange-500', labelTop: 'EN', labelBottom: 'SEGUIMIENTO' },
    'PENDIENTE_AUDITORIA': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', accent: 'bg-blue-500', labelTop: 'PENDIENTE', labelBottom: 'AUDITORÍA' }
  }[status] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', accent: 'bg-slate-400', labelTop: '---', labelBottom: '---' };

  return (
    <div className={`inline-flex flex-col items-center justify-center px-4 py-2 rounded-full border ${config.bg} ${config.border} shadow-sm relative overflow-hidden group min-w-[100px]`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${config.accent} opacity-40`}></div>
      <span className={`text-[7px] font-black uppercase tracking-[0.25em] leading-none mb-0.5 ${config.text} opacity-60`}>{config.labelTop}</span>
      <span className={`text-[8px] font-black uppercase tracking-tight leading-none ${config.text}`}>{config.labelBottom}</span>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ cases, patients, onSelectCase, onEditCase, onDeleteCase }) => {
  const today = new Date().toISOString().split('T')[0];
  const [sortKey, setSortKey] = useState<string>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const queueCases = useMemo(() => {
    const filtered = cases.filter(c => {
      if (c.status === 'PENDIENTE_AUDITORIA') return true;
      if (c.status === 'EN_SEGUIMIENTO') {
        const latest = getLatestEvolution(c.evolutions);
        return latest && latest.endDate <= today;
      }
      return false;
    });

    return filtered.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      const patA = patients.find(p => p.id === a.patientId);
      const patB = patients.find(p => p.id === b.patientId);
      const latA = getLatestEvolution(a.evolutions);
      const latB = getLatestEvolution(b.evolutions);

      if (sortKey === 'status') {
        valA = a.status === 'PENDIENTE_AUDITORIA' ? 0 : 1;
        valB = b.status === 'PENDIENTE_AUDITORIA' ? 0 : 1;
      } else if (sortKey === 'name') {
        valA = `${patA?.apellido || ''} ${patA?.nombre || ''}`.toLowerCase();
        valB = `${patB?.apellido || ''} ${patB?.nombre || ''}`.toLowerCase();
      } else if (sortKey === 'date') {
        valA = latA?.endDate || '';
        valB = latB?.endDate || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [cases, patients, today, sortKey, sortOrder]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      <header className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Gestión Diaria</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.25em]">Auditoría Médica Prioritaria</p>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative table-scroll-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px] border-collapse">
            <thead>
              <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/30">
                <th className="px-10 py-6 cursor-pointer hover:text-arial-orange transition-colors" onClick={() => toggleSort('name')}>Colaborador / Empresa</th>
                <th className="px-10 py-6">Diagnóstico Prevalente</th>
                <th className="px-10 py-6 text-center cursor-pointer hover:text-arial-orange transition-colors" onClick={() => toggleSort('status')}>Estado Actual</th>
                <th className="px-10 py-6 cursor-pointer hover:text-arial-orange transition-colors" onClick={() => toggleSort('date')}>Vencimiento</th>
                <th className="px-10 py-6 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queueCases.length === 0 ? (
                <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black uppercase text-xs italic tracking-widest">Sin casos pendientes de auditoría</td></tr>
              ) : queueCases.map((c) => {
                const latest = getLatestEvolution(c.evolutions);
                const patient = patients.find(p => p.id === c.patientId);
                const isOverdue = c.status === 'EN_SEGUIMIENTO' && latest?.endDate! < today;

                return (
                  <tr key={c.id} className="hover:bg-slate-50 group cursor-pointer transition-colors" onClick={() => onSelectCase(c.id)}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm uppercase shrink-0 group-hover:bg-white group-hover:text-arial-orange transition-colors">{patient?.nombre?.charAt(0)}</div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-800 text-sm uppercase tracking-tight truncate">{patient?.nombre} {patient?.apellido}</div>
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate">{patient?.empresa}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="text-[10px] font-bold text-slate-600 truncate max-w-[250px] bg-slate-50/50 px-3 py-1.5 rounded-lg border border-transparent group-hover:border-slate-100 group-hover:bg-white transition-all">
                        {latest?.diagnosis || 'Sin Diagnóstico'}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center"><StatusBadge status={c.status} /></td>
                    <td className="px-10 py-6">
                      <div className={`text-[10px] font-black ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                        {formatDisplayDate(latest?.endDate)}
                        {isOverdue && <span className="block text-[7px] uppercase mt-1 text-red-400">Plazo Vencido</span>}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSelectCase(c.id); }}
                        className="bg-[#0f172a] text-white px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] hover:bg-arial-orange transition-all active:scale-95 shadow-lg shadow-slate-900/10 min-w-[120px]"
                      >
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
    </div>
  );
};

export default Dashboard;
