<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import { money, monthLabel } from '@/utils/format'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ series: { key: string; ingresos: number; egresos: number }[] }>()
const IN = '#d81b60'
const OUT = '#5b6bb5'

const chartData = computed(() => ({
  labels: props.series.map((s) => monthLabel(s.key)),
  datasets: [
    { label: 'Ingresos', data: props.series.map((s) => s.ingresos), backgroundColor: IN },
    { label: 'Egresos', data: props.series.map((s) => s.egresos), backgroundColor: OUT },
  ].map((d) => ({
    ...d,
    borderRadius: { topLeft: 4, topRight: 4 },
    borderSkipped: 'start' as const,
    borderColor: '#ffffff',
    borderWidth: { left: 1, right: 1 },
    maxBarThickness: 26,
    categoryPercentage: 0.62,
    barPercentage: 0.9,
  })),
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#4a2337',
      padding: 10,
      cornerRadius: 10,
      boxPadding: 4,
      callbacks: { label: (c: { dataset: { label?: string }; parsed: { y: number | null } }) => ` ${c.dataset.label}: ${money(c.parsed.y ?? 0)}` },
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#7a5566', font: { family: 'Nunito', weight: 600 } } },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: '#f6e6ec' },
      ticks: { color: '#a88a97', font: { family: 'Nunito' }, maxTicksLimit: 5, callback: (v: string | number) => money(Number(v)).replace(/\.00$/, '') },
    },
  },
}
</script>

<template>
  <div>
    <div class="legend" style="margin-bottom: 8px">
      <span><i :style="{ background: IN }" /> Ingresos</span>
      <span><i :style="{ background: OUT }" /> Egresos</span>
    </div>
    <div class="chart-box">
      <Bar :data="chartData" :options="options" aria-label="Ingresos y egresos por mes" />
    </div>
  </div>
</template>
