
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
  isDark?: boolean;
}> = ({ label, value, options, onChange, isDark = false }) => {
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
    <div className="space-y-1.5 relative flex-1 min-w-0" ref={containerRef}>
      <label className={`text-[8px] font-black uppercase tracking-widest ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</label>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-xl px-4 py-3 text-[10px] font-bold text-left flex justify-between items-center transition-all shadow-sm ${
          isDark 
            ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' 
            : 'bg-white border-slate-200 text-slate-700 hover:border-arial-orange'
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className={`absolute z-[110] mt-2 w-full border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className={`p-2 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <input 
              autoFocus
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-[10px] font-bold outline-none ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white focus:border-arial-orange' 
                  : 'bg-white border-slate-200 text-slate-700 focus:border-arial-orange'
              }`}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
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
                  className={`w-full text-left px-4 py-3 text-[9px] font-black uppercase transition-all border-b last:border-0 ${
                    isDark 
                      ? `border-slate-800 ${value === opt.value ? 'bg-arial-orange text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}` 
                      : `border-slate-50 ${value === opt.value ? 'bg-orange-50 text-arial-orange' : 'text-slate-600 hover:bg-slate-50'}`
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
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const [tableSearch, setTableSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: 'lastUpdate', direction: 'desc' });
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const tableItemsPerPage = 10;

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
        id: c.id,
        patientId: c.patientId,
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

  const handleExportExcel = () => {
    const exportData = processedData.map(d => ({
      Colaborador: d.patientName,
      Empresa: d.empresa,
      Diagnostico: d.diagnosis,
      Medicos: d.auditorString,
      Solicitado: d.suggested,
      Auditado: d.authorized,
      Ahorro: d.ahorro
    }));
    const ws = (window as any).XLSX.utils.json_to_sheet(exportData);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    const filename = `Arial_Reporte_${filterEmpresa !== 'todas' ? filterEmpresa : 'Global'}_${filterPeriod}.xlsx`;
    (window as any).XLSX.writeFile(wb, filename);
  };

  const handleExportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF('landscape');
    doc.setFontSize(22);
    doc.setTextColor(188, 75, 19); 
    doc.text("ARIAL - Auditoría Médica", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Filtro: ${filterEmpresa} | Periodo: ${filterPeriod} | Generado: ${new Date().toLocaleString()}`, 14, 28);
    const tableData = processedData.map(d => [d.patientName, d.empresa, d.diagnosis, d.auditorString, d.suggested, d.authorized, `${d.ahorro} d`]);
    (doc as any).autoTable({
      head: [['Colaborador', 'Empresa', 'Diagnóstico', 'Auditores', 'Sol.', 'Aud.', 'Ahorro']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [188, 75, 19], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });
    doc.save(`Arial_Reporte_${filterEmpresa}_${Date.now()}.pdf`);
  };

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
          scales: { 
            y: { display: false },
            x: { grid: { display: false }, border: { display: false }, ticks: { font: chartFont, color: '#94a3b8', padding: 10 } }
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
              labels: { boxWidth: 6, padding: 10, font: { size: 8, weight: '600', family: 'Inter' }, color: '#64748b', usePointStyle: true } 
            } 
          }
        }
      });
    }
  }, [processedData, kpis]);

  const periodOptions = [{ value: 'todo', label: 'Historial Completo' }, { value: 'este-mes', label: 'Mes en Curso' }, { value: 'mes-pasado', label: 'Mes Anterior' }, { value: 'anio-actual', label: 'Año Fiscal 2026' }];
  const empresaOptions = useMemo(() => {
    const uniques = (companies || []).map(c => c.name).sort((a, b) => a.localeCompare(b));
    return [{ value: 'todas', label: 'Todas las Empresas' }, ...uniques.map(e => ({ value: e, label: e }))];
  }, [companies]);

  return (
    <div className="min-h-screen bg-slate-50 font-inter -mx-4 md:mx-0">
      <div className="hidden lg:block bg-white/80 backdrop-blur-xl sticky top-[-2rem] z-40 border-b border-slate-100 shadow-sm px-8 py-6 mb-8">
        <div className="max-w-7xl mx-auto flex items-end gap-6">
          <div className="flex-1 grid grid-cols-4 gap-4">
            <SmartSelect label="Filtrar Periodo" value={filterPeriod} options={periodOptions} onChange={setFilterPeriod} />
            <SmartSelect label="Filtrar Empresa" value={filterEmpresa} options={empresaOptions} onChange={setFilterEmpresa} />
            <SmartSelect label="Filtrar Auditor" value={filterMedico} options={[{ value: 'todos', label: 'Todos los Médicos' }, ...users.filter(u => u.role !== 'administrativo').map(u => ({ value: u.fullName, label: u.fullName }))]} onChange={setFilterMedico} />
            <SmartSelect label="Filtrar Paciente" value={filterPacienteId} options={[{ value: 'todos', label: 'Todos los Pacientes' }, ...patients.map(p => ({ value: p.id, label: `${p.apellido}, ${p.nombre}` }))]} onChange={setFilterPacienteId} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportExcel} className="bg-emerald-600 text-white h-[44px] px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/20" title="Exportar datos a Excel">Exportar Excel</button>
            <button onClick={handleExportPDF} className="bg-slate-900 text-white h-[44px] px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg" title="Generar informe en PDF">Informe PDF</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 px-4 md:px-0 pb-20 mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <KPICard title="Solicitados" value={kpis.totalSuggested} sub="Solicitud Original" />
          <KPICard title="Validados" value={kpis.totalAuthorized} sub="Auditoría Real" />
          <KPICard title="Días Ahorrados" value={kpis.totalSaved} sub="Gestión de Baja" />
          <KPICard title="Tasa Eficacia" value={`${kpis.efficiency}%`} sub="Performance" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">
          <div className="lg:col-span-5 bg-white p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-slate-200 h-[280px] md:h-[340px] flex flex-col">
             <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Comparativa de Días</h3>
             <div className="flex-1 relative w-full h-full"><canvas ref={barChartRef}></canvas></div>
          </div>
          <div className="lg:col-span-7 bg-white p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-slate-200 h-[380px] md:h-[480px] flex flex-col">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Distribución Patológica</h3>
            <div className="flex-1 relative w-full h-full"><canvas ref={pieChartRef}></canvas></div>
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
