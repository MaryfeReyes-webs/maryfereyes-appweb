<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { data, deleteExpense } from '@/stores/data'
import { errorToast, openExpense, toast } from '@/stores/ui'
import { EXPENSE_CATEGORIES, type Expense } from '@/types'
import { money, normalize, prettyDate } from '@/utils/format'
import { sum } from '@/utils/stats'

const q = ref('')
const cat = ref('')
const tipo = ref('')

const rows = computed(() => {
  const term = normalize(q.value.trim())
  return data.expenses.filter(
    (e) =>
      (!cat.value || e.categoria === cat.value) &&
      (!tipo.value || e.tipo === tipo.value) &&
      (!term || normalize(`${e.concepto} ${e.proveedor ?? ''}`).includes(term)),
  )
})
const total = computed(() => sum(rows.value, (e) => e.monto))

async function remove(e: Expense) {
  if (!confirm(`¿Eliminar el egreso "${e.concepto}"?`)) return
  try {
    await deleteExpense(e.id)
    toast('Egreso eliminado')
  } catch (err) {
    errorToast(err)
  }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Egresos</h1>
        <p>Inversiones (equipos, capacitación) y gastos operativos del consultorio</p>
      </div>
      <button class="btn btn-primary" @click="openExpense()"><AppIcon name="plus" /> Registrar egreso</button>
    </div>

    <div class="card list-card">
      <div class="toolbar">
        <input v-model="q" class="input" type="search" placeholder="Buscar concepto o proveedor…" />
        <select v-model="cat" class="input" style="max-width: 220px">
          <option value="">Todas las categorías</option>
          <option v-for="c in EXPENSE_CATEGORIES" :key="c">{{ c }}</option>
        </select>
        <select v-model="tipo" class="input" style="max-width: 170px">
          <option value="">Todos los tipos</option>
          <option value="inversion">Inversión</option>
          <option value="gasto">Gasto</option>
        </select>
        <div class="spacer" />
        <span class="strong total-pill">Total: {{ money(total) }}</span>
      </div>
      <div class="table-wrap">
        <table class="rtable">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Categoría</th>
              <th>Tipo</th>
              <th class="num">Monto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in rows" :key="e.id">
              <td style="white-space: nowrap" data-label="Fecha">{{ prettyDate(e.fecha) }}</td>
              <td class="cell-main">
                <span class="strong">{{ e.concepto }}</span>
                <div v-if="e.proveedor || e.notas" class="small muted">{{ [e.proveedor, e.notas].filter(Boolean).join(' · ') }}</div>
              </td>
              <td data-label="Categoría">{{ e.categoria }}</td>
              <td data-label="Tipo"><span class="badge" :class="`badge-${e.tipo}`">{{ e.tipo === 'inversion' ? 'Inversión' : 'Gasto' }}</span></td>
              <td class="num strong" data-label="Monto">{{ money(e.monto) }}</td>
              <td class="num cell-actions">
                <div class="actions" style="justify-content: flex-end; flex-wrap: nowrap">
                  <button class="btn btn-ghost btn-icon" aria-label="Editar" @click="openExpense(e)"><AppIcon name="edit" :size="15" /></button>
                  <button class="btn btn-ghost btn-icon" aria-label="Eliminar" @click="remove(e)"><AppIcon name="trash" :size="15" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!data.loaded.expenses" class="empty">Cargando…</div>
        <div v-else-if="!rows.length" class="empty">No hay egresos registrados.</div>
      </div>
    </div>
  </div>
</template>
