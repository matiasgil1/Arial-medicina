
import { AbsenteeismCase, Patient } from './types';

export const COLORS = {
  primary: '#BC4B13',
  secondary: '#F1F5F9',
  accent: '#EAB308',
  danger: '#EF4444',
};

// Top 50 CIE-10 más usados en Medicina Laboral (Priorizados)
export const CIE10_COMMON_LIST = [
  // TRAUMATOLOGÍA Y ERGONOMÍA (Más comunes)
  { code: 'M54.5', description: 'Lumbalgia aguda / Lumbago no especificado' },
  { code: 'M54.2', description: 'Cervicalgia' },
  { code: 'S93.4', description: 'Esguince y torcedura del tobillo' },
  { code: 'M75.1', description: 'Síndrome del manguito rotador (Hombro)' },
  { code: 'G56.0', description: 'Síndrome del túnel carpiano' },
  { code: 'M77.1', description: 'Epicondilitis lateral (Codo de tenista)' },
  { code: 'M54.4', description: 'Lumbago con ciática' },
  { code: 'M79.1', description: 'Mialgia (Dolor muscular generalizado)' },
  { code: 'S63.5', description: 'Esguince y torcedura de la muñeca' },
  { code: 'M62.6', description: 'Distensión muscular / Desgarro' },
  { code: 'S83.6', description: 'Esguince y torcedura de la rodilla' },
  { code: 'M54.1', description: 'Radiculopatía' },
  { code: 'M25.5', description: 'Dolor articular' },
  { code: 'S60.0', description: 'Contusión de dedo(s) de la mano' },
  { code: 'M72.2', description: 'Fascitis plantar' },
  { code: 'M17.9', description: 'Gonartrosis (Desgaste de rodilla)' },
  { code: 'S33.5', description: 'Esguince y torcedura de columna lumbar' },
  { code: 'M65.9', description: 'Tenosinovitis / Sinovitis' },
  { code: 'M22.4', description: 'Condromalacia rotuliana' },
  { code: 'S40.0', description: 'Contusión de hombro y brazo' },
  
  // INFECTOLOGÍA Y RESPIRATORIO
  { code: 'J00', description: 'Resfriado común (Nasofaringitis)' },
  { code: 'J06.9', description: 'Infección respiratoria alta aguda' },
  { code: 'A09', description: 'Gastroenteritis y diarrea infecciosa' },
  { code: 'J03.9', description: 'Amigdalitis aguda' },
  { code: 'U07.1', description: 'COVID-19 (Confirmado)' },
  { code: 'J11.1', description: 'Gripe con manifestaciones respiratorias' },
  { code: 'J20.9', description: 'Bronquitis aguda' },
  { code: 'A90', description: 'Fiebre del Dengue' },
  { code: 'J01.9', description: 'Sinusitis aguda' },
  { code: 'B34.9', description: 'Infección viral no especificada' },
  { code: 'J02.9', description: 'Faringitis aguda' },
  
  // SALUD MENTAL (Creciente demanda)
  { code: 'F43.0', description: 'Reacción al estrés agudo' },
  { code: 'Z73.0', description: 'Síndrome de Burnout (Agotamiento vital)' },
  { code: 'F41.1', description: 'Trastorno de ansiedad generalizada' },
  { code: 'F41.2', description: 'Trastorno mixto ansioso-depresivo' },
  { code: 'F32.9', description: 'Episodio depresivo moderado' },
  { code: 'F43.2', description: 'Trastorno de adaptación' },
  { code: 'F51.0', description: 'Insomnio no orgánico' },
  
  // OTROS (Sintomatología y Varios)
  { code: 'R51', description: 'Cefalea / Dolor de cabeza intenso' },
  { code: 'G43.9', description: 'Migraña no especificada' },
  { code: 'R42', description: 'Mareo y vértigo' },
  { code: 'I10', description: 'Hipertensión arterial esencial' },
  { code: 'K29.7', description: 'Gastritis aguda' },
  { code: 'N39.0', description: 'Infección urinaria' },
  { code: 'L24.9', description: 'Dermatitis de contacto' },
  { code: 'R10.4', description: 'Dolor abdominal / Cólico' },
  { code: 'R53', description: 'Malestar y fatiga general' },
  { code: 'K02.9', description: 'Caries dental / Odontalgia aguda' },
  { code: 'Z76.3', description: 'Cuidado de familiar enfermo' },
  { code: 'Z02.7', description: 'Extensión de certificado médico' }
];

// Datos Mock para desarrollo (Mantenidos por compatibilidad)
export const MOCK_PATIENTS: Patient[] = [];
export const MOCK_CASES: AbsenteeismCase[] = [];
