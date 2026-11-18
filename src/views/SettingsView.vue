<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { data, deleteCatalogItem, saveCatalogItem, saveSettings, seedCatalog } from '@/stores/data'
import { errorToast, toast } from '@/stores/ui'
import type { CatalogItem, ClinicSettings } from '@/types'
import { money } from '@/utils/format'

const settings = reactive<ClinicSettings>({ ...data.settings })
watch(
  () => data.settings,
  (v) => Object.assign(settings, v),
)
const savingSettings = ref(false)

async function submitSettings() {
  savingSettings.value = true
  try {
    await saveSettings({ ...settings })
    toast('Configuración guardada')
  } catch (e) {
    errorToast(e)
  } finally {
    savingSettings.value = false
  }
}

const newItem = reactive({ nombre: '', precio: 0 })
const editId = ref('')
const editItem = reactive({ nombre: '', precio: 0 })

async function addItem() {
  if (!newItem.nombre.trim()) return
  try {
    await saveCatalogItem({ nombre: newItem.nombre, precio: Number(newItem.precio) || 0 })
    newItem.nombre = ''
    newItem.precio = 0
    toast('Servicio agregado al catálogo')
  } catch (e) {
    errorToast(e)
  }
}

function startEdit(c: CatalogItem) {
  editId.value = c.id
  editItem.nombre = c.nombre
  editItem.precio = c.precio
}

async function saveEdit() {
  try {
    await saveCatalogItem({ id: editId.value, nombre: editItem.nombre, precio: Number(editItem.precio) || 0 })
    editId.value = ''
    toast('Precio actualizado')
  } catch (e) {
    errorToast(e)
  }
}

async function removeItem(c: CatalogItem) {
  if (!confirm(`¿Quitar "${c.nombre}" del catálogo? (No afecta servicios ya registrados)`)) return
  try {
    await deleteCatalogItem(c.id)
  } catch (e) {
    errorToast(e)
  }
}

async function seed() {
  try {
    await seedCatalog()
    toast('Servicios comunes cargados. Ajusta los precios a tu tarifa.')
  } catch (e) {
    errorToast(e)
  }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Configuración</h1>
        <p>Catálogo de servicios con precios y datos que aparecen en la boleta</p>
      </div>
    </div>

    <div class="grid grid-2">
      <section class="card">
        <div class="card-head">
          <div>
            <h2>Catálogo de servicios</h2>
            <span class="card-sub">El precio se sugiere al registrar un servicio y siempre se puede editar.</span>
          </div>
          <button v-if="data.loaded.catalog" class="btn btn-soft btn-sm" @click="seed">Cargar servicios comunes</button>
        </div>
        <form class="input-group" style="margin-bottom: 12px" @submit.prevent="addItem">
          <input v-model="newItem.nombre" class="input" placeholder="Nuevo servicio" />
          <input v-model.number="newItem.precio" class="input" type="number" min="0" step="0.5" style="max-width: 110px" />
          <button class="btn btn-primary btn-sm"><AppIcon name="plus" /></button>
        </form>
        <div class="table-wrap">
          <table>
            <tbody>
              <tr v-for="c in data.catalog" :key="c.id">
                <template v-if="editId === c.id">
                  <td><input v-model="editItem.nombre" class="input" /></td>
                  <td class="num"><input v-model.number="editItem.precio" class="input" type="number" min="0" step="0.5" style="max-width: 110px" /></td>
                  <td class="num">
                    <div class="actions" style="justify-content: flex-end; flex-wrap: nowrap">
                      <button class="btn btn-primary btn-icon" aria-label="Guardar" @click="saveEdit"><AppIcon name="check" :size="15" /></button>
                      <button class="btn btn-ghost btn-icon" aria-label="Cancelar" @click="editId = ''"><AppIcon name="x" :size="15" /></button>
                    </div>
                  </td>
                </template>
                <template v-else>
                  <td>{{ c.nombre }}</td>
                  <td class="num strong">{{ money(c.precio) }}</td>
                  <td class="num">
                    <div class="actions" style="justify-content: flex-end; flex-wrap: nowrap">
                      <button class="btn btn-ghost btn-icon" aria-label="Editar" @click="startEdit(c)"><AppIcon name="edit" :size="15" /></button>
                      <button class="btn btn-ghost btn-icon" aria-label="Eliminar" @click="removeItem(c)"><AppIcon name="trash" :size="15" /></button>
                    </div>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
          <div v-if="!data.catalog.length" class="empty">Catálogo vacío. Agrega servicios o carga los comunes.</div>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Datos del consultorio (boleta)</h2></div>
        <form class="form-grid" @submit.prevent="submitSettings">
          <label class="field full"><span>Nombre comercial</span><input v-model="settings.nombre" class="input" /></label>
          <label class="field full"><span>Profesional / subtítulo</span><input v-model="settings.profesional" class="input" /></label>
          <label class="field"><span>RUC</span><input v-model="settings.ruc" class="input" inputmode="numeric" /></label>
          <label class="field"><span>Teléfono</span><input v-model="settings.telefono" class="input" /></label>
          <label class="field full"><span>Dirección</span><input v-model="settings.direccion" class="input" /></label>
          <label class="field">
            <span>Código de país (WhatsApp)</span>
            <input v-model="settings.codigoPais" class="input" inputmode="numeric" />
            <small>Perú = 51. Se antepone a los teléfonos sin código.</small>
          </label>
          <label class="field"><span>Símbolo de moneda</span><input v-model="settings.moneda" class="input" /></label>
          <div class="full" style="display: flex; justify-content: flex-end">
            <button class="btn btn-primary" :disabled="savingSettings">{{ savingSettings ? 'Guardando…' : 'Guardar configuración' }}</button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>
