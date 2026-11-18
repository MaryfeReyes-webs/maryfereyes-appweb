<script setup lang="ts">
import { computed, ref } from 'vue'
import AppModal from './AppModal.vue'
import AppIcon from './AppIcon.vue'
import { data, updateService } from '@/stores/data'
import { errorToast, openBoleta, toast, ui } from '@/stores/ui'
import { PAYMENT_METHODS, type Service } from '@/types'
import { money, prettyDate, today } from '@/utils/format'

const service = computed(() => data.services.find((s) => s.id === ui.completeModal.serviceId))

const costo = ref<number>(service.value?.costo ?? 0)
const adelanto = computed(() => service.value?.pagado ?? 0)
/** Lo que falta pagar hoy (costo final menos lo que ya dejó de adelanto). */
const pendienteHoy = computed(() => Math.max(0, Math.round(((Number(costo.value) || 0) - adelanto.value) * 100) / 100))

const mode = ref<'' | 'completo' | 'parcial' | 'nada'>('')
const monto = ref<number>(0)
const metodo = ref(service.value?.metodoPago ?? 'Efectivo')
const tratamiento = ref(service.value?.tratamiento ?? '')
const conBoleta = ref(true)
const saving = ref(false)

const pagaHoy = computed(() => {
  if (mode.value === 'completo') return pendienteHoy.value
  if (mode.value === 'parcial') return Number(monto.value) || 0
  return 0
})
const quedaDebiendo = computed(() => Math.max(0, Math.round((pendienteHoy.value - pagaHoy.value) * 100) / 100))

const invalid = computed(() => {
  if (!(Number(costo.value) >= 0)) return 'Ingresa un costo válido.'
  if (Number(costo.value) < adelanto.value) return `El costo no puede ser menor que el adelanto (${money(adelanto.value)}).`
  if (mode.value === 'parcial') {
    if (!(pagaHoy.value > 0)) return 'Ingresa cuánto pagó.'
    if (pagaHoy.value >= pendienteHoy.value) return 'Si pagó todo, elige «Pagó completo».'
  }
  return ''
})

function choose(m: 'completo' | 'parcial' | 'nada') {
  mode.value = m
  if (m === 'parcial' && !monto.value) monto.value = Math.round(pendienteHoy.value / 2)
}

function close() {
  ui.completeModal.open = false
}

