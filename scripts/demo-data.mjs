#!/usr/bin/env node
/**
 * Datos de prueba para maryfereyes.
 *
 *   node scripts/demo-data.mjs seed    → crea pacientes, servicios, egresos y catálogo de ejemplo
 *   node scripts/demo-data.mjs clean   → borra SOLO lo marcado con demo: true y reinicia el correlativo de boletas
 *
 * Usa la API REST de Firebase con el usuario admin (las mismas reglas que la app).
 * Las fechas son relativas a hoy, así que siempre habrá citas hoy, vencidas y próximas.
 * Los teléfonos son falsos (000 000 0xx) para no enviar WhatsApp a desconocidos:
 * edita un paciente con tu número para probar el envío de boletas.
 */

const API_KEY = 'AIzaSyC8YcyDIONQK1xgisAPB7oiBgfKgRMa2d0'
const PROJECT = 'maryfereyes-appweb'
const USER = { email: 'admin@maryfereyes.app', password: 'admin123' }
const DOCS = `projects/${PROJECT}/databases/(default)/documents`
const BASE = `https://firestore.googleapis.com/v1/${DOCS}`

// ---------- utilidades ----------
let seed = 20261118
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (min, max) => min + Math.floor(rnd() * (max - min + 1))
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayOffset = (n) => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return d
}
const id = (prefix, n) => `demo_${prefix}_${String(n).padStart(3, '0')}`

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  return { stringValue: String(v) }
}
const toFields = (o) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, toValue(v)]))

async function login() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...USER, returnSecureToken: true }),
  })
  const j = await r.json()
  if (!j.idToken) throw new Error(`Login falló: ${JSON.stringify(j.error ?? j)}`)
  return j.idToken
}

