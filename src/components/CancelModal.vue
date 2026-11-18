<script setup lang="ts">
import { computed, ref } from 'vue'
import AppModal from './AppModal.vue'
import AppIcon from './AppIcon.vue'
import { data, updateService } from '@/stores/data'
import { errorToast, toast, ui } from '@/stores/ui'
import { whatsappNumber } from '@/utils/boleta'
import { longDate, money, prettyDate, today } from '@/utils/format'

const service = computed(() => data.services.find((s) => s.id === ui.cancelModal.serviceId))
const patient = computed(() => data.patients.find((p) => p.id === service.value?.patientId))

const mode = ref<'' | 'reprogramar' | 'cancelar'>('')
const fecha = ref(service.value && service.value.fecha >= today() ? service.value.fecha : today())
const hora = ref(service.value?.hora ?? '')
const motivo = ref('')
const notify = ref(true)
const saving = ref(false)
const err = ref('')

const MOTIVOS = ['El paciente no puede asistir', 'El paciente no se presentó', 'Indisposición de la doctora', 'Ya no requiere el tratamiento']

/** Otras citas a la misma fecha y hora (para evitar cruces). */
const conflict = computed(() =>
  hora.value
    ? data.services.find(
        (s) => s.id !== service.value?.id && s.estado === 'agendado' && s.fecha === fecha.value && s.hora === hora.value,
      )
    : undefined,
)
/** Agenda del día elegido, para ayudar a escoger un horario libre. */
const dayAgenda = computed(() =>
  data.services
    .filter((s) => s.id !== service.value?.id && s.estado === 'agendado' && s.fecha === fecha.value)
    .sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? '')),
)
const unchanged = computed(() => service.value?.fecha === fecha.value && (service.value?.hora ?? '') === hora.value)

function close() {
  ui.cancelModal.open = false
}

function whenText(f: string, h?: string) {
  return `${longDate(f)}${h ? ` a las ${h}` : ''}`
}

function sendWhatsapp(text: string) {
  if (!patient.value?.telefono) return
  const n = whatsappNumber(patient.value.telefono, data.settings.codigoPais)
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}

async function submit() {
  const s = service.value
  if (!s || !mode.value) return
  err.value = ''
  const nombre = s.patientName.split(' ')[0]
  try {
    saving.value = true
    if (mode.value === 'reprogramar') {
      if (!fecha.value) return (err.value = 'Elige la nueva fecha.')
      if (fecha.value < today()) return (err.value = 'La nueva fecha no puede ser anterior a hoy.')
      if (unchanged.value) return (err.value = 'Elige una fecha u hora distinta a la actual.')
      const nota = `Reprogramada del ${prettyDate(s.fecha)}${s.hora ? ` ${s.hora}` : ''} al ${prettyDate(fecha.value)}${hora.value ? ` ${hora.value}` : ''}`
      await updateService(s.id, {
        fecha: fecha.value,
        hora: hora.value,
        estado: 'agendado',
        reprogramaciones: (s.reprogramaciones ?? 0) + 1,
        notas: [s.notas, nota].filter(Boolean).join(' · '),
      })
      toast('Cita reprogramada')
      if (notify.value)
        sendWhatsapp(
          `Hola ${nombre} 😊, te escribimos de *${data.settings.nombre}*.\nTu cita de ${s.servicio} fue reprogramada para el ${whenText(fecha.value, hora.value)}.\n¡Te esperamos! 🦷`,
        )
    } else {
      const m = motivo.value.trim()
      await updateService(s.id, {
        estado: 'cancelado',
        motivoCancelacion: m,
        notas: [s.notas, `Cancelada${m ? `: ${m}` : ''}`].filter(Boolean).join(' · '),
      })
      toast('Cita cancelada')
      if (notify.value)
        sendWhatsapp(
          `Hola ${nombre}, te escribimos de *${data.settings.nombre}*.\nTu cita de ${s.servicio} del ${whenText(s.fecha, s.hora)} ha sido cancelada.\nSi deseas una nueva fecha, escríbenos. 🦷`,
        )
    }
    close()
  } catch (e) {
    errorToast(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal title="Cancelar cita" @close="close">
    <div v-if="service" class="stack">
      <div class="summary-box">
        <div class="strong">{{ service.patientName }}</div>
        <div class="small muted">
          {{ service.servicio }} · {{ prettyDate(service.fecha) }}{{ service.hora ? ` · ${service.hora}` : '' }}
          <span v-if="service.reprogramaciones"> · reprogramada {{ service.reprogramaciones }} vez/veces</span>
        </div>
      </div>

      <p class="question">¿Qué deseas hacer con esta cita?</p>
      <div class="choices">
        <button type="button" class="choice" :class="{ active: mode === 'reprogramar' }" @click="mode = 'reprogramar'">
          <span class="choice-ic info"><AppIcon name="calendar" :size="22" /></span>
          <span><b>Reprogramar</b><small>Mover la cita a otro día u hora</small></span>
        </button>
        <button type="button" class="choice" :class="{ active: mode === 'cancelar' }" @click="mode = 'cancelar'">
          <span class="choice-ic bad"><AppIcon name="x" :size="22" /></span>
          <span><b>Cancelar por completo</b><small>La cita no se realizará</small></span>
        </button>
      </div>

      <div v-if="mode === 'reprogramar'" class="form-grid">
        <label class="field">
          <span>Nuevo día *</span>
          <input v-model="fecha" class="input" type="date" :min="today()" required />
        </label>
        <label class="field">
          <span>Nueva hora</span>
          <input v-model="hora" class="input" type="time" />
        </label>
        <p v-if="conflict" class="full alert alert-warn small">
          <AppIcon name="alert" /> Ya hay una cita a esa hora: {{ conflict.patientName }} ({{ conflict.servicio }}).
        </p>
        <div v-if="dayAgenda.length" class="full small muted">
          Ese día ya tienes:
          <span v-for="(a, i) in dayAgenda" :key="a.id">{{ i ? ' · ' : '' }}<b>{{ a.hora || 'sin hora' }}</b> {{ a.patientName.split(' ')[0] }}</span>
        </div>
        <div v-else-if="fecha" class="full small text-ok">No hay otras citas agendadas ese día.</div>
      </div>

      <div v-if="mode === 'cancelar'" class="stack">
        <label class="field">
          <span>Motivo (opcional)</span>
          <input v-model="motivo" class="input" list="motivos" placeholder="Elige o escribe un motivo" />
          <datalist id="motivos"><option v-for="m in MOTIVOS" :key="m" :value="m" /></datalist>
        </label>
        <p v-if="service.pagado > 0" class="alert alert-warn small">
          <AppIcon name="alert" />
          <span>
            El paciente dejó un adelanto de <b>{{ money(service.pagado) }}</b>. Al cancelar, ese monto deja de contarse
            como ingreso. Si no lo vas a devolver, mejor <b>reprograma</b> la cita.
          </span>
        </p>
      </div>

      <label v-if="mode && patient?.telefono" class="check">
        <input v-model="notify" type="checkbox" />
        Avisar al paciente por WhatsApp
      </label>
      <p v-if="err" class="alert alert-bad small">{{ err }}</p>
    </div>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="close">Volver</button>
      <button
        class="btn"
        :class="mode === 'cancelar' ? 'btn-danger-solid' : 'btn-primary'"
        type="button"
        :disabled="!mode || saving"
        @click="submit"
      >
        {{ saving ? 'Guardando…' : mode === 'cancelar' ? 'Cancelar cita' : mode === 'reprogramar' ? 'Reprogramar cita' : 'Elige una opción' }}
      </button>
    </template>
  </AppModal>
</template>
