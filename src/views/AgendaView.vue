<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ServiceCard from '@/components/ServiceCard.vue'
import { useServiceActions } from '@/composables/useServiceActions'
import { data } from '@/stores/data'
import { openBoleta, openCancel, openPay, openService } from '@/stores/ui'
import { addDays, longDate, money, today } from '@/utils/format'
import { balanceOf, sum } from '@/utils/stats'

const route = useRoute()
const router = useRouter()
const { complete, remind } = useServiceActions()

const day = ref(typeof route.query.dia === 'string' ? route.query.dia : today())
watch(day, (d) => router.replace({ query: d === today() ? {} : { dia: d } }))

const isToday = computed(() => day.value === today())
const title = computed(() => {
  if (isToday.value) return 'Hoy'
  if (day.value === addDays(today(), 1)) return 'Mañana'
  if (day.value === addDays(today(), -1)) return 'Ayer'
  return ''
})

const list = computed(() =>
  data.services
    .filter((s) => s.fecha === day.value)
    .sort((a, b) => (a.estado === 'cancelado' ? 1 : 0) - (b.estado === 'cancelado' ? 1 : 0) || (a.hora ?? '99').localeCompare(b.hora ?? '99')),
)
const pending = computed(() => list.value.filter((s) => s.estado === 'agendado'))
const done = computed(() => list.value.filter((s) => s.estado === 'completado'))
const cobrado = computed(() => sum(done.value, (s) => s.pagado))
const porCobrar = computed(() => sum(done.value, balanceOf))
/** Próxima cita pendiente de hoy (para resaltarla). */
const nextId = computed(() => {
  if (!isToday.value) return ''
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return pending.value.find((s) => (s.hora ?? '') >= hhmm)?.id ?? pending.value[0]?.id ?? ''
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Agenda del día</h1>
        <p class="capitalize">{{ title ? `${title} · ` : '' }}{{ longDate(day) }}</p>
      </div>
      <button class="btn btn-primary" @click="openService(null, '', { fecha: day, estado: isToday ? 'completado' : 'agendado' })">
        <AppIcon name="plus" /> {{ day >= today() ? 'Agendar cita' : 'Registrar servicio' }}
      </button>
    </div>

    <div class="day-nav card">
      <button class="btn btn-ghost btn-icon" aria-label="Día anterior" @click="day = addDays(day, -1)"><AppIcon name="back" /></button>
      <input v-model="day" type="date" class="input day-input" aria-label="Elegir día" />
      <button v-if="!isToday" class="btn btn-soft btn-sm" @click="day = today()">Hoy</button>
      <button class="btn btn-ghost btn-icon" aria-label="Día siguiente" @click="day = addDays(day, 1)">
        <AppIcon name="back" style="transform: rotate(180deg)" />
      </button>
    </div>

    <div class="grid grid-kpi" style="margin-top: 14px">
      <div class="card kpi"><span class="kpi-label">Citas</span><span class="kpi-value">{{ list.filter((s) => s.estado !== 'cancelado').length }}</span></div>
      <div class="card kpi"><span class="kpi-label">Pendientes</span><span class="kpi-value" :class="{ 'text-fucsia': pending.length }">{{ pending.length }}</span></div>
      <div class="card kpi"><span class="kpi-label">Realizadas</span><span class="kpi-value text-ok">{{ done.length }}</span></div>
      <div class="card kpi">
        <span class="kpi-label">Cobrado</span><span class="kpi-value">{{ money(cobrado) }}</span>
        <span v-if="porCobrar > 0" class="kpi-foot text-bad">Falta cobrar {{ money(porCobrar) }}</span>
      </div>
    </div>

    <div class="list-stack" style="margin-top: 16px">
      <div v-for="s in list" :key="s.id" class="slot" :class="{ next: s.id === nextId }">
        <span v-if="s.id === nextId" class="next-label">Siguiente</span>
        <ServiceCard :service="s" lead="hora">
          <template v-if="s.estado === 'agendado'">
            <button class="btn btn-ghost btn-icon" title="Recordar por WhatsApp" aria-label="Recordar por WhatsApp" @click="remind(s)">
              <AppIcon name="whatsapp" />
            </button>
            <button class="btn btn-ghost btn-sm" @click="openCancel(s.id)">Cancelar</button>
            <button class="btn btn-primary btn-sm" @click="complete(s)"><AppIcon name="check" /> Realizado</button>
          </template>
          <template v-else-if="s.estado === 'completado'">
            <button v-if="balanceOf(s) > 0" class="btn btn-soft btn-sm" @click="openPay(s.id)"><AppIcon name="dollar" /> Cobrar</button>
            <button class="btn btn-soft btn-sm" @click="openBoleta(s.id)"><AppIcon name="file" /> Boleta</button>
          </template>
          <button v-if="s.estado !== 'cancelado'" class="btn btn-ghost btn-icon" aria-label="Editar" @click="openService(s)"><AppIcon name="edit" :size="15" /></button>
        </ServiceCard>
      </div>
      <div v-if="!data.loaded.services" class="empty card">Cargando…</div>
      <div v-else-if="!list.length" class="empty card">
        <div style="font-size: 2rem">🗓️</div>
        No hay citas para este día.
        <div style="margin-top: 10px">
          <button class="btn btn-soft btn-sm" @click="openService(null, '', { fecha: day, estado: day > today() ? 'agendado' : 'completado' })">
            <AppIcon name="plus" /> Agendar una cita
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.capitalize::first-letter { text-transform: uppercase; }
.day-nav { display: flex; align-items: center; gap: 8px; padding: 10px; }
.day-input { flex: 1; text-align: center; font-weight: 700; }
.list-stack { display: flex; flex-direction: column; gap: 10px; }
.slot { position: relative; }
.slot.next :deep(.svc) { box-shadow: 0 0 0 2px var(--fucsia), var(--shadow); }
.next-label { position: absolute; top: -9px; right: 14px; z-index: 1; background: var(--fucsia); color: #fff; font-size: 0.7rem; font-weight: 800; padding: 2px 10px; border-radius: 999px; }
</style>
