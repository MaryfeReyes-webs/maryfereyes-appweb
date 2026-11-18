<script setup lang="ts">
import { authState } from '@/stores/auth'
</script>

<template>
  <div v-if="!authState.ready" class="boot">
    <div class="brand">maryfereyes</div>
  </div>
  <RouterView v-else />
</template>

<style scoped>
.boot { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.boot .brand { font-size: 2rem; color: var(--fucsia); animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.4; } }
</style>
