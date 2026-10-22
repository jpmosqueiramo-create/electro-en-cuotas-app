# Preparación de documentos contractuales — evolución incremental V2

Base: `9f25f5da086d79d8a5c6b6718b6dbcc2623af887` (build publicado 008).
Esta evolución sólo prepara borradores. Revisión jurídica pendiente; no emite
instrumentos definitivos, números CH, firmas, entregas ni cobranza productiva.

## Matriz de campos y fuentes

| Campo | Fuente canónica / destino | Edición y validación |
| --- | --- | --- |
| Nombre/contacto/localidad de consulta | Solicitud original; snapshot del presupuesto conserva el dato cotizado | No se sobrescribe al preparar documentos. Se muestra el origen y las discrepancias mediante revisión de identidad existente. |
| Presupuesto, versión, alternativa aceptada | Budget V2 EMITIDO y Acceptance, enlazados por operación | Inmutables; la proyección comprueba IDs y hashes. Nunca se consulta catálogo vivo. |
| Nombre, DNI, domicilio, localidad, provincia, CP, email, WhatsApp | `ContractDraftV2.personalData` → ambos PDF | Formulario y sección administrativa existentes; recepción no aplica datos automáticamente. Validaciones personales vigentes. Pendientes con acceso directo. |
| CUIL, trabajo y domicilio laboral | `ContractDraftV2.employmentData` | Misma sección existente; laborales opcionales. CUIL faltante se señala sin duplicar formulario. |
| Producto / descripción | `acceptedReferenceSnapshot` (coincide con alternativa aceptada) → mandato | Sin edición ni reemplazo por valores actuales del catálogo. |
| Cantidad | Nuevo `ContractDraftV2.productDetails.quantity` → mandato | Opcional por compatibilidad. `null` = pendiente; entero positivo seguro. No se infiere ni se multiplica el capital por esta cantidad. |
| Condición | Nuevo `ContractDraftV2.productDetails.condition` → mandato | `null`, `NEW`, `USED`; decisión explícita administrativa. Nunca inferida del nombre/proveedor/precio. |
| Capital, servicios, total, cantidad e importe de cuotas | `economicTerms` guardado → proyección; total al pagaré | Sólo comandos administrativos y motor vigente. Sin cálculo económico en PDF. Pendiente si no se confirmó. |
| Primera fecha, día mensual, vencimientos e importes | `paymentScheduleDraft` guardado → mandato | Se conserva motor de fechas y puerta crediticia existentes. PDF transcribe fechas/importes. El pagaré no expone cuotas. |
| Identidad / conformidad | Verificación documental y `conformity/current` existentes | No se vinculan identidades por coincidencias. Bloquea preview ante discrepancia o conformidad pendiente. |
| Datos societarios | Configuración central confirmada `legalEntity.ts` | Sin cambios en esta etapa. Misma identificación en ambos documentos. |
| Representación, jurisdicción, lugar/fecha efectiva y aprobación jurídica | Pendientes legales explícitos | No se deducen ni se completan automáticamente. Sin controles administrativos que presuman aprobación legal. |

La estructura aceptada vigente no contiene cantidad ni condición inequívocas;
por ello permanecen pendientes hasta una acción administrativa explícita.

## Persistencia, conformidad y compatibilidad

Se reutiliza `POST .../contract` con `UPDATE_PRODUCT_DETAILS`, `commandId` y
`expectedRevision`. Sólo Administración. La transacción guarda borrador,
comando, evento antes/después y, ante un cambio de producto, la invalidación de
conformidad. No escribe presupuesto, Acceptance, solicitud, carpeta del cliente
ni snapshot aceptado. Replays idénticos recuperan resultado; conflictos se
rechazan. READY exige volver explícitamente a borrador antes de editar.

Por prudencia se considera material toda incorporación o cambio de cantidad o
condición: requiere referencia de nueva conformidad recibida. No se presume
consentimiento. El comando existente de conformidad requiere plan y cronograma
completos; un producto guardado con economía pendiente no habilita el PDF hasta
completar esos requisitos y registrar conformidad. La interfaz explica el estado.

