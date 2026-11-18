<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { data, deletePatient, deleteService } from '@/stores/data'
import { errorToast, openBoleta, openCancel, openPatient, openPay, openService, toast } from '@/stores/ui'
import { age, boletaCode, initials, money, prettyDate } from '@/utils/format'
import { balanceOf, sum } from '@/utils/stats'
import { whatsappNumber } from '@/utils/boleta'
import type { Service } from '@/types'

const route = useRoute()
const router = useRouter()
const patient = computed(() => data.patients.find((p) => p.id === route.params.id))
const services = computed(() => data.services.filter((s) => s.patientId === route.params.id))
const active = computed(() => services.value.filter((s) => s.estado !== 'cancelado'))
const totals = computed(() => ({
  visits: active.value.filter((s) => s.estado === 'completado').length,
  pagado: sum(active.value, (s) => s.pagado),
  saldo: sum(active.value, balanceOf),
  next: [...active.value].filter((s) => s.estado === 'agendado').sort((a, b) => a.fecha.localeCompare(b.fecha))[0],
}))

const statusLabel: Record<string, string> = { agendado: 'Agendado', completado: 'Realizado', cancelado: 'Cancelado' }

async function removeService(s: Service) {
  if (!confirm(`¿Eliminar el servicio "${s.servicio}" del ${prettyDate(s.fecha)}?`)) return
  try {
    await deleteService(s.id)
    toast('Servicio eliminado')
  } catch (e) {
    errorToast(e)
  }
}

async function removePatient() {
  if (!patient.value) return
  const n = services.value.length
  if (!confirm(`¿Eliminar a ${patient.value.nombre}${n ? ` y sus ${n} servicios` : ''}? Esta acción no se puede deshacer.`)) return
  try {
    await deletePatient(patient.value.id)
    toast('Paciente eliminado')
    router.replace('/pacientes')
  } catch (e) {
    errorToast(e)
  }
}

function chat() {
  if (!patient.value) return
  window.open(`https://wa.me/${whatsappNumber(patient.value.telefono, data.settings.codigoPais)}`, '_blank', 'noopener')
}

function printHistory() {
  window.print()
}
</script>

