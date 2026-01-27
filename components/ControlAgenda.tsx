
import React, { useMemo } from 'react';
import { AbsenteeismCase, Patient, User } from '../types';
import { getLatestEvolution, calculateDaysRemaining, formatDisplayDate } from '../utils';

interface ControlAgendaProps {
  cases: AbsenteeismCase[];
  patients: Patient[];
  currentUser: User;
  onSaveCase: (updatedCase: AbsenteeismCase) => Promise<void>;
  onOpenEvolution: (caseId: string) => void;
}

const ControlAgenda: React.FC<ControlAgendaProps> = ({ cases, patients, onOpenEvolution }) => {
  const today = new Date().toISOString().split('T')[0];

  const agendaItems = useMemo(() => {
    try {
      if (!cases || !Array.isArray(cases)) return [];

      return cases
        .filter(c => c && c.status === 'EN_SEGUIMIENTO')
        .map(c => {
          const patient = patients.find(p => p.id === c.patientId);
          const latest = getLatestEvolution(c.evolutions);
          const controlDate = latest?.endDate || today;
          const daysToControl = calculateDaysRemaining(controlDate);
          
          return {
            ...c,
            patient,
            latest,
            daysToControl,
            controlDate
          };
        })
        .sort((a, b) => a.controlDate.localeCompare(b.controlDate));
    } catch (error) {
      console.error("Error al procesar la agenda:", error);
      return [];
    }
  }, [cases, patients, today]);

  if (agendaItems.length === 0) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-700 bg-white rounded-[2rem] border border-dashed border-slate-200 m-4">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
          <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-black text-slate-800 tracking-tight">Agenda al Día</h3>
        <p className="text-slate-400 text-xs font-medium max-w-xs mt-1">No hay controles pendientes para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-arial-orange rounded-full"></div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Agenda de Controles</h2>
        </div>
        <p className="text-slate-500 font-medium ml-4 uppercase text-[9px] tracking-[0.2em]">Monitoreo Priorizado</p>
      </header>

      <div className="bg-white rounded-[1.5rem] shadow-lg border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead>
              <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] border-b border-slate-50 bg-slate-50/30">
                <th className="px-6 py-4">Vencimiento</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Colaborador / Empresa</th>
                <th className="px-6 py-4">Diagnóstico</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {agendaItems.map((item) => {
                let statusColor = "bg-emerald-500";
                let badgeStyle = "bg-emerald-50 text-emerald-600 border-emerald-100";
                let statusLabel = `Faltan ${item.daysToControl} días`;
                
                if (item.daysToControl < 0) {
                  statusColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
                  badgeStyle = "bg-red-50 text-red-600 border-red-200 animate-pulse";
                  statusLabel = "VENCIDO";
                } else if (item.daysToControl === 0) {
                  statusColor = "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]";
                  badgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
                  statusLabel = "HOY";
                }

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all group border-l-4 border-l-transparent hover:border-l-arial-orange">
                    <td className="px-6 py-4">
                      <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                        {formatDisplayDate(item.controlDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${badgeStyle}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-800 text-xs leading-tight">
                        {item.patient ? `${item.patient.nombre} ${item.patient.apellido}` : '---'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">
                        {item.patient?.empresa || '---'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] text-slate-600 font-bold max-w-[180px] truncate">
                        {item.latest?.diagnosis || '---'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onOpenEvolution(item.id)}
                        className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-arial-orange transition-all active:scale-95 shadow-md flex items-center gap-2 mx-auto"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 pt-2">
        <div className="px-4 py-2 bg-white rounded-xl border border-slate-100 flex items-center gap-2 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Atrasado</span>
        </div>
        <div className="px-4 py-2 bg-white rounded-xl border border-slate-100 flex items-center gap-2 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vence Hoy</span>
        </div>
        <div className="px-4 py-2 bg-white rounded-xl border border-slate-100 flex items-center gap-2 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">En Plazo</span>
        </div>
      </div>
    </div>
  );
};

export default ControlAgenda;
