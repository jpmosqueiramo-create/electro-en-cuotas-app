# Configuración y aceptación productiva — preparación, no ejecución

Este procedimiento no autoriza sus mutaciones. No se consultaron ni modificaron datos productivos en el cierre. No hay migración automática, nuevas cuentas, cambios de Rules, IAM, secretos, índices ni Storage necesarios propuestos por estas correcciones. La configuración efectiva y los permisos del servicio deberán verificarse nuevamente antes de cualquier despliegue autorizado.

## Orden de habilitación

| Paso | Preparación exacta | Autorización independiente |
|---|---|---|
| 1. Código | Revisar PR #80 y cierre técnico `TECHNICAL_CLOSURE.md`, merge manual y SHA resultante | Merge manual; no se ejecutó |
| 2. Publicación cerrada | `PRODUCTION_OPERATIONS_ENABLED` ausente o `false`; no añadir allowlist ni activar laboratorio | Rollout del SHA explícitamente aprobado |
| 3. Documentos | Completar paquete de `legal-package/`; instalar mandato, pagaré y remito exactos en `approvedFinalPackages`, conservar versiones anteriores | Aprobación exacta y revisión del commit documental |
| 4. Numeración | Inventario de contador/números/orígenes/snapshots; manifiesto de inicialización CH | Número inicial y escritura exacta autorizados; no se presupone que comienza en 1 |
| 5. Administradores | `PRODUCTION_OPERATION_ADMIN_UIDS=<UIDs existentes expresamente aprobados, separados por coma>`; rol administrativo actual y correo verificado | Asignación/configuración exacta autorizada; no hardcodear correos personales |
| 6. Habilitar comandos | `PRODUCTION_OPERATIONS_ENABLED=true`, sólo servidor/RUNTIME, conservando todos los overrides previos | Cambio exacto de configuración y publicación autorizados |
| 7. Operación | Registro profesional del paquete + autorización de la revisión READY y sus alcances | Una operación real identificada; no deriva del despliegue |
| 8. Entrega/finanzas/cliente | Tres firmas auténticas, originales y custodia, entrega real; ledger una sola vez; UID existente explícito | Alcances DELIVERY, FINANCE y CLIENT_ACTIVATION; acreditaciones reales separadas |

`OPERATIONS_LAB_*` no forma parte de este procedimiento. No se cambian bucket, HMAC, rate limit, secretos ni rollouts automáticos. ARCA permanece deshabilitada. Las liquidaciones productivas de comisiones tampoco se habilitan mediante este adaptador.

## Catálogo y hashes

Un `FinalPackage` contiene `id`, `version`, `issuer` (incluido representante/capacidad), `jurisdiction`, tres `FinalTemplate`, `rendererHash`, `resourcesHash`, `sha256`. Cada plantilla contiene `kind`, `id`, `version`, `title`, `paragraphs`, `sha256`.

Los hashes se calculan con `templateHash` y `packageHash`; no son el hash de una extracción PDF. `FINAL_RENDERER_HASH` deriva del manifiesto versionado de fuentes/dependencias, estable entre tsx y compilación minificada. `npm run build` verifica los bytes antes de compilar; un manifiesto desactualizado falla. Su regeneración es explícita, revisada y obliga a volver a cotejar el paquete, nunca ocurre en runtime.

No eliminar versiones instaladas después de una emisión: las lecturas de instrumentos ya emitidos validan su paquete histórico y sus hashes. No dependen del renderer actual ni regeneran el pagaré. Una versión nueva no modifica instrumentos anteriores.

## Numeración CH: inicialización propuesta

Referencia exacta del contador: `contractNumberingV2/CONTRACT_NUMBERING_V1`.

Forma requerida (plantilla incompleta, **no ejecutar**):

```json
{
  "schemaVersion": "CONTRACT_NUMBER_COUNTER_V1",
  "policyId": "CONTRACT_NUMBERING_V1",
  "executionMode": "PRODUCTION",
  "active": true,
  "lastAllocatedSequence": "<última secuencia inventariada y autorizada>",
  "initializationAuthorizationReference": "<referencia de autorización explícita>"
}
```

La secuencia es un entero decimal validado, no un número de JavaScript. No adoptar contador Emulator/TEST, reiniciar, saltar ni rellenar huecos automáticamente. Preparar lectura de `contractNumbersV2`, `contractOriginsV2`, `contractSnapshotsV2` y el contador. Comparar secuencia máxima, colisiones y referencias. Presentar el manifiesto de una escritura con precondición exacta (ausencia o `updateTime` inventariado) y pedir autorización. La inicialización no tiene API pública ni se ejecuta al abrir la ficha. El congelamiento transaccional posterior asigna el siguiente número y reserva origen/snapshot/recibo de forma única.

