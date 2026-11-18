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

## Publicar en Vercel (recomendado)

La configuración ya está en [`vercel.json`](vercel.json): build de Vite, reescritura de rutas a `index.html`
(para que funcionen enlaces como `/agenda` o `/pacientes/…` al recargar), caché larga para `/assets` y cabeceras de seguridad.

1. Sube los cambios a GitHub (`git push`).
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repositorio `maryfereyes-appweb`.
3. Vercel detecta todo desde `vercel.json`; **no hace falta configurar variables de entorno** (la config web de Firebase es pública
   y la seguridad la dan Authentication + `firestore.rules`). Pulsa **Deploy**.
4. Cada `git push` a `main` vuelve a publicar automáticamente; las ramas generan URLs de vista previa.

Después del primer despliegue (opcional, recomendado):

- **Restringir la API key** a tu dominio: Google Cloud Console → APIs y servicios → Credenciales → la clave "Browser key" →
  *Restricciones de aplicaciones: sitios web* → agrega `https://<tu-proyecto>.vercel.app/*` (y `http://localhost:5173/*` para desarrollo).
- **Quitar los datos de prueba** antes de que la doctora empiece a usarla: `node scripts/demo-data.mjs clean`.
- En el celular: abrir la URL → "Agregar a pantalla de inicio" para usarla como app.

## Publicar (Firebase Hosting, alternativa)

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
