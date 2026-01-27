
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AbsenteeismCase, Patient, User, Company } from '../types';

interface StatisticsProps {
  cases: AbsenteeismCase[];
  patients: Patient[];
  users: User[];
  companies: Company[];
}

// Componente de Select Inteligente con buscador interno
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
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-[11px] font-bold text-left flex justify-between items-center hover:bg-white transition-all shadow-sm"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-50 bg-slate-50/50">
            <input 
              autoFocus
              type="text"
              placeholder="Escriba para buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-bold outline-none focus:border-arial-orange"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="p-4 text-[10px] text-slate-400 italic font-bold">Sin resultados</p>
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
                  className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase transition-all border-b border-slate-50 last:border-0 ${
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

  const exportExcel = () => {
    const headers = ["Colaborador", "Diagnóstico CIE-10", "Médicos Auditores", "Empresa", "Días Solicitados", "Días Auditados", "Días Ahorro"];
    const rows = processedData.map(d => [d.patientName, d.diagnosis, d.auditorString, d.empresa, d.suggested, d.authorized, Math.abs(d.ahorro)]);
    const worksheet = (window as any).XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    worksheet['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    (window as any).XLSX.writeFile(workbook, `Arial_Export_${Date.now()}.xlsx`);
  };

  const exportPDF = async () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // --- 1. ENCABEZADO CORPORATIVO ---
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.text("ARIAL", margin, 25);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("REPORT AUDIT - GESTIÓN DE AUSENTISMO", margin, 34);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("ESTADÍSTICAS GERENCIALES", pageWidth - margin, 25, { align: 'right' });
    doc.setFontSize(8);
    doc.text(`FECHA REPORTE: ${new Date().toLocaleString()}`, pageWidth - margin, 32, { align: 'right' });

    let currentY = 55;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DE CONFIGURACIÓN Y FILTROS", margin, currentY);
    
    currentY += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    
    currentY += 10;
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    const filterInfo = [
      `PERIODO: ${filterPeriod.replace('-', ' ').toUpperCase()}`,
      `EMPRESA: ${filterEmpresa.toUpperCase()}`,
      `AUDITOR: ${filterMedico.toUpperCase()}`,
      `PACIENTE: ${filterPacienteId === 'todos' ? 'TODOS' : patients.find(p => p.id === filterPacienteId)?.apellido || 'ÚNICO'}`
    ].join("  |  ");
    doc.text(filterInfo, margin, currentY);

    currentY += 12;
    const cardW = (contentWidth - 9) / 4;
    const cardH = 26;
    
    const drawPDFCard = (x: number, y: number, title: string, value: string, accent: [number, number, number]) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardW, cardH, 3, 3, 'FD');
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(x, y, 1.2, cardH, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), x + 5, y + 8);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(15);
      doc.text(value, x + 5, y + 17);
    };

    drawPDFCard(margin, currentY, "Pretensión", kpis.totalSuggested.toString(), [30, 41, 59]);
    drawPDFCard(margin + cardW + 3, currentY, "Autorizado", kpis.totalAuthorized.toString(), [30, 41, 59]);
    drawPDFCard(margin + (cardW + 3) * 2, currentY, "Ahorro", kpis.totalSaved.toString(), [188, 75, 19]);
    drawPDFCard(margin + (cardW + 3) * 3, currentY, "Eficacia", `${kpis.efficiency}%`, [188, 75, 19]);

    currentY += cardH + 15;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DETALLE TÉCNICO Y TRAZABILIDAD OPERATIVA", margin, currentY);

    (doc as any).autoTable({
      startY: currentY + 5,
      head: [['Colaborador / Diagnóstico', 'Médicos Auditores', 'Empresa', 'Sol.', 'Aud.', 'Ahorro']],
      body: processedData.map(d => [
        `${d.patientName}\n[${d.diagnosis}]`, 
        d.auditorString, 
        d.empresa, 
        d.suggested, 
        d.authorized, 
        Math.abs(d.ahorro)
      ]),
      headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold', halign: 'left' },
      styles: { fontSize: 7, cellPadding: 3, font: 'helvetica' }, 
      columnStyles: { 
        0: { cellWidth: 'auto' },
        1: { cellWidth: 50 }, 
        2: { cellWidth: 20 },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', fontStyle: 'bold', textColor: [188, 75, 19], cellWidth: 15 } 
      },
      tableWidth: 'auto',
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
      didDrawPage: (data: any) => {
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${data.pageNumber}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
        doc.text("Arial Medicina Laboral - Documento Confidencial", margin, doc.internal.pageSize.getHeight() - 10);
      }
    });

    doc.save(`Arial_Reporte_Gerencial_${Date.now()}.pdf`);
  };

  useEffect(() => {
    if (barInstance.current) barInstance.current.destroy();
    if (pieInstance.current) pieInstance.current.destroy();

    const chartFont = { size: 11, weight: 'bold', family: 'Inter' };

    if (barChartRef.current) {
      barInstance.current = new (window as any).Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels: ['Solicitado', 'Auditado'],
          datasets: [{
            data: [kpis.totalSuggested, kpis.totalAuthorized],
            backgroundColor: ['#f1f5f9', '#BC4B13'],
            borderRadius: 12,
            maxBarThickness: 50 
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          layout: { padding: { top: 20, bottom: 10, left: 20, right: 20 } },
          scales: { 
            y: { display: false },
            x: { 
              grid: { display: false }, 
              border: { display: false }, 
              ticks: { font: chartFont, color: '#94a3b8', padding: 15 } 
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
            hoverOffset: 20
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: { 
            legend: { 
              position: 'bottom', 
              labels: { 
                boxWidth: 8, 
                padding: 12, 
                font: { size: 9, weight: '600', family: 'Inter' },
                color: '#64748b',
                usePointStyle: true,
                textAlign: 'left'
              } 
            } 
          }
        }
      });
    }
  }, [processedData, kpis]);

  // Preparar opciones para los Smart Selects
  const periodOptions = [
    { value: 'todo', label: 'Historial Completo' },
    { value: 'este-mes', label: 'Este Mes' },
    { value: 'mes-pasado', label: 'Mes Pasado' },
    { value: 'anio-actual', label: 'Año Fiscal' }
  ];

  const empresaOptions = useMemo(() => {
    // Usar el listado oficial de empresas registradas
    const uniques = (companies || []).map(c => c.name).sort((a, b) => a.localeCompare(b));
    return [
      { value: 'todas', label: 'Todas las Empresas' },
      ...uniques.map(e => ({ value: e, label: e }))
    ];
  }, [companies]);

  const auditorOptions = useMemo(() => {
    const medicos = users.filter(u => u.role !== 'administrativo');
    return [
      { value: 'todos', label: 'Auditores' },
      ...medicos.map(u => ({ value: u.fullName, label: u.fullName }))
    ];
  }, [users]);

  const pacienteOptions = useMemo(() => {
    const sorted = [...patients].sort((a, b) => a.apellido.localeCompare(b.apellido));
    return [
      { value: 'todos', label: 'Pacientes' },
      ...sorted.map(p => ({ value: p.id, label: `${p.apellido}, ${p.nombre}` }))
    ];
  }, [patients]);

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      {/* BARRA DE FILTROS TOTALMENTE FIJA CON SMART SELECTS */}
      <div className="bg-white/95 backdrop-blur-xl sticky top-[-2rem] z-50 border-b border-slate-200 shadow-lg mx-[-2rem] px-8 py-6 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          
          {/* Fila Filtros Específicos con Select Inteligente */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SmartSelect 
              label="Periodo" 
              value={filterPeriod} 
              options={periodOptions} 
              onChange={setFilterPeriod} 
            />
            <SmartSelect 
              label="Empresa" 
              value={filterEmpresa} 
              options={empresaOptions} 
              onChange={setFilterEmpresa} 
            />
            <SmartSelect 
              label="Auditor" 
              value={filterMedico} 
              options={auditorOptions} 
              onChange={setFilterMedico} 
            />
            <SmartSelect 
              label="Paciente" 
              value={filterPacienteId} 
              options={pacienteOptions} 
              onChange={setFilterPacienteId} 
            />
          </div>

          {/* Fila Acciones de Exportación */}
          <div className="flex gap-4">
            <button onClick={exportExcel} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] shadow-lg hover:bg-emerald-700 transition-all active:scale-95">Excel</button>
            <button onClick={exportPDF} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] shadow-lg hover:bg-arial-orange transition-all active:scale-95">PDF</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 px-4 md:px-0 pb-24">
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <KPICard title="Días Solicitados" value={kpis.totalSuggested} sub="Pretensión Total" />
          <KPICard title="Días Validados" value={kpis.totalAuthorized} sub="Carga Operativa" />
          <KPICard title="Ahorro Real" value={kpis.totalSaved} sub="Días de Gestión" />
          <KPICard title="Eficacia Staff" value={`${kpis.efficiency}%`} sub="Performance KPI" />
        </div>

        {/* DASHBOARD GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 h-[340px] flex flex-col hover:shadow-xl transition-all group overflow-hidden">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4 group-hover:text-arial-orange transition-colors">Balance de Auditoría</h3>
             <div className="flex-1 relative w-full h-full"><canvas ref={barChartRef}></canvas></div>
          </div>
          
          <div className="lg:col-span-7 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 h-[480px] flex flex-col hover:shadow-xl transition-all group overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 border-b border-slate-50 pb-4 group-hover:text-arial-orange transition-colors">Mix Patológico</h3>
            <div className="flex-1 relative w-full h-full"><canvas ref={pieChartRef}></canvas></div>
          </div>
        </div>

        {/* TABLA DE TRAZABILIDAD */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trazabilidad de Auditoría Médica</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed min-w-[950px]">
              <thead>
                <tr className="text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-50 bg-white">
                  <th className="px-10 py-6 w-[30%]">Colaborador / Diagnóstico</th>
                  <th className="px-6 py-6 w-[25%]">Médicos Auditores</th>
                  <th className="px-6 py-6 w-[15%]">Empresa</th>
                  <th className="px-6 py-6 text-center w-[12%]">Auditado (S/A)</th>
                  <th className="px-10 py-6 text-center w-[18%]">Ahorro Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {processedData.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-[10px] font-black text-slate-300 uppercase italic">Sin registros para los criterios de búsqueda</td></tr>
                ) : processedData.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-10 py-7">
                      <p className="font-black text-slate-800 text-xs leading-tight">{d.patientName}</p>
                      <p className="text-[9px] font-semibold text-slate-400 mt-1 uppercase truncate">{d.diagnosis}</p>
                    </td>
                    <td className="px-6 py-7">
                      <span className="text-[9px] font-black text-arial-orange bg-orange-50/50 px-4 py-2 rounded-xl inline-block max-w-full truncate">{d.auditorString}</span>
                    </td>
                    <td className="px-6 py-7 text-[9px] font-bold text-slate-400 uppercase">{d.empresa}</td>
                    <td className="px-6 py-7 text-center font-bold text-slate-500 text-[11px] tracking-tighter">{d.suggested} <span className="text-slate-200">/</span> {d.authorized}</td>
                    <td className="px-10 py-7 text-center">
                      <div className="inline-block px-6 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
                        <span className="text-xs font-black text-slate-700">{Math.abs(d.ahorro)} Días</span>
                      </div>
                    </td>
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
  <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
    <p className="text-[9px] md:text-[10px] font-black text-slate-400 group-hover:text-arial-orange uppercase tracking-widest mb-3 transition-colors">{title}</p>
    <p className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter leading-tight">{value}</p>
    <p className="text-[8px] font-bold text-slate-300 uppercase mt-4 tracking-wider">{sub}</p>
  </div>
);

export default Statistics;
