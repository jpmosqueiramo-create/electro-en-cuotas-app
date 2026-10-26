# Validación funcional

Fecha: 2026-10-26. Base remota comprobada: `5b24e6ced827feb9d5fa04ca1854767c97dc6320`.

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Desglose ejemplo $400.000 + $320.000 + $480.000 = $1.200.000; IVA incluido por componente | PASS | `scripts/testContractCommercialPreparation.ts` |
| TypeScript | PASS | `npx tsc --noEmit` |
| ESLint de todos los TS/TSX modificados y nuevos | PASS | `npx eslint <archivos del diff y nuevos>` |
| Build + cierre de fuentes/dependencias del renderizador | PASS | `npm run build` |
| Pricing, routing, manuales, ledger y guardas Auth | PASS | `npm run test:safe` |
| Catálogo: hashes originales, texto completo, compatibilidad, determinismo | PASS | `npx tsx scripts/testOwnerFinalCatalog.ts` |
| Fiscalidad incluida y ausencia de aumento del bruto | PASS | `npx tsx scripts/testFiscalV2.ts` y `testFiscalV2Emulator.ts` |
| Adaptador productivo: firmas, entrega externa, activación única, pagos, reversas, permisos, recuperación | PASS, 32 grupos | `testProductionAdapterEmulator.ts`, políticas externa y aprobación del propietario |
| Revisiones anteriores compatibles, mismo CH e historial inmutable | PASS | `testContractDocumentRevisionEmulator.ts` |
| Panel real en Chromium, escritorio 1280 y móvil 390: datos prellenados, cambio de cuotas con factores guardados, guardar y emitir por rutas reales | PASS | `testSimpleContractIssuanceEmulator.ts`; capturas adjuntas |
| Sin selector técnico ni casilla adicional en emisión | PASS | La misma suite de navegador |
| Cambios sin guardar no persisten ni permiten emitir | PASS | La misma suite de navegador |
| Importes suministrados por navegador y revisión obsoleta rechazados | PASS | La misma suite |
| Guardado concurrente idempotente, nueva conformidad obligatoria, plan corregido de 12 a 8, mismo CH y snapshot anterior intacto | PASS | La misma suite |
| Mandato y pagaré contra el mismo snapshot, texto seleccionable, 12 vencimientos e importes exactos, logos correctos | PASS | Extracción con pypdf y revisión visual de las 4 páginas |
| Escrituras productivas, consumo CH productivo, cambios de Rules/configuración/ARCA | NO EJECUTADOS | Sólo proyecto demo y hosts explícitos de Emulator |

Las suites con escrituras se ejecutaron en Emulator limpio con:

```sh
GCLOUD_PROJECT=demo-cuenta-hogar
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-cuenta-hogar.appspot.com
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
NEXT_PUBLIC_ADMIN_EMAIL=production-review-admin@example.test
```

Se usó `firebase-tools emulators:exec --only firestore,auth,storage --project demo-cuenta-hogar`. Navegador: `SYNTHETIC_INSTALLED_OWNER_PACKAGE_SUITE=1`; adaptador: `SYNTHETIC_EXTERNAL_DELIVERY_SUITE=1 SYNTHETIC_OWNER_APPROVAL_SUITE=1`. Nunca se usaron credenciales o expedientes productivos como fixtures.

## Una operación documentada

Las capturas y los PDF adjuntos corresponden a la misma primera edición del caso sintético CH-000002: capital $580.000, servicios brutos $464.000, financiación bruta $696.000, total $1.740.000, 12 cuotas de $145.000. Servicios netos $383.471,07 e IVA $80.528,93; financiación neta $575.206,61 e IVA $120.793,39. El snapshot sintético adjunto contiene los doce vencimientos y el digest exacto para contrastar los PDF. Todas las páginas indican DOCUMENTO DE PRUEBA — SIN VALIDEZ CONTRACTUAL O FISCAL porque se generaron en Emulator. La ruta productiva sigue generando instrumentos definitivos mediante los motores vigentes.

Después de capturar esa edición, la prueba modifica el plan a 8 cuotas y verifica una nueva edición con el mismo CH, sin reemplazar el snapshot anterior. No se mezclan sus PDF con los de la primera edición.

## Límites y publicación

La UI anterior y el motor compartido ya conservaban una denegación de lectura de alertas del dashboard para el administrador sintético del navegador. No afecta las rutas de contrato verificadas y no se cambiaron Rules para ocultarla. No se comprobó este cambio en producción: requiere revisión, merge manual, publicación del SHA autorizado y preparación/instalación autorizada del paquete técnico V4. Sus cláusulas y hashes originales se conservan; el hash del renderizador y del paquete cambia por la representación económica añadida. No se migra ni modifica un paquete productivo desde los tests.

La validación comprueba cálculos y circuito de software con la política del propietario. No registra una aprobación profesional, factura fiscal ni CAE. El desglose por conceptos redondea netos e IVA a centavos por línea; no sustituye comprobantes fiscales existentes ni recalcula su impuesto agregado.

## Aceptación manual posterior a la publicación

1. Abrir una operación aceptada y «Confeccionar contrato y pagaré».
2. Revisar datos prellenados; elegir cuotas y vencimientos; completar lugar de emisión.
3. Guardar datos del contrato. Si cambiaron condiciones confirmadas, registrar la conformidad realmente recibida.
4. Pulsar «Emitir contrato y pagaré». Abrir ambos documentos; comprobar mismo CH y total.
5. Continuar al portal y a logística. La activación de cuotas sigue requiriendo firmas, custodia y evidencia externa de entrega.

No se ejecutó ninguna emisión real para esta aceptación.
