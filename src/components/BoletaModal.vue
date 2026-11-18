<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppModal from './AppModal.vue'
import AppIcon from './AppIcon.vue'
import { data, ensureBoletaNumber } from '@/stores/data'
import { errorToast, toast, ui } from '@/stores/ui'
import { boletaFileName, buildBoletaPdf, whatsappMessage, whatsappNumber } from '@/utils/boleta'
import { boletaCode, money, prettyDate } from '@/utils/format'
import type { jsPDF } from 'jspdf'

const service = computed(() => data.services.find((s) => s.id === ui.boletaModal.serviceId))
const patient = computed(() => data.patients.find((p) => p.id === service.value?.patientId))
const previewUrl = ref('')
const loading = ref(true)
let pdf: jsPDF | null = null

const phone = computed(() => (patient.value ? whatsappNumber(patient.value.telefono, data.settings.codigoPais) : ''))
const canShareFiles = ref(false)
// Los navegadores móviles no muestran PDFs dentro de un iframe.
const isMobile = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches

function close() {
  ui.boletaModal.open = false
}

onMounted(async () => {
  try {
    if (!service.value) throw new Error('Servicio no encontrado')
    const n = await ensureBoletaNumber(service.value.id)
    const s = { ...service.value, boletaNumero: n }
    pdf = buildBoletaPdf(s, patient.value, data.settings)
    previewUrl.value = URL.createObjectURL(pdf.output('blob'))
    const probe = new File([new Blob()], 'x.pdf', { type: 'application/pdf' })
    canShareFiles.value = !!navigator.canShare?.({ files: [probe] })
  } catch (e) {
    errorToast(e)
    close()
  } finally {
    loading.value = false
  }
})
onBeforeUnmount(() => previewUrl.value && URL.revokeObjectURL(previewUrl.value))

function file(): File {
  const blob = pdf!.output('blob')
  return new File([blob], boletaFileName(service.value!), { type: 'application/pdf' })
}

function download() {
  pdf?.save(boletaFileName(service.value!))
}

function viewPdf() {
  if (previewUrl.value) window.open(previewUrl.value, '_blank')
}

/** Escritorio: descarga el PDF y abre el chat del paciente para adjuntarlo. */
function sendWhatsapp() {
  if (!service.value) return
  download()
  const text = encodeURIComponent(whatsappMessage(service.value, data.settings))
  window.open(`https://wa.me/${phone.value}?text=${text}`, '_blank', 'noopener')
  toast('PDF descargado: adjúntalo en el chat de WhatsApp que se abrió 📎')
}

/** Celular: comparte el archivo PDF directamente (elige WhatsApp en el menú). */
async function share() {
  if (!service.value) return
  try {
    await navigator.share({ files: [file()], title: 'Boleta', text: whatsappMessage(service.value, data.settings) })
  } catch (e) {
    if ((e as DOMException).name !== 'AbortError') errorToast(e)
  }
}
</script>

<template>
  <AppModal title="Boleta de venta" wide @close="close">
    <div v-if="loading" class="empty">Generando boleta…</div>
    <div v-else-if="service" class="boleta">
      <div class="summary">
        <div>
          <div class="muted small">Boleta</div>
          <div class="strong text-fucsia">{{ boletaCode(service.boletaNumero) }}</div>
        </div>
        <div>
          <div class="muted small">Paciente</div>
          <div class="strong">{{ service.patientName }}</div>
        </div>
        <div>
          <div class="muted small">Servicio</div>
          <div>{{ service.servicio }} · {{ prettyDate(service.fecha) }}</div>
        </div>
        <div>
          <div class="muted small">Total</div>
          <div class="strong">{{ money(service.costo) }}</div>
        </div>
      </div>
      <iframe v-if="previewUrl && !isMobile" :src="previewUrl" title="Vista previa de la boleta" class="preview" />
      <div v-else-if="previewUrl" class="mobile-preview">
        <AppIcon name="file" :size="40" />
        <div>
          <b>Boleta lista</b>
          <div class="small muted">{{ canShareFiles ? 'Toca «Compartir PDF» y elige WhatsApp.' : 'Descárgala o envíala por WhatsApp.' }}</div>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" @click="viewPdf">Ver PDF</button>
      </div>
      <p v-if="!patient?.telefono" class="alert alert-warn small">El paciente no tiene teléfono registrado.</p>
      <p v-else class="small muted">WhatsApp: +{{ phone }}</p>
    </div>
    <template #footer>
      <button class="btn btn-ghost" type="button" :disabled="loading" @click="download">
        <AppIcon name="download" /> Descargar
      </button>
      <button
        class="btn btn-wa"
        :class="{ 'btn-sec': isMobile && canShareFiles }"
        type="button"
        :disabled="loading || !patient?.telefono"
        @click="sendWhatsapp"
      >
        <AppIcon name="whatsapp" /> {{ isMobile && canShareFiles ? 'Abrir chat' : 'Enviar por WhatsApp' }}
      </button>
      <button v-if="canShareFiles" class="btn" :class="isMobile ? 'btn-wa share-main' : 'btn-soft'" type="button" :disabled="loading" @click="share">
        <AppIcon name="share" /> Compartir PDF{{ isMobile ? ' por WhatsApp' : '' }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.boleta { display: flex; flex-direction: column; gap: 12px; }
.summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; background: var(--crema); border-radius: 12px; padding: 12px; }
.preview { width: 100%; height: 420px; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
.mobile-preview { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 14px; background: var(--rosa-2); color: var(--fucsia-dark); border: 1px dashed var(--fucsia-soft); }
.mobile-preview > div { flex: 1; min-width: 0; color: var(--ink); }
.btn-sec { background: var(--blanco); color: #128c4a; border-color: #25d366; }
.share-main { flex-basis: 100% !important; order: 10; }
@media (max-width: 700px) { .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