## Llamadas administrativas existentes

Desde la sesión administrativa de la aplicación, sin extraer tokens ni credenciales:

`POST /api/admin/presupuestos-v2/{budgetId}/versions/{version}/production`

- `REGISTER_PACKAGE_APPROVAL`: `commandId`, `packageId`, `packageHash`, `approvalDate`, `professional`, `validationReference`, `sourceReference`, `confirmed:true`. Sólo un paquete instalado exacto; no acepta textos desde el navegador.
- `AUTHORIZE`: `commandId`, `operationId`, `expectedRevision`, `packageId`, `approvalId`, `formal` con lugares/fechas de mandato y pagaré, `scopes`, `expiresAt`, `reason`, `confirmed:true`. La autorización siempre incluye ISSUANCE; los demás alcances se eligen explícitamente. Vigencia de emisión máxima 30 días.
- `FREEZE`: `commandId`, `authorizationId`, `expectedRevision`, `confirmed:true`. Reserva numeración y snapshot; potencialmente irreversible. No se ofrece como prueba productiva.
- `ISSUE_DOCUMENTS`: `confirmed:true`. Tres archivos determinísticos privados para el mismo snapshot; reintento conserva identidad y no genera otro pagaré.
- `REVOKE_AUTHORIZATION`: `authorizationId`, `commandId`, `reason`. Bloquea nuevos actos, conserva historia/lecturas. No cancela obligaciones ni documentos ya emitidos.

No se proporcionan payloads rellenados para una operación real. El titular aún debe aprobar los destinatarios/roles y cada acto que pueda crear obligaciones.

## Roles y portales

- Administración: Auth activa, token no revocado, rol/email administrativo vigente. Para el adaptador: correo verificado, UID en allowlist del servidor y flag activo, además del permiso por operación.
- Vendedor afiliado: registro activo y UID explícito, asignación vigente; sólo consulta sus operaciones y acciones de custodia autorizadas. No acredita pagos, aprueba contratos ni cambia porcentajes. Reasignar/desactivar retira acceso; comisiones devengadas no cambian beneficiario.
- Cliente: UID existente explícitamente vinculado, Auth activa/verificada y activación posterior a entrega/firmas; invitación privada de un uso/revocable. Revocar el vínculo bloquea HTTP directo y refrescos. No se crean cuentas desde la invitación productiva.
- Dos correos personales no se asignan automáticamente a roles. Nunca usar una simulación de rol como evidencia de autorización real.

## Aceptación del propietario y recuperación

Primero lectura: ficha, fuente aceptada, preparación documental, presupuesto, contrato y cuotas sin botones de escritura habilitados accidentalmente. Después, sólo con expediente y autorizaciones concretas: confirmar paquete/revisión, congelar y emitir una vez; abrir los tres archivos; comprobar importes/fechas/número/revisión/hash. Firmas, recepción de originales, custodia y entrega requieren hechos reales. Activar el cronograma una vez, acreditar únicamente pagos comprobados y revertir por comando auditado; recibo no es factura ARCA.

Una emisión interrumpida se recupera con los mismos identificadores/archivos mientras la autorización siga vigente. Si venció, usar el procedimiento de recuperación siguiente. Si fue revocada, detenerse: la recuperación no levanta una revocación. No cambiar fechas, snapshot, hashes ni crear otro pagaré.

Pausa bajo autorización: poner el flag en false o revocar un permiso concreto. Lecturas e historia permanecen; no borrar archivos, números, saldos ni evidencias. Un rollback requiere aprobación y evaluación de compatibilidad con snapshots ya emitidos; no revierte obligaciones reales. No restaurar Rules inseguras. Las reversas económicas se registran mediante el motor existente, nunca editando saldos.

## Recuperación de emisión vencida

En la misma ficha, Administración ve la fecha original y el número reservado. Requiere cuenta activa/verificada, rol actual, UID autorizado y ejecución habilitada, además de la aprobación jurídica exacta vigente.

