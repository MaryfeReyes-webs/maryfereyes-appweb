<script setup lang="ts">
import { computed, ref } from 'vue'
import AppModal from './AppModal.vue'
import AppIcon from './AppIcon.vue'
import { data, updateService } from '@/stores/data'
import { errorToast, openBoleta, toast, ui } from '@/stores/ui'
import { PAYMENT_METHODS } from '@/types'
import { money, prettyDate, today } from '@/utils/format'
import { balanceOf } from '@/utils/stats'

const service = computed(() => data.services.find((s) => s.id === ui.payModal.serviceId))
const saldo = computed(() => (service.value ? balanceOf(service.value) : 0))

const mode = ref<'' | 'total' | 'parcial'>('')
const monto = ref<number>(0)
const metodo = ref(service.value?.metodoPago ?? 'Efectivo')
const fecha = ref(today())
const saving = ref(false)
const err = ref('')

const amount = computed(() => (mode.value === 'total' ? saldo.value : Number(monto.value) || 0))
const invalid = computed(() => {
  if (!mode.value) return ''
  if (!(amount.value > 0)) return 'Ingresa un monto mayor a 0.'
  if (amount.value > saldo.value + 0.001) return `El abono no puede ser mayor que la deuda (${money(saldo.value)}).`
  return ''
})
const remaining = computed(() => Math.max(0, Math.round((saldo.value - amount.value) * 100) / 100))

function close() {
  ui.payModal.open = false
}

function choose(m: 'total' | 'parcial') {
  mode.value = m
  if (m === 'parcial' && !monto.value) monto.value = Math.round(saldo.value / 2)
}

async function submit(withBoleta: boolean) {
  const s = service.value
  if (!s || !mode.value) return
  err.value = ''
  if (!(amount.value > 0)) return (err.value = 'Ingresa un monto mayor a 0.')
  if (amount.value > saldo.value + 0.001) return (err.value = `El monto no puede superar la deuda (${money(saldo.value)}).`)
  if (mode.value === 'parcial' && amount.value >= saldo.value) {
    mode.value = 'total' // si paga todo, se registra como pago completo
  }
  const paid = amount.value
  const left = remaining.value
  saving.value = true
  try {
    const pagado = Math.min(s.costo, Math.round((s.pagado + paid) * 100) / 100)
    await updateService(s.id, {
      pagado,
      metodoPago: metodo.value,
      pagos: [...(s.pagos ?? []), { monto: paid, fecha: fecha.value, metodo: metodo.value, registradoEn: Date.now() }],
    })
    toast(left > 0 ? `Abono de ${money(paid)} registrado. Queda ${money(left)}` : 'Deuda pagada por completo ✨')
    close()
    if (withBoleta) openBoleta(s.id)
  } catch (e) {
    errorToast(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal title="Cobrar deuda" @close="close">
    <div v-if="service" class="stack">
      <div class="summary-box">
        <div class="strong">{{ service.patientName }}</div>
        <div class="small muted">{{ service.servicio }} · {{ prettyDate(service.fecha) }}</div>
        <div class="totals">
          <span>Costo <b>{{ money(service.costo) }}</b></span>
          <span>Pagado <b>{{ money(service.pagado) }}</b></span>
          <span class="text-bad">Debe <b>{{ money(saldo) }}</b></span>
        </div>
      </div>

      <p class="question">¿Cuánto va a pagar?</p>
      <div class="choices">
        <button type="button" class="choice" :class="{ active: mode === 'total' }" @click="choose('total')">
          <span class="choice-ic ok"><AppIcon name="check" :size="22" /></span>
          <span><b>Deuda completa</b><small>Paga {{ money(saldo) }} y queda en cero</small></span>
        </button>
        <button type="button" class="choice" :class="{ active: mode === 'parcial' }" @click="choose('parcial')">
          <span class="choice-ic warn"><AppIcon name="dollar" :size="22" /></span>
          <span><b>Una parte</b><small>Abono a cuenta; el resto queda pendiente</small></span>
        </button>
      </div>

      <div v-if="mode" class="form-grid">
        <label v-if="mode === 'parcial'" class="field full">
          <span>Monto del abono *</span>
          <input v-model.number="monto" class="input" type="number" min="0.5" :max="saldo" step="0.5" inputmode="decimal" />
          <div class="chips">
            <button v-for="p in [25, 50, 75]" :key="p" type="button" class="chip" @click="monto = Math.round((saldo * p) / 100)">
              {{ p }}% · {{ money(Math.round((saldo * p) / 100)) }}
            </button>
          </div>
        </label>
        <label class="field">
          <span>Método de pago</span>
          <select v-model="metodo" class="input">
            <option v-for="m in PAYMENT_METHODS" :key="m">{{ m }}</option>
          </select>
        </label>
        <label class="field">
          <span>Fecha del pago</span>
          <input v-model="fecha" class="input" type="date" :max="today()" />
        </label>
        <div v-if="invalid" class="full result invalid">{{ invalid }}</div>
        <div v-else class="full result" :class="remaining > 0 ? 'pending' : 'done'">
          <span>Recibes <b>{{ money(amount) }}</b></span>
          <span v-if="remaining > 0">Quedará pendiente <b>{{ money(remaining) }}</b></span>
          <span v-else>✓ La deuda queda saldada</span>
        </div>
      </div>

      <div v-if="service.pagos?.length" class="small">
        <div class="muted strong" style="margin-bottom: 4px">Abonos anteriores</div>
        <div v-for="(p, i) in service.pagos" :key="i" class="muted">
          {{ prettyDate(p.fecha) }} · {{ money(p.monto) }} · {{ p.metodo }}
        </div>
      </div>
      <p v-if="err" class="alert alert-bad small">{{ err }}</p>
    </div>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="close">Volver</button>
      <button class="btn btn-soft" type="button" :disabled="!mode || !!invalid || saving" @click="submit(true)">Cobrar y ver boleta</button>
      <button class="btn btn-primary" type="button" :disabled="!mode || !!invalid || saving" @click="submit(false)">
        {{ saving ? 'Guardando…' : mode ? `Cobrar ${money(amount)}` : 'Elige una opción' }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.totals { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; font-size: 0.88rem; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.chip { border: 1px solid var(--line); background: var(--crema); color: var(--ink-2); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; min-height: 34px; }
.chip:hover { background: var(--rosa); color: var(--fucsia-dark); }
.result { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px; font-size: 0.92rem; }
.result.pending { background: var(--warn-bg); color: var(--warn); }
.result.done { background: var(--ok-bg); color: var(--ok); }
.result.invalid { background: var(--bad-bg); color: var(--bad); font-weight: 700; }
</style>
