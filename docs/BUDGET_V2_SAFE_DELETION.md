# Eliminación administrativa de familias de Presupuestos V2

## Alcance

`/admin/presupuestos` ofrece **Eliminar presupuesto** desde el historial único.
La verificación muestra cliente, referencias, versiones, identificador, solicitud
que se conserva, registros propios y dependencias. El borrado requiere una
confirmación explícita y actualiza el historial. No emite ni acepta propuestas.

`POST /api/admin/presupuestos-v2/eliminacion` usa la autenticación administrativa
existente antes de leer datos. `mode: PREVIEW` es sólo lectura. `mode: DELETE`
exige `budgetId`, `commandId`, `fingerprint` y `confirm: true`. Los portales de
cliente y vendedor afiliado no acceden a esta funcionalidad.

## Condiciones de borrado

Se retiran únicamente el documento de familia y sus documentos directos de
`versions` y `commands`, con esquema e identidad verificables. Se conservan
siempre las solicitudes de origen, incluidas las manuales, todos los productos,
archivos y registros históricos ajenos. Una familia emitida pero no aceptada
puede eliminarse si supera las mismas comprobaciones.

Cualquier otra subcolección, descendiente, campo desconocido, origen ausente o
inconsistencia bloquea la eliminación. Esto comprende aceptaciones, expedientes,
documentos, revisión crediticia, contratos, proveedor, logística, custodia,
asignaciones, cliente y finanzas. Se detectan padres inexistentes que conservan
descendientes. También se consultan referencias privadas por `originBudgetId`,
índices de formularios contractuales, snapshots, evidencia/fixtures contractuales
y movimientos de comisiones por su vínculo explícito al presupuesto.
Las liquidaciones y recibos no se retiran: una comisión o expediente financiero
relacionado ya bloquea el presupuesto completo.

El recorrido de metadatos y la transacción admiten hasta 180 referencias. Una
familia más grande requiere inventario y procedimiento específicos. No existe
borrado recursivo, limpieza de Storage ni migración de datos. Las estructuras
nuevas no reconocidas quedan bloqueadas por defecto.

## Atomicidad, concurrencia y auditoría

Una única transacción vuelve a leer documentos, consultas de versiones/comandos,
aceptaciones y documentación, dependencias externas y origen. Compara las fechas
de actualización con la huella revisada por Administración. Una actualización
concurrente exige verificar otra vez.

La misma transacción crea `budgetDeletionAuditV2/{budgetId}` y elimina los registros
propios. El registro permanente contiene versión de política, comando, digest,
UID administrativo, fecha, rutas eliminadas y origen conservado; no guarda nombre,
DNI, teléfono ni snapshots personales. Es también la marca que impide recrear la
familia desde un SAVE atrasado. SAVE, ISSUE, REVISE y Acceptance leen esa marca
antes de actuar. Acceptance lee además la familia para serializarse con el borrado.

El mismo comando y actor recuperan el resultado anterior sin nuevas escrituras.
Otro payload, comando o actor sobre una familia eliminada recibe conflicto.
Un corte de respuesta conserva el mismo cuerpo y commandId para reintentar.

No se cambian Rules. La nueva colección mantiene el acceso administrativo
existente del fallback de Rules; clientes y afiliados quedan denegados. Los
controles de concurrencia cubren los escritores autorizados de la aplicación;
no pretenden impedir que un administrador con acceso directo a Firebase altere
manualmente documentos, Rules o auditoría. No se utiliza ese acceso desde la UI.

## Inventario productivo de sólo lectura

Archivo privado local, fuera de Git:
`/tmp/cuenta-hogar-budget-deletion-inventory.json`.

Lectura del 21/10/2026: **6 familias; 3 candidatas sin dependencias detectadas y
3 bloqueadas**. Incluye IDs y paths exactos, metadatos de actualización y padres
faltantes; no incluye contenido personal, costos ni archivos. Las candidatas no
constituyen una autorización de borrado ni sustituyen PREVIEW y su validación
transaccional. No se eliminaron datos productivos.

## Verificación reproducible

