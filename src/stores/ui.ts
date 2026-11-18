import { reactive } from 'vue'
import type { Expense, Patient, Service } from '@/types'

/** Estado global de los modales para poder abrirlos desde cualquier pantalla. */
export const ui = reactive({
  patientModal: { open: false, patient: null as Patient | null },
  serviceModal: {
    open: false,
    service: null as Service | null,
    patientId: '' as string,
    preset: {} as { fecha?: string; estado?: 'agendado' | 'completado' },
  },
  expenseModal: { open: false, expense: null as Expense | null },
  boletaModal: { open: false, serviceId: '' as string },
  cancelModal: { open: false, serviceId: '' as string },
  payModal: { open: false, serviceId: '' as string },
  completeModal: { open: false, serviceId: '' as string },
  toasts: [] as { id: number; text: string; kind: 'ok' | 'error' }[],
})

export function openPatient(patient: Patient | null = null) {
  ui.patientModal = { open: true, patient }
}
export function openService(
  service: Service | null = null,
  patientId = '',
  preset: { fecha?: string; estado?: 'agendado' | 'completado' } = {},
) {
  ui.serviceModal = { open: true, service, patientId, preset }
}
export function openExpense(expense: Expense | null = null) {
  ui.expenseModal = { open: true, expense }
}
export function openBoleta(serviceId: string) {
  ui.boletaModal = { open: true, serviceId }
}

export function openCancel(serviceId: string) {
  ui.cancelModal = { open: true, serviceId }
}
export function openComplete(serviceId: string) {
  ui.completeModal = { open: true, serviceId }
}
export function openPay(serviceId: string) {
  ui.payModal = { open: true, serviceId }
}

let toastId = 0
export function toast(text: string, kind: 'ok' | 'error' = 'ok') {
  const id = ++toastId
  ui.toasts.push({ id, text, kind })
  setTimeout(() => {
    ui.toasts = ui.toasts.filter((t) => t.id !== id)
  }, 3500)
}

export function errorToast(e: unknown) {
  console.error(e)
  toast(e instanceof Error ? e.message : 'Ocurrió un error', 'error')
}
