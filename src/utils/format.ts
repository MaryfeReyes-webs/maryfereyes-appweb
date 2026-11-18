import { data } from '@/stores/data'

export function money(n: number | undefined | null): string {
  const v = Number(n) || 0
  return `${data.settings.moneda} ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Fecha local en formato YYYY-MM-DD (sin desfases de zona horaria). */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return isoDate()
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function prettyDate(iso: string | undefined): string {
  if (!iso) return '—'
  return parseIso(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function longDate(iso: string): string {
  return parseIso(iso).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, 1).toLocaleDateString('es-PE', { month: 'short', year: '2-digit' })
}

export function age(iso: string | undefined): string {
  if (!iso) return ''
  const b = parseIso(iso)
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a >= 0 ? `${a} años` : ''
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function boletaCode(n: number | undefined): string {
  return n ? `B001-${String(n).padStart(6, '0')}` : ''
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}
