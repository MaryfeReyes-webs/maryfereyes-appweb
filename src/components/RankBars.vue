<script setup lang="ts">
import { computed } from 'vue'
import { money } from '@/utils/format'

const props = defineProps<{ rows: { key: string; total: number; count: number }[]; variant?: 'in' | 'out'; limit?: number; unit?: string }>()
const shown = computed(() => props.rows.slice(0, props.limit ?? 6))
const max = computed(() => Math.max(1, ...shown.value.map((r) => r.total)))
const grand = computed(() => props.rows.reduce((a, r) => a + r.total, 0) || 1)
</script>

<template>
  <div v-if="shown.length" class="rank">
    <div v-for="r in shown" :key="r.key" class="rank-row" :title="`${r.key}: ${money(r.total)} (${r.count} ${unit ?? 'registros'})`">
      <span class="strong">{{ r.key }}</span>
      <span class="num">{{ money(r.total) }} <span class="muted small">· {{ Math.round((r.total / grand) * 100) }}%</span></span>
      <div class="rank-bar" :class="variant ?? 'out'"><div :style="{ width: `${(r.total / max) * 100}%` }" /></div>
    </div>
  </div>
  <div v-else class="empty">Sin datos en este periodo.</div>
</template>
