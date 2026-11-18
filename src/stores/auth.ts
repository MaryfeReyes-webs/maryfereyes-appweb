import { reactive } from 'vue'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, AUTH_EMAIL_DOMAIN } from '@/firebase'

const COOKIE = 'mfr_usuario'
const COOKIE_DAYS = 30

export const authState = reactive<{ user: User | null; ready: boolean }>({ user: null, ready: false })

let readyResolve: () => void
export const authReady = new Promise<void>((r) => (readyResolve = r))

onAuthStateChanged(auth, (u) => {
  authState.user = u
  authState.ready = true
  readyResolve()
})

export function getSavedUsername(): string {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`))
  return m?.[1] ? decodeURIComponent(m[1]) : ''
}

function saveUsernameCookie(username: string) {
  const maxAge = COOKIE_DAYS * 24 * 60 * 60
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE}=${encodeURIComponent(username)}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`
}

function clearUsernameCookie() {
  document.cookie = `${COOKIE}=; max-age=0; path=/`
}

export function usernameOf(u: User | null): string {
  return u?.email?.split('@')[0] ?? ''
}

export async function login(username: string, password: string, remember: boolean) {
  const user = username.trim().toLowerCase()
  if (!user || !password) throw new Error('Ingresa usuario y contraseña.')
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
  try {
    await signInWithEmailAndPassword(auth, `${user}@${AUTH_EMAIL_DOMAIN}`, password)
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? ''
    if (code.includes('too-many-requests')) throw new Error('Demasiados intentos. Espera unos minutos.')
    if (code.includes('network')) throw new Error('Sin conexión a internet.')
    throw new Error('Usuario o contraseña incorrectos.')
  }
  if (remember) saveUsernameCookie(user)
  else clearUsernameCookie()
}

export async function logout() {
  clearUsernameCookie()
  await signOut(auth)
}
