# Aprobación del paquete por el titular

Cambio expresamente solicitado por el propietario: su aprobación administrativa es suficiente; ya no se exige autorización profesional para ese paso. No se presenta como dictamen del abogado ni contador.

## Flujo

En Contrato → Autorizaciones y preparación para emisión → Aprobación del paquete por el titular:

1. Seleccionar una versión instalada y exacta del catálogo.
2. Registrar una referencia o motivo de la decisión.
3. Confirmar expresamente la aprobación como titular o representante autorizado.
4. Registrar. Cambiar paquete o motivo invalida la casilla; el guardado impide comandos duplicados.

La autorización de cada operación sigue siendo independiente. Aprobar un paquete no asigna CH, no emite instrumentos, no registra firmas, no acredita entrega y no activa deuda ni pagos.

## Registro y compatibilidad

Misma API y colección existentes, sin migraciones ni cambios de Rules. Nueva variante de `REGISTER_PACKAGE_APPROVAL`:

```json
{
  "commandId": "<identificador estable del comando>",
  "packageId": "<paquete instalado>",
  "packageHash": "<SHA-256 exacto>",
  "approvalBasis": "OWNER_AUTHORIZATION",
  "reason": "<referencia de mi decisión>",
  "confirmed": true
}
```

El servidor exige Auth activa y verificada, identidad administrativa vigente y pertenencia a `PRODUCTION_OPERATION_ADMIN_UIDS`. Para reservar esta facultad al propietario, la configuración existente debe autorizar exclusivamente su UID; no se hardcodea una identidad ni se cambian usuarios desde este PR.

El registro tiene `schemaVersion: EXACT_OWNER_PACKAGE_APPROVAL_V2`, `status: OWNER_AUTHORIZED`, `approvalBasis: OWNER_AUTHORIZATION`, `ownerAcknowledged: true`, motivo, actor de la sesión, día local argentino y timestamp UTC. Incluye hashes de paquete, documentos emitibles, renderer y recursos, digest íntegro y digest estable de la solicitud para reintentos incluso al cambiar de día. No contiene profesional, fecha profesional ni referencias de evidencia jurídica.

V1 conserva su significado `PROFESSIONAL_VERSION_IDENTIFIED`, validaciones, bytes y hashes. V2 nunca se etiqueta como verificación profesional. No se transforma ningún registro histórico. Las revocaciones existentes bloquean nuevas operaciones y mantienen las lecturas históricas.

## Controles que no cambian

Catálogo exacto, integridad del renderer, snapshot, identidad, conformidad del cliente, READY, autorización por operación, numeración correlativa única, emisión idempotente, firmas y custodia, documentación externa, entrega y activación financiera única. No cambian los textos, importes, CFT, cuotas, recibos ni fórmulas. ARCA y laboratorio no se activan.

## Publicación pendiente

Este PR modifica el requisito de aprobación; no instala paquetes ni cambia flags o permisos. El catálogo publicado sigue siendo el existente. Merge manual, SHA revisado y deploy requieren sus autorizaciones. La aprobación del titular se registrará desde su sesión después de instalar la versión exacta y habilitar la configuración revisada, sin consumir CH en esa acción. No se ejecutó ninguna mutación productiva.


## Validación ejecutada

Base: `be58ed1e933f47884cc59ade32ffc2fc54710880`. Todas las escrituras en `demo-cuenta-hogar`, sin credenciales ni datos reales.

| Comprobación | Resultado |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| ESLint de los cinco archivos de código afectados | PASS, sin diagnósticos |
| `npm run build` y manifiesto técnico | PASS |
| `npm run test:safe` | PASS |
| `testProductionAdapterEmulator.ts` con `SYNTHETIC_OWNER_APPROVAL_SUITE=1`, originales y entrega externa | PASS, 32 grupos |
| `testOriginalDocumentIntegrationEmulator.ts` con aprobación V1 | PASS, 6 grupos |
| `testProductionAdapterBrowser.ts` con `SYNTHETIC_OWNER_APPROVAL_FOCUS=1`, originales y entrega externa | PASS, escritorio 1280 y celular 390 |
| `git diff --check` | PASS |

La prueba nueva cubre registro sin profesional ni referencias inventadas, actor autenticado, confirmación obligatoria, hash exacto, rechazo de campos extra, doble clic y concurrencia, conflictos de comando, replay al cambiar de día sin alterar `updateTime`, alteración de contenido, imposibilidad de etiquetar V2 como profesional y rechazo de otra cuenta. La suite integral comprueba revocación, lectura histórica, emisión única, recuperación, snapshot, numeración, documentación externa, entrega, cuotas, pagos, recibos, saldos y reversas.

La prueba de navegador utiliza la interfaz Next y los handlers reales con un adaptador HTTP exclusivamente local. Ejecutó aprobación del titular, invalidación al editar, autorización de la operación, congelamiento CH y emisión del par mandato/pagaré; no se declara ejecutado el tramo posterior de entrega/pagos desde navegador en esta ejecución focalizada. Ese tramo pasó en la suite de Emulator.

Para navegador se usa una copia temporal de Rules con el correo administrativo reemplazado por el de la cuenta sintética, sin cambiar la política ni las Rules versionadas. La suite de Emulator utiliza las Rules versionadas. No se publicaron Rules.

[Resultados del navegador](owner-approval-evidence/owner-approval-results.json). Capturas:

- [Aprobación escritorio](owner-approval-evidence/owner-approval-desktop.png)
- [Aprobación celular](owner-approval-evidence/owner-approval-mobile.png)
- [Documentos emitidos sintéticos escritorio](owner-approval-evidence/issued-documents-desktop.png)
- [Documentos emitidos sintéticos celular](owner-approval-evidence/issued-documents-mobile.png)

Logs locales: `/tmp/ch-owner-{tsc,eslint,build,safe,emulator,legacy,browser}.log`. No se incorporan scripts locales protegidos. No hubo merge, deploy, cambios de catálogo, configuración productiva, Rules o CH reales. Los artefactos Next obsoletos de otra rama se apartaron antes de regenerar los tipos; no se cambió tsconfig ni se omitieron errores.
