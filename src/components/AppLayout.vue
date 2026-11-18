<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import PatientModal from './PatientModal.vue'
import ServiceModal from './ServiceModal.vue'
import ExpenseModal from './ExpenseModal.vue'
import CancelModal from './CancelModal.vue'
import PayModal from './PayModal.vue'
import CompleteModal from './CompleteModal.vue'
import { authState, logout, usernameOf } from '@/stores/auth'
import { data, startSync, stopSync } from '@/stores/data'
import { openExpense, openPatient, openService, ui } from '@/stores/ui'
import { today } from '@/utils/format'

const BoletaModal = defineAsyncComponent(() => import('./BoletaModal.vue'))

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const sheetOpen = ref(false)

const counts = computed(() => {
  const t = today()
  let hoy = 0, proximas = 0, sinCerrar = 0, porCobrar = 0
  for (const s of data.services) {
    if (s.estado === 'agendado') {
      if (s.fecha === t) hoy++
      else if (s.fecha > t) proximas++
      else sinCerrar++
    } else if (s.estado === 'completado' && s.costo - s.pagado > 0) porCobrar++
  }
  return { hoy, proximas, sinCerrar, porCobrar }
})
const todayCount = computed(() => counts.value.hoy)

type NavItem = { to: string; icon: string; label: string; count?: number; alert?: boolean } | { section: string }
const nav = computed<NavItem[]>(() => [
  { to: '/', icon: 'home', label: 'Dashboard' },
  { section: 'Agenda' },
  { to: '/agenda', icon: 'clock', label: 'Agenda del día', count: counts.value.hoy },
  { to: '/proximas', icon: 'calendar', label: 'Próximas citas', count: counts.value.proximas },
  { to: '/sin-cerrar', icon: 'alert', label: 'Citas sin cerrar', count: counts.value.sinCerrar, alert: true },
  { to: '/por-cobrar', icon: 'dollar', label: 'Por cobrar', count: counts.value.porCobrar, alert: true },
  { to: '/historial', icon: 'file', label: 'Historial' },
  { section: 'Consultorio' },
  { to: '/pacientes', icon: 'users', label: 'Pacientes' },
  { to: '/egresos', icon: 'wallet', label: 'Egresos' },
  { to: '/contabilidad', icon: 'chart', label: 'Contabilidad' },
  { to: '/configuracion', icon: 'settings', label: 'Configuración' },
])

// Barra inferior (teléfono / tablet vertical). El botón central abre el menú de registro.
const bottomLeft = [
  { to: '/', icon: 'home', label: 'Inicio' },
  { to: '/pacientes', icon: 'users', label: 'Pacientes' },
]
const bottomRight = [
  { to: '/agenda', icon: 'calendar', label: 'Agenda' },
  { to: '/contabilidad', icon: 'chart', label: 'Cuentas' },
]

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
    sheetOpen.value = false
  },
)

function quick(action: 'patient' | 'service' | 'expense') {
  sheetOpen.value = false
  if (action === 'patient') openPatient()
  else if (action === 'service') openService()
  else openExpense()
}

async function doLogout() {
  stopSync()
  await logout()
  router.replace('/login')
}

onMounted(startSync)
onBeforeUnmount(stopSync)
</script>

