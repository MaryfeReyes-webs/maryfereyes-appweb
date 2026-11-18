# maryfereyes · Gestión del consultorio dental

App web (Vue 3 + Vite + TypeScript + Firebase) para la gestión contable y clínica del consultorio:
pacientes con historia clínica, servicios/citas, boletas en PDF por WhatsApp, egresos (inversiones y
gastos), contabilidad general y dashboard.

## Acceso

- **Usuario:** `admin` · **Contraseña:** `admin123`
- Internamente Firebase Auth usa el correo `admin@maryfereyes.app` (el usuario nunca lo ve).
- "Mantener sesión iniciada" guarda la sesión en el navegador y el usuario en una cookie (`mfr_usuario`, 30 días).
- Para crear otro usuario: Firebase Console → Authentication → Add user → `<usuario>@maryfereyes.app`.

## Puesta en marcha (una sola vez)

1. **Reglas de Firestore** — Firebase Console → Firestore Database → *Reglas* → pega el contenido de
   [`firestore.rules`](firestore.rules) → *Publicar*. (o `firebase deploy --only firestore:rules` con la cuenta dueña del proyecto)
2. **Authentication** → método *Correo electrónico/contraseña* habilitado (ya lo está; el usuario admin ya fue creado).

## Desarrollo

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + build a dist/
```

## Datos de prueba

```sh
node scripts/demo-data.mjs seed    # crea pacientes, servicios, egresos y catálogo de ejemplo
node scripts/demo-data.mjs clean   # borra solo los datos demo (demo: true) antes de usar la app en serio
```

Los teléfonos demo son falsos (`000 000 0xx`); edita un paciente con tu número para probar el envío por WhatsApp.

## Publicar (Firebase Hosting)

```sh
firebase login            # con la cuenta dueña de maryfereyes-appweb
npm run build
firebase deploy           # sube hosting + reglas
```

## Estructura de datos (Firestore)

| Colección  | Contenido |
|------------|-----------|
| `patients` | Datos personales y antecedentes médicos (alergias, enfermedades, medicamentos) |
| `services` | Cada atención o cita: paciente, servicio, fecha/hora, costo, pagado, estado, diagnóstico, tratamiento, piezas, n° de boleta |
| `expenses` | Egresos: concepto, categoría, tipo (`inversion`/`gasto`), monto, fecha |
| `catalog`  | Catálogo de servicios con precio sugerido |
| `config`   | `clinica` (datos de la boleta) y `contadores` (correlativo de boletas) |

**Ingresos** = monto pagado de servicios no cancelados. **Por cobrar** = costo − pagado de servicios realizados.

## Boleta por WhatsApp

WhatsApp no permite adjuntar archivos mediante un enlace, así que la app ofrece:

- **Enviar por WhatsApp** (PC): descarga el PDF y abre el chat del paciente con el mensaje listo; solo falta arrastrar el PDF.
- **Compartir PDF** (celular): abre el menú de compartir del sistema con el PDF adjunto → elegir WhatsApp → contacto.

El envío 100 % automático requeriría la API de WhatsApp Business (Meta) y un backend.