Los borradores históricos no reciben valores por lectura. La ausencia de
`productDetails` conserva exactamente los digests históricos de condiciones y
revisión READY. Cuando existe, se incluye en ambos digests y en la revisión
persistida. La validación READY conserva el validador estricto del origen y
valida separadamente el añadido de producto. No se modifica el schema del
snapshot definitivo: su validador estricto sigue rechazando este campo nuevo en
el circuito Emulator de congelamiento. Integrarlo allí requerirá una evolución
explícita futura antes de cualquier habilitación; no se omite silenciosamente.

Ambos PDF usan una sola proyección de la revisión persistida y un mismo hash de
origen. Guardar incrementa revisión; el componente existente revoca URLs blob,
oculta previews anteriores y vuelve a consultar la versión guardada. Los cambios
sin guardar no se incorporan a los PDF ni al resumen de información guardada.

## Interfaz

Resumen «Preparación de documentos» con datos personales, producto, economía,
cronograma, identidad/conformidad y revisión jurídica. Accesos abren y enfocan
las secciones existentes. Cantidad y condición se incorporan a «Operación
aceptada»; no hay un segundo formulario. Los pendientes jurídicos se separan de
campos operativos que Administración sí puede completar.

## Verificación y artefactos

- Runner nuevo: `scripts/testContractProductPreparationEmulator.ts`.
- Browser ampliado: `scripts/runOperationDraftDocumentsBrowser.ts` con fixtures
  sintéticos, desktop 1280×900 y mobile 390×844.
- Comandos de Emulator: proyecto `demo-cuenta-hogar`, Firestore 8080, Auth 9099,
  Storage 9199 explícitos; nunca producción. El runner nuevo usa un email admin
  sintético diferente al de las regresiones para evitar colisión de fixtures.
- Muestras y capturas: `docs/evidence/contract-document-preparation/`.
- Resultados finales se registran tras ejecutar gates. No hay migración, cambios
  de Rules, IAM, secretos, configuración ni escrituras productivas.

## Resultados ejecutados

| Verificación | Resultado |
| --- | --- |
| TypeScript y ESLint diferencial | PASS |
| `npm run test:safe` | PASS |
| `npm run build` | PASS |
| Producto: validación, CAS, replay/concurrencia, auditoría, identidad/roles | PASS en Emulator |
| Cliente completo/incompleto y borrador histórico sin mutaciones por lectura | PASS en Emulator |
| Preview documental, errores seguros e integridad de origen | PASS en Emulator |
| READY: revisión, idempotencia, concurrencia y bloqueo de edición | PASS en Emulator |
| Documentos desde snapshot C1 sintético existente | PASS en Emulator |
| Navegador 1280×900 y 390×844: navegación, guardado, nueva revisión, conformidad y URLs antiguas invalidadas | PASS |
| PDF seleccionable, cantidad/condición, mismo hash/revisión, total y ocho fechas exactos, pagaré sin cuotas | PASS |
| Inspección visual de las tres páginas del mandato, pagaré y capturas | PASS |

La ejecución conjunta inicial requirió separar cuentas Auth sintéticas y ordenar
READY antes de la suite que crea un snapshot de prueba. El runner browser se
ajustó al marcado de etiquetas y corrigió un escape en su assertion; no se
eliminaron assertions. Los logs `409`/`500` esperados corresponden a fixtures de
origen inconsistente, identidad/conformidad y texto no soportado, con recuperación
validada. Ninguna prueba utilizó datos o servicios productivos.

### Archivos funcionales

- `src/lib/contractV2.ts`, `contractV2Server.ts`, `contractReadyV2.ts`.
- `src/lib/contractDocuments/operationDraft.ts`, `operationDraftServer.ts`, `operationDraftPdf.ts`.
- `src/components/admin/contracts/ContractV2Composer.tsx`, `OperationDocumentPreviews.tsx`.
- Nuevos `ContractDocumentPreparation.tsx` y `contractSectionNavigation.ts` en ese mismo directorio.
- Runner Emulator nuevo, ampliación del runner browser y verificación Python de PDF.

Sin cambios en campos o tokens del formulario público, motores económicos,
aceptaciones, snapshot definitivo, contratos históricos o bloqueos productivos.
