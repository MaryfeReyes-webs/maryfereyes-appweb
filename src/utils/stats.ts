import type { Expense, Service } from '@/types'
import { monthKey } from '@/utils/format'

export interface Period {
  from: string // YYYY-MM-DD inclusive ('' = sin límite)
  to: string
}

export const inPeriod = (fecha: string, p: Period) => (!p.from || fecha >= p.from) && (!p.to || fecha <= p.to)

/** Ingreso real = lo efectivamente pagado en servicios no cancelados. */
export const activeServices = (services: Service[]) => services.filter((s) => s.estado !== 'cancelado')

export const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((a, r) => a + (Number(f(r)) || 0), 0)

/** Deuda real: solo existe si el servicio ya se realizó (una cita agendada aún no se debe). */
export function balanceOf(s: Service): number {
  return s.estado === 'completado' ? Math.max(0, (s.costo || 0) - (s.pagado || 0)) : 0
}

export function summary(services: Service[], expenses: Expense[], p: Period) {
  const sv = activeServices(services).filter((s) => inPeriod(s.fecha, p))
  const ex = expenses.filter((e) => inPeriod(e.fecha, p))
  const ingresos = sum(sv, (s) => s.pagado)
  const inversiones = sum(
    ex.filter((e) => e.tipo === 'inversion'),
    (e) => e.monto,
  )
  const gastos = sum(
    ex.filter((e) => e.tipo !== 'inversion'),
    (e) => e.monto,
  )
  const egresos = inversiones + gastos
  return {
    services: sv,
    expenses: ex,
    ingresos,
    facturado: sum(sv, (s) => s.costo),
    porCobrar: sum(sv, balanceOf),
    inversiones,
    gastos,
    egresos,
    balance: ingresos - egresos,
    atenciones: sv.filter((s) => s.estado === 'completado').length,
  }
}

export function groupSum<T>(rows: T[], key: (r: T) => string, val: (r: T) => number) {
  const m = new Map<string, { key: string; total: number; count: number }>()
  for (const r of rows) {
    const k = key(r) || 'Sin especificar'
    const cur = m.get(k) ?? { key: k, total: 0, count: 0 }
    cur.total += Number(val(r)) || 0
    cur.count++
    m.set(k, cur)
  }
  return [...m.values()].sort((a, b) => b.total - a.total)
}

/** Últimos N meses (incluido el actual) con ingresos y egresos. */
export function monthlySeries(services: Service[], expenses: Expense[], months = 6) {
  const keys: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = months - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    keys.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`)
  }
  const inc = new Map(keys.map((k) => [k, 0]))
  const exp = new Map(keys.map((k) => [k, 0]))
  for (const s of activeServices(services)) {
    const k = monthKey(s.fecha)
    if (inc.has(k)) inc.set(k, (inc.get(k) ?? 0) + (s.pagado || 0))
  }
  for (const e of expenses) {
    const k = monthKey(e.fecha)
    if (exp.has(k)) exp.set(k, (exp.get(k) ?? 0) + (e.monto || 0))
  }
  return keys.map((k) => ({ key: k, ingresos: inc.get(k) ?? 0, egresos: exp.get(k) ?? 0 }))
}

export function topPatients(services: Service[], limit = 5) {
  const m = new Map<string, { patientId: string; name: string; visits: number; total: number; last: string }>()
  for (const s of activeServices(services)) {
    const cur = m.get(s.patientId) ?? { patientId: s.patientId, name: s.patientName, visits: 0, total: 0, last: '' }
    cur.visits++
    cur.total += s.pagado || 0
    if (s.fecha > cur.last) cur.last = s.fecha
    m.set(s.patientId, cur)
  }
  return [...m.values()].sort((a, b) => b.visits - a.visits || b.total - a.total).slice(0, limit)
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const v = String(c ?? '')
          return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
        })
        .join(','),
    )
    .join('\n')
}

export function downloadText(name: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
