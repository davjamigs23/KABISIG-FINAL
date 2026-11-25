import {
  YouthProfile,
  Program,
  Registration,
  DocumentRecord,
  ExpenseRecord,
  FeedbackRecord,
  ResolutionRecord,
  SystemAuditLog,
  AnnouncementRecord
} from './types';

/**
 * Initial Provisioning: Permanent 27 Naga City Barangays
 * Matching fixed UUIDs and canonical names in database migration 001_kabisig_schema.sql
 */
export const DEFAULT_BARANGAY_LOGOS: Record<string, string> = {
  "Bagumbayan Norte": "/logos/bagumbayannorte_logo.png",
  "Bagumbayan Sur": "/logos/bagumbayansur_logo.png",
  "Calauag": "/logos/calauag_logo.png",
  "Carolina": "/logos/carolina_logo.png",
  "Dayangdang": "/logos/dayangdang_logo.png",
  "Liboton": "/logos/liboton_logo.png",
  "Pacol": "/logos/pacol_logo.png",
  "Panicuason": "/logos/panicuason_logo.png",
  "Peñafrancia": "/logos/penafrancia_logo.png",
  "San Felipe": "/logos/sanfelipe_logo.png",
  "Santa Cruz": "/logos/stacruz_logo.png",
  "Abella": "/logos/abella_logo.PNG",
  "Balatas": "/logos/balatas_logo.png",
  "Cararayan": "/logos/cararayan_logo.png",
  "Concepcion Grande": "/logos/grande_logo.png",
  "Concepcion Pequeña": "/logos/pequena_logo.png",
  "Del Rosario": "/logos/delrosario_logo.png",
  "Dinaga": "/logos/dinaga_logo.png",
  "Igualdad Interior": "/logos/igualidad_logo.png",
  "Lerma": "/logos/lerma_logo.png",
  "Mabolo": "/logos/mabolo_logo.png",
  "Sabang": "/logos/sabang_logo.png",
  "San Francisco": "/logos/sanfrancisco_logo.png",
  "San Isidro": "/logos/sanisidiro_logo.png",
  "Tabuco": "/logos/tabuco_logo.png",
  "Tinago": "/logos/tinago_logo.png",
  "Triangulo": "/logos/triangulo_logo.png"
};

export const BARANGAY_DISTRICTS: Record<string, 'District 1' | 'District 2'> = {
  'Bagumbayan Norte': 'District 1',
  'Bagumbayan Sur': 'District 1',
  'Calauag': 'District 1',
  'Carolina': 'District 1',
  'Dayangdang': 'District 1',
  'Liboton': 'District 1',
  'Pacol': 'District 1',
  'Panicuason': 'District 1',
  'Peñafrancia': 'District 1',
  'San Felipe': 'District 1',
  'Santa Cruz': 'District 1',
  'Abella': 'District 2',
  'Balatas': 'District 2',
  'Cararayan': 'District 2',
  'Concepcion Grande': 'District 2',
  'Concepcion Pequeña': 'District 2',
  'Del Rosario': 'District 2',
  'Dinaga': 'District 2',
  'Igualdad Interior': 'District 2',
  'Lerma': 'District 2',
  'Mabolo': 'District 2',
  'Sabang': 'District 2',
  'San Francisco': 'District 2',
  'San Isidro': 'District 2',
  'Tabuco': 'District 2',
  'Tinago': 'District 2',
  'Triangulo': 'District 2',
};

export const BARANGAY_SK_DISTRICTS: Record<string, 'North' | 'South' | 'West' | 'East'> = {
  'Bagumbayan Norte': 'North',
  'Bagumbayan Sur': 'North',
  'Calauag': 'North',
  'Liboton': 'North',
  'Peñafrancia': 'North',
  'San Felipe': 'North',
  'San Francisco': 'North',
  'Santa Cruz': 'North',
  'Balatas': 'South',
  'Concepcion Grande': 'South',
  'Concepcion Pequeña': 'South',
  'Dayangdang': 'South',
  'Tinago': 'South',
  'Triangulo': 'South',
  'Abella': 'West',
  'Dinaga': 'West',
  'Igualdad Interior': 'West',
  'Lerma': 'West',
  'Mabolo': 'West',
  'Sabang': 'West',
  'Tabuco': 'West',
  'Cararayan': 'East',
  'Carolina': 'East',
  'Del Rosario': 'East',
  'Pacol': 'East',
  'Panicuason': 'East',
  'San Isidro': 'East',
};

// User-generated records start empty and are populated from the backend.
export const INITIAL_PROGRAMS: Program[] = [];
export const INITIAL_YOUTH_PROFILES: YouthProfile[] = [];
export const INITIAL_REGISTRATIONS: Registration[] = [];
export const INITIAL_FEEDBACK: FeedbackRecord[] = [];
export const INITIAL_RESOLUTIONS: ResolutionRecord[] = [];
export const INITIAL_EXPENSES: ExpenseRecord[] = [];
export const INITIAL_DOCUMENTS: DocumentRecord[] = [];
export const INITIAL_ANNOUNCEMENTS: AnnouncementRecord[] = [];
export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [];
