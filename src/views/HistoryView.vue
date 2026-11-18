<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useServiceActions } from '@/composables/useServiceActions'
import { data } from '@/stores/data'
import { openBoleta, openPay, openService } from '@/stores/ui'
import { boletaCode, money, monthLabel, normalize, prettyDate, today } from '@/utils/format'
import { balanceOf, sum } from '@/utils/stats'
import type { ServiceStatus } from '@/types'

const { remove } = useServiceActions()
const q = ref('')
const estado = ref<'' | ServiceStatus>('')
const mes = ref('')
const t = today()

const months = computed(() => [...new Set(data.services.map((s) => s.fecha.slice(0, 7)))].sort().reverse())
const statusLabel: Record<string, string> = { agendado: 'Agendado', completado: 'Realizado', cancelado: 'Cancelado' }

const rows = computed(() => {
  const term = normalize(q.value.trim())
  return data.services.filter(
    (s) =>
      (!estado.value || s.estado === estado.value) &&
      (!mes.value || s.fecha.startsWith(mes.value)) &&
      (!term || normalize(`${s.patientName} ${s.servicio} ${boletaCode(s.boletaNumero)}`).includes(term)),
  )
})
const totals = computed(() => {
  const active = rows.value.filter((s) => s.estado !== 'cancelado')
  return { costo: sum(active, (s) => s.costo), pagado: sum(active, (s) => s.pagado) }
})

// Paginación simple para que la lista no se haga eterna en el teléfono.
const PAGE = 30
const shown = ref(PAGE)
const visible = computed(() => rows.value.slice(0, shown.value))
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Historial de servicios</h1>
        <p>Todas las atenciones y citas registradas</p>
      </div>
      <button class="btn btn-primary" @click="openService()"><AppIcon name="plus" /> Registrar servicio</button>
    </div>

    <div class="card list-card">
      <div class="toolbar">
        <input v-model="q" class="input" type="search" placeholder="Buscar paciente, servicio o n° de boleta…" @input="shown = PAGE" />
        <select v-model="estado" class="input" style="max-width: 170px" @change="shown = PAGE">
          <option value="">Todos los estados</option>
          <option value="completado">Realizados</option>
          <option value="agendado">Agendados</option>
          <option value="cancelado">Cancelados</option>
        </select>
        <select v-model="mes" class="input" style="max-width: 170px" @change="shown = PAGE">
          <option value="">Todos los meses</option>
          <option v-for="m in months" :key="m" :value="m">{{ monthLabel(m) }}</option>
        </select>
        <div class="spacer" />
        <span class="total-pill small">
          {{ rows.length }} registros · <b>{{ money(totals.pagado) }}</b> cobrado
        </span>
      </div>

      <div class="table-wrap">
        <table class="rtable">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Servicio</th>
              <th>Estado</th>
              <th class="num">Costo</th>
              <th class="num">Pagado</th>
              <th class="num">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in visible" :key="s.id">
              <td style="white-space: nowrap" data-label="Fecha">
                <span>{{ prettyDate(s.fecha) }}<span v-if="s.hora" class="muted hora">{{ s.hora }}</span></span>
              </td>
              <td class="cell-main patient-cell">
                <RouterLink :to="`/pacientes/${s.patientId}`" class="strong" style="color: var(--ink)">{{ s.patientName }}</RouterLink>
              </td>
              <td data-label="Servicio">
                <span>{{ s.servicio }}<span v-if="s.boletaNumero" class="small muted"><br />{{ boletaCode(s.boletaNumero) }}</span></span>
              </td>
              <td data-label="Estado">
                <span>
                  <span class="badge" :class="`badge-${s.estado}`">{{ statusLabel[s.estado] }}</span>
                  <span v-if="s.estado === 'agendado' && s.fecha < t" class="badge badge-pend" style="margin-left: 4px">Sin cerrar</span>
                </span>
              </td>
              <td class="num" data-label="Costo">{{ money(s.costo) }}</td>
              <td class="num" data-label="Pagado">
                <span>{{ money(s.pagado) }}<span v-if="balanceOf(s) > 0" class="small text-bad"><br />Debe {{ money(balanceOf(s)) }}</span></span>
              </td>
              <td class="num cell-actions">
                <div class="actions" style="justify-content: flex-end">
                  <RouterLink
                    v-if="s.estado === 'agendado'"
                    :to="s.fecha < t ? '/sin-cerrar' : `/agenda?dia=${s.fecha}`"
                    class="btn btn-ghost btn-icon"
                    :title="s.fecha < t ? 'Cerrar cita' : 'Ver en agenda'"
                    :aria-label="s.fecha < t ? 'Cerrar cita' : 'Ver en agenda'"
                  >
                    <AppIcon :name="s.fecha < t ? 'alert' : 'calendar'" :size="15" />
                  </RouterLink>
                  <button v-if="s.estado === 'completado' && balanceOf(s) > 0" class="btn btn-soft btn-sm" @click="openPay(s.id)"><AppIcon name="dollar" /> Cobrar</button>
                  <button v-if="s.estado === 'completado'" class="btn btn-soft btn-icon" title="Boleta" aria-label="Boleta" @click="openBoleta(s.id)"><AppIcon name="file" :size="15" /></button>
                  <button class="btn btn-ghost btn-icon" aria-label="Editar" @click="openService(s)"><AppIcon name="edit" :size="15" /></button>
                  <button class="btn btn-ghost btn-icon" aria-label="Eliminar" @click="remove(s)"><AppIcon name="trash" :size="15" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!data.loaded.services" class="empty">Cargando…</div>
        <div v-else-if="!rows.length" class="empty">No hay servicios con estos filtros.</div>
        <div v-if="rows.length > shown" style="text-align: center; margin-top: 12px">
          <button class="btn btn-soft" @click="shown += PAGE">Ver más ({{ rows.length - shown }} restantes)</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (min-width: 901px) {
  .patient-cell { min-width: 170px; }
  .cell-actions .actions { flex-wrap: nowrap !important; }
  .hora { display: block; font-size: 0.8rem; }
}
@media (max-width: 900px) {
  .hora::before { content: ' · '; }
}
</style>