<template>
  <div v-if="patient">
    <div class="page-head">
      <div class="person">
        <RouterLink to="/pacientes" class="btn btn-ghost btn-icon no-print" aria-label="Volver"><AppIcon name="back" /></RouterLink>
        <span class="avatar" style="width: 52px; height: 52px; font-size: 1.1rem">{{ initials(patient.nombre) }}</span>
        <div>
          <h1>{{ patient.nombre }}</h1>
          <p>
            Historia clínica · paciente desde {{ new Date(patient.createdAt).toLocaleDateString('es-PE') }}
          </p>
        </div>
      </div>
      <div class="actions head-actions no-print">
        <button class="btn btn-wa btn-sm" @click="chat"><AppIcon name="whatsapp" /> WhatsApp</button>
        <button class="btn btn-ghost btn-sm" @click="printHistory"><AppIcon name="file" /> Imprimir</button>
        <button class="btn btn-ghost btn-sm" @click="openPatient(patient)"><AppIcon name="edit" /> Editar</button>
        <button class="btn btn-primary btn-sm" @click="openService(null, patient.id)"><AppIcon name="plus" /> Registrar servicio</button>
      </div>
    </div>

    <div class="grid grid-kpi">
      <div class="card kpi"><span class="kpi-label">Visitas</span><span class="kpi-value">{{ totals.visits }}</span></div>
      <div class="card kpi"><span class="kpi-label">Total pagado</span><span class="kpi-value">{{ money(totals.pagado) }}</span></div>
      <div class="card kpi">
        <span class="kpi-label">Saldo pendiente</span>
        <span class="kpi-value" :class="{ 'text-bad': totals.saldo > 0 }">{{ money(totals.saldo) }}</span>
      </div>
      <div class="card kpi">
        <span class="kpi-label">Próxima cita</span>
        <span class="kpi-value" style="font-size: 1.1rem">{{ totals.next ? prettyDate(totals.next.fecha) : '—' }}</span>
        <span v-if="totals.next" class="kpi-foot">{{ totals.next.servicio }} {{ totals.next.hora }}</span>
      </div>
    </div>

    <div class="grid grid-3" style="margin-top: 16px; grid-template-columns: 1fr 2fr">
      <section class="card">
        <h2 style="margin-bottom: 12px">Datos del paciente</h2>
        <dl class="dl">
          <dt>Documento</dt><dd>{{ patient.documento || '—' }}</dd>
          <dt>Teléfono</dt><dd>{{ patient.telefono }}</dd>
          <dt>Correo</dt><dd>{{ patient.email || '—' }}</dd>
          <dt>Nacimiento</dt><dd>{{ prettyDate(patient.fechaNacimiento) }} {{ age(patient.fechaNacimiento) && `(${age(patient.fechaNacimiento)})` }}</dd>
          <dt>Sexo</dt><dd>{{ patient.sexo || '—' }}</dd>
          <dt>Dirección</dt><dd>{{ patient.direccion || '—' }}</dd>
        </dl>
        <h3 style="margin: 18px 0 10px">Antecedentes médicos</h3>
        <p v-if="patient.alergias" class="alert alert-bad small" style="margin: 0 0 10px">⚠ Alergias: <b>{{ patient.alergias }}</b></p>
        <dl class="dl">
          <dt>Enfermedades</dt><dd>{{ patient.enfermedades || '—' }}</dd>
          <dt>Medicamentos</dt><dd>{{ patient.medicamentos || '—' }}</dd>
          <dt>Odontológicos</dt><dd>{{ patient.antecedentes || '—' }}</dd>
          <dt>Notas</dt><dd>{{ patient.notas || '—' }}</dd>
        </dl>
        <button class="btn btn-danger btn-sm no-print" style="margin-top: 18px" @click="removePatient">
          <AppIcon name="trash" /> Eliminar paciente
        </button>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>Historial de servicios</h2>
            <span class="card-sub">{{ services.length }} registros, del más reciente al más antiguo</span>
          </div>
        </div>
        <div v-if="services.length" class="timeline">
          <div v-for="s in services" :key="s.id" class="tl-item" :class="s.estado">
            <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 6px">
              <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: center">
                <div>
                  <span class="strong">{{ s.servicio }}</span>
                  <span class="muted small"> · {{ prettyDate(s.fecha) }}{{ s.hora ? ` ${s.hora}` : '' }}</span>
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap">
                  <span class="badge" :class="`badge-${s.estado}`">{{ statusLabel[s.estado] }}</span>
                  <span v-if="balanceOf(s) > 0" class="badge badge-pend">Debe {{ money(balanceOf(s)) }}</span>
                  <span class="strong num">{{ money(s.costo) }}</span>
                </div>
              </div>
              <div v-if="s.piezas || s.diagnostico || s.tratamiento || s.notas" class="small clinical">
                <div v-if="s.piezas"><b>Pieza(s):</b> {{ s.piezas }}</div>
                <div v-if="s.diagnostico"><b>Diagnóstico:</b> {{ s.diagnostico }}</div>
                <div v-if="s.tratamiento"><b>Tratamiento:</b> {{ s.tratamiento }}</div>
                <div v-if="s.notas"><b>Obs.:</b> {{ s.notas }}</div>
              </div>
              <div v-if="s.pagos?.length" class="small clinical">
                <b>Abonos</b>
                <div v-for="(p, i) in s.pagos" :key="i">{{ prettyDate(p.fecha) }} · {{ money(p.monto) }} · {{ p.metodo }}</div>
              </div>
              <div class="small muted" style="display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; align-items: center">
                <span>
                  Pagado {{ money(s.pagado) }}{{ s.metodoPago ? ` · ${s.metodoPago}` : '' }}
                  {{ s.boletaNumero ? ` · ${boletaCode(s.boletaNumero)}` : '' }}
                </span>
                <span class="actions no-print">
                  <button v-if="s.estado === 'agendado'" class="btn btn-ghost btn-sm" @click="openCancel(s.id)">Cancelar</button>
                  <button v-if="balanceOf(s) > 0 && s.estado === 'completado'" class="btn btn-soft btn-sm" @click="openPay(s.id)"><AppIcon name="dollar" /> Cobrar</button>
                  <button v-if="s.estado === 'completado'" class="btn btn-soft btn-sm" @click="openBoleta(s.id)"><AppIcon name="file" /> Boleta</button>
                  <button class="btn btn-ghost btn-sm" @click="openService(s)"><AppIcon name="edit" /> Editar</button>
                  <button class="btn btn-ghost btn-icon" aria-label="Eliminar" @click="removeService(s)"><AppIcon name="trash" :size="15" /></button>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty">
          Sin servicios todavía.
          <div style="margin-top: 10px"><button class="btn btn-primary btn-sm" @click="openService(null, patient.id)">Registrar el primero</button></div>
        </div>
      </section>
    </div>
  </div>
  <div v-else-if="data.loaded.patients" class="empty">
    Paciente no encontrado. <RouterLink to="/pacientes">Volver a pacientes</RouterLink>
  </div>
  <div v-else class="empty">Cargando…</div>
</template>

<style scoped>
.dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin: 0; font-size: 0.9rem; }
dt { color: var(--muted); font-weight: 700; }
dd { margin: 0; overflow-wrap: anywhere; }
.clinical { background: var(--blanco); border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; gap: 3px; }
@media (max-width: 960px) { .grid-3 { grid-template-columns: minmax(0, 1fr) !important; } }
@media print { .no-print { display: none !important; } }
@media (max-width: 700px) {
  .head-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .head-actions .btn { padding-left: 6px; padding-right: 6px; }
  .head-actions .btn-primary { grid-column: 1 / -1; order: -1; }
  .dl { grid-template-columns: minmax(96px, auto) 1fr; }
}
</style>
