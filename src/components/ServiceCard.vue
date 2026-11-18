<script setup lang="ts">
import { computed } from 'vue'
import type { Service } from '@/types'
import { money, prettyDate, today } from '@/utils/format'
import { balanceOf } from '@/utils/stats'

const props = defineProps<{
  service: Service
  /** Qué mostrar en el bloque de la izquierda: la hora (agenda) o la fecha (listas). */
  lead?: 'hora' | 'fecha'
  hidePatient?: boolean
}>()

const statusLabel: Record<string, string> = { agendado: 'Agendado', completado: 'Realizado', cancelado: 'Cancelado' }
const debt = computed(() => balanceOf(props.service))
const overdue = computed(() => props.service.estado === 'agendado' && props.service.fecha < today())
const leadText = computed(() => {
  if ((props.lead ?? 'hora') === 'hora') return props.service.hora || '--:--'
  return prettyDate(props.service.fecha).replace(/ \d{4}$/, '')
})
</script>

<template>
  <article class="svc" :class="[service.estado, { overdue }]">
    <div class="svc-main">
      <div class="lead">
        <span class="lead-top">{{ leadText }}</span>
        <span v-if="lead === 'fecha' && service.hora" class="lead-sub">{{ service.hora }}</span>
      </div>
      <div class="info">
        <RouterLink v-if="!hidePatient" :to="`/pacientes/${service.patientId}`" class="patient">{{ service.patientName }}</RouterLink>
        <div class="what">
          {{ service.servicio }}<span v-if="service.piezas" class="muted"> · pieza(s) {{ service.piezas }}</span>
        </div>
        <div class="badges">
          <span class="badge" :class="`badge-${service.estado}`">{{ statusLabel[service.estado] }}</span>
          <span v-if="service.reprogramaciones && service.estado === 'agendado'" class="badge badge-agendado" title="Veces reprogramada">↻ {{ service.reprogramaciones }}</span>
          <span v-if="debt > 0" class="badge badge-pend">Debe {{ money(debt) }}</span>
          <span v-if="service.estado === 'agendado' && service.pagado > 0" class="badge badge-completado">Adelanto {{ money(service.pagado) }}</span>
          <slot name="badges" />
        </div>
        <div v-if="service.notas" class="notes small muted">{{ service.notas }}</div>
      </div>
      <div class="amount">
        <span class="strong">{{ money(service.costo) }}</span>
        <span v-if="service.estado === 'completado' && debt === 0" class="small text-ok">Pagado</span>
      </div>
    </div>
    <div v-if="$slots.default" class="svc-actions"><slot /></div>
  </article>
</template>

<style scoped>
.svc { background: var(--blanco); border: 1px solid var(--line); border-left: 5px solid var(--info); border-radius: 16px; padding: 12px 14px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 10px; }
.svc.completado { border-left-color: var(--ok); }
.svc.cancelado { border-left-color: #bbb; opacity: 0.75; }
.svc.overdue { border-left-color: var(--bad); }
.svc-main { display: flex; gap: 12px; align-items: flex-start; }
.lead { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 64px; padding: 8px 6px; border-radius: 12px; background: var(--rosa-2); color: var(--fucsia-dark); font-variant-numeric: tabular-nums; }
.completado .lead { background: var(--ok-bg); color: var(--ok); }
.overdue .lead { background: var(--bad-bg); color: var(--bad); }
.lead-top { font-weight: 800; font-size: 0.95rem; white-space: nowrap; }
.lead-sub { font-size: 0.75rem; font-weight: 700; opacity: 0.8; }
.info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.patient { font-weight: 800; color: var(--ink); font-size: 1rem; }
.what { font-size: 0.9rem; }
.badges { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 3px; }
.notes { margin-top: 2px; overflow-wrap: anywhere; }
.amount { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.svc-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; padding-top: 10px; border-top: 1px dashed var(--line); }
@media (max-width: 480px) {
  .svc-main { flex-wrap: wrap; }
  .amount { flex-direction: row; align-items: center; gap: 8px; width: 100%; justify-content: flex-end; }
  .lead { min-width: 58px; }
  .svc-actions :deep(.btn:not(.btn-icon)) { flex: 1 1 auto; }
}
</style>