<template>
  <div class="shell">
    <aside :class="{ open: menuOpen }">
      <div class="logo">
        <div class="logo-mark"><AppIcon name="tooth" :size="22" /></div>
        <div class="collapse-hide">
          <div class="brand logo-name">maryfereyes</div>
          <div class="logo-sub">Consultorio dental</div>
        </div>
        <button class="btn btn-ghost btn-icon close-btn" aria-label="Cerrar menú" @click="menuOpen = false">
          <AppIcon name="x" />
        </button>
      </div>
      <nav>
        <template v-for="n in nav" :key="'section' in n ? n.section : n.to">
          <div v-if="'section' in n" class="nav-section"><span class="collapse-hide">{{ n.section }}</span></div>
          <RouterLink v-else :to="n.to" class="nav-link" :class="{ active: isActive(n.to) }" :title="n.label">
            <span class="nav-icon">
              <AppIcon :name="n.icon" :size="20" />
              <i v-if="n.count && n.alert" class="dot" />
            </span>
            <span class="collapse-hide">{{ n.label }}</span>
            <b v-if="n.count" class="nav-count" :class="{ alert: n.alert }">{{ n.count }}</b>
          </RouterLink>
        </template>
      </nav>
      <div class="user-box">
        <div class="avatar">{{ usernameOf(authState.user).slice(0, 1).toUpperCase() }}</div>
        <div class="grow collapse-hide">
          <div class="strong">{{ usernameOf(authState.user) }}</div>
          <div class="small muted">Sesión iniciada</div>
        </div>
        <button class="btn btn-ghost btn-icon" title="Cerrar sesión" aria-label="Cerrar sesión" @click="doLogout">
          <AppIcon name="logout" />
        </button>
      </div>
    </aside>
    <Transition name="fade">
      <div v-if="menuOpen" class="scrim" @click="menuOpen = false" />
    </Transition>

    <div class="main">
      <header class="topbar">
        <button class="btn btn-ghost btn-icon menu-btn" aria-label="Menú" @click="menuOpen = true">
          <AppIcon name="menu" />
        </button>
        <span class="brand top-brand">maryfereyes</span>
        <div class="spacer" />
        <div class="quick">
          <button class="btn btn-soft btn-sm" @click="openPatient()"><AppIcon name="user" /> Registrar paciente</button>
          <button class="btn btn-primary btn-sm" @click="openService()"><AppIcon name="plus" /> Registrar servicio</button>
          <button class="btn btn-ghost btn-sm" @click="openExpense()"><AppIcon name="wallet" /> Registrar egreso</button>
        </div>
      </header>

      <p v-if="data.error" class="alert alert-bad sync-error"><AppIcon name="alert" /> {{ data.error }}</p>

      <main class="content">
        <RouterView />
      </main>
    </div>

    <!-- Navegación inferior: teléfono y tablet vertical -->
    <nav class="bottom-nav" aria-label="Navegación principal">
      <RouterLink v-for="n in bottomLeft" :key="n.to" :to="n.to" class="bn-link" :class="{ active: isActive(n.to) }">
        <AppIcon :name="n.icon" :size="22" />
        <span>{{ n.label }}</span>
      </RouterLink>
      <button class="bn-fab" :class="{ open: sheetOpen }" aria-label="Registrar" @click="sheetOpen = !sheetOpen">
        <AppIcon name="plus" :size="28" />
      </button>
      <RouterLink v-for="n in bottomRight" :key="n.to" :to="n.to" class="bn-link" :class="{ active: isActive(n.to) }">
        <span class="bn-icon">
          <AppIcon :name="n.icon" :size="22" />
          <b v-if="n.to === '/agenda' && todayCount" class="bn-count">{{ todayCount }}</b>
        </span>
        <span>{{ n.label }}</span>
      </RouterLink>
    </nav>

    <!-- Menú de acciones rápidas del botón + -->
    <Transition name="fade">
      <div v-if="sheetOpen" class="scrim sheet-scrim" @click="sheetOpen = false" />
    </Transition>
    <Transition name="sheet">
      <div v-if="sheetOpen" class="sheet" role="menu">
        <button class="sheet-item" role="menuitem" @click="quick('service')">
          <span class="sheet-ic primary"><AppIcon name="tooth" :size="22" /></span>
          <span><b>Registrar servicio</b><small>Atención realizada o cita agendada</small></span>
        </button>
        <button class="sheet-item" role="menuitem" @click="quick('patient')">
          <span class="sheet-ic"><AppIcon name="user" :size="22" /></span>
          <span><b>Registrar paciente</b><small>Nuevo paciente e historia clínica</small></span>
        </button>
        <button class="sheet-item" role="menuitem" @click="quick('expense')">
          <span class="sheet-ic out"><AppIcon name="wallet" :size="22" /></span>
          <span><b>Registrar egreso</b><small>Compra, inversión o gasto</small></span>
        </button>
      </div>
    </Transition>

    <PatientModal v-if="ui.patientModal.open" />
    <ServiceModal v-if="ui.serviceModal.open" />
    <ExpenseModal v-if="ui.expenseModal.open" />
    <BoletaModal v-if="ui.boletaModal.open" />
    <CancelModal v-if="ui.cancelModal.open" />
    <PayModal v-if="ui.payModal.open" />
    <CompleteModal v-if="ui.completeModal.open" />

    <div class="toasts">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.kind">{{ t.text }}</div>
    </div>
  </div>
