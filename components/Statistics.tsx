
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AbsenteeismCase, Patient, User, Company } from '../types';

interface StatisticsProps {
  cases: AbsenteeismCase[];
  patients: Patient[];
  users: User[];
  companies: Company[];
}

const SmartSelect: React.FC<{ 
  label: string; 
  value: string; 
  options: { value: string; label: string }[]; 
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const selectedLabel = options.find(opt => opt.value === value)?.label || 'Seleccionar...';

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-left flex justify-between items-center hover:bg-white transition-all shadow-sm"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg className={`w-3 h-3 md:w-4 md:h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 md:p-3 border-b border-slate-50 bg-slate-50/50">
            <input 
              autoFocus
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[9px] md:text-[10px] font-bold outline-none focus:border-arial-orange"
            />
          </div>
          <div className="max-h-52 md:max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="p-4 text-[9px] text-slate-400 italic font-bold">Sin resultados</p>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-4 py-2.5 md:px-5 md:py-3 text-[9px] md:text-[10px] font-black uppercase transition-all border-b border-slate-50 last:border-0 ${
                    value === opt.value ? 'bg-orange-50 text-arial-orange' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Statistics: React.FC<StatisticsProps> = ({ cases, patients, users, companies }) => {
  const [filterPeriod, setFilterPeriod] = useState('todo');
  const [filterEmpresa, setFilterEmpresa] = useState('todas');
  const [filterMedico, setFilterMedico] = useState('todos');
  const [filterPacienteId, setFilterPacienteId] = useState('todos');

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const barInstance = useRef<any>(null);
  const pieInstance = useRef<any>(null);

  const isWithinPeriod = (dateStr: string) => {
    if (!dateStr || filterPeriod === 'todo') return true;
    const date = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    if (filterPeriod === 'este-mes') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    if (filterPeriod === 'mes-pasado') {
      const lastMonth = new Date();
      lastMonth.setMonth(now.getMonth() - 1);
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
    }
    if (filterPeriod === 'anio-actual') return date.getFullYear() === now.getFullYear();
    return true;
  };

  const processedData = useMemo(() => {
    return cases.map(c => {
      const patient = patients.find(p => p.id === c.patientId);
      const evolutions = c.evolutions || [];
      const admission = evolutions.find(ev => ev.user.includes('Admisión'));
      const suggested = admission ? admission.daysSuggested : (evolutions[0]?.daysSuggested || 0);
      
      const doctorsMap = new Map<string, number>();
      let totalAuthorized = 0;
      evolutions.forEach(ev => {
        if (!ev.user.includes('Admisión')) {
          const cleanName = ev.user.replace('Dr. ', '').split('(')[0].trim();
          const days = ev.daysAuthorized || 0;
          if (days > 0) {
            doctorsMap.set(cleanName, (doctorsMap.get(cleanName) || 0) + days);
            totalAuthorized += days;
          }
        }
      });

      const ahorro = suggested - totalAuthorized;
      const diagnosis = admission?.diagnosis || evolutions[evolutions.length - 1]?.diagnosis || 'S/D';
      
      return {
        ...c,
        patientName: patient ? `${patient.nombre} ${patient.apellido}` : 'Desconocido',
        diagnosis,
        auditorString: Array.from(doctorsMap.entries()).map(([n, d]) => `Dr. ${n} (${d}d)`).join(', ') || 'Pendiente',
        empresa: patient?.empresa || 'S/E',
        suggested,
        authorized: totalAuthorized,
        ahorro,
        lastUpdate: evolutions[evolutions.length - 1]?.timestamp || '',
        rawDoctors: Array.from(doctorsMap.keys())
      };
    }).filter(item => {
      const matchesEmpresa = filterEmpresa === 'todas' || item.empresa === filterEmpresa;
      const matchesMedico = filterMedico === 'todos' || item.rawDoctors.some(d => d.toLowerCase().includes(filterMedico.toLowerCase()));
      const matchesPaciente = filterPacienteId === 'todos' || item.patientId === filterPacienteId;
      return matchesEmpresa && matchesMedico && matchesPaciente && isWithinPeriod(item.lastUpdate);
    });
  }, [cases, patients, filterPeriod, filterEmpresa, filterMedico, filterPacienteId]);

  const kpis = useMemo(() => {
    const totalSuggested = processedData.reduce((acc, curr) => acc + curr.suggested, 0);
    const totalAuthorized = processedData.reduce((acc, curr) => acc + curr.authorized, 0);
    const totalSaved = processedData.reduce((acc, curr) => acc + Math.max(0, curr.ahorro), 0);
    return {
      totalSuggested,
      totalAuthorized,
      totalSaved,
      efficiency: totalSuggested > 0 ? ((totalSaved / totalSuggested) * 100).toFixed(1) : "0.0"
    };
  }, [processedData]);

  useEffect(() => {
    if (barInstance.current) barInstance.current.destroy();
    if (pieInstance.current) pieInstance.current.destroy();

    const chartFont = { size: 10, weight: 'bold', family: 'Inter' };

    if (barChartRef.current) {
      barInstance.current = new (window as any).Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels: ['Solicitado', 'Auditado'],
          datasets: [{
            data: [kpis.totalSuggested, kpis.totalAuthorized],
            backgroundColor: ['#f1f5f9', '#BC4B13'],
            borderRadius: 8,
            maxBarThickness: 40 
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          layout: { padding: { top: 10, bottom: 5, left: 10, right: 10 } },
          scales: { 
            y: { display: false },
            x: { 
              grid: { display: false }, 
              border: { display: false }, 
              ticks: { font: chartFont, color: '#94a3b8', padding: 10 } 
            }
          }
        }
      });
    }

    if (pieChartRef.current) {
      const counts: Record<string, number> = {};
      processedData.forEach(d => { counts[d.diagnosis] = (counts[d.diagnosis] || 0) + 1; });
      const top5 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

      pieInstance.current = new (window as any).Chart(pieChartRef.current, {
        type: 'doughnut',
        data: {
          labels: top5.map(t => t[0]),
          datasets: [{
            data: top5.map(t => t[1]),
            backgroundColor: ['#BC4B13', '#1e293b', '#334155', '#475569', '#64748b'],
            borderWidth: 0,
            hoverOffset: 15
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: { 
            legend: { 
              position: 'bottom', 
              labels: { 
                boxWidth: 6, 
                padding: 10, 
                font: { size: 8, weight: '600', family: 'Inter' },
                color: '#64748b',
                usePointStyle: true
              } 
            } 
          }
        }
      });
    }
  }, [processedData, kpis]);

  const periodOptions = [
    { value: 'todo', label: 'Historial' },
    { value: 'este-mes', label: 'Este Mes' },
    { value: 'mes-pasado', label: 'Mes Pasado' },
    { value: 'anio-actual', label: 'Año Fiscal' }
  ];

  const empresaOptions = useMemo(() => {
    const uniques = (companies || []).map(c => c.name).sort((a, b) => a.localeCompare(b));
    return [{ value: 'todas', label: 'Todas las Empresas' }, ...uniques.map(e => ({ value: e, label: e }))];
  }, [companies]);

  const auditorOptions = useMemo(() => {
    const medicos = users.filter(u => u.role !== 'administrativo');
    return [{ value: 'todos', label: 'Auditores' }, ...medicos.map(u => ({ value: u.fullName, label: u.fullName }))];
  }, [users]);

  const pacienteOptions = useMemo(() => {
    const sorted = [...patients].sort((a, b) => a.apellido.localeCompare(b.apellido));
    return [{ value: 'todos', label: 'Pacientes' }, ...sorted.map(p => ({ value: p.id, label: `${p.apellido}, ${p.nombre}` }))];
  }, [patients]);

  return (
    <div className="min-h-screen bg-slate-50 font-inter -mx-4 md:mx-0">
      {/* BARRA DE FILTROS REPOSICIONADA PARA MÓVIL */}
      <div className="bg-white/95 backdrop-blur-xl sticky top-0 md:top-[-2rem] z-40 border-b border-slate-200 shadow-lg px-4 md:px-8 py-4 md:py-6 mb-4 md:mb-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <SmartSelect label="Periodo" value={filterPeriod} options={periodOptions} onChange={setFilterPeriod} />
            <SmartSelect label="Empresa" value={filterEmpresa} options={empresaOptions} onChange={setFilterEmpresa} />
            <SmartSelect label="Auditor" value={filterMedico} options={auditorOptions} onChange={setFilterMedico} />
            <SmartSelect label="Paciente" value={filterPacienteId} options={pacienteOptions} onChange={setFilterPacienteId} />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 bg-emerald-600 text-white py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest shadow-lg">Excel</button>
            <button className="flex-1 bg-slate-900 text-white py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest shadow-lg">PDF</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 px-4 md:px-0 pb-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <KPICard title="Solicitados" value={kpis.totalSuggested} sub="Pretensión" />
          <KPICard title="Validados" value={kpis.totalAuthorized} sub="Auditoría" />
          <KPICard title="Ahorro Real" value={kpis.totalSaved} sub="Días de Gestión" />
          <KPICard title="Eficacia" value={`${kpis.efficiency}%`} sub="Performance" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">
          <div className="lg:col-span-5 bg-white p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-slate-200 h-[280px] md:h-[340px] flex flex-col">
             <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Días Auditados</h3>
             <div className="flex-1 relative w-full h-full"><canvas ref={barChartRef}></canvas></div>
          </div>
          <div className="lg:col-span-7 bg-white p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-slate-200 h-[380px] md:h-[480px] flex flex-col">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Mix Patológico</h3>
            <div className="flex-1 relative w-full h-full"><canvas ref={pieChartRef}></canvas></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
            <h3 className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">Trazabilidad Auditoría</h3>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-50">
                  <th className="px-6 md:px-10 py-5">Colaborador / Diagnóstico</th>
                  <th className="px-4 md:px-6 py-5">Médicos</th>
                  <th className="px-4 md:px-6 py-5">Empresa</th>
                  <th className="px-4 md:px-6 py-5 text-center">Auditado</th>
                  <th className="px-6 md:px-10 py-5 text-center">Ahorro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {processedData.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-[9px] font-black text-slate-300 uppercase italic">Sin registros</td></tr>
                ) : processedData.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 md:px-10 py-5">
                      <p className="font-black text-slate-800 text-[11px] md:text-xs leading-tight">{d.patientName}</p>
                      <p className="text-[8px] md:text-[9px] font-semibold text-slate-400 mt-0.5 uppercase truncate max-w-[150px]">{d.diagnosis}</p>
                    </td>
                    <td className="px-4 md:px-6 py-5">
                      <span className="text-[8px] md:text-[9px] font-black text-arial-orange bg-orange-50/50 px-3 py-1.5 rounded-lg inline-block truncate max-w-[150px]">{d.auditorString}</span>
                    </td>
                    <td className="px-4 md:px-6 py-5 text-[8px] md:text-[9px] font-bold text-slate-400 uppercase truncate max-w-[100px]">{d.empresa}</td>
                    <td className="px-4 md:px-6 py-5 text-center font-bold text-slate-500 text-[10px] md:text-[11px]">{d.suggested} / {d.authorized}</td>
                    <td className="px-6 md:px-10 py-5 text-center font-black text-slate-700 text-[10px] md:text-[11px] whitespace-nowrap">{Math.abs(d.ahorro)} d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard: React.FC<{ title: string; value: string | number; sub: string }> = ({ title, value, sub }) => (
  <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-lg transition-all group">
    <p className="text-[8px] md:text-[9px] font-black text-slate-400 group-hover:text-arial-orange uppercase tracking-widest mb-2 transition-colors">{title}</p>
    <p className="text-xl md:text-3xl font-black text-slate-800 tracking-tighter leading-none">{value}</p>
    <p className="text-[7px] md:text-[8px] font-bold text-slate-300 uppercase mt-3 tracking-wider">{sub}</p>
  </div>
);

export default Statistics;
