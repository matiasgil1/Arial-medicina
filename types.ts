
export interface EvolutionEntry {
  id: string;
  timestamp: string;
  user: string;
  diagnosis: string;
  cie10: string;
  daysSuggested: number;
  daysAuthorized: number;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface Patient {
  id: string;
  fecha?: string; // Col B
  dni: string;    // Col C
  nombre: string; // Col D
  apellido: string; // Col E
  edad: string;   // Col F
  mail: string;   // Col G
  telefono: string; // Col H
  empresa: string; // Col I
  legajo: string;  // Col J
}

export interface Company {
  id: string;
  name: string;
  cuit: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'médico' | 'administrativo';
}

export interface AbsenteeismCase {
  id: string;
  patientId: string;
  status: 'PENDIENTE_AUDITORIA' | 'EN_SEGUIMIENTO' | 'ALTA_MEDICA';
  evolutions: EvolutionEntry[];
}

export type ViewType = 'atencion-dia' | 'new-case' | 'details' | 'stats' | 'history' | 'history-global' | 'admin-panel' | 'agenda' | 'companies';
