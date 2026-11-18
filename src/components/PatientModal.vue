<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from './AppModal.vue'
import { data, savePatient } from '@/stores/data'
import { errorToast, toast, ui, openService } from '@/stores/ui'
import type { Patient } from '@/types'

const router = useRouter()
const editing = ui.patientModal.patient
const form = reactive<Omit<Patient, 'id' | 'createdAt'>>({
  nombre: editing?.nombre ?? '',
  documento: editing?.documento ?? '',
  telefono: editing?.telefono ?? '',
  email: editing?.email ?? '',
  fechaNacimiento: editing?.fechaNacimiento ?? '',
  sexo: editing?.sexo ?? '',
  direccion: editing?.direccion ?? '',
  alergias: editing?.alergias ?? '',
  enfermedades: editing?.enfermedades ?? '',
  medicamentos: editing?.medicamentos ?? '',
  antecedentes: editing?.antecedentes ?? '',
  notas: editing?.notas ?? '',
})
const saving = ref(false)
const err = ref('')

function close() {
  ui.patientModal.open = false
}

async function submit(thenService: boolean) {
  err.value = ''
  if (!form.nombre.trim()) return (err.value = 'El nombre es obligatorio.')
  if (form.telefono.replace(/\D/g, '').length < 6) return (err.value = 'Ingresa un teléfono válido (para WhatsApp).')
  const doc = form.documento.trim()
  if (doc && data.patients.some((p) => p.documento === doc && p.id !== editing?.id)) {
    return (err.value = 'Ya existe un paciente con ese documento.')
  }
  saving.value = true
  try {
    const id = await savePatient({ ...form, id: editing?.id, createdAt: editing?.createdAt ?? Date.now() })
    toast(editing ? 'Paciente actualizado' : 'Paciente registrado')
    close()
    if (thenService) openService(null, id)
    else if (!editing) router.push(`/pacientes/${id}`)
  } catch (e) {
    errorToast(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal :title="editing ? 'Editar paciente' : 'Registrar paciente'" wide @close="close">
    <form class="form-grid" @submit.prevent="submit(false)">
      <div class="section-title">Datos personales</div>
      <label class="field full">
        <span>Nombre completo *</span>
        <input v-model="form.nombre" class="input" required autofocus placeholder="Ej. Ana Torres Díaz" />
      </label>
      <label class="field">
        <span>DNI / Documento</span>
        <input v-model="form.documento" class="input" inputmode="numeric" />
      </label>
      <label class="field">
        <span>Teléfono (WhatsApp) *</span>
        <input v-model="form.telefono" class="input" type="tel" required placeholder="987 654 321" />
        <small>Se usará para enviar la boleta por WhatsApp.</small>
      </label>
      <label class="field">
        <span>Fecha de nacimiento</span>
        <input v-model="form.fechaNacimiento" class="input" type="date" />
      </label>
      <label class="field">
        <span>Sexo</span>
        <select v-model="form.sexo" class="input">
          <option value="">—</option>
          <option>Femenino</option>
          <option>Masculino</option>
          <option>Otro</option>
        </select>
      </label>
      <label class="field">
        <span>Correo</span>
        <input v-model="form.email" class="input" type="email" />
      </label>
      <label class="field">
        <span>Dirección</span>
        <input v-model="form.direccion" class="input" />
      </label>

      <div class="section-title">Antecedentes médicos</div>
      <label class="field">
        <span>Alergias</span>
        <input v-model="form.alergias" class="input" placeholder="Penicilina, látex, anestesia…" />
      </label>
      <label class="field">
        <span>Enfermedades</span>
        <input v-model="form.enfermedades" class="input" placeholder="Diabetes, hipertensión…" />
      </label>
      <label class="field">
        <span>Medicamentos actuales</span>
        <input v-model="form.medicamentos" class="input" />
      </label>
      <label class="field">
        <span>Antecedentes odontológicos</span>
        <input v-model="form.antecedentes" class="input" placeholder="Ortodoncia previa, bruxismo…" />
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
      <button v-if="!editing" class="btn btn-soft" type="button" :disabled="saving" @click="submit(true)">
        Guardar y registrar servicio
      </button>
      <button class="btn btn-primary" type="button" :disabled="saving" @click="submit(false)">
        {{ saving ? 'Guardando…' : 'Guardar' }}
      </button>
    </template>
  </AppModal>
</template>
