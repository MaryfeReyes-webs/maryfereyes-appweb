<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
void props
</script>

<template>
  <div class="overlay" @mousedown.self="emit('close')">
    <div class="modal" :class="{ wide }" role="dialog" aria-modal="true" :aria-label="title">
      <header>
        <h2>{{ title }}</h2>
        <button class="btn btn-ghost btn-icon" type="button" aria-label="Cerrar" @click="emit('close')">
          <AppIcon name="x" />
        </button>
      </header>
      <div class="body"><slot /></div>
      <footer v-if="$slots.footer"><slot name="footer" /></footer>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(74, 35, 55, 0.35); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;
}
.modal {
  background: var(--blanco); border-radius: 20px; width: 100%; max-width: 560px; max-height: calc(100vh - 32px);
  display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(74, 35, 55, 0.25); animation: pop 0.18s ease;
}
.modal.wide { max-width: 760px; }
header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); background: linear-gradient(90deg, var(--rosa-2), var(--crema)); border-radius: 20px 20px 0 0; }
.body { padding: 18px 20px; overflow-y: auto; }
footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--line); flex-wrap: wrap; }
@media (max-width: 700px) {
  .overlay { padding: 0; align-items: flex-end; }
  .modal, .modal.wide { max-width: none; border-radius: 22px 22px 0 0; max-height: 94vh; max-height: 94dvh; animation: slideUp 0.22s ease; }
  header { padding: 12px 16px; border-radius: 22px 22px 0 0; position: relative; }
  header::before { content: ''; position: absolute; top: 6px; left: 50%; width: 40px; height: 4px; margin-left: -20px; border-radius: 4px; background: var(--fucsia-soft); }
  .body { padding: 14px 16px; }
  footer { padding: 10px 16px calc(10px + var(--safe-bottom)); }
  footer :deep(.btn) { flex: 1 1 auto; }
  footer :deep(.btn-primary) { order: 10; flex-basis: 100%; }
}
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
</style>
