# Limpieza controlada de expedientes de prueba V2

## Alcance y seguridad

Nueva modalidad `Eliminar expediente de prueba` dentro del diálogo de eliminación existente, accesible desde el historial y desde el presupuesto abierto. La eliminación normal conserva sus reglas anteriores.

La clasificación como prueba exige una declaración administrativa explícita y un motivo; nunca se deduce del nombre. PREVIEW no escribe. DELETE_TEST vuelve a inventariar y compara huellas de paths, existencia y updateTime. La transacción crea el tombstone/auditoría permanente y elimina exclusivamente los paths permitidos. El mismo comando recupera el resultado anterior; otro comando o actor entra en conflicto. SAVE y Acceptance conservan su bloqueo frente al tombstone.

Se permiten únicamente familia, versiones, comandos, Acceptance, documentación vacía, borrador técnico, READY técnico histórico verificable y una asignación inicial sin movimientos físicos, con su índice propio coherente. Una revisión documental/crediticia ya realizada, conformidad, formularios recibidos, firmas, snapshots definitivos, numeración, pagos, comisiones, liquidaciones, entrega, movimientos físicos, archivos o esquemas desconocidos bloquean la modalidad. READY técnico no acredita firma, aprobación legal ni contrato definitivo.

Solicitudes, productos privados o compartidos, perfiles de vendedores, historial externo, archivos y auditorías se conservan. No hay borrado recursivo ni eliminación de Storage. Las relaciones compartidas sólo se conservan; los índices inesperados, huérfanos o inconsistentes bloquean.

El inventario de cada familia y de cada índice global está acotado a 180 referencias; máximo 10 versiones y 30 resultados por consulta externa. Superar un límite o no poder leer Storage bloquea la limpieza. El índice global acotado evita depender de nuevos índices de colección-grupo; a mayor volumen requiere un inventario específico, no una ampliación automática.

Storage se lista fuera de la transacción Firestore. Cualquier archivo, incluso sin reserva en Firestore, bloquea. Las APIs de carga reservan registros y leen Acceptance/identidad/documentación; esas lecturas compartidas y el inventario transaccional serializan las escrituras de aplicación. No existe una transacción distribuida Firestore/GCS: cambios manuales externos concurrentes requieren suspender y revalidar. No se toca ningún byte.

## Inventario productivo de lectura

Proyecto: `negocio-facil-page`. Revisión: `2026-10-22T02:02:22.374Z`. Base: `9a5a8ef1a7ec054a5244d2dc84e045138fe47cc0`. Cero escrituras productivas en esta tarea.

| Familia | Nombre de prueba | Registros propios | Índices propios | Clasificación |
| --- | --- | ---: | ---: | --- |
| `14b82cff-5c72-438b-8bac-a69fd7ef4d0b` | JUAN | 15 | 1 | Prueba confirmada expresamente por el propietario; incluye asignación ficticia |
| `40aa027d-9a25-4108-9cb5-9c69f3b5a34a` | PRUEBA V2 UNIFICADOS A MANUAL CATALOGO — NO REAL | 10 | 0 | Prueba del recorrido sintético previamente autorizado |
| `45705278-cd5c-4544-9e93-43222691e763` | PRUEBA V2 UNIFICADOS C SOLICITUD CATALOGO — NO REAL | 3 | 0 | Prueba del recorrido sintético previamente autorizado |
| `aee8966b-5c17-4f7f-b50c-fff959ca0f0d` | PRUEBA DEPLOY d927 NO REAL | 20 | 0 | Prueba del recorrido sintético previamente autorizado |
| `dd625377-6773-4d19-bcdd-c94f3181faf7` | Familia original ya ausente | 0 | 0 | Auditoría preexistente: eliminación `2026-10-22T01:28:45.301Z` |
| `0fb2cb46-86a8-4f1d-bcdd-0f4471e0638e` | Familia original ya ausente | 0 | 0 | Auditoría preexistente: eliminación `2026-10-22T01:28:35.136Z` |

Las seis familias originales se reconcilian como cuatro presentes y dos eliminadas previamente, según sus auditorías. Esas dos eliminaciones no fueron ejecutadas por esta tarea. No se detectaron padres de familia ausentes con descendientes en el listado raíz. Las cuatro solicitudes originales están ausentes y bloquean la modalidad. Los padres contractuales ausentes se enumeran explícitamente; no se crean ni migran.

En las cuatro familias presentes, el inventario cerrado no detectó firmas, pagos, liquidaciones, entregas, registros definitivos ni archivos bajo sus prefijos documentales. Se consultaron dependencias externas por budgetId, operationId y origen, índices globales de afiliado/cliente, registros de origen/snapshot/número y metadatos de Storage. Esto no acredita aprobación jurídica ni autoriza un borrado.

El grafo contiene 49 documentos existentes (48 propios de familia y un índice de asignación). Actualmente las cuatro familias quedan BLOQUEADAS porque sus solicitudes de origen están ausentes. Los paths siguientes son un inventario potencial, no un manifiesto ejecutable. Permitir el origen ausente exige una decisión explícita adicional; no se recrearán solicitudes ni se sustituirán vínculos. Un borrado futuro requiere nueva verificación y autorización productiva.

