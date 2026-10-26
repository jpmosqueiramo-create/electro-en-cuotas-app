# Preparación contractual en cinco pasos

## Cambio implementado

Se reemplaza el diagnóstico histórico de 18 filas por una presentación de preparación con exactamente cinco pasos:

1. Solicitud y aceptación (incluye producto y conformidad de las condiciones guardadas).
2. Datos personales.
3. Datos laborales (conserva sus campos opcionales).
4. Condiciones económicas.
5. Cronograma contractual.

El panel aparece directamente al inicio del paso Contrato, en la ficha y en su ventana independiente. Sustituye el resumen duplicado anterior. Los botones navegan a los campos existentes; no abren nuevos formularios ni guardan datos.

Los datos personales completos ingresados por Administración ya no se presentan como pendientes por carecer de `lastClientSubmissionAppliedAt`. Se sigue comprobando su contenido y cualquier discrepancia de identidad. Se conserva la recepción/aplicación explícita del formulario del cliente.

Se retiraron del **diagnóstico de presentación** las filas permanentes de aprobación profesional, infraestructura, tres remitos/firmas, ARCA y portal. Esas filas describían un estado antiguo de implementación y no representaban la configuración efectiva de emisión. La presentación ahora remite al estado efectivo de «Emisión definitiva del contrato y pagaré» y no afirma que preparar cinco pasos autorice por sí solo una acción.

## Alcance no implementado: política del backend

La revisión automática rechazó el cambio que retiraba la aprobación crediticia del backend y sustituía las barreras de emisión por los cinco pasos. Ninguna parte de ese comando rechazado se aplicó.

Este PR no elimina ni evita validadores de emisión, aprobación de paquete, autorización por operación, READY, crédito, identidad, conformidad, firmas, entrega, permisos, numeración, finanzas o acceso al portal. No integra aprobaciones automáticas. No modifica documentos ni sus hashes, catálogo, Rules, Auth, configuración, CH, motores financieros ni datos productivos.

La habilitación funcional integral solicitada por el propietario **todavía no está resuelta**. El PR debe seguir en borrador mientras se confirma el alcance del cambio de política y se implementa y prueba.

## Cambio concreto propuesto para autorización

La confirmación específica pendiente abarca:

- Dejar de exigir aprobación crediticia y verificación documental manual como condiciones adicionales de emisión, manteniendo el rechazo de identidad incompatible y el origen aceptado íntegro.
- Integrar la revisión técnica, la aprobación exacta del paquete por el titular y la autorización por operación en una confirmación explícita «Emitir contrato y pagaré», con hashes, control de revisión, auditoría y reintentos idempotentes. No registrar una aprobación profesional ni una conformidad del cliente inexistente.
- Permitir la activación del portal después de emitir ambos documentos íntegros, con cuenta existente expresamente vinculada y Auth verificada, sin exigir previamente entrega. Esto no activaría cuotas ni acreditaría pagos.
- Mantener firmas, originales, custodia, documentación externa y entrega como condiciones de la etapa logística y de activación financiera; conservar permisos, revocación, conciliación y ausencia de duplicaciones.

Esta propuesta no autoriza ni ejecuta emisiones, vínculos o movimientos reales, ni cambia configuración. No requiere volver a consultar al abogado para preparar el cambio de software; no modifica cláusulas.

## Pruebas realmente ejecutadas

- Unitarias de preparación: **11 PASS** (cinco pasos, cada pendiente, datos laborales opcionales y ausencia de capacidad productiva por flags del navegador).
- Emulator de lectura: **9 grupos PASS** (carga administrativa reconocida sin formulario enviado, permisos, identidad, conformidad, cronograma inconsistente, revisión y ausencia de escrituras o cambios de timestamps).
- Navegador Chrome local desktop 1280×900 y mobile 390×844: **PASS**, cinco filas visibles, sin desbordamiento, GET privado y POST rechazado 405, ningún cambio en el borrador.
- TypeScript, ESLint diferencial, build y `test:safe`: **PASS**.

[Desktop](evidence/readiness-1280.png) · [Mobile](evidence/readiness-390.png) · [Resultado navegador](evidence/browser-results.json).

Las escrituras de fixtures se ejecutaron exclusivamente en `demo-cuenta-hogar`, con Firestore 8080, Auth 9099 y Storage 9199. No se hicieron pruebas comerciales productivas, merge ni deploy.