Configurar explícitamente el proyecto `demo-cuenta-hogar`, Firestore local 8080,
Auth 9099 y Storage 9199. Las suites abortan sin entorno demo y hosts locales.

- `npx tsx scripts/testBudgetV2DeletionEmulator.ts`: servicio, HTTP administrativo,
  denegación anónima/cliente/afiliado, varias versiones, dependencias, fuentes,
  replays, dos administradores, carreras SAVE/ISSUE/Acceptance y límites.
- `npx tsx scripts/runBudgetV2DeletionBrowser.ts`: Next local, Auth Emulator,
  desktop/mobile, confirmación, borrado, persistencia al recargar, bloqueo y
  capturas en `/tmp/cuenta-hogar-budget-deletion/`.
- Para navegador, configurar `NEXT_PUBLIC_ADMIN_EMAIL` de modo que corresponda a
  la identidad autorizada por las Rules locales existentes. Se crea una cuenta
  exclusivamente en Auth Emulator, con contraseña sintética; no se usan sesiones
  ni credenciales productivas. No se cambia la autorización para pasar la prueba.
- Regresiones: `testBudgetV2.ts`, `testBudgetV2Emulator.ts`,
  `testBudgetAcceptanceV2Emulator.ts`, `testContractV2Emulator.ts`, `npm run test:safe`.
- Gates: `npx tsc --noEmit`, ESLint de archivos tocados, `npm run build`,
  `git diff --check`.

El script local preexistente `scripts/testBudgetV2HttpIdempotency.ts` permanece
intacto y no se incorpora al commit.

## Publicación pendiente de merge y autorización

No se realizó merge ni deploy. El build de recuperación confirmado es
`build-2026-10-21-008`, SHA `e142ee6041ee12eb82888e3078b579d46311baf1`.
Bucket: `negocio-facil-page.firebasestorage.app`. HMAC v1 y rate limit activos.
Rollouts automáticos deshabilitados. No se necesitan índices, permisos nuevos,
migraciones ni cambios de infraestructura, IAM, secretos o Rules.

Después del merge manual: confirmar el SHA exacto de main, repetir preflight de
configuración y bloqueos, y solicitar ratificación para **ese** SHA. Sólo entonces:

```sh
npx firebase-tools apphosting:rollouts:create cuenta-hogar \
  --project negocio-facil-page \
  --git-commit <SHA_MAIN_MERGE_APROBADO>
```

Verificar READY/SUCCEEDED y tráfico al 100 %. Smoke productivo exclusivamente de
lectura: botón, apertura del diálogo y PREVIEW de una familia existente. **No
confirmar ni ejecutar eliminaciones durante el deploy o smoke**.

Ante incidente, informar y proponer un rollout manual del SHA anterior confirmado;
no restaurar Rules inseguras ni ejecutar rollback automáticamente. Una reversión
de aplicación no recupera presupuestos borrados. Por eso el borrado productivo
posterior requiere su propia selección y confirmación administrativa.
Los bloqueos contractuales, entrega y cobranza productivas permanecen vigentes.

## Resultados de esta entrega

| Verificación ejecutada | Resultado |
| --- | --- |
| TypeScript y ESLint de archivos modificados | PASS |
| Build Next.js | PASS |
| `npm run test:safe` | PASS |
| Eliminación: Emulator y HTTP administrativo | PASS |
| Navegador desktop/mobile, actualización y recarga del historial | PASS |
| Modelo y persistencia de Presupuestos V2 | PASS |
| Acceptance y almacenamiento documental en Emulator | PASS |
| Contrato V2, formularios históricos/nuevos y digests | PASS |
| Relectura de metadatos de las 6 familias productivas | SIN CAMBIOS |

Las pruebas de borrado y toda escritura de fixtures se limitaron al proyecto demo
local. La primera ejecución del navegador y una regresión documental detectaron
una discrepancia entre el email administrativo de prueba configurado y el que
esperaban las Rules/suite; se repitieron con configuración coherente de Auth
Emulator, sin modificar assertions, Rules ni credenciales productivas.
