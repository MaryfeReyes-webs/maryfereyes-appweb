<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppModal from './AppModal.vue'
import { data, saveService } from '@/stores/data'
import { errorToast, openBoleta, openPatient, toast, ui } from '@/stores/ui'
import { PAYMENT_METHODS, type Service, type ServiceStatus } from '@/types'
import { money, normalize, today } from '@/utils/format'

const editing = ui.serviceModal.service
const form = reactive({
  patientId: editing?.patientId ?? ui.serviceModal.patientId ?? '',
  servicio: editing?.servicio ?? '',
  fecha: editing?.fecha ?? ui.serviceModal.preset.fecha ?? today(),
  hora: editing?.hora ?? '',
  costo: editing?.costo ?? (0 as number),
  pagado: editing?.pagado ?? (0 as number),
  estado: (editing?.estado ?? ui.serviceModal.preset.estado ?? 'completado') as ServiceStatus,
  metodoPago: editing?.metodoPago ?? 'Efectivo',
  piezas: editing?.piezas ?? '',
  diagnostico: editing?.diagnostico ?? '',
  tratamiento: editing?.tratamiento ?? '',
  notas: editing?.notas ?? '',
})
const saving = ref(false)
const err = ref('')

const patient = computed(() => data.patients.find((p) => p.id === form.patientId))
const patientQuery = ref('')
const patientOptions = computed(() => {
  const term = normalize(patientQuery.value.trim())
  if (!term) return data.patients
  return data.patients.filter(
    (p) => p.id === form.patientId || normalize(`${p.nombre} ${p.documento} ${p.telefono}`).includes(term),
  )
})
// Si la búsqueda deja un único resultado, se selecciona solo.
watch(patientOptions, (opts) => {
  if (patientQuery.value && opts.length === 1 && opts[0]) form.patientId = opts[0].id
})
const history = computed(() =>
  data.services.filter((s) => s.patientId === form.patientId && s.id !== editing?.id).slice(0, 4),
)
const saldo = computed(() => Math.max(0, (form.costo || 0) - (form.pagado || 0)))

// Al elegir un servicio del catálogo se sugiere su precio (editable).
watch(
  () => form.servicio,
  (name) => {
    const item = data.catalog.find((c) => c.nombre.toLowerCase() === name.trim().toLowerCase())
    if (item && !editing) {
      form.costo = item.precio
      if (form.estado === 'completado') form.pagado = item.precio
    }
  },
)
// Si se agenda para el futuro, por defecto no hay pago todavía.
watch(
  () => form.estado,
  (st) => {
    if (editing) return
    if (st === 'agendado') form.pagado = 0
    if (st === 'completado') form.pagado = form.costo
  },
)

// Una fecha futura solo puede ser una cita agendada.
watch(
  () => form.fecha,
  (f) => {
    if (!editing && f > today() && form.estado === 'completado') form.estado = 'agendado'
  },
)

function close() {
  ui.serviceModal.open = false
}

async function submit(withBoleta: boolean) {
  err.value = ''
  if (!patient.value) return (err.value = 'Selecciona un paciente.')
  if (!form.servicio.trim()) return (err.value = 'Indica el servicio.')
  if (form.costo < 0 || form.pagado < 0) return (err.value = 'Los montos no pueden ser negativos.')
  if (form.pagado > form.costo) return (err.value = 'El monto pagado no puede superar el costo.')
  saving.value = true
  try {
    const payload: Omit<Service, 'id'> & { id?: string } = {
      ...form,
      costo: Number(form.costo) || 0,
      pagado: Number(form.pagado) || 0,
      patientName: patient.value.nombre,
      id: editing?.id,
      boletaNumero: editing?.boletaNumero,
      createdAt: editing?.createdAt ?? Date.now(),
    }
    const id = await saveService(payload)
    toast(editing ? 'Servicio actualizado' : 'Servicio registrado')
    close()
    if (withBoleta) openBoleta(id)
  } catch (e) {
    errorToast(e)
  } finally {
    saving.value = false
  }
}

function newPatient() {
  close()
  openPatient()
}
</script>

