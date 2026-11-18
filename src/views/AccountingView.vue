<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import IncomeExpenseChart from '@/components/IncomeExpenseChart.vue'
import RankBars from '@/components/RankBars.vue'
import { data } from '@/stores/data'
import { money, prettyDate, today } from '@/utils/format'
import { downloadText, groupSum, monthlySeries, summary, toCsv, type Period } from '@/utils/stats'

type Preset = 'mes' | 'mesAnterior' | 'anio' | 'todo' | 'rango'
const preset = ref<Preset>('mes')
const customFrom = ref(today().slice(0, 8) + '01')
const customTo = ref(today())

const period = computed<Period>(() => {
  const d = new Date()
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  switch (preset.value) {
    case 'mes':
      return { from: iso(new Date(d.getFullYear(), d.getMonth(), 1)), to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
    case 'mesAnterior':
      return { from: iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: iso(new Date(d.getFullYear(), d.getMonth(), 0)) }
    case 'anio':
      return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` }
    case 'rango':
      return { from: customFrom.value, to: customTo.value }
    default:
      return { from: '', to: '' }
  }
})

const s = computed(() => summary(data.services, data.expenses, period.value))
const byService = computed(() => groupSum(s.value.services, (x) => x.servicio, (x) => x.pagado))
const byPatient = computed(() => groupSum(s.value.services, (x) => x.patientName, (x) => x.pagado))
const byCategory = computed(() => groupSum(s.value.expenses, (x) => x.categoria, (x) => x.monto))
const byMethod = computed(() => groupSum(s.value.services, (x) => x.metodoPago ?? '', (x) => x.pagado))
const series = computed(() => monthlySeries(data.services, data.expenses, 12))
const margin = computed(() => (s.value.ingresos ? Math.round((s.value.balance / s.value.ingresos) * 100) : 0))

interface Move {
  id: string
  fecha: string
  tipo: 'Ingreso' | 'Inversión' | 'Gasto'
  detalle: string
  categoria: string
  monto: number
}
const moves = computed<Move[]>(() => {
  const inc: Move[] = s.value.services
    .filter((x) => x.pagado > 0)
    .map((x) => ({ id: x.id, fecha: x.fecha, tipo: 'Ingreso', detalle: `${x.servicio} — ${x.patientName}`, categoria: x.metodoPago ?? '', monto: x.pagado }))
  const out: Move[] = s.value.expenses.map((x) => ({
    id: x.id,
    fecha: x.fecha,
    tipo: x.tipo === 'inversion' ? 'Inversión' : 'Gasto',
    detalle: x.concepto,
    categoria: x.categoria,
    monto: -x.monto,
  }))
  return [...inc, ...out].sort((a, b) => b.fecha.localeCompare(a.fecha))
})

function exportCsv() {
  const rows = [['Fecha', 'Tipo', 'Detalle', 'Categoría / Método', 'Monto'], ...moves.value.map((m) => [m.fecha, m.tipo, m.detalle, m.categoria, m.monto.toFixed(2)])]
  downloadText(`contabilidad_${period.value.from || 'inicio'}_${period.value.to || today()}.csv`, toCsv(rows))
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Contabilidad general</h1>
        <p>Ingresos por servicios, inversiones, gastos y resultado del periodo</p>
      </div>
      <button class="btn btn-ghost" @click="exportCsv"><AppIcon name="download" /> Exportar CSV</button>
    </div>

    <div class="toolbar">
      <div class="tabs tabs-scroll">
        <button class="tab" :class="{ active: preset === 'mes' }" @click="preset = 'mes'">Este mes</button>
        <button class="tab" :class="{ active: preset === 'mesAnterior' }" @click="preset = 'mesAnterior'">Mes anterior</button>
        <button class="tab" :class="{ active: preset === 'anio' }" @click="preset = 'anio'">Este año</button>
        <button class="tab" :class="{ active: preset === 'todo' }" @click="preset = 'todo'">Todo</button>
        <button class="tab" :class="{ active: preset === 'rango' }" @click="preset = 'rango'">Rango</button>
      </div>
      <template v-if="preset === 'rango'">
        <input v-model="customFrom" type="date" class="input" style="max-width: 160px" />
        <span class="muted">a</span>
        <input v-model="customTo" type="date" class="input" style="max-width: 160px" />
      </template>
    </div>

    <div class="grid grid-kpi">
      <div class="card kpi">
        <span class="kpi-label"><i class="kpi-dot" style="background: var(--series-in)" /> Ingresos</span>
        <span class="kpi-value">{{ money(s.ingresos) }}</span>
        <span class="kpi-foot">Facturado {{ money(s.facturado) }}</span>
      </div>
      <div class="card kpi">
        <span class="kpi-label"><i class="kpi-dot" style="background: var(--series-out)" /> Egresos</span>
        <span class="kpi-value">{{ money(s.egresos) }}</span>
        <span class="kpi-foot">{{ s.expenses.length }} movimientos</span>
      </div>
      <div class="card kpi">
        <span class="kpi-label">Inversiones</span>
        <span class="kpi-value">{{ money(s.inversiones) }}</span>
        <span class="kpi-foot">Gastos operativos {{ money(s.gastos) }}</span>
      </div>
      <div class="card kpi">
        <span class="kpi-label">Utilidad</span>
        <span class="kpi-value" :class="s.balance >= 0 ? 'text-ok' : 'text-bad'">{{ money(s.balance) }}</span>
        <span class="kpi-foot">Margen {{ margin }}%</span>
      </div>
      <div class="card kpi">
        <span class="kpi-label">Por cobrar</span>
        <span class="kpi-value">{{ money(s.porCobrar) }}</span>
        <span class="kpi-foot">{{ s.atenciones }} atenciones</span>
      </div>
    </div>

    <section class="card" style="margin-top: 16px">
      <div class="card-head">
        <div><h2>Evolución mensual</h2><span class="card-sub">Últimos 12 meses</span></div>
      </div>
      <IncomeExpenseChart :series="series" />
    </section>

    <div class="grid grid-2" style="margin-top: 16px">
      <section class="card">
        <div class="card-head"><h2>Ingresos por servicio</h2></div>
        <RankBars :rows="byService" variant="in" :limit="8" unit="atenciones" />
      </section>
      <section class="card">
        <div class="card-head"><h2>Egresos por categoría</h2></div>
        <RankBars :rows="byCategory" variant="out" :limit="8" unit="egresos" />
      </section>
      <section class="card">
        <div class="card-head"><h2>Ingresos por paciente</h2></div>
        <RankBars :rows="byPatient" variant="in" :limit="8" unit="atenciones" />
      </section>
      <section class="card">
        <div class="card-head"><h2>Ingresos por método de pago</h2></div>
        <RankBars :rows="byMethod" variant="in" unit="pagos" />
      </section>
    </div>

    <section class="card list-card ledger" style="margin-top: 16px">
      <div class="card-head">
        <div><h2>Libro de movimientos</h2><span class="card-sub">{{ moves.length }} movimientos en el periodo</span></div>
      </div>
      <div class="table-wrap">
        <table class="rtable">
          <thead>
            <tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Categoría / método</th><th class="num">Monto</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in moves" :key="m.tipo + m.id">
              <td style="white-space: nowrap" data-label="Fecha">{{ prettyDate(m.fecha) }}</td>
              <td data-label="Tipo">
                <span class="badge" :class="m.tipo === 'Ingreso' ? 'badge-completado' : m.tipo === 'Inversión' ? 'badge-inversion' : 'badge-gasto'">{{ m.tipo }}</span>
              </td>
              <td class="cell-main">{{ m.detalle }}</td>
              <td class="muted" data-label="Categoría / método">{{ m.categoria || '—' }}</td>
              <td class="num strong" data-label="Monto" :class="m.monto >= 0 ? 'text-ok' : 'text-bad'">{{ m.monto >= 0 ? '+' : '−' }}{{ money(Math.abs(m.monto)) }}</td>
            </tr>
          </tbody>
          <tfoot v-if="moves.length">
            <tr>
              <td colspan="4" class="strong">Resultado del periodo</td>
              <td class="num strong" :class="s.balance >= 0 ? 'text-ok' : 'text-bad'">{{ money(s.balance) }}</td>
            </tr>
          </tfoot>
        </table>
        <div v-if="!moves.length" class="empty">No hay movimientos en este periodo.</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
tfoot td { border-top: 2px solid var(--line); background: var(--crema); }
@media (max-width: 700px) {
  .ledger tfoot tr { background: var(--rosa); border-color: var(--fucsia-soft); }
  .ledger tfoot td[colspan] { display: block; }
}
</style>