## Manifiesto exacto potencial, no ejecutado

### 14b82cff-5c72-438b-8bac-a69fd7ef4d0b

Nombre: JUAN. Registros del grafo bloqueado, candidatos sólo tras resolver el origen: 16.

```text
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/acceptanceCommands/1a7c47be-0c9a-4670-b969-729b8e724a12
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/acceptances/1
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/commands/b645fcf7-4ae9-4f6e-9b36-ba7819f22ba1
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/commands/d844c2c5-2f8f-42aa-8c55-1db09e24d1ca
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/contracts/v1
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/contracts/v1/commands/7e06848f-7dea-4ff2-b9ae-de64bf5979c9
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/contracts/v1/creditReview/current
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/contracts/v1/operation/affiliate
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/contracts/v1/operation/custody
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/contracts/v1/operation/custody/commands/1f4d9b8e-7ef7-4257-9c7d-3d18bbc6ee93
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/contracts/v1/operation/custody/events/1f4d9b8e-7ef7-4257-9c7d-3d18bbc6ee93
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/contracts/v1/operation/identity
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/documentation/1
presupuestos_v2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b/versions/1
presupuestos_v2/_operation_affiliate_index_v2/contracts/2a5834b043442845c9a889e83ddc3dd118d71ff285b978eec49a056581803b85/assignments/op_776f2afa3e0ebd72b733dfc253ff9bbfde4c64c955ae18f6c0ddf4035949691e
```

Conservar (la solicitud de origen está ausente):

- `productos/budget_69d2569d44e6d6ffd391a2bf47524a87625e07529e272fd6c477a9c4560bad0d`
- `solicitudes_cuenta/budget_manual_14b82cff-5c72-438b-8bac-a69fd7ef4d0b`
- Auditoría futura: `budgetDeletionAuditV2/14b82cff-5c72-438b-8bac-a69fd7ef4d0b`.
- Todos los archivos, referencias de catálogo, vendedores y registros ajenos.

### 40aa027d-9a25-4108-9cb5-9c69f3b5a34a

Nombre: PRUEBA V2 UNIFICADOS A MANUAL CATALOGO — NO REAL. Registros del grafo bloqueado, candidatos sólo tras resolver el origen: 10.

```text
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a/acceptanceCommands/89213bff-0541-4c8a-b757-aed6086c88fb
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a/acceptances/1
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a/commands/952f0317-39ee-48d8-994b-805037895a29
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a/commands/adc96017-65dd-4fad-a659-57f369f55a6f
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a/contracts/v1
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a/contracts/v1/commands/d00dbfdc-06b3-4e47-b443-cb12fae5a04d
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a/contracts/v1/operation/identity
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a/documentation/1
presupuestos_v2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a/versions/1
```

Conservar (la solicitud de origen está ausente):

- `solicitudes_cuenta/budget_manual_40aa027d-9a25-4108-9cb5-9c69f3b5a34a`
- Auditoría futura: `budgetDeletionAuditV2/40aa027d-9a25-4108-9cb5-9c69f3b5a34a`.
- Todos los archivos, referencias de catálogo, vendedores y registros ajenos.

### 45705278-cd5c-4544-9e93-43222691e763

Nombre: PRUEBA V2 UNIFICADOS C SOLICITUD CATALOGO — NO REAL. Registros del grafo bloqueado, candidatos sólo tras resolver el origen: 3.

```text
presupuestos_v2/45705278-cd5c-4544-9e93-43222691e763
presupuestos_v2/45705278-cd5c-4544-9e93-43222691e763/commands/20da7421-a883-4d6e-bc7e-4398fdc81f4f
presupuestos_v2/45705278-cd5c-4544-9e93-43222691e763/versions/1
```

Conservar (la solicitud de origen está ausente):

- `solicitudes_cuenta/web_23a681dd-d6c5-438d-903a-6e41edf03104`
- Auditoría futura: `budgetDeletionAuditV2/45705278-cd5c-4544-9e93-43222691e763`.
- Todos los archivos, referencias de catálogo, vendedores y registros ajenos.

### aee8966b-5c17-4f7f-b50c-fff959ca0f0d

Nombre: PRUEBA DEPLOY d927 NO REAL. Registros del grafo bloqueado, candidatos sólo tras resolver el origen: 20.

