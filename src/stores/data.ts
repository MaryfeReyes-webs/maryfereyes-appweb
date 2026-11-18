import { reactive } from 'vue'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase'
import {
  DEFAULT_CATALOG,
  DEFAULT_SETTINGS,
  type CatalogItem,
  type ClinicSettings,
  type Expense,
  type Patient,
  type Service,
} from '@/types'

type WithoutId<T> = Omit<T, 'id'>

export const data = reactive({
  patients: [] as Patient[],
  services: [] as Service[],
  expenses: [] as Expense[],
  catalog: [] as CatalogItem[],
  settings: { ...DEFAULT_SETTINGS } as ClinicSettings,
  loaded: { patients: false, services: false, expenses: false, catalog: false },
  error: '' as string,
})

let unsubs: Unsubscribe[] = []

function listen<T extends { id: string }>(
  name: 'patients' | 'services' | 'expenses' | 'catalog',
  sort: (a: T, b: T) => number,
) {
  return onSnapshot(
    collection(db, name),
    (snap) => {
      const rows = snap.docs.map((d) => ({ ...(d.data() as WithoutId<T>), id: d.id }) as T)
      rows.sort(sort)
      ;(data[name] as unknown as T[]) = rows
      data.loaded[name] = true
    },
    (err) => {
      console.error(name, err)
      data.error =
        err.code === 'permission-denied'
          ? 'Firestore rechazó el acceso. Publica las reglas de firestore.rules en la consola de Firebase.'
          : `Error al cargar datos: ${err.message}`
    },
  )
}

export function startSync() {
  if (unsubs.length) return
  data.error = ''
  unsubs = [
    listen<Patient>('patients', (a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    listen<Service>('services', (a, b) => (b.fecha + (b.hora ?? '')).localeCompare(a.fecha + (a.hora ?? ''))),
    listen<Expense>('expenses', (a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt - a.createdAt),
    listen<CatalogItem>('catalog', (a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    onSnapshot(doc(db, 'config', 'clinica'), (snap) => {
      data.settings = { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<ClinicSettings> | undefined) }
    }),
  ]
}

export function stopSync() {
  unsubs.forEach((u) => u())
  unsubs = []
  data.patients = []
  data.services = []
  data.expenses = []
  data.catalog = []
  data.loaded = { patients: false, services: false, expenses: false, catalog: false }
}

/** Firestore no acepta `undefined`: limpiamos los campos vacíos. */
function clean<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'id' || v === undefined) continue
    out[k] = typeof v === 'string' ? v.trim() : v
  }
  return out as T
}

// ---------- Pacientes ----------
export async function savePatient(p: WithoutId<Patient> & { id?: string }): Promise<string> {
  const body = clean(p)
  if (p.id) {
    await updateDoc(doc(db, 'patients', p.id), body)
    // Mantener el nombre desnormalizado en sus servicios
    const batch = writeBatch(db)
    data.services
      .filter((s) => s.patientId === p.id && s.patientName !== p.nombre)
      .forEach((s) => batch.update(doc(db, 'services', s.id), { patientName: p.nombre.trim() }))
    await batch.commit()
    return p.id
  }
  const ref = await addDoc(collection(db, 'patients'), { ...body, createdAt: Date.now() })
  return ref.id
}

export async function deletePatient(id: string) {
  const batch = writeBatch(db)
  data.services.filter((s) => s.patientId === id).forEach((s) => batch.delete(doc(db, 'services', s.id)))
  batch.delete(doc(db, 'patients', id))
  await batch.commit()
}

// ---------- Servicios / atenciones ----------
export async function saveService(s: WithoutId<Service> & { id?: string }): Promise<string> {
  const body = clean(s)
  if (s.id) {
    await updateDoc(doc(db, 'services', s.id), body)
    return s.id
  }
  const ref = await addDoc(collection(db, 'services'), { ...body, createdAt: Date.now() })
  return ref.id
}

export async function updateService(id: string, patch: Partial<Service>) {
  await updateDoc(doc(db, 'services', id), clean(patch))
}

export async function deleteService(id: string) {
  await deleteDoc(doc(db, 'services', id))
}

/** Asigna un número de boleta correlativo (una sola vez por servicio). */
export async function ensureBoletaNumber(serviceId: string): Promise<number> {
  return runTransaction(db, async (tx) => {
    const sRef = doc(db, 'services', serviceId)
    const cRef = doc(db, 'config', 'contadores')
    const sSnap = await tx.get(sRef)
    const existing = sSnap.data()?.boletaNumero as number | undefined
    if (existing) return existing
    const cSnap = await tx.get(cRef)
    const next = ((cSnap.data()?.boleta as number | undefined) ?? 0) + 1
    tx.set(cRef, { boleta: next }, { merge: true })
    tx.update(sRef, { boletaNumero: next })
    return next
  })
}

// ---------- Egresos ----------
export async function saveExpense(e: WithoutId<Expense> & { id?: string }): Promise<string> {
  const body = clean(e)
  if (e.id) {
    await updateDoc(doc(db, 'expenses', e.id), body)
    return e.id
  }
  const ref = await addDoc(collection(db, 'expenses'), { ...body, createdAt: Date.now() })
  return ref.id
}

export async function deleteExpense(id: string) {
  await deleteDoc(doc(db, 'expenses', id))
}

// ---------- Catálogo ----------
export async function saveCatalogItem(item: WithoutId<CatalogItem> & { id?: string }) {
  const body = clean(item)
  if (item.id) await updateDoc(doc(db, 'catalog', item.id), body)
  else await addDoc(collection(db, 'catalog'), body)
}

export async function deleteCatalogItem(id: string) {
  await deleteDoc(doc(db, 'catalog', id))
}

export async function seedCatalog() {
  const batch = writeBatch(db)
  const existing = new Set(data.catalog.map((c) => c.nombre.toLowerCase()))
  DEFAULT_CATALOG.filter((c) => !existing.has(c.nombre.toLowerCase())).forEach((c) =>
    batch.set(doc(collection(db, 'catalog')), c),
  )
  await batch.commit()
}

// ---------- Configuración ----------
export async function saveSettings(s: ClinicSettings) {
  await setDoc(doc(db, 'config', 'clinica'), clean(s), { merge: true })
}
