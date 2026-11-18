import { realpathSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Ruta canónica del proyecto. En Windows la terminal puede entregar "c:\…" y Node "C:\…";
// si raíz y alias no coinciden, el bundler duplica módulos (p. ej. dos copias de vue-router
// y `useRoute()` devuelve undefined). Usar la misma ruta en ambos lo evita.
const projectRoot = realpathSync.native(fileURLToPath(new URL('.', import.meta.url)))

// https://vite.dev/config/
export default defineConfig({
  root: projectRoot,
  plugins: [
    vue(),
    vueDevTools(),
  ],
  build: {
    // Firebase + Chart.js forman un bloque grande (≈220 kB gzip); es esperado.
    chunkSizeWarningLimit: 900,
  },
  resolve: {
    alias: {
      '@': join(projectRoot, 'src'),
    },
  },
})