async function commit(token, writes) {
  for (let i = 0; i < writes.length; i += 400) {
    const r = await fetch(`${BASE}:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: writes.slice(i, i + 400) }),
    })
    if (!r.ok) throw new Error(`Commit falló (${r.status}): ${await r.text()}`)
  }
}

const upsert = (collection, docId, data) => ({ update: { name: `${DOCS}/${collection}/${docId}`, fields: toFields(data) } })

async function listIds(token, collection, onlyDemo) {
  const ids = []
  let pageToken = ''
  do {
    const r = await fetch(`${BASE}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const j = await r.json()
    for (const d of j.documents ?? []) {
      if (!onlyDemo || d.fields?.demo?.booleanValue === true) ids.push(d.name.split('/').pop())
    }
    pageToken = j.nextPageToken ?? ''
  } while (pageToken)
  return ids
}

// ---------- datos de ejemplo ----------
const PATIENTS = [
  ['Ana Lucía Torres Díaz', 'Femenino', 'Penicilina', '', '', 'Usó ortodoncia en la adolescencia'],
  ['Carlos Alberto Mendoza Ríos', 'Masculino', '', 'Hipertensión', 'Losartán 50 mg', ''],
  ['Rosa Elena Quispe Huamán', 'Femenino', '', '', '', 'Sensibilidad dental al frío'],
  ['Jorge Luis Salazar Peña', 'Masculino', 'Látex', '', '', 'Bruxismo nocturno'],
  ['María Fernanda Castillo Vega', 'Femenino', '', '', '', ''],
  ['Luis Miguel Rojas Campos', 'Masculino', '', 'Diabetes tipo 2', 'Metformina 850 mg', 'Enfermedad periodontal leve'],
  ['Valeria Sofía Gutiérrez León', 'Femenino', '', '', '', 'Primera visita al dentista a los 20 años'],
  ['Diego Andrés Flores Paredes', 'Masculino', 'Ibuprofeno', 'Asma', 'Salbutamol inhalador', ''],
  ['Camila Alejandra Ramos Soto', 'Femenino', '', '', '', 'Brackets metálicos desde 2025'],
  ['Pedro Pablo Chávez Medina', 'Masculino', '', '', '', 'Fumador'],
  ['Lucía Isabel Vargas Herrera', 'Femenino', 'Anestesia con epinefrina', 'Arritmia', '', ''],
  ['Andrés Felipe Morales Cruz', 'Masculino', '', '', '', ''],
  ['Gabriela Patricia Núñez Silva', 'Femenino', '', 'Embarazo (2.º trimestre)', 'Ácido fólico', 'Evitar radiografías'],
  ['Fernando José Aguilar Ponce', 'Masculino', '', '', '', 'Prótesis parcial superior'],
  ['Sofía Valentina Ortiz Lozano', 'Femenino', '', '', '', 'Paciente pediátrica (acompaña la madre)'],
  ['Ricardo Manuel Espinoza Tello', 'Masculino', '', 'Gastritis', 'Omeprazol', ''],
]

// [nombre, precio, diagnóstico, tratamiento, piezas]
const SERVICES = [
  ['Consulta y evaluación', 50, 'Evaluación general, odontograma inicial', 'Examen clínico y plan de tratamiento', ''],
  ['Limpieza dental (profilaxis)', 120, 'Placa bacteriana y cálculo supragingival', 'Destartraje con ultrasonido y pulido', ''],
  ['Curación con resina', 150, 'Caries dentinaria', 'Restauración con resina fotocurable', () => pick(['1.6', '2.6', '3.6', '4.6', '1.4', '2.5', '3.7'])],
  ['Extracción simple', 120, 'Resto radicular', 'Exodoncia simple con anestesia local', () => pick(['1.8', '2.8', '3.5', '4.4'])],
  ['Extracción de tercera molar', 350, 'Tercera molar semi-retenida', 'Exodoncia quirúrgica, sutura', () => pick(['3.8', '4.8'])],
  ['Endodoncia', 450, 'Pulpitis irreversible', 'Tratamiento de conductos', () => pick(['1.6', '2.6', '3.6', '4.6', '1.1'])],
  ['Blanqueamiento dental', 600, 'Pigmentación extrínseca', 'Blanqueamiento en consultorio (2 sesiones)', ''],
  ['Corona', 800, 'Pieza con endodoncia y gran destrucción coronaria', 'Corona de porcelana sobre metal', () => pick(['1.6', '2.6', '3.6'])],
  ['Control de ortodoncia', 150, 'Maloclusión clase II', 'Cambio de arcos y ligaduras', ''],
  ['Radiografía', 40, 'Control radiográfico', 'Radiografía periapical', () => pick(['1.6', '3.6', '4.6'])],
]
const WEIGHTS = [16, 18, 18, 6, 3, 6, 3, 2, 14, 6] // frecuencia relativa de cada servicio
const weighted = () => {
  let r = rnd() * WEIGHTS.reduce((a, b) => a + b, 0)
  for (let i = 0; i < WEIGHTS.length; i++) if ((r -= WEIGHTS[i]) < 0) return SERVICES[i]
  return SERVICES[0]
}
const METHODS = ['Efectivo', 'Yape', 'Yape', 'Plin', 'Tarjeta', 'Transferencia']
const HOURS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '15:00', '15:30', '16:00', '16:30', '17:00', '18:00']

