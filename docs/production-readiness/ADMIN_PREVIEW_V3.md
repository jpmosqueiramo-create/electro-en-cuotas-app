# Preview administrativo V3

Baseline: `e3c754309bd1d440dabd4c21cf64ee7b9ec59b60`.

## Causa y corrección

El endpoint administrativo llamaba a `renderOriginalReview` sin seleccionar plantilla; su valor predeterminado conserva V1 para reproducir históricos. Ahora selecciona explícitamente `clientPaymentPlaceReviewTemplates()` y entrega la conformidad leída junto con el borrador en la misma transacción de lectura. La generación PDF ocurre fuera de esa transacción.

Se exige conformidad económica vigente, evidencia y hash del domicilio completo coincidente. Ausencia de conformidad, domicilio incompleto o consentimiento histórico sin hash de domicilio bloquean la nueva vista previa. No se migran datos ni se reescriben documentos históricos. El remito y el renderer predeterminado histórico no cambian.

## Validación ejecutada

- PASS: TypeScript, ESLint diferencial sin diagnósticos, build y `npm run test:safe`.
- PASS: `testClientPaymentPlaceProposal.ts` (7 grupos), `testZeroPenaltyDocumentProposal.ts` (10 grupos), `testProductionRendererManifest.ts`.
- PASS en Firebase Emulator demo-cuenta-hogar: `testClientPaymentPlaceEmulator.ts` (8 grupos), `testContractProductPreparationEmulator.ts`, `testOperationDraftDocumentsEmulator.ts`, `testOperationDraftPreviewErrorsEmulator.ts`, `testOriginalDocumentIntegrationEmulator.ts`.
- PASS: `testOperationDraftDocumentsBrowser.ts` en localhost, desktop 1280 y mobile 390: HTTP real, conformidad, dirección modificada, permisos, errores seguros y ausencia de desbordamiento.
- PASS: `verifyAdminPreviewV3Pdfs.py`, 68 comprobaciones sobre seis PDF recibidos por HTTP. Se revisaron visualmente las cinco páginas de los tres ejemplares completos mediante Poppler.

El caso completo conserva capital $580.000, servicios brutos $1.160.000, total/pagaré $1.740.000 y doce cuotas de $145.000, del 05/12/2026 al 05/11/2027. La propuesta no instala aprobación jurídica ni calcula tasas/CFT inexistentes.

Una ejecución inicial compartida entre suites encontró colisión de identidad del fixture `p3-shared-id`; las suites afectadas se ejecutaron en emuladores limpios y pasaron, conservando las aserciones negativas. El listener preexistente de alertas de Hoy registra denegación de permisos con el administrador sintético; no se ampliaron Rules. El visor PDF embebido de Chrome headless se muestra vacío: se verificaron los bytes HTTP y todas las páginas renderizadas con Poppler, sin atribuir un PASS visual a ese visor.

## Evidencias

En `output/pdf/admin-preview-v3/`: capturas desktop/mobile, tres PDF exclusivamente sintéticos y hashes SHA-256. Todos muestran BORRADOR — NO VÁLIDO PARA FIRMA. El pagaré no tiene logo. Los PDF se obtuvieron del endpoint probado, no de una generación alternativa.

## Publicación posterior

Sin merge ni deploy en esta tarea. Después del merge manual, verificar el SHA resultante y repetir el preflight. Con autorización de ese SHA:

```sh
npx firebase-tools apphosting:rollouts:create cuenta-hogar --project negocio-facil-page --git-commit <SHA_MERGE_APROBADO>
```

Mantener PRODUCTION_OPERATIONS_ENABLED ausente/false, laboratorio deshabilitado, catálogo definitivo sin instalar y CH sin consumo. Smoke exclusivamente de lectura con conformidad vigente. No se modificaron Rules, permisos, configuración, motores económicos ni datos productivos.
