<script setup lang="ts">
import { reactive, ref } from 'vue'
import AppModal from './AppModal.vue'
import { saveExpense } from '@/stores/data'
import { errorToast, toast, ui } from '@/stores/ui'
import { EXPENSE_CATEGORIES, type ExpenseType } from '@/types'
import { today } from '@/utils/format'

const editing = ui.expenseModal.expense
const form = reactive({
  concepto: editing?.concepto ?? '',
  categoria: editing?.categoria ?? 'Materiales e insumos',
  tipo: (editing?.tipo ?? 'gasto') as ExpenseType,
  monto: editing?.monto ?? (0 as number),
  fecha: editing?.fecha ?? today(),
  proveedor: editing?.proveedor ?? '',
  notas: editing?.notas ?? '',
})
const saving = ref(false)
const err = ref('')

function close() {
  ui.expenseModal.open = false
}

function pickCategory(c: string) {
  form.categoria = c
  // Equipos y capacitación suelen ser inversión; lo demás, gasto operativo.
  if (!editing) form.tipo = c === 'Equipos' || c === 'Capacitación' ? 'inversion' : 'gasto'
}

async function submit() {
  err.value = ''
  if (!form.concepto.trim()) return (err.value = 'Describe el egreso.')
  if (!(form.monto > 0)) return (err.value = 'El monto debe ser mayor a 0.')
  saving.value = true
  try {
    await saveExpense({ ...form, monto: Number(form.monto), id: editing?.id, createdAt: editing?.createdAt ?? Date.now() })
    toast(editing ? 'Egreso actualizado' : 'Egreso registrado')
    close()
  } catch (e) {
    errorToast(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal :title="editing ? 'Editar egreso' : 'Registrar egreso'" @close="close">
    <form class="form-grid" @submit.prevent="submit">
      <label class="field full">
        <span>¿Qué se compró o pagó? *</span>
        <input v-model="form.concepto" class="input" required autofocus placeholder="Ej. Compra de autoclave" />
      </label>
      <label class="field">
        <span>Categoría</span>
        <select :value="form.categoria" class="input" @change="pickCategory(($event.target as HTMLSelectElement).value)">
          <option v-for="c in EXPENSE_CATEGORIES" :key="c">{{ c }}</option>
        </select>
      </label>
      <label class="field">
        <span>Tipo</span>
        <select v-model="form.tipo" class="input">
          <option value="gasto">Gasto operativo</option>
          <option value="inversion">Inversión</option>
        </select>
      </label>
      <label class="field">
        <span>Monto *</span>
        <input v-model.number="form.monto" class="input" type="number" min="0" step="0.5" required />
      </label>
      <label class="field">
        <span>Fecha</span>
        <input v-model="form.fecha" class="input" type="date" required />
      </label>
      <label class="field full">
        <span>Proveedor</span>
        <input v-model="form.proveedor" class="input" />
      </label>
      <label class="field full">
        <span>Notas</span>
        <textarea v-model="form.notas" class="input" rows="2" />
      </label>
      <p v-if="err" class="full alert alert-bad">{{ err }}</p>
      <button type="submit" hidden />
    </form>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="close">Cancelar</button>
      <button class="btn btn-primary" type="button" :disabled="saving" @click="submit">
        {{ saving ? 'Guardando…' : 'Guardar egreso' }}
      </button>
    </template>
  </AppModal>
</template>