async function submit() {
  const s = service.value
  if (!s || !mode.value || invalid.value) return
  const paid = pagaHoy.value
  const debt = quedaDebiendo.value
  saving.value = true
  try {
    const patch: Partial<Service> = {
      estado: 'completado',
      costo: Number(costo.value) || 0,
      pagado: Math.round((adelanto.value + paid) * 100) / 100,
      tratamiento: tratamiento.value.trim(),
    }
    if (paid > 0) {
      patch.metodoPago = metodo.value
      patch.pagos = [...(s.pagos ?? []), { monto: paid, fecha: today(), metodo: metodo.value, registradoEn: Date.now() }]
    }
    await updateService(s.id, patch)
    toast(debt > 0 ? `Realizado. ${money(debt)} quedó en «Por cobrar»` : 'Servicio realizado y pagado ✨')
    close()
    if (conBoleta.value) openBoleta(s.id)
  } catch (e) {
    errorToast(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal title="Marcar como realizado" @close="close">
    <div v-if="service" class="stack">
      <div class="summary-box">
        <div class="strong">{{ service.patientName }}</div>
        <div class="small muted">
          {{ service.servicio }}{{ service.piezas ? ` · pieza(s) ${service.piezas}` : '' }} · {{ prettyDate(service.fecha) }}{{ service.hora ? ` · ${service.hora}` : '' }}
        </div>
      </div>

      <div class="form-grid">
        <label class="field">
          <span>Costo final</span>
          <input v-model.number="costo" class="input" type="number" min="0" step="0.5" inputmode="decimal" />
          <small v-if="Number(costo) !== service.costo">Antes: {{ money(service.costo) }}</small>
        </label>
        <div class="field">
          <span>{{ adelanto > 0 ? 'Adelanto recibido' : 'Por pagar' }}</span>
          <div class="input readonly">{{ adelanto > 0 ? money(adelanto) : money(pendienteHoy) }}</div>
          <small v-if="adelanto > 0">Falta pagar {{ money(pendienteHoy) }}</small>
        </div>
      </div>

      <p class="question">¿Cómo pagó el paciente?</p>
      <div class="choices three">
        <button type="button" class="choice" :class="{ active: mode === 'completo' }" @click="choose('completo')">
          <span class="choice-ic ok"><AppIcon name="check" :size="22" /></span>
          <span><b>Pagó completo</b><small>Recibes {{ money(pendienteHoy) }}</small></span>
        </button>
        <button type="button" class="choice" :class="{ active: mode === 'parcial' }" @click="choose('parcial')">
          <span class="choice-ic warn"><AppIcon name="dollar" :size="22" /></span>
          <span><b>Pagó una parte</b><small>El resto va a «Por cobrar»</small></span>
        </button>
        <button type="button" class="choice" :class="{ active: mode === 'nada' }" @click="choose('nada')">
          <span class="choice-ic bad"><AppIcon name="clock" :size="22" /></span>
          <span><b>No pagó aún</b><small>Todo queda como deuda</small></span>
        </button>
      </div>

      <div v-if="mode" class="form-grid">
        <label v-if="mode === 'parcial'" class="field">
          <span>¿Cuánto pagó hoy? *</span>
          <input v-model.number="monto" class="input" type="number" min="0.5" step="0.5" inputmode="decimal" />
        </label>
        <label v-if="mode !== 'nada'" class="field">
          <span>Método de pago</span>
          <select v-model="metodo" class="input">
            <option v-for="m in PAYMENT_METHODS" :key="m">{{ m }}</option>
          </select>
        </label>
        <div v-if="invalid" class="full result invalid">{{ invalid }}</div>
        <div v-else class="full result" :class="quedaDebiendo > 0 ? 'pending' : 'done'">
          <span>Recibes hoy <b>{{ money(pagaHoy) }}</b></span>
          <span v-if="quedaDebiendo > 0">Queda en «Por cobrar» <b>{{ money(quedaDebiendo) }}</b></span>
          <span v-else>✓ Queda totalmente pagado</span>
        </div>
      </div>

      <label class="field">
        <span>Tratamiento realizado (opcional, para la historia clínica)</span>
        <textarea v-model="tratamiento" class="input" rows="2" placeholder="Ej. Destartraje y pulido, se indicó control en 6 meses" />
      </label>

      <label class="check">
        <input v-model="conBoleta" type="checkbox" />
        Generar boleta al terminar
      </label>
    </div>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="close">Volver</button>
      <button class="btn btn-primary" type="button" :disabled="!mode || !!invalid || saving" @click="submit">
        <AppIcon name="check" /> {{ saving ? 'Guardando…' : mode ? 'Marcar realizado' : 'Elige cómo pagó' }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.readonly { background: var(--crema); font-weight: 800; font-variant-numeric: tabular-nums; }
.choices.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.choices.three .choice { flex-direction: column; text-align: center; padding: 14px 10px; }
.choices.three .choice small { margin-top: 2px; }
@media (max-width: 560px) {
  .choices.three { grid-template-columns: minmax(0, 1fr); }
  .choices.three .choice { flex-direction: row; text-align: left; }
}
.result { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px; font-size: 0.92rem; }
.result.pending { background: var(--warn-bg); color: var(--warn); }
.result.done { background: var(--ok-bg); color: var(--ok); }
.result.invalid { background: var(--bad-bg); color: var(--bad); font-weight: 700; }
</style>
