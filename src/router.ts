import { createRouter, createWebHistory } from 'vue-router'
import { authReady, authState } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'pacientes', name: 'pacientes', component: () => import('@/views/PatientsView.vue') },
        { path: 'pacientes/:id', name: 'paciente', component: () => import('@/views/PatientDetailView.vue') },
        { path: 'agenda', name: 'agenda', component: () => import('@/views/AgendaView.vue') },
        { path: 'proximas', name: 'proximas', component: () => import('@/views/UpcomingView.vue') },
        { path: 'sin-cerrar', name: 'sin-cerrar', component: () => import('@/views/OverdueView.vue') },
        { path: 'por-cobrar', name: 'por-cobrar', component: () => import('@/views/ReceivablesView.vue') },
        { path: 'historial', name: 'historial', component: () => import('@/views/HistoryView.vue') },
        // Ruta antigua: /servicios?tab=… → nueva vista equivalente
        {
          path: 'servicios',
          redirect: (to) =>
            ({ hoy: '/agenda', proximos: '/proximas', vencidos: '/sin-cerrar', porcobrar: '/por-cobrar' })[String(to.query.tab)] ??
            '/historial',
        },
        { path: 'egresos', name: 'egresos', component: () => import('@/views/ExpensesView.vue') },
        { path: 'contabilidad', name: 'contabilidad', component: () => import('@/views/AccountingView.vue') },
        { path: 'configuracion', name: 'configuracion', component: () => import('@/views/SettingsView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  await authReady
  if (!to.meta.public && !authState.user) return { name: 'login', query: { r: to.fullPath } }
  if (to.name === 'login' && authState.user) return { path: '/' }
})

export default router
