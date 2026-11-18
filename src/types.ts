export type ServiceStatus = 'agendado' | 'completado' | 'cancelado'
export type ExpenseType = 'inversion' | 'gasto'

export interface Patient {
  id: string
  nombre: string
  documento: string
  telefono: string
  email?: string
  fechaNacimiento?: string
  sexo?: string
  direccion?: string
  alergias?: string
  enfermedades?: string
  medicamentos?: string
  antecedentes?: string
  notas?: string
  createdAt: number
}

export interface Payment {
  monto: number
  /** YYYY-MM-DD */
  fecha: string
  metodo: string
  registradoEn: number
}

export interface Service {
  id: string
  patientId: string
  patientName: string
  servicio: string
  /** YYYY-MM-DD */
  fecha: string
  /** HH:mm */
  hora?: string
  costo: number
  pagado: number
  estado: ServiceStatus
  metodoPago?: string
  piezas?: string
  diagnostico?: string
  tratamiento?: string
  notas?: string
  boletaNumero?: number
  /** Abonos registrados con "Cobrar" (el pago inicial va en `pagado`). */
  pagos?: Payment[]
  reprogramaciones?: number
  motivoCancelacion?: string
  createdAt: number
}

export interface Expense {
  id: string
  concepto: string
  categoria: string
  tipo: ExpenseType
  monto: number
  /** YYYY-MM-DD */
  fecha: string
  proveedor?: string
  notas?: string
  createdAt: number
}

export interface CatalogItem {
  id: string
  nombre: string
  precio: number
}

export interface ClinicSettings {
  nombre: string
  profesional: string
  ruc: string
  direccion: string
  telefono: string
  codigoPais: string
  moneda: string
}

export const EXPENSE_CATEGORIES = [
  'Equipos',
  'Materiales e insumos',
  'Alquiler',
  'Servicios (luz, agua, internet)',
  'Personal',
  'Laboratorio dental',
  'Marketing',
  'Mantenimiento',
  'Capacitación',
  'Impuestos',
  'Otros',
]

export const PAYMENT_METHODS = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia', 'Otro']

export const DEFAULT_CATALOG: Omit<CatalogItem, 'id'>[] = [
  { nombre: 'Consulta y evaluación', precio: 50 },
  { nombre: 'Limpieza dental (profilaxis)', precio: 120 },
  { nombre: 'Curación con resina', precio: 150 },
  { nombre: 'Extracción simple', precio: 120 },
  { nombre: 'Extracción de tercera molar', precio: 350 },
  { nombre: 'Endodoncia', precio: 450 },
  { nombre: 'Blanqueamiento dental', precio: 600 },
  { nombre: 'Corona', precio: 800 },
  { nombre: 'Prótesis dental', precio: 1200 },
  { nombre: 'Control de ortodoncia', precio: 150 },
  { nombre: 'Radiografía', precio: 40 },
]

export const DEFAULT_SETTINGS: ClinicSettings = {
  nombre: 'maryfereyes',
  profesional: 'Mary Fe Reyes · Cirujano Dentista',
  ruc: '',
  direccion: '',
  telefono: '',
  codigoPais: '51',
  moneda: 'S/',
}
