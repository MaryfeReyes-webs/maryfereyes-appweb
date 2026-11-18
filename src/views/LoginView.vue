<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { getSavedUsername, login } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const username = ref(getSavedUsername())
const password = ref('')
const remember = ref(true)
const showPass = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await login(username.value, password.value, remember.value)
    const r = typeof route.query.r === 'string' && route.query.r.startsWith('/') ? route.query.r : '/'
    router.replace(r)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo iniciar sesión.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="deco deco-1" />
    <div class="deco deco-2" />
    <form class="panel" @submit.prevent="submit">
      <div class="mark"><AppIcon name="tooth" :size="30" /></div>
      <h1 class="brand title">maryfereyes</h1>
      <p class="subtitle">Gestión del consultorio dental</p>

      <label class="field">
        <span>Usuario</span>
        <input v-model="username" class="input" autocomplete="username" autocapitalize="none" required :autofocus="!username" />
      </label>
      <label class="field">
        <span>Contraseña</span>
        <div class="pass">
          <input
            v-model="password"
            class="input"
            :type="showPass ? 'text' : 'password'"
            autocomplete="current-password"
            required
            :autofocus="!!username"
          />
          <button type="button" class="eye" @click="showPass = !showPass">{{ showPass ? 'Ocultar' : 'Ver' }}</button>
        </div>
      </label>
      <label class="remember">
        <input v-model="remember" type="checkbox" />
        Mantener sesión iniciada en este navegador
      </label>
      <p v-if="error" class="alert alert-bad small">{{ error }}</p>
      <button class="btn btn-primary submit" :disabled="loading">
        {{ loading ? 'Ingresando…' : 'Iniciar sesión' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; position: relative; overflow: hidden; background: linear-gradient(140deg, var(--crema) 0%, var(--rosa) 100%); }
.deco { position: absolute; border-radius: 50%; filter: blur(2px); }
.deco-1 { width: 420px; height: 420px; background: var(--fucsia-soft); top: -140px; right: -120px; opacity: 0.6; }
.deco-2 { width: 300px; height: 300px; background: #fff; bottom: -110px; left: -80px; opacity: 0.7; }
.panel { position: relative; width: 100%; max-width: 380px; background: var(--blanco); border-radius: 24px; padding: 34px 28px 28px; box-shadow: 0 24px 60px rgba(173, 20, 87, 0.15); display: flex; flex-direction: column; gap: 14px; }
.mark { width: 60px; height: 60px; border-radius: 20px; background: var(--fucsia); color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 10px 24px rgba(216, 27, 96, 0.35); }
.title { text-align: center; font-size: 2rem; color: var(--fucsia-dark); }
.subtitle { text-align: center; margin: -10px 0 8px; color: var(--ink-2); }
.pass { position: relative; }
.pass .input { padding-right: 70px; }
.eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); border: none; background: var(--rosa-2); color: var(--fucsia-dark); border-radius: 8px; padding: 4px 8px; font: inherit; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
.remember { display: flex; gap: 8px; align-items: center; font-size: 0.85rem; color: var(--ink-2); cursor: pointer; }
.remember input { accent-color: var(--fucsia); width: 16px; height: 16px; }
.submit { padding: 12px; font-size: 1rem; margin-top: 4px; }
.alert { margin: 0; }
</style>
