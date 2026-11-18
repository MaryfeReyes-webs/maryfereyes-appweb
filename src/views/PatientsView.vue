<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { data } from '@/stores/data'
import { openPatient, openService } from '@/stores/ui'
import { age, initials, money, normalize, prettyDate } from '@/utils/format'
import { balanceOf } from '@/utils/stats'

const router = useRouter()
const q = ref('')

const stats = computed(() => {
  const m = new Map<string, { visits: number; total: number; saldo: number; last: string }>()
  for (const s of data.services) {
    if (s.estado === 'cancelado') continue
    const cur = m.get(s.patientId) ?? { visits: 0, total: 0, saldo: 0, last: '' }
    if (s.estado === 'completado') cur.visits++
    cur.total += s.pagado || 0
    cur.saldo += balanceOf(s)
    if (s.estado === 'completado' && s.fecha > cur.last) cur.last = s.fecha
    m.set(s.patientId, cur)
  }
  return m
})

const rows = computed(() => {
  const term = normalize(q.value.trim())
  return data.patients.filter(
    (p) => !term || normalize(`${p.nombre} ${p.documento} ${p.telefono}`).includes(term),
  )
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Pacientes</h1>
        <p>{{ data.patients.length }} pacientes registrados · cada uno con su historia clínica</p>
      </div>
      <button class="btn btn-primary" @click="openPatient()"><AppIcon name="plus" /> Registrar paciente</button>
    </div>

    <div class="card list-card">
      <div class="toolbar">
        <input v-model="q" class="input" type="search" placeholder="Buscar por nombre, DNI o teléfono…" />
      </div>
      <div class="table-wrap">
        <table class="rtable">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Teléfono</th>
              <th class="num">Visitas</th>
              <th>Última visita</th>
              <th class="num">Total pagado</th>
              <th class="num">Saldo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in rows" :key="p.id" class="row-link" @click="router.push(`/pacientes/${p.id}`)">
              <td class="cell-main">
                <div class="person">
                  <span class="avatar">{{ initials(p.nombre) }}</span>
                  <div style="min-width: 0">
                    <div class="person-name">{{ p.nombre }}</div>
                    <div class="small muted">
                      {{ p.documento || 'Sin documento' }}{{ age(p.fechaNacimiento) ? ` · ${age(p.fechaNacimiento)}` : '' }}
                      <span v-if="p.alergias" class="text-bad"> · ⚠ Alergias</span>
                    </div>
                  </div>
                </div>
              </td>
              <td data-label="Teléfono">{{ p.telefono }}</td>
              <td class="num" data-label="Visitas">{{ stats.get(p.id)?.visits ?? 0 }}</td>
              <td data-label="Última visita">{{ prettyDate(stats.get(p.id)?.last) }}</td>
              <td class="num" data-label="Total pagado">{{ money(stats.get(p.id)?.total) }}</td>
              <td class="num" data-label="Saldo">
                <span v-if="(stats.get(p.id)?.saldo ?? 0) > 0" class="badge badge-pend">{{ money(stats.get(p.id)?.saldo) }}</span>
                <span v-else class="muted">—</span>
              </td>
              <td class="num cell-actions">
                <button class="btn btn-soft btn-sm" @click.stop="openService(null, p.id)"><AppIcon name="plus" /> Servicio</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!data.loaded.patients" class="empty">Cargando…</div>
        <div v-else-if="!rows.length" class="empty">
          {{ q ? 'No hay coincidencias.' : 'Aún no hay pacientes. ¡Registra el primero!' }}
        </div>
      </div>
    </div>
  </div>
</template>