function buildData() {
  const patients = PATIENTS.map(([nombre, sexo, alergias, enfermedades, medicamentos, antecedentes], i) => {
    const birth = dayOffset(-int(6, 65) * 365 - int(0, 364))
    if (nombre.startsWith('Sofía')) birth.setFullYear(new Date().getFullYear() - 9)
    return {
      id: id('pac', i + 1),
      nombre,
      sexo,
      documento: String(int(40000000, 79999999)),
      telefono: `000 000 0${String(i + 1).padStart(2, '0')}`,
      email: i % 3 === 0 ? `${nombre.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.demo@example.com` : '',
      fechaNacimiento: iso(birth),
      direccion: pick(['Miraflores', 'San Isidro', 'Surco', 'San Borja', 'Barranco', 'La Molina', 'Jesús María']) + ', Lima',
      alergias,
      enfermedades,
      medicamentos,
      antecedentes,
      notas: i === 3 ? 'Usa placa de descanso nocturna' : '',
      firstVisit: -int(10, 175),
    }
  })

  const services = []
  let n = 0
  const add = (p, offset, estado, overrides = {}) => {
    const [servicio, precio, diagnostico, tratamiento, piezas] = overrides.svc ?? weighted()
    const fecha = dayOffset(offset)
    const costo = overrides.costo ?? precio
    let pagado = 0
    if (estado === 'completado') pagado = overrides.pagado ?? (rnd() < 0.12 ? Math.round(costo * 0.5) : costo)
    if (estado === 'agendado' && overrides.adelanto) pagado = overrides.adelanto
    services.push({
      id: id('srv', ++n),
      patientId: p.id,
      patientName: p.nombre,
      servicio,
      fecha: iso(fecha),
      hora: overrides.hora ?? pick(HOURS),
      costo,
      pagado,
      estado,
      metodoPago: pagado > 0 ? pick(METHODS) : 'Efectivo',
      piezas: typeof piezas === 'function' ? piezas() : piezas,
      diagnostico: estado === 'completado' ? diagnostico : '',
      tratamiento: estado === 'completado' ? tratamiento : '',
      notas: estado === 'cancelado' ? 'Paciente canceló por motivos personales' : overrides.notas ?? '',
      createdAt: fecha.getTime() - int(1, 10) * 86400000,
    })
  }

  // Historial: cada paciente tiene de 1 a 7 atenciones pasadas desde su primera visita.
  patients.forEach((p, i) => {
    const visits = i < 5 ? int(4, 7) : int(1, 4) // los primeros serán los más frecuentes
    add(p, p.firstVisit, 'completado', { svc: SERVICES[0] })
    for (let v = 1; v < visits; v++) {
      const off = int(p.firstVisit + 3, -2)
      add(p, off, rnd() < 0.07 ? 'cancelado' : 'completado')
    }
  })

  const P = (i) => patients[i]
  // Hoy: 4 citas pendientes + 1 ya atendida
  add(P(0), 0, 'agendado', { svc: SERVICES[1], hora: '09:30' })
  add(P(8), 0, 'agendado', { svc: SERVICES[8], hora: '11:00' })
  add(P(5), 0, 'completado', { svc: SERVICES[2], hora: '10:00', pagado: 150 })
  add(P(11), 0, 'agendado', { svc: SERVICES[5], hora: '15:30', adelanto: 200, notas: 'Dejó adelanto de S/ 200' })
  add(P(14), 0, 'agendado', { svc: SERVICES[0], hora: '17:00' })
  // Próximos 7 días
  add(P(2), 1, 'agendado', { svc: SERVICES[6], hora: '10:00' })
  add(P(9), 2, 'agendado', { svc: SERVICES[1], hora: '16:00' })
  add(P(3), 3, 'agendado', { svc: SERVICES[2], hora: '09:00' })
  add(P(12), 5, 'agendado', { svc: SERVICES[0], hora: '11:30', notas: 'Paciente gestante: sin radiografías' })
  add(P(8), 6, 'agendado', { svc: SERVICES[8], hora: '18:00' })
  add(P(13), 12, 'agendado', { svc: SERVICES[7], hora: '15:00' })
  // Citas vencidas que nunca se cerraron (para la alerta)
  add(P(6), -2, 'agendado', { svc: SERVICES[1], hora: '10:30' })
  add(P(15), -4, 'agendado', { svc: SERVICES[9], hora: '16:30' })
  // Saldos pendientes claros
  add(P(1), -9, 'completado', { svc: SERVICES[7], pagado: 400, notas: 'Paga el saldo en la próxima cita' })
  add(P(4), -6, 'completado', { svc: SERVICES[5], pagado: 250 })

  // Egresos: fijos mensuales + insumos + inversiones puntuales
  const expenses = []
  let e = 0
  const exp = (offset, concepto, categoria, tipo, monto, proveedor = '', notas = '') =>
    expenses.push({ id: id('egr', ++e), concepto, categoria, tipo, monto, fecha: iso(dayOffset(offset)), proveedor, notas, createdAt: dayOffset(offset).getTime() })

  const now = new Date()
  for (let m = 5; m >= 0; m--) {
    const first = new Date(now.getFullYear(), now.getMonth() - m, 1, 12)
    const off = (d) => Math.round((new Date(first.getFullYear(), first.getMonth(), d, 12) - dayOffset(0)) / 86400000)
    const ok = (d) => off(d) <= 0
    if (ok(1)) exp(off(1), 'Alquiler del consultorio', 'Alquiler', 'gasto', 1500, 'Inmobiliaria')
    if (ok(8)) exp(off(8), 'Luz, agua e internet', 'Servicios (luz, agua, internet)', 'gasto', int(220, 290))
    if (ok(10)) exp(off(10), 'Resinas, adhesivos y anestésicos', 'Materiales e insumos', 'gasto', int(380, 650), 'Dental Perú')
    if (ok(15)) exp(off(15), 'Sueldo asistente dental', 'Personal', 'gasto', 1300)
    if (ok(20) && m % 2 === 0) exp(off(20), 'Guantes, mascarillas y bioseguridad', 'Materiales e insumos', 'gasto', int(150, 260), 'Dental Perú')
    if (ok(22) && m % 2 === 1) exp(off(22), 'Trabajo de laboratorio (coronas/prótesis)', 'Laboratorio dental', 'gasto', int(300, 520), 'Lab. Sonrisa')
    if (ok(25)) exp(off(25), 'Publicidad en Instagram y Facebook', 'Marketing', 'gasto', int(120, 220))
  }
  exp(-150, 'Sillón dental eléctrico', 'Equipos', 'inversion', 9800, 'Equipos Dentales SAC', 'Pago al contado')
  exp(-95, 'Autoclave clase B 18 L', 'Equipos', 'inversion', 3500, 'Equipos Dentales SAC')
  exp(-60, 'Curso de estética dental', 'Capacitación', 'inversion', 1200, 'Colegio Odontológico')
  exp(-33, 'Mantenimiento de compresora', 'Mantenimiento', 'gasto', 280, 'Técnico dental')
  exp(-12, 'Lámpara de fotocurado LED', 'Equipos', 'inversion', 850, 'Dental Perú')
  exp(-3, 'Kit de blanqueamiento (5 pacientes)', 'Materiales e insumos', 'gasto', 540, 'Dental Perú')

  // createdAt del paciente = su primera visita
  const pats = patients.map(({ firstVisit, ...p }) => ({ ...p, createdAt: dayOffset(firstVisit).getTime() - 3600000 }))
  return { patients: pats, services, expenses }
}

