# Preparación productiva V2 — alcance y bloqueos

Base auditada: `70b47ef75ae94ba8decc61550b6ea98b096a72ee`.

**NO LISTO PARA HABILITACIÓN INTEGRAL.** Este cambio incorpora una comprobación real, administrativa y de sólo lectura, y corrige la carga autenticada de Solicitudes. No habilita emisión, entrega ni finanzas productivas. No representa la finalización del objetivo de lanzamiento.

## Implementación entregada

- Ficha de operación → Contrato: preparación para operar con clientes reales, próximo requisito y responsable, enlaces a módulos existentes.
- `GET /api/admin/presupuestos-v2/{budgetId}/versions/{version}/production-readiness`: identidad explícita, origen aceptado, datos, producto, economía y fechas mediante motores actuales, conformidad, revisión READY, identidad documental, aprobación crediticia y registro jurídico.
- Una operación histórica sin revisión crediticia sigue siendo legible, pero nunca se presenta como aprobada para emitir instrumentos nuevos. No se modifica el tratamiento histórico de `assertCreditPreparation`.
- Revisión íntegra de Auth en el nuevo acceso: token revocado/inválido, cuenta deshabilitada, correo no verificado o identidad no administrativa impiden la lectura.
- Respuesta sin datos personales, documentos ni secretos; `private, no-store`. El digest sólo detecta cambios: no es un token ni autorización de emisión.
- Solicitudes: API administrativa por fuente, paginación de 100 registros y cursor por ID, sin nuevos índices. Mantiene las dos fuentes y proyecciones históricas. No hay escrituras ni cambios de tipos persistidos.
- La bandeja espera Auth y descarta respuestas de otra sesión; conserva resultados ante fallos parciales y los elimina de la vista cuando se conoce una denegación de acceso. Los filtros indican que actúan sobre registros cargados.
- Fixtures de administración configurables para usar exclusivamente un correo sintético bajo `demo-cuenta-hogar`.

## Matriz de habilitación real

| Módulo | Estado del código normal | Evidencia / condición |
|---|---|---|
| Administración | Operativa con Auth | `adminAuth.ts`, `AuthProvider.tsx`; las nuevas consultas revalidan Auth |
| Solicitudes públicas | Operativa | `publicSolicitud*`; persistencia servidor, cupo e idempotencia existentes |
| Bandeja Solicitudes | Corregida en este PR | `adminSolicitudesHttpReader.ts`, `adminSolicitudesServer.ts`; antes SDK y correo fijo en Rules |
| Presupuesto y Acceptance | Operativos | `budgetV2Persistence.ts`, `budgetAcceptanceV2Server.ts`; conservar snapshots/versiones |
| Datos, identidad y crédito | Operativos | `contractV2Server.ts`, `creditReviewV2Server.ts`, `operationIdentityReviewServer.ts` |
| Preparación económica y READY | Operativa; no equivale a emisión | `contractV2Server.ts`, `contractReadyV2.ts` |
| Mandato y pagaré actuales | Borradores únicamente | `contractDocuments/operationDraftTemplates.ts`, `operationDraftPdf.ts`; cláusulas pendientes y advertencia |
| Congelamiento y CH | Bloqueado fuera de Emulator | `contractFreezeIntegrationEmulator.ts`, `contractInfrastructureEmulator.ts`; identidad/validaciones reales reutilizables, adaptador exclusivo de prueba |
| Snapshot definitivo | Falta adaptador productivo | `contractSnapshotV2.ts` sólo acepta políticas de Emulator; no modificar discriminadores sin adaptar y probar toda la cadena |
| Proveedor y logística | Operativos hasta entrega programada | `operationFulfillmentV2Server.ts` |
| Afiliado, asignación y custodia | Operativos bajo vínculo explícito | `operationCustodyV2Server.ts`, `affiliateRegistryServer.ts` |
| Remito, firmas y originales | Motor probado en Emulator | `operationDeliveryV2Server.ts`, `operationDeliveryV2Photos.ts`; falta vinculación con documentos definitivos emitidos |
| Entrega real | Bloqueada | `requireDeliveryEmulator`; tres firmas, custodia, incidencias y evidencia se conservan |
| Activación de cliente | Bloqueada | `operationClientV2Server.ts`: `EMULATOR_CLIENT_ACTIVATION_FIXTURE_V2`; no es prueba de una entrega real |
| Cuotas, pagos, recibos, reversas | Motor FIFO probado; producción bloqueada | `operationFinancialV2Server.ts`: `EMULATOR_FINANCIAL_APPROVAL_V1` + snapshot/entrega sintéticos |
| Tres portales | Misma fuente financiera en pruebas | `readFinancial`; UID, asignación activa y vínculo cliente revocable |
| Comisiones | Devengamiento V2 ligado al pago; no habilitado financieramente | `operationCommissionV2Server.ts`; preserva atribución/porcentaje congelados |
| ARCA | Fuera del alcance, bloqueada | `fiscalV2Emulator.ts`; recibo de pago no equivale a comprobante fiscal |

## Aprobación jurídica que falta, exactamente

Los originales están identificados por bytes, sin sustituirlos por los borradores técnicos:

- Mandato `OWNER_ORIGINAL_MANDATE_V3`, SHA-256 `8e23a3734506a63920de1b75a3fdcb4f0c6fe88c13c1941b3357ebd9e1a3b4d6`.
- Pagaré `OWNER_ORIGINAL_NOTE_UNVERSIONED`, SHA-256 `6f22b6f9bae6fd75f989ed9fb33ef53052832a43fff5d3f52fd30db56c3253b6`.

