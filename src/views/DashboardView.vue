<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import IncomeExpenseChart from '@/components/IncomeExpenseChart.vue'
import RankBars from '@/components/RankBars.vue'
import { data } from '@/stores/data'
import { openCancel, openComplete } from '@/stores/ui'
import { addDays, initials, longDate, money, prettyDate, today } from '@/utils/format'
import { balanceOf, groupSum, monthlySeries, summary, topPatients } from '@/utils/stats'
import type { Service } from '@/types'

const router = useRouter()
const t = today()
const monthStart = t.slice(0, 8) + '01'

const month = computed(() => summary(data.services, data.expenses, { from: monthStart, to: t }))
const allTime = computed(() => summary(data.services, data.expenses, { from: '', to: '' }))
const series = computed(() => monthlySeries(data.services, data.expenses, 6))
const expenseByCat = computed(() => groupSum(data.expenses, (e) => e.categoria, (e) => e.monto))
const frequent = computed(() => topPatients(data.services, 5))
const newPatients = computed(() => data.patients.filter((p) => new Date(p.createdAt) >= new Date(monthStart + 'T00:00')).length)

const byTime = (a: Service, b: Service) => (a.hora ?? '99').localeCompare(b.hora ?? '99')
const todays = computed(() => data.services.filter((s) => s.fecha === t && s.estado !== 'cancelado').sort(byTime))
const upcoming = computed(() =>
  data.services
    .filter((s) => s.estado === 'agendado' && s.fecha > t && s.fecha <= addDays(t, 7))
    .sort((a, b) => (a.fecha + (a.hora ?? '')).localeCompare(b.fecha + (b.hora ?? ''))),
)
const overdue = computed(() => data.services.filter((s) => s.estado === 'agendado' && s.fecha < t))
const unpaid = computed(() => data.services.filter((s) => s.estado === 'completado' && balanceOf(s) > 0))

const greeting = (() => {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
})()

