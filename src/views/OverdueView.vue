<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ServiceCard from '@/components/ServiceCard.vue'
import { useServiceActions } from '@/composables/useServiceActions'
import { data } from '@/stores/data'
import { openCancel, openService } from '@/stores/ui'
import { parseIso, today } from '@/utils/format'

const { complete } = useServiceActions()

const rows = computed(() =>
  data.services
    .filter((s) => s.estado === 'agendado' && s.fecha < today())
    .sort((a, b) => (a.fecha + (a.hora ?? '')).localeCompare(b.fecha + (b.hora ?? ''))),
)

function daysLate(fecha: string) {
  const n = Math.round((parseIso(today()).getTime() - parseIso(fecha).getTime()) / 86400000)
  return n === 1 ? 'hace 1 día' : `hace ${n} días`
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Citas sin cerrar</h1>
        <p>Citas cuya fecha ya pasó y siguen como "agendadas"</p>
      </div>
    </div>

    <p v-if="rows.length" class="alert alert-info small help">
      <AppIcon name="alert" />
      <span>
        Indica qué pasó con cada una: si el paciente <b>vino</b>, márcala como <b>Realizado</b> (se registra el ingreso y su boleta). Si
        <b>no vino</b>, usa <b>Cancelar</b> para reprogramarla o anularla. Así la contabilidad y la agenda quedan al día.
      </span>
    </p>

    <div class="list-stack">
      <ServiceCard v-for="s in rows" :key="s.id" :service="s" lead="fecha">
        <template #badges><span class="badge badge-pend">⏰ {{ daysLate(s.fecha) }}</span></template>
        <button class="btn btn-ghost btn-icon" aria-label="Editar" @click="openService(s)"><AppIcon name="edit" :size="15" /></button>
        <button class="btn btn-ghost btn-sm" @click="openCancel(s.id)">No vino: cancelar / reprogramar</button>
        <button class="btn btn-primary btn-sm" @click="complete(s)"><AppIcon name="check" /> Sí vino: realizado</button>
      </ServiceCard>
    </div>

    <div v-if="!data.loaded.services" class="empty card">Cargando…</div>
    <div v-else-if="!rows.length" class="empty card done">
      <div style="font-size: 2rem">✅</div>
      <b>¡Todo al día!</b>
      <div>No hay citas pasadas pendientes de cerrar.</div>
    </div>
  </div>
</template>

<style scoped>
.help { margin: 0 0 16px; }
.list-stack { display: flex; flex-direction: column; gap: 10px; }
.done { color: var(--ok); }
</style>