</template>

<style scoped>
.shell { display: flex; min-height: 100vh; min-height: 100dvh; }

/* ---------- Menú lateral (escritorio) ---------- */
aside {
  width: 248px; flex-shrink: 0; background: var(--blanco); border-right: 1px solid var(--line);
  display: flex; flex-direction: column; padding: calc(20px + var(--safe-top)) 14px calc(16px + var(--safe-bottom));
  position: sticky; top: 0; height: 100vh; height: 100dvh; z-index: 70; overflow-y: auto;
}
.logo { display: flex; align-items: center; gap: 10px; padding: 0 8px 20px; }
.logo-mark { width: 42px; height: 42px; flex-shrink: 0; border-radius: 14px; background: var(--fucsia); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(216, 27, 96, 0.3); }
.logo-name { font-size: 1.25rem; color: var(--fucsia-dark); }
.logo-sub { font-size: 0.75rem; color: var(--muted); }
.close-btn { display: none; margin-left: auto; }
nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.nav-link { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 12px; color: var(--ink-2); font-weight: 700; font-size: 0.92rem; position: relative; }
.nav-link:hover { background: var(--rosa-2); }
.nav-link.active { background: var(--rosa); color: var(--fucsia-dark); }
.nav-count { margin-left: auto; background: var(--rosa); color: var(--fucsia-dark); border-radius: 999px; font-size: 0.72rem; padding: 1px 8px; }
.nav-count.alert { background: var(--fucsia); color: #fff; }
.nav-link.active .nav-count:not(.alert) { background: var(--blanco); }
.nav-section { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); padding: 14px 14px 4px; }
.nav-icon { position: relative; display: inline-flex; }
.nav-icon .dot { display: none; position: absolute; top: -2px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--fucsia); border: 2px solid var(--blanco); }
.user-box { display: flex; align-items: center; gap: 10px; padding: 12px 8px 0; border-top: 1px solid var(--line); }
.user-box .grow { flex: 1; min-width: 0; }