<template>
  <AppModal :title="editing ? 'Editar servicio' : 'Registrar servicio'" wide @close="close">
    <form class="form-grid" @submit.prevent="submit(false)">
      <label class="field full">
        <span>Paciente *</span>
        <input
          v-if="!editing && data.patients.length > 8"
          v-model="patientQuery"
          class="input"
          type="search"
          placeholder="Buscar paciente por nombre, DNI o teléfono…"
          style="margin-bottom: 6px"
        />
        <div class="input-group">
          <select v-model="form.patientId" class="input" required>
            <option value="" disabled>Selecciona un paciente…</option>
            <option v-for="p in patientOptions" :key="p.id" :value="p.id">
              {{ p.nombre }}{{ p.documento ? ` · ${p.documento}` : '' }}
            </option>
          </select>
          <button v-if="!editing" type="button" class="btn btn-soft btn-sm" @click="newPatient">+ Nuevo</button>
        </div>
      </label>

      <div v-if="patient && (patient.alergias || history.length)" class="full patient-info">
        <p v-if="patient.alergias" class="alert alert-bad small">⚠ Alergias: <b>{{ patient.alergias }}</b></p>
        <p v-if="history.length" class="small muted">
          Últimos servicios:
          <span v-for="(h, i) in history" :key="h.id">{{ i ? ' · ' : '' }}{{ h.servicio }} ({{ h.fecha }})</span>
        </p>
      </div>

      <label class="field full">
        <span>Servicio *</span>
        <input v-model="form.servicio" class="input" list="catalog-list" required placeholder="Elige del catálogo o escribe uno nuevo" />
        <datalist id="catalog-list">
          <option v-for="c in data.catalog" :key="c.id" :value="c.nombre">{{ money(c.precio) }}</option>
        </datalist>
      </label>

      <label class="field">
        <span>Estado</span>
        <select v-model="form.estado" class="input">
          <option value="completado">Realizado</option>
          <option value="agendado">Agendado (cita)</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </label>
      <div class="field">
        <span>Fecha y hora</span>
        <div class="input-group">
          <input v-model="form.fecha" class="input" type="date" required />
          <input v-model="form.hora" class="input" type="time" style="max-width: 130px" />
        </div>
      </div>

      <div class="section-title">Pago</div>
      <label class="field">
        <span>Costo del servicio *</span>
        <input v-model.number="form.costo" class="input" type="number" min="0" step="0.5" />
        <small>Puedes editar el precio sugerido del catálogo.</small>
      </label>
      <label class="field">
        <span>Monto pagado</span>
        <div class="input-group">
          <input v-model.number="form.pagado" class="input" type="number" min="0" step="0.5" />
          <button type="button" class="btn btn-ghost btn-sm" @click="form.pagado = form.costo">Todo</button>
        </div>
        <small :class="saldo > 0 ? (form.estado === 'agendado' ? 'muted' : 'text-bad') : 'text-ok'">
          {{ saldo > 0 ? (form.estado === 'agendado' ? `Se cobrará al atender: ${money(saldo)}` : `Saldo pendiente: ${money(saldo)}`) : 'Pagado completo' }}
        </small>
      </label>
      <label class="field">
        <span>Método de pago</span>
        <select v-model="form.metodoPago" class="input">
          <option v-for="m in PAYMENT_METHODS" :key="m">{{ m }}</option>
        </select>
      </label>
      <label class="field">
        <span>Pieza(s) dental(es)</span>
        <input v-model="form.piezas" class="input" placeholder="Ej. 1.6, 2.4" />
      </label>

      <div class="section-title">Historia clínica</div>
      <label class="field">
        <span>Diagnóstico</span>
        <textarea v-model="form.diagnostico" class="input" rows="2" />
      </label>
      <label class="field">
        <span>Tratamiento realizado / plan</span>
        <textarea v-model="form.tratamiento" class="input" rows="2" />
      </label>
      <label class="field full">
        <span>Observaciones</span>
        <textarea v-model="form.notas" class="input" rows="2" />
      </label>
      <p v-if="err" class="full alert alert-bad">{{ err }}</p>
      <button type="submit" hidden />
    </form>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="close">Cancelar</button>
      <button
        v-if="form.estado === 'completado'"
        class="btn btn-soft"
        type="button"
        :disabled="saving"
        @click="submit(true)"
      >
        Guardar y generar boleta
      </button>
      <button class="btn btn-primary" type="button" :disabled="saving" @click="submit(false)">
        {{ saving ? 'Guardando…' : 'Guardar' }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.patient-info { display: flex; flex-direction: column; gap: 6px; }
.patient-info p { margin: 0; }
</style>