const CATALOG = [
  ['Consulta y evaluación', 50],
  ['Limpieza dental (profilaxis)', 120],
  ['Curación con resina', 150],
  ['Extracción simple', 120],
  ['Extracción de tercera molar', 350],
  ['Endodoncia', 450],
  ['Blanqueamiento dental', 600],
  ['Corona', 800],
  ['Prótesis dental', 1200],
  ['Control de ortodoncia', 150],
  ['Radiografía', 40],
]

// ---------- comandos ----------
async function runSeed() {
  const token = await login()
  const { patients, services, expenses } = buildData()
  const writes = [
    ...patients.map(({ id, ...p }) => upsert('patients', id, { ...p, demo: true })),
    ...services.map(({ id, ...s }) => upsert('services', id, { ...s, demo: true })),
    ...expenses.map(({ id, ...x }) => upsert('expenses', id, { ...x, demo: true })),
  ]
  // El catálogo solo se crea si está vacío (y no se marca como demo: sirve de base real).
  const catalog = await listIds(token, 'catalog', false)
  if (!catalog.length) {
    CATALOG.forEach(([nombre, precio], i) => writes.push(upsert('catalog', `cat_${String(i + 1).padStart(2, '0')}`, { nombre, precio })))
  }
  await commit(token, writes)
  console.log(`✔ ${patients.length} pacientes, ${services.length} servicios, ${expenses.length} egresos` + (catalog.length ? '' : `, ${CATALOG.length} servicios en catálogo`))
}

async function runClean() {
  const token = await login()
  const writes = []
  for (const c of ['patients', 'services', 'expenses']) {
    const ids = await listIds(token, c, true)
    ids.forEach((d) => writes.push({ delete: `${DOCS}/${c}/${d}` }))
    console.log(`  ${c}: ${ids.length} registros demo`)
  }
  // Reiniciar el correlativo solo si ningún servicio real tiene boleta (si no, se repetirían números).
  const r = await fetch(`${BASE}/services?pageSize=300`, { headers: { Authorization: `Bearer ${token}` } })
  const realWithBoleta = ((await r.json()).documents ?? []).some(
    (d) => d.fields?.demo?.booleanValue !== true && d.fields?.boletaNumero,
  )
  if (!realWithBoleta) writes.push(upsert('config', 'contadores', { boleta: 0 }))
  await commit(token, writes)
  console.log(
    '✔ Datos demo eliminados (el catálogo se conserva)' +
      (realWithBoleta ? '. El correlativo de boletas NO se reinició porque hay boletas reales.' : ' y correlativo de boletas reiniciado'),
  )
}

const cmd = process.argv[2]
if (cmd === 'seed') await runSeed()
else if (cmd === 'clean') await runClean()
else console.log('Uso: node scripts/demo-data.mjs seed | clean')