La declaración del titular se conserva como `OWNER_REPORTED`. No se inventaron fecha, profesional ni referencia. No se pide repetir la revisión de los originales: falta identificar su evidencia y comprobar los cambios materiales de la plantilla derivada. La comparación existente está en [ORIGINALS_MATRIX.md](../integration-final-v2/ORIGINALS_MATRIX.md).

Entre los cambios documentados: irrevocabilidad/representación, factura del producto, composición económica, ausencia de anticipo, mora/intimación, garantías, renuncia de fuero y contenido del pagaré. Una entrada `VERIFIED` por sí sola no elimina los pendientes del texto ni habilita un renderer definitivo.

Además siguen pendientes: facultades de representación, jurisdicción aplicable, lugar y fecha efectiva de cada instrumento, aprobación exacta del texto y tratamiento del remito. El CUIT/domicilio societarios ya confirmados no resuelven esos campos. No se asignan porcentajes a gestión, logística ni asistencia técnica.

## Incidente de revisión automática y alternativa segura

La revisión automática rechazó una propuesta de refactor amplio del congelamiento porque introducía `PRODUCTION` / `legalTemplateReviewRequired:false` antes de demostrar un adaptador productivo autorizado por versiones exactas. **El comando rechazado no se ejecutó y ese refactor no forma parte del diff.** No se eludió el rechazo con flags ni rutas alternativas.

Se completó la alternativa sin ese riesgo: consulta de prerrequisitos, pruebas de guardas y corrección del acceso administrativo reproducido. El PR permanece en borrador; el motor productivo completo todavía no está implementado.

## Diseño concreto pendiente de revisión para completar el mismo PR

1. **Catálogo final aprobado y renderer:** vincular cada texto final y recursos por hash con registros profesionales exactos. Conservar los originales y aprobar diferencias materiales. Separar cuerpo jurídico de variables. No quitar marcas de borrador de un renderer que aún contiene propuestas. El pagaré lleva el total persistido, sin logo; mandato y remito conservan branding.
2. **Autorización por operación:** recibo inmutable servidor, con operationId, versión, revisión READY, digest de conformidad, hash del paquete jurídico, actor, fecha y alcance explícito. Una política server-side deshabilitada por defecto no sustituye dicho recibo. Nunca aceptar `production=true` ni contexto enviado por navegador como autorización.
3. **Congelamiento compartido:** extraer validación de origen, READY y snapshot sin cambiar su semántica. Mantener el adaptador Emulator intacto. El nuevo adaptador normal recibe una autorización opaca comprobada por servidor; en una misma transacción verifica aprobación crediticia existente/vigente, conformidad, revisión esperada, autorización, numeración CH y destinos únicos. No reservar número antes de disponer de renderer aprobado y datos formales completos.
4. **Documentos inmutables:** registrar paquete ligado a snapshot+hash+versiones+generaciones privadas de Storage. Recuperación idempotente de una emisión interrumpida, sin segundo pagaré ni documento alternativo. Descargas por servidor y generación fijada, nunca tokens públicos permanentes. Revalidar metadatos en transacción, archivos fuera de ella.
5. **Entrega:** adaptar el motor existente, añadiendo prueba del paquete definitivo emitido. Conservar tres firmas físicas, originales, custodia, responsable y ausencia de incidentes. No sustituirlas por booleans o fixtures de Emulator.
6. **Cliente y ledger:** reemplazar exclusivamente las dependencias sintéticas de los adaptadores normales por verificación de emisión+entrega de la misma operación. Activación atómica única; mismos importes persistidos, FIFO, pagos parciales, recibos, reversas y comisiones. La revocación del cliente y reasignación del afiliado deben seguir aplicándose en cada consulta.
7. **Aceptación técnica antes de publicar:** ejecutar en `demo-cuenta-hogar` el adaptador normal con un paquete jurídico ficticio claramente de test, sin configuración que habilite esa sustitución en producción. Probar races/replays/fallos parciales/custodia/identidad/roles/generaciones. Los PASS del circuito actual con fixtures **no** certifican este adaptador aún pendiente.

## Despliegue y aceptación del propietario

No se realizó merge, rollout, publicación de Rules, cambio de IAM/secretos/Auth ni escritura productiva. No se asignaron los correos personales a roles.

Este PR en su estado actual **no debe anunciarse como lanzamiento integral**. Si sólo se publica la consulta/lectura, tras merge manual: verificar SHA aprobado, tsc/lint/build/test y Rules/configuración sin diferencias; rollout manual de ese SHA con autorización separada; smoke de lectura de Solicitudes y preparación productiva. No activar nada por variables nuevas: este diff no agrega flags.

Para el lanzamiento integral, completar y revisar los siete pasos anteriores. Luego merge manual, SHA exacto, despliegue deshabilitado inicialmente, autorización explícita de roles/cuentas existentes y de la primera operación real. No crear usuarios ni usar correos personales de forma implícita. La prueba de aceptación deberá guardar evidencia de contrato+pagaré+remito, tres firmas reales, custodia y entrega antes del alta de cuotas; pago real sólo con autorización expresa y comprobante efectivo. ARCA seguirá separada.

Recuperación: una consulta es de sólo lectura; el rollback de aplicación requiere autorización y no modifica registros. Si ya existieran instrumentos o movimientos reales, detener comandos nuevos y conservar auditoría; no borrar, regenerar pagarés ni cancelar deuda mediante rollback de código.
