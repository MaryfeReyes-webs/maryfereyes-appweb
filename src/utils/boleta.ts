import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ClinicSettings, Patient, Service } from '@/types'
import { boletaCode, money, prettyDate } from '@/utils/format'

const FUCSIA: [number, number, number] = [216, 27, 96]
const ROSA: [number, number, number] = [252, 228, 236]
const CREMA: [number, number, number] = [255, 248, 240]
const TEXTO: [number, number, number] = [74, 35, 55]

export function buildBoletaPdf(service: Service, patient: Patient | undefined, s: ClinicSettings): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a5' })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const M = 12

  // Fondo crema y cabecera fucsia
  pdf.setFillColor(...CREMA)
  pdf.rect(0, 0, W, H, 'F')
  pdf.setFillColor(...FUCSIA)
  pdf.rect(0, 0, W, 34, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text(s.nombre || 'maryfereyes', M, 15)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  const info = [s.profesional, [s.direccion, s.telefono && `Tel. ${s.telefono}`].filter(Boolean).join(' · ')]
    .filter(Boolean)
    .join('\n')
  pdf.text(info, M, 21)

  // Recuadro de número de boleta
  const boxW = 46
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(W - M - boxW, 7, boxW, 20, 2, 2, 'F')
  pdf.setTextColor(...FUCSIA)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.text(s.ruc ? `RUC ${s.ruc}` : 'COMPROBANTE', W - M - boxW / 2, 12.5, { align: 'center' })
  pdf.setFontSize(9)
  pdf.text('BOLETA DE VENTA', W - M - boxW / 2, 17.5, { align: 'center' })
  pdf.setFontSize(10)
  pdf.text(boletaCode(service.boletaNumero) || 'B001-—', W - M - boxW / 2, 23, { align: 'center' })

  // Datos del paciente
  let y = 44
  pdf.setTextColor(...TEXTO)
  pdf.setFontSize(9)
  const row = (label: string, value: string, x: number) => {
    pdf.setFont('helvetica', 'bold')
    pdf.text(label, x, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(value || '—', x + 22, y)
  }
  row('Paciente:', service.patientName, M)
  y += 6
  row('Documento:', patient?.documento ?? '', M)
  row('Fecha:', prettyDate(service.fecha), W / 2 + 6)
  y += 6
  row('Teléfono:', patient?.telefono ?? '', M)
  row('Pago:', service.metodoPago ?? '', W / 2 + 6)

  // Detalle
  const detalle = [service.piezas && `Pieza(s): ${service.piezas}`, service.tratamiento]
    .filter(Boolean)
    .join(' — ')
  autoTable(pdf, {
    startY: y + 7,
    margin: { left: M, right: M },
    head: [['Descripción', 'Importe']],
    body: [[detalle ? `${service.servicio}\n${detalle}` : service.servicio, money(service.costo)]],
    theme: 'grid',
    styles: { fontSize: 9, textColor: TEXTO, lineColor: [240, 190, 210], lineWidth: 0.2, cellPadding: 3 },
    headStyles: { fillColor: FUCSIA, textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fillColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'right', cellWidth: 32 } },
  })

  // Totales
  const lastY = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  y = lastY + 8
  const saldo = Math.max(0, service.costo - service.pagado)
  const tot = (label: string, value: string, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(bold ? 11 : 9)
    pdf.text(label, W - M - 34, y, { align: 'right' })
    pdf.text(value, W - M, y, { align: 'right' })
    y += bold ? 7 : 5.5
  }
  pdf.setFillColor(...ROSA)
  pdf.roundedRect(W / 2 - 4, y - 5, W / 2 + 4 - M + 2, saldo > 0 ? 25 : 19, 2, 2, 'F')
  pdf.setTextColor(...TEXTO)
  tot('Total:', money(service.costo), true)
  tot('Pagado:', money(service.pagado))
  if (saldo > 0) {
    pdf.setTextColor(...FUCSIA)
    tot('Saldo pendiente:', money(saldo))
    pdf.setTextColor(...TEXTO)
  }

  // Pie
  pdf.setDrawColor(...FUCSIA)
  pdf.setLineWidth(0.4)
  pdf.line(M, H - 22, W - M, H - 22)
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(9)
  pdf.setTextColor(...FUCSIA)
  pdf.text('¡Gracias por confiar en nosotros! Tu sonrisa es nuestra prioridad.', W / 2, H - 15, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(150, 120, 135)
  pdf.text(`Emitido el ${new Date().toLocaleString('es-PE')}`, W / 2, H - 10, { align: 'center' })

  return pdf
}

export function boletaFileName(service: Service): string {
  const code = boletaCode(service.boletaNumero) || 'boleta'
  const name = service.patientName.replace(/[^\p{L}\p{N}]+/gu, '_')
  return `${code}_${name}.pdf`
}

/** Normaliza el teléfono al formato internacional que pide wa.me (solo dígitos). */
export function whatsappNumber(phone: string, countryCode: string): string {
  let digits = phone.replace(/\D/g, '')
  if (phone.trim().startsWith('+')) return digits
  digits = digits.replace(/^0+/, '')
  const cc = countryCode.replace(/\D/g, '')
  if (cc && !digits.startsWith(cc)) digits = cc + digits
  return digits
}

export function whatsappMessage(service: Service, s: ClinicSettings): string {
  const saldo = Math.max(0, service.costo - service.pagado)
  return [
    `Hola ${service.patientName.split(' ')[0]} 😊`,
    `Te enviamos tu boleta ${boletaCode(service.boletaNumero)} de *${s.nombre}*.`,
    `Servicio: ${service.servicio}`,
    `Total: ${money(service.costo)} · Pagado: ${money(service.pagado)}${saldo > 0 ? ` · Saldo: ${money(saldo)}` : ''}`,
    '¡Gracias por tu visita! 🦷✨',
  ].join('\n')
}