// "Realizado" abre el diálogo que pregunta cómo pagó (completo, parte o nada).
const complete = (s: Service) => openComplete(s.id)
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>{{ greeting }}, Dra. 🦷</h1>
        <p>Resumen de {{ longDate(t) }}</p>
      </div>
    </div>

    <!-- KPIs del mes -->
    <div class="grid grid-kpi">
      <div class="card kpi">
        <span class="kpi-label"><i class="kpi-dot" style="background: var(--series-in)" /> Ingresos del mes</span>
        <span class="kpi-value">{{ money(month.ingresos) }}</span>
        <span class="kpi-foot">{{ month.atenciones }} atenciones realizadas</span>
      </div>
      <div class="card kpi">
        <span class="kpi-label"><i class="kpi-dot" style="background: var(--series-out)" /> Egresos del mes</span>
        <span class="kpi-value">{{ money(month.egresos) }}</span>
        <span class="kpi-foot">Inversión {{ money(month.inversiones) }} · Gastos {{ money(month.gastos) }}</span>
      </div>
      <div class="card kpi">
        <span class="kpi-label">Balance del mes</span>
        <span class="kpi-value" :class="month.balance >= 0 ? 'text-ok' : 'text-bad'">{{ money(month.balance) }}</span>
        <span class="kpi-foot">Histórico: {{ money(allTime.balance) }}</span>
      </div>
      <div class="card kpi">
        <span class="kpi-label">Por cobrar</span>
        <span class="kpi-value">{{ money(allTime.porCobrar) }}</span>
        <span class="kpi-foot">{{ unpaid.length }} servicios con saldo</span>
      </div>
      <div class="card kpi">
        <span class="kpi-label">Pacientes</span>
        <span class="kpi-value">{{ data.patients.length }}</span>
        <span class="kpi-foot">+{{ newPatients }} nuevos este mes</span>
      </div>
    </div>

    <div class="grid grid-3" style="margin-top: 16px">
      <!-- Agenda de hoy -->
      <section class="card">
        <div class="card-head">
          <div>
            <h2>Servicios de hoy</h2>
            <span class="card-sub">{{ todays.length }} en agenda</span>
          </div>
          <RouterLink to="/agenda" class="small strong">Ver agenda →</RouterLink>
        </div>
        <div v-if="todays.length" class="list">
          <div v-for="s in todays" :key="s.id" class="list-item">
            <span class="time-pill">{{ s.hora || '--:--' }}</span>
            <div class="grow">
              <RouterLink :to="`/pacientes/${s.patientId}`" class="strong" style="color: var(--ink)">{{ s.patientName }}</RouterLink>
              <div class="small muted">{{ s.servicio }} · {{ money(s.costo) }}</div>
            </div>
            <span v-if="s.estado === 'completado'" class="badge badge-completado">Realizado</span>
            <template v-else>
              <button class="btn btn-ghost btn-icon" title="Cancelar o reprogramar" aria-label="Cancelar o reprogramar" @click="openCancel(s.id)">
                <AppIcon name="calendar" :size="16" />
              </button>
              <button class="btn btn-primary btn-sm" @click="complete(s)"><AppIcon name="check" /> Realizado</button>
            </template>
          </div>
        </div>
        <div v-else class="empty">No hay servicios agendados para hoy.</div>

        <template v-if="upcoming.length">
          <h3 style="margin: 18px 0 10px; display: flex; justify-content: space-between">Próximos 7 días <RouterLink to="/proximas" class="small strong">Ver todas →</RouterLink></h3>
          <div class="list">
            <div v-for="s in upcoming" :key="s.id" class="list-item">
              <span class="time-pill" style="background: var(--info)">{{ prettyDate(s.fecha).slice(0, 6) }}</span>
              <div class="grow">
                <span class="strong">{{ s.patientName }}</span>
                <div class="small muted">{{ s.servicio }}{{ s.hora ? ` · ${s.hora}` : '' }}</div>
              </div>
            </div>
          </div>
        </template>
      </section>

      <!-- Alertas -->
      <section class="card">
        <div class="card-head"><h2>Alertas</h2></div>
        <div class="list">
          <div v-if="overdue.length" class="alert alert-bad">
            <AppIcon name="alert" />
            <div>
              <b>{{ overdue.length }} cita(s) pasada(s) sin cerrar.</b>
              <div class="small">Márcalas como realizadas o canceladas.</div>
              <RouterLink to="/sin-cerrar" class="small strong" style="color: inherit">Revisar →</RouterLink>
            </div>
          </div>
          <div v-if="unpaid.length" class="alert alert-warn">
            <AppIcon name="dollar" />
            <div>
              <b>{{ money(allTime.porCobrar) }} pendientes de cobro</b>
              <div class="small">en {{ unpaid.length }} servicio(s).</div>
              <RouterLink to="/por-cobrar" class="small strong" style="color: inherit">Ver saldos →</RouterLink>
            </div>
          </div>
          <div v-if="todays.filter((s) => s.estado === 'agendado').length" class="alert alert-info">
            <AppIcon name="clock" />
            <div><b>{{ todays.filter((s) => s.estado === 'agendado').length }} servicio(s) pendiente(s) hoy.</b></div>
          </div>
          <div v-if="!overdue.length && !unpaid.length && !todays.length" class="alert alert-ok">
            <AppIcon name="check" /> <div>Todo al día. ✨</div>
          </div>
        </div>

        <h3 style="margin: 20px 0 12px">Pacientes más frecuentes</h3>
        <div v-if="frequent.length" class="list">
          <div v-for="p in frequent" :key="p.patientId" class="person row-link" @click="router.push(`/pacientes/${p.patientId}`)">
            <span class="avatar">{{ initials(p.name) }}</span>
            <div class="grow" style="min-width: 0; flex: 1">
              <div class="person-name">{{ p.name }}</div>
              <div class="small muted">{{ p.visits }} visitas · {{ money(p.total) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty">Aún no hay atenciones.</div>
      </section>
    </div>

    <div class="grid grid-3" style="margin-top: 16px">
      <section class="card">
        <div class="card-head">
          <div>
            <h2>Ingresos vs egresos</h2>
            <span class="card-sub">Últimos 6 meses</span>
          </div>
          <RouterLink to="/contabilidad" class="small strong">Ver contabilidad →</RouterLink>
        </div>
        <IncomeExpenseChart :series="series" />
      </section>
      <section class="card">
        <div class="card-head">
          <div>
            <h2>¿En qué se gasta más?</h2>
            <span class="card-sub">Egresos por categoría (histórico)</span>
          </div>
        </div>
        <RankBars :rows="expenseByCat" variant="out" unit="egresos" />
      </section>
    </div>
  </div>
</template>