1. Revisar número, snapshot y autorización original; la emisión no debe tener un manifiesto completo. No editar el snapshot ni la aceptación.
2. Registrar `AUTHORIZE_ISSUANCE_RECOVERY` con `commandId`, `snapshotHash`, `authorizationId` original, `expiresAt` ISO UTC (máximo 24 horas), `reason` y `confirmed:true`. La pantalla exige una confirmación específica. El servidor liga operación, revisión congelada, número, paquete, aprobación y recursos por hash; no acepta otra plantilla o datos económicos.
3. Seleccionar la autorización de recuperación y confirmar separadamente `RECOVER_DOCUMENTS`, con `recoveryId` y `confirmed:true`. Se conservan los paths determinísticos y bytes de los instrumentos originales. La recuperación no consulta el día actual como nueva fecha de emisión.
4. Ante pérdida de respuesta, actualizar el estado y consultar el manifiesto antes de reintentar. Conservar identificadores y payload; un manifiesto completo se devuelve sin escrituras, incluso tras vencer el permiso. Un archivo faltante/reemplazado después de un manifiesto completo falla: no se regenera silenciosamente.
5. `REVOKE_ISSUANCE_RECOVERY` recibe `recoveryId`, `commandId`, `reason`. La revocación y el vencimiento bloquean nuevas etapas. Revocar la autorización original o la aprobación jurídica también impide completar archivos; una recuperación no amplía DELIVERY, FINANCE ni CLIENT_ACTIVATION.

Persistencia aditiva bajo `production/current`: `issuanceRecoveries/{commandId}`, su `revocations/current` y evento `events/recovery_{commandId}`. El manifiesto emitido agrega opcionalmente `recoveryAuthorization:{id,hash}`. Los históricos sin ese campo conservan su validación. Sin migraciones, colecciones públicas, índices compuestos ni Rules nuevas. Storage permanece privado; sólo se crean objetos faltantes, nunca se sobreescriben instrumentos.

## Política de fecha efectiva

Para nuevas autorizaciones: `AR_LOCAL_ISSUE_DATE_V1`, zona `America/Argentina/Buenos_Aires`. El día visible se obtiene en servidor con esa zona. Mandato y pagaré mantienen las fechas explícitas autorizadas; congelar verifica que ambas correspondan al día local del mismo instante UTC que se registra en auditoría. Si cambia el día, rechaza y exige una autorización explícita corregida; no cambia datos aceptados. Los snapshots históricos y la recuperación conservan las fechas guardadas. Los campos `at`, `issuedAt`, `termsFrozenAt` y vencimientos de permisos siguen siendo instantes UTC. El día de un vencimiento contractual no se modifica por esta política.

## Anulación de una reserva CH sin reutilización

Este procedimiento detiene la operatoria; **no declara extinguida una obligación ni anula jurídicamente un pagaré**.

1. Inventariar en lectura el número, snapshot, autorización, manifiesto, generaciones de los archivos, firmas, entrega y actividad financiera. Identificar motivo y expediente de decisión.
2. Obtener autorización administrativa específica. Si ya existen instrumentos, firmas, entrega o pagos, obtener además la decisión jurídica/contable correspondiente antes de actuar. No editar saldos para simular una anulación.
3. Mediante la acción existente `REVOKE_AUTHORIZATION`, registrar motivo y referencia de la decisión contra la autorización original. Revocar también recuperaciones abiertas. Guardar los recibos idempotentes y la evidencia de la decisión. Esto impide nuevas emisiones, entrega, activación o pagos por ese permiso, pero conserva las lecturas.
4. Conservar **sin cambios** contador, `contractNumbersV2/{CH}`, origen, snapshot, comandos, PDF, firmas e historia. El número sigue consumido; no reducir `lastAllocatedSequence`, borrar reservas, rellenar huecos ni adjudicarlo a otra persona. Una emisión interrumpida no requiere anular: usar recuperación.
5. No hay un comando de cancelación jurídica del instrumento ni una pantalla que declare “obligación extinguida”. Si se necesita ese proceso, diseñarlo y aprobarlo por separado. Un nuevo negocio no reutiliza el snapshot, el origen ni el número del anterior.

## Consulta de historia

La API GET acepta exclusivamente `approvalAfter`, `authorizationAfter`, `recoveryAfter`, cursores de ID validados en colecciones fijas. Cada tipo muestra hasta 20 registros y lee uno adicional para saber si hay otra página. Orden por ID/documento, sin índice compuesto; fechas y responsables originales permanecen. La pantalla ofrece primera/siguiente página en auditoría, mantiene revocaciones visibles y permite seleccionar aprobaciones/autorizaciones de páginas anteriores. Las lecturas no generan registros. Refrescar desde la primera página incorpora nuevas altas concurrentes.