.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.topbar {
  display: flex; align-items: center; gap: 10px; padding: calc(14px + var(--safe-top)) 28px 14px;
  background: rgba(255, 248, 240, 0.92); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  position: sticky; top: 0; z-index: 50; border-bottom: 1px solid var(--line);
}
.quick { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.menu-btn, .top-brand { display: none; }
.top-brand { color: var(--fucsia-dark); font-size: 1.2rem; }
.content { padding: 24px 28px 48px; max-width: 1400px; width: 100%; }
.sync-error { margin: 16px 28px 0; }
.scrim { position: fixed; inset: 0; background: rgba(74, 35, 55, 0.35); z-index: 65; }

/* ---------- Barra inferior + hoja de acciones (ocultas en escritorio) ---------- */
.bottom-nav, .sheet, .sheet-scrim { display: none; }

/* ---------- Tablet horizontal / laptop pequeño: menú solo con íconos ---------- */
@media (min-width: 901px) and (max-width: 1200px) {
  aside { width: 76px; padding-left: 12px; padding-right: 12px; }
  .collapse-hide, .nav-count { display: none; }
  .nav-icon .dot { display: block; }
  .nav-section { padding: 8px 0 2px; border-top: 1px solid var(--line); margin: 6px 8px 0; }
  .logo { padding: 0 0 20px; justify-content: center; }
  .nav-link { justify-content: center; padding: 12px; }
  .user-box { flex-direction: column; padding: 12px 0 0; }
  .content { padding: 22px 22px 40px; }
  .topbar { padding-left: 22px; padding-right: 22px; }
}

/* ---------- Teléfono y tablet vertical ---------- */
@media (max-width: 900px) {
  aside {
    position: fixed; left: 0; top: 0; width: min(290px, 84vw); transform: translateX(-100%);
    transition: transform 0.25s ease; box-shadow: 0 0 40px rgba(74, 35, 55, 0.2);
  }
  aside.open { transform: none; }
  .close-btn { display: inline-flex; }
  .nav-link { padding: 14px; font-size: 1rem; }
  .menu-btn, .top-brand { display: inline-flex; }
  .quick { display: none; }
  .topbar { padding: calc(8px + var(--safe-top)) 12px 8px; }
  .content { padding: 16px 16px calc(var(--bottom-nav-h) + var(--safe-bottom) + 28px); }
  .sync-error { margin: 12px 16px 0; }

  .bottom-nav {
    display: grid; grid-template-columns: repeat(5, 1fr); align-items: end;
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
    height: calc(var(--bottom-nav-h) + var(--safe-bottom)); padding: 0 6px var(--safe-bottom);
    background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid var(--line); box-shadow: 0 -4px 20px rgba(173, 20, 87, 0.06);
  }
  .bn-link {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    height: var(--bottom-nav-h); color: var(--muted); font-size: 0.7rem; font-weight: 800;
  }
  .bn-link.active { color: var(--fucsia); }
  .bn-icon { position: relative; display: inline-flex; }
  .bn-count {
    position: absolute; top: -6px; right: -10px; background: var(--fucsia); color: #fff; border: 2px solid #fff;
    border-radius: 999px; font-size: 0.62rem; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px;
  }
  .bn-fab {
    justify-self: center; align-self: center; width: 56px; height: 56px; margin-top: -26px; border-radius: 50%;
    border: 4px solid var(--crema); background: var(--fucsia); color: #fff; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 22px rgba(216, 27, 96, 0.4); cursor: pointer; transition: transform 0.2s ease, background 0.2s;
  }
  .bn-fab.open { transform: rotate(45deg); background: var(--fucsia-dark); }

  .sheet-scrim { display: block; z-index: 58; }
  .sheet {
    display: flex; flex-direction: column; gap: 8px; position: fixed; z-index: 59;
    left: 12px; right: 12px; bottom: calc(var(--bottom-nav-h) + var(--safe-bottom) + 14px);
    max-width: 460px; margin: 0 auto; background: var(--blanco); border-radius: 22px; padding: 12px;
    box-shadow: 0 20px 50px rgba(74, 35, 55, 0.25);
  }
  .sheet-item {
    display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px; border: none; border-radius: 16px;
    background: var(--crema); font: inherit; color: var(--ink); text-align: left; cursor: pointer;
  }
  .sheet-item:active { background: var(--rosa); }
  .sheet-item b { display: block; font-size: 1rem; }
  .sheet-item small { color: var(--muted); font-size: 0.8rem; }
  .sheet-ic { width: 46px; height: 46px; flex-shrink: 0; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: var(--rosa); color: var(--fucsia-dark); }
  .sheet-ic.primary { background: var(--fucsia); color: #fff; }
  .sheet-ic.out { background: var(--info-bg); color: var(--info); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.sheet-enter-active, .sheet-leave-active { transition: transform 0.22s ease, opacity 0.22s ease; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(20px); opacity: 0; }
</style>
