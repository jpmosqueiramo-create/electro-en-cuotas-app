# Consulta pública → bandeja administrativa

Base: `7c7bb783a4e97d68f71f0fa608e0b2e96b9d37af`.

## Causas comprobadas

- El CTA principal «Quiero recibir una propuesta» de la landing abría WhatsApp directamente. No pasaba por el formulario ni por `POST /api/public/solicitudes`.
- Solicitudes se cargaba una sola vez al montar la página. Una bandeja abierta podía seguir mostrando resultados anteriores.
- Clientes leía las colecciones directamente, fusionaba registros por DNI/email y no consultaba el estado de retiro utilizado por Solicitudes. Un registro retirado podía continuar apareciendo en ese directorio.

## Corrección

El CTA principal abre `#contacto`, con los cuatro datos existentes. El envío conserva la API, recibo persistido, control de doble envío, identidad de reintento, captura del catálogo/plan y apertura de WhatsApp sólo después de la confirmación del servidor.

La bandeja agrega «Actualizar bandeja» y actualiza al recuperar foco, visibilidad o conexión. Conserva filtros, errores por fuente, cancelación y protección frente a respuestas antiguas.

Clientes consulta las mismas páginas administrativas autorizadas de Solicitudes, incluida su marca de retiro. No crea perfiles, no fusiona identidades y no reescribe registros. Sus accesos conservan colección e ID. La proyección administrativa agrega datos opcionales de ocupación, antigüedad y referente desde sus campos existentes; no hay cambios de schema Firestore ni nuevas escrituras.

## Evidencia ejecutada

| Comprobación | Resultado | Entorno |
| --- | --- | --- |
| TypeScript | PASS | `npx tsc --noEmit` |
| ESLint diferencial | PASS: cero errores y cero diagnósticos nuevos | Archivos modificados |
| Build / manifiesto del renderer | PASS | `npm run build` |
| Suites seguras | PASS | `npm run test:safe` |
| Sender, doble clic, respuesta perdida y compatibilidad | PASS | `scripts/testPublicSolicitudes.ts` |
| Read model y errores parciales | 21/21 PASS | `scripts/testAdminSolicitudesReadModel.ts` |
| Persistencia pública, concurrencia, catálogo y fallos | PASS | `scripts/testPublicSolicitudesEmulator.ts`, Emulator |
| Permisos, revocación, paginación y fechas | 10 comprobaciones PASS | `scripts/testAdminSolicitudesAuthorizedEmulator.ts`, Emulator limpio |
| Landing y catálogo → POST HTTP → bandeja → detalle | PASS | Navegador real local, 1280 y 390 px |
| Doble submit y replay con updateTime intacto | PASS | Mismo recorrido, Emulator |
| Registro retirado ausente en Clientes | PASS | Mismo recorrido, Emulator |
| Nueva consulta visible al recuperar foco | PASS | Mismo recorrido, Emulator |
| Desbordamiento y conexiones Firebase externas | PASS: sin desbordamiento global ni Firebase externo | Desktop/mobile |

Las nueve advertencias de `HomeTechCatalog.tsx` (cinco imports sin uso y cuatro imágenes HTML) ya existen en la base; comparación por regla, severidad y mensaje. No se modificaron reglas de lint.

### Reproducción

Para suites de escritura, seleccionar explícitamente `GCLOUD_PROJECT=demo-cuenta-hogar`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` y `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, sin credenciales productivas.

```sh
NEXT_PUBLIC_ADMIN_EMAIL=solicitudes-admin@example.test npx firebase-tools emulators:exec \
  --only firestore,auth --project demo-cuenta-hogar \
  'npx tsx scripts/testPublicSolicitudesEmulator.ts && npx tsx scripts/testPublicRequestInboxBrowser.ts'
```

La suite de permisos requiere un Emulator limpio y `NEXT_PUBLIC_ADMIN_EMAIL=production-review-admin@example.test`. El runner de navegador inicia y detiene Next local, usa un perfil efímero de Chrome y bloquea la navegación externa a WhatsApp. Capturas y resultados contienen exclusivamente datos sintéticos.

## Alcance

No cambia motores económicos, contratos, permisos, Rules, catálogo documental, numeración ni configuración. No hace merge ni deploy. El script local protegido `scripts/testBudgetV2HttpIdempotency.ts` queda fuera del commit.

La limpieza productiva solicitada por el propietario es una operación independiente, confirmada mediante manifiesto exacto. Sus rutas, metadatos y comprobantes privados se conservan localmente y no se incorporan a este PR. Las escrituras de estas suites corresponden exclusivamente a Emulator.
