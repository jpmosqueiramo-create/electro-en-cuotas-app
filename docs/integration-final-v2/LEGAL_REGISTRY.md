# Registro de aprobación documental por versión

Acceso: Administración → Documentación → Aprobación documental. API administrativa `/api/admin/aprobaciones-documentales`.

Se conserva la declaración del titular sobre los originales identificados como OWNER_REPORTED. No se inventan fecha, profesional ni evidencia; los datos parciales disponibles pueden registrarse sin promover la declaración a VERIFIED. VERIFIED exige fecha válida no futura, profesional y referencia de su validación. La confirmación administrativa identifica versión y hash exactos; registrar una referencia no habilita emisión.

Cada plantilla técnica posee hash SHA-256 del contenido canónico de sus cláusulas/texto, identificación societaria, tipo y versión. Los originales se identifican por SHA-256 de sus bytes, con origen y semántica separados. Es un hash del texto de plantilla, distinto del hash del PDF particular, renderer o snapshot económico. Las versiones históricas de referencia y las propuestas de `docs/legal-review` no reciben aprobación por asociación.

Persistencia inmutable: `presupuestos_v2/_legal_registry_v1/contracts/registry/records/{commandId}`. El subtree existente es exclusivamente de servidor bajo las Rules actuales. Cada registro guarda actor, fecha del servidor, tipo, versión, hash, clasificación, fecha de aprobación, profesional, referencia y evidencia privada opcional. Un commandId idéntico devuelve el registro previo; otro payload o actor con ese ID es rechazado. No se escribe un registro por consultar la pantalla.

La evidencia opcional recibida por API debe estar bajo `legal-approvals/{id}/{archivo}`, sin tokens de descarga, con generación exacta y SHA-256 coincidente. Se verifica tamaño máximo de 10 MiB, contenido y generación antes/después, fuera de transacciones Firestore. El registro fija esa generación; no crea URLs públicas ni uploads. La pantalla inicial permite registrar la referencia profesional sin archivo; no se implementa un cargador nuevo que duplique el archivo documental existente.

`legalIssuanceAssessment` comprueba ambas versiones exactas, registros profesionales válidos, ausencia de pendientes y datos formales completos. Devuelve siempre emisión productiva deshabilitada: no existe un flag que transforme esta validación en autorización. Los templates actuales conservan pendientes y advertencia de borrador. Se requiere una implementación y autorización productiva independiente para emitir.

Pruebas: identidad/hash distinto bloquea, declaración no sustituye validación, fechas inválidas rechazadas, campos formales pendientes bloquean, concurrencia y replay sin updateTime, evidencia privada válida/hash falso, API sin sesión o con usuario cliente rechazada. Sólo demo-cuenta-hogar; no hay migración, cambios de Rules ni escrituras productivas.

Resultados ejecutados: modelo puro PASS; Emulator con evidencia Storage sintética PASS; navegador administrativo desktop/mobile y registro de declaración PASS; TypeScript, ESLint diferencial, build y test:safe PASS. Capturas en `docs/evidence/legal-approval-registry/`. Los datos creados por el runner nunca acreditan aprobación jurídica real.

Actualización de integración: main `e39186b1495940539b9137a91659b53d48160e0e`, con #74 conservado. Sin conflictos textuales ni cambios de validación jurídica. Revalidado junto a #76/#77 en `9cda5b03f0a463d5d792e979ed10ffca64312f6d`: TypeScript, ESLint diferencial, build, test:safe, Emulator jurídico y navegador desktop/mobile PASS. Ninguna declaración o registro administrativo habilita emisión definitiva.

## Actualización contra main 49cc1d0

Se integraron PR74/76/77 sin conflictos. Ver [procedencia y matriz de originales](ORIGINALS_MATRIX.md). La declaración del propietario se refiere a los originales identificados, no a la última plantilla técnica. El selector muestra cuatro referencias separadas; no se copia ni transforma ningún archivo histórico.

### Validación de esta actualización

| Verificación | Resultado |
|---|---|
| TypeScript; ESLint diferencial; build; test:safe | PASS |
| Modelo jurídico: hashes, fuentes, declaración parcial, no transferencia de aprobación | PASS |
| Emulator jurídico: concurrencia, replay/updateTime, auditoría, permisos, evidencia privada, referencias inconsistentes | PASS |
| Recorrido integral y controles de contrato/entrega | PASS |
| Revocación de cliente (#74), fiscal/IVA incluido (#76), finanzas y afiliados | PASS |
| Navegador tres portales (#77): reconexión, respuestas antiguas, paginación, acceso cruzado | PASS |
| Navegador registro jurídico desktop/mobile; desbordamientos | PASS / 0 |
| Regresiones PDF 1..18 cuotas y comparación exacta snapshot/PDF de 12 cuotas | PASS |

Comandos: `npx tsc --noEmit`, `npx eslint` sobre los seis archivos TypeScript modificados, `npm run build`, `npm run test:safe`, `tsx scripts/testLegalApprovalV2.ts`, `tsx scripts/testOperationDraftDocuments.ts`, `tsx scripts/testFiscalV2.ts`. Suites Emulator: `testV2IntegralJourney`, `testContractDeliveryFinancialControls`, `testOperationClientV2Emulator`, `testLegalApprovalEmulator`, `testFiscalV2Emulator`, `testOperationFinancialV2Emulator`, `testAffiliateIntegrationV2Emulator`. Navegador: `testOperationFinancialV2Browser`, `testLegalApprovalBrowser` con Next local, Auth/Firestore/Storage Emulator y proyecto demo-cuenta-hogar. Evidencias y hashes de logs: `docs/evidence/legal-approval-registry/validation.json`.

Los originales fueron además inspeccionados visualmente en sus cinco páginas. Los PDFs históricos y las plantillas técnicas no se modificaron. No hay migración, nuevos permisos ni cambios fiscales/financieros; los registros históricos sin procedencia siguen legibles, sin reescritura. Cero escrituras productivas.
