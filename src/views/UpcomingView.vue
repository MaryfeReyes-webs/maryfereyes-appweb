<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ServiceCard from '@/components/ServiceCard.vue'
import { useServiceActions } from '@/composables/useServiceActions'
import { data } from '@/stores/data'
import { openCancel, openService } from '@/stores/ui'
import { addDays, longDate, today } from '@/utils/format'

const { remind } = useServiceActions()
const range = ref<'7' | '30' | 'todas'>('30')

const groups = computed(() => {
  const t = today()
  const limit = range.value === 'todas' ? '9999-12-31' : addDays(t, Number(range.value))
  const rows = data.services
    .filter((s) => s.estado === 'agendado' && s.fecha > t && s.fecha <= limit)
    .sort((a, b) => (a.fecha + (a.hora ?? '')).localeCompare(b.fecha + (b.hora ?? '')))
  const map = new Map<string, typeof rows>()
  rows.forEach((s) => map.set(s.fecha, [...(map.get(s.fecha) ?? []), s]))
  return [...map.entries()].map(([fecha, items]) => ({ fecha, items }))
})
const total = computed(() => groups.value.reduce((a, g) => a + g.items.length, 0))

function dayTitle(fecha: string) {
  const t = today()
  if (fecha === addDays(t, 1)) return `Mañana · ${longDate(fecha)}`
  return longDate(fecha)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Próximas citas</h1>
        <p>{{ total }} cita(s) agendada(s) a partir de mañana</p>
      </div>
      <button class="btn btn-primary" @click="openService(null, '', { fecha: addDays(today(), 1), estado: 'agendado' })">
        <AppIcon name="plus" /> Agendar cita
      </button>
    </div>

    <div class="toolbar">
      <div class="tabs">
        <button class="tab" :class="{ active: range === '7' }" @click="range = '7'">Próximos 7 días</button>
        <button class="tab" :class="{ active: range === '30' }" @click="range = '30'">30 días</button>
        <button class="tab" :class="{ active: range === 'todas' }" @click="range = 'todas'">Todas</button>
      </div>
    </div>

    <section v-for="g in groups" :key="g.fecha" class="day-group">
      <h2 class="day-title">
        <span class="capitalize">{{ dayTitle(g.fecha) }}</span>
        <span class="count">{{ g.items.length }}</span>
        <RouterLink :to="`/agenda?dia=${g.fecha}`" class="small strong see-day">Ver día →</RouterLink>
      </h2>
      <div class="list-stack">
        <ServiceCard v-for="s in g.items" :key="s.id" :service="s" lead="hora">
          <button class="btn btn-wa btn-sm" @click="remind(s)"><AppIcon name="whatsapp" /> Recordar</button>
          <button class="btn btn-ghost btn-sm" @click="openCancel(s.id)">Cancelar</button>
          <button class="btn btn-ghost btn-icon" aria-label="Editar" @click="openService(s)"><AppIcon name="edit" :size="15" /></button>
        </ServiceCard>
      </div>
    </section>

    <div v-if="!data.loaded.services" class="empty card">Cargando…</div>
    <div v-else-if="!groups.length" class="empty card">
      <div style="font-size: 2rem">📅</div>
      No hay citas agendadas en este periodo.
    </div>
  </div>
</template>

<style scoped>
.capitalize { display: inline-block; }
.capitalize::first-letter { text-transform: uppercase; }
.day-group { margin-bottom: 22px; }
.day-title { display: flex; align-items: center; gap: 8px; font-size: 1rem; margin: 0 0 10px; color: var(--fucsia-dark); }
.count { background: var(--rosa); color: var(--fucsia-dark); border-radius: 999px; font-size: 0.75rem; padding: 1px 9px; }
.see-day { margin-left: auto; }
.list-stack { display: flex; flex-direction: column; gap: 10px; }
</style>
