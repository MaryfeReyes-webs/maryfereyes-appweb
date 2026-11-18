import { data, deleteService } from '@/stores/data'
import { errorToast, openComplete, toast } from '@/stores/ui'
import type { Service } from '@/types'
import { whatsappNumber } from '@/utils/boleta'
import { longDate, money, prettyDate, today } from '@/utils/format'
import { balanceOf } from '@/utils/stats'

/** Acciones comunes sobre un servicio / cita, usadas por todas las vistas de agenda. */
export function useServiceActions() {
  /** Abre el diálogo "Marcar como realizado", que pregunta si pagó completo, una parte o nada. */
  function complete(s: Service) {
    openComplete(s.id)
  }

  async function remove(s: Service) {
    if (!confirm(`¿Eliminar el servicio "${s.servicio}" de ${s.patientName} del ${prettyDate(s.fecha)}?`)) return
    try {
      await deleteService(s.id)
      toast('Servicio eliminado')
    } catch (e) {
      errorToast(e)
    }
  }

  function phoneOf(patientId: string): string {
    const p = data.patients.find((x) => x.id === patientId)
    return p?.telefono ? whatsappNumber(p.telefono, data.settings.codigoPais) : ''
  }

  function openChat(patientId: string, text: string) {
    const n = phoneOf(patientId)
    if (!n) return toast('El paciente no tiene teléfono registrado', 'error')
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  function remind(s: Service) {
    const cuando = s.fecha === today() ? 'hoy' : `el ${longDate(s.fecha)}`
    openChat(
      s.patientId,
      `Hola ${s.patientName.split(' ')[0]} 😊, te escribimos de *${data.settings.nombre}*.\n` +
        `Te recordamos tu cita de ${s.servicio} ${cuando}${s.hora ? ` a las ${s.hora}` : ''}.\n` +
        `Por favor confírmanos tu asistencia. ¡Te esperamos! 🦷`,
    )
  }

  function remindDebt(patientId: string, services: Service[]) {
    const total = services.reduce((a, s) => a + balanceOf(s), 0)
    const name = services[0]?.patientName.split(' ')[0] ?? ''
    const detalle = services.map((s) => `• ${s.servicio} (${prettyDate(s.fecha)}): ${money(balanceOf(s))}`).join('\n')
    openChat(
      patientId,
      `Hola ${name} 😊, te escribimos de *${data.settings.nombre}*.\n` +
        `Te recordamos que tienes un saldo pendiente de *${money(total)}*:\n${detalle}\n` +
        `Puedes pagarlo en tu próxima visita o por Yape/Plin. ¡Gracias! 🦷`,
    )
  }

  return { complete, remove, remind, remindDebt, phoneOf }
}
