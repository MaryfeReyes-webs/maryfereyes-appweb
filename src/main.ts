import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')

// Solo en desarrollo: acceso a los stores desde la consola / pruebas automáticas.
if (import.meta.env.DEV) {
  Promise.all([import('@/stores/data'), import('@/stores/ui')]).then(([d, u]) => {
    ;(window as unknown as { __mfr: unknown }).__mfr = { data: d.data, ui: u }
  })
}