```text
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/acceptanceCommands/2ebc0b32-a3bd-416a-aef9-5f652f35fd8d
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/acceptances/1
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/commands/57c04cf0-a55b-43c3-8950-c8785072524a
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/commands/b9730791-6599-42bc-915e-80a2f54ef4d4
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/0e0bfd9f-f6c1-4638-9cce-530c0f2222ea
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/1499e87c-23b7-4a57-b23a-bef82c640e68
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/4221efdf-8dae-4b51-b0a4-9cb9de59be55
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/b4a6028f-ea18-40ee-b18f-9ff6da1ed1af
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/bb2e234d-4d4a-4f18-9082-7e3f25bbfa48
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/fe7112c8-378b-44c1-8657-f97d18e20dce
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/0e0bfd9f-f6c1-4638-9cce-530c0f2222ea
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/1499e87c-23b7-4a57-b23a-bef82c640e68
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/4221efdf-8dae-4b51-b0a4-9cb9de59be55
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/b4a6028f-ea18-40ee-b18f-9ff6da1ed1af
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/bb2e234d-4d4a-4f18-9082-7e3f25bbfa48
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/readyReviews/4221efdf-8dae-4b51-b0a4-9cb9de59be55
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/documentation/1
presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/versions/1
```

Conservar (la solicitud de origen está ausente):

- `solicitudes_cuenta/03j4qAuSiA77FOPMEcUg`
- Auditoría futura: `budgetDeletionAuditV2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d`.
- Todos los archivos, referencias de catálogo, vendedores y registros ajenos.

## Verificación y publicación

No se modifican Firestore Rules, Storage Rules, IAM, secretos, bucket ni configuración. No requiere migración. Permisos: API administrativa existente, Firestore/Storage privados mediados por servidor. Los bloqueos contractuales y financieros se mantienen.

Preflight de lectura: bucket `negocio-facil-page.firebasestorage.app`, HMAC versión 1 habilitada en RUNTIME, rate limit activo, sin variables Emulator/E2E y rollouts automáticos deshabilitados. Firestore SHA256 `179df4acc739097a4dab8f77ebc899bf23f61dec42e1f3fffa138467d0fdfed2`; Storage SHA256 `990218bc41510a0678318f7a8767fb2e9d6068839fc49496bc912a7f4553ba93`.

Después de revisión, merge manual y autorización de un SHA exacto:

```sh
npx firebase-tools apphosting:rollouts:create cuenta-hogar \
  --project negocio-facil-page \
  --git-commit <SHA_MERGE_EXPRESAMENTE_APROBADO>
```

Smoke publicado: sólo abrir ambos accesos, cambiar de modalidad, verificar manifiesto/dependencias y diseño desktop/mobile. No confirmar borrados. Recuperación de aplicación: previo análisis y autorización, volver al SHA base `9a5a8ef1a7ec054a5244d2dc84e045138fe47cc0` / build `build-2026-10-22-001`. No restaurar Rules inseguras. Un rollback de aplicación no restaura documentos: el diálogo advierte irreversibilidad; las solicitudes y referencias permanecen y el tombstone impide resurrección accidental.

## Evidencia de pruebas

Resultados verificados en esta rama:

| Gate / suite | Resultado |
| --- | --- |
| `git diff --check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npx eslint` sobre ocho archivos tocados | PASS, 0 errores y 0 warnings |
| `npm run build` | PASS |
| `npm run test:safe` | PASS |
| `testBudgetTestDossierEmulator.ts` | PASS: atomicidad, fallo transaccional, concurrencia, permisos, archivos/finanzas protegidos, origen ausente bloqueado |
| `testBudgetV2DeletionEmulator.ts` | PASS |
| `testBudgetV2Emulator.ts` | PASS |
| `testBudgetAcceptanceV2Emulator.ts` | PASS, incluyendo documentación privada y API adversarial |
| `testContractV2Emulator.ts` | PASS, compatibilidad histórica y digests |
| `runBudgetV2DeletionBrowser.ts` | PASS desktop/mobile, ambos accesos normales |
| `runBudgetTestDossierBrowser.ts` | PASS desktop/mobile, manifiesto, doble confirmación, bloqueo de pago y 0 requests Firebase productivos |

Las suites Firebase se ejecutaron con proyecto `demo-cuenta-hogar`, Firestore `127.0.0.1:8080`, Auth `127.0.0.1:9099` y Storage `127.0.0.1:9199`. La regresión histórica P4 exige su email de administrador de fixture; una primera invocación con otro email sintético dio 403 en lugar del 409 esperado. Se corrigió únicamente el entorno de invocación y la suite pasó íntegra, sin cambiar código ni assertions.

La revisión automática rechazó permitir la eliminación con una solicitud de origen ausente. La implementación conserva ese bloqueo; se solicitó decisión explícita del propietario. El PR se entrega como borrador mientras esta excepción esté pendiente. Nuevas suites: `testBudgetTestDossierEmulator.ts` y `runBudgetTestDossierBrowser.ts`, con guardas demo-cuenta-hogar, Auth/Firestore/Storage Emulator y Chrome local aislado. Las fixtures son sintéticas; no se copian documentos productivos.

Capturas locales fuera de Git: `/tmp/cuenta-hogar-test-dossier-review/` (desktop/mobile, manifiesto, confirmaciones y bloqueo financiero). Inventario técnico reducido: `/tmp/cuenta-hogar-test-dossier-inventory.json`. No contiene tokens, costos, proveedores ni documentos privados raw.

No se modificó el script local no versionado `scripts/testBudgetV2HttpIdempotency.ts`. No se ejecutaron eliminaciones productivas, merge ni deploy.
