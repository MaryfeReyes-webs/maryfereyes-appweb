<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ServiceCard from '@/components/ServiceCard.vue'
import { useServiceActions } from '@/composables/useServiceActions'
import { data } from '@/stores/data'
import { openBoleta, openPay } from '@/stores/ui'
import { initials, money, normalize, parseIso, today } from '@/utils/format'
import { balanceOf, sum } from '@/utils/stats'
import type { Service } from '@/types'

const { remindDebt } = useServiceActions()
const q = ref('')
const sort = ref<'monto' | 'antiguedad'>('monto')

const debts = computed(() => data.services.filter((s) => s.estado === 'completado' && balanceOf(s) > 0))
const total = computed(() => sum(debts.value, balanceOf))

const groups = computed(() => {
  const map = new Map<string, Service[]>()
  debts.value.forEach((s) => map.set(s.patientId, [...(map.get(s.patientId) ?? []), s]))
  const term = normalize(q.value.trim())
  return [...map.entries()]
    .map(([patientId, items]) => ({
      patientId,
      name: items[0]?.patientName ?? '',
      items: items.sort((a, b) => a.fecha.localeCompare(b.fecha)),
      total: sum(items, balanceOf),
      oldest: items.reduce((m, s) => (s.fecha < m ? s.fecha : m), '9999'),
    }))
    .filter((g) => !term || normalize(g.name).includes(term))
    .sort((a, b) => (sort.value === 'monto' ? b.total - a.total : a.oldest.localeCompare(b.oldest)))
})

function age(fecha: string) {
  const n = Math.round((parseIso(today()).getTime() - parseIso(fecha).getTime()) / 86400000)
  return n === 0 ? 'hoy' : n === 1 ? 'hace 1 día' : `hace ${n} días`
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Por cobrar</h1>
        <p>Servicios realizados con saldo pendiente, agrupados por paciente</p>
      </div>
    </div>

    <div class="grid grid-kpi">
      <div class="card kpi">
        <span class="kpi-label">Total por cobrar</span>
        <span class="kpi-value text-bad">{{ money(total) }}</span>
      </div>
      <div class="card kpi"><span class="kpi-label">Pacientes con deuda</span><span class="kpi-value">{{ groups.length }}</span></div>
      <div class="card kpi"><span class="kpi-label">Servicios con saldo</span><span class="kpi-value">{{ debts.length }}</span></div>
    </div>

    <div class="toolbar" style="margin-top: 16px">
      <input v-model="q" class="input" type="search" placeholder="Buscar paciente…" />
      <div class="tabs">
        <button class="tab" :class="{ active: sort === 'monto' }" @click="sort = 'monto'">Mayor deuda</button>
        <button class="tab" :class="{ active: sort === 'antiguedad' }" @click="sort = 'antiguedad'">Más antigua</button>
      </div>
    </div>

    <section v-for="g in groups" :key="g.patientId" class="card debtor">
      <header class="debtor-head">
        <RouterLink :to="`/pacientes/${g.patientId}`" class="person">
          <span class="avatar">{{ initials(g.name) }}</span>
          <span style="min-width: 0">
            <span class="person-name" style="display: block; color: var(--ink)">{{ g.name }}</span>
            <span class="small muted">{{ g.items.length }} servicio(s) · el más antiguo {{ age(g.oldest) }}</span>
          </span>
        </RouterLink>
        <div class="debtor-total">
          <span class="small muted">Debe</span>
          <span class="strong text-bad">{{ money(g.total) }}</span>
        </div>
        <button class="btn btn-wa btn-sm" @click="remindDebt(g.patientId, g.items)"><AppIcon name="whatsapp" /> Recordar deuda</button>
      </header>
      <div class="list-stack">
        <ServiceCard v-for="s in g.items" :key="s.id" :service="s" lead="fecha" hide-patient>
          <button class="btn btn-ghost btn-sm" @click="openBoleta(s.id)"><AppIcon name="file" /> Boleta</button>
          <button class="btn btn-primary btn-sm" @click="openPay(s.id)"><AppIcon name="dollar" /> Cobrar {{ money(balanceOf(s)) }}</button>
        </ServiceCard>
      </div>
    </section>

    <div v-if="!data.loaded.services" class="empty card">Cargando…</div>
    <div v-else-if="!groups.length" class="empty card" style="color: var(--ok)">
      <div style="font-size: 2rem">💰</div>
      <b>{{ q ? 'Sin coincidencias.' : '¡No hay deudas pendientes!' }}</b>
    </div>
  </div>
</template>

<style scoped>
.debtor { margin-bottom: 14px; display: flex; flex-direction: column; gap: 12px; }
.debtor-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.debtor-head .person { flex: 1; min-width: 200px; }
.debtor-total { display: flex; flex-direction: column; align-items: flex-end; font-variant-numeric: tabular-nums; }
.debtor-total .strong { font-size: 1.15rem; }
.list-stack { display: flex; flex-direction: column; gap: 8px; }
.list-stack :deep(.svc) { box-shadow: none; background: var(--crema); }
@media (max-width: 700px) {
  .debtor { padding: 12px; }
  .debtor-head .btn { width: 100%; }
}
</style>
