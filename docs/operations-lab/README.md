# Laboratorio de operaciones — incremento 1

## Estado real

Este PR **no implementa todavía el circuito completo solicitado**. Prepara sesiones aisladas,
acceso administrativo explícito, auditoría y una entrada visible. No permite presupuestos,
contratos, firmas, entrega, pagos, recibos ni vistas de roles. No debe anunciarse como listo
para la prueba integral del propietario. No se habilita ninguna guarda Emulator en producción.

## Uso de este incremento

Administración → Laboratorio de operaciones muestra un aviso permanente de datos sintéticos.
Sin configuración explícita se mantiene bloqueado. Con autorización validada, “Registrar sesión
sintética” crea sólo metadatos y su auditoría; no crea una operación. Reintentar tras error conserva
el commandId mientras la página siga abierta. Recargar inicia una intención nueva.

## Modelo y acceso

- `operationsLabV1/{sha256(uid)}/sessions/{commandId}`: propietario, schema, modo sintético y fecha servidor.
- `.../commands/{commandId}`: resultado y digest inmutables.
- `.../events/{commandId}`: acción, actor y fecha. Tres documentos en una transacción.
- No documento raíz necesario; las consultas nunca realizan collectionGroup global.
- Sólo se aceptan UUID v4 y el campo commandId. Sin nombres, teléfonos ni importes.
- Token Firebase verificado con revocación, cuenta activa, correo verificado, administrador actual
  y UID incluido en allowlist de servidor. El navegador no elige propietario ni rol.
- Listado acotado a las 20 últimas sesiones del UID; respuestas no-store.
- La exclusión nueva en firestore.rules **restringe** el fallback administrativo actual: ningún
  cliente SDK, incluido admin, puede consultar/escribir esta raíz. No hay cambios Storage.
- No eliminaciones, migraciones, llamadas externas, numeración ni archivos.

## Configuración futura (no aplicada)

`OPERATIONS_LAB_ENABLED=true` y `OPERATIONS_LAB_ADMIN_UIDS=["UID_AUTORIZADO"]`, variables sólo
servidor. La ausencia, false o JSON inválido deniega el acceso. Nunca NEXT_PUBLIC ni wildcard.
No se configuró ningún UID real. Deshabilitar el primer valor detiene nuevas llamadas; una
transacción ya en vuelo puede terminar. No borra sesiones ni altera operación normal.
**Antes de habilitar** debe aprobarse y desplegarse la exclusión restrictiva de Rules y verificarse
la denegación SDK. No activar el código contra las Rules antiguas. No se realizó ese despliegue.

## Auditoría de integración y siguientes incrementos

1. Este PR: frontera de acceso y sesiones, sin servicios de negocio.
2. Contexto tipado de persistencia: adaptar referencias de solicitud, presupuesto, Acceptance,
   contrato y Storage para aceptar exclusivamente un ámbito de laboratorio comprobado. Mantener
   rutas normales y sus guardas. No usar un proxy genérico de Firestore ni cambiar variables de
   entorno en cada request. Las rutas globales actuales en operationFinancialV2Server y las
   comprobaciones de `EMULATOR_ONLY`/`demo-cuenta-hogar` requieren refactor con regresiones.
3. Documentos y entrega sintéticos: misma proyección/cláusulas y motores, identificadores propios,
   watermark `DOCUMENTO DE PRUEBA — SIN VALIDEZ CONTRACTUAL O FISCAL`, sin logo en pagaré;
   archivos privados y pruebas contra rutas cruzadas. Nunca snapshots/numeradores normales.
4. Finanzas: reutilizar FIFO, reversas, recibos y extracción IVA incluido desde snapshot persistido;
   una sola fuente scoped, sin CAE, ARCA o deuda adicional. Ninguna distribución fiscal inventada.
5. Tres vistas y permisos: previews etiquetadas + cuentas sintéticas independientes y vínculos
   explícitos por sesión. No crear cuentas Auth ni claims productivos dentro de esta tarea.
6. Recorrido integral, pruebas negativas y revisión de aislamiento antes de proponer publicación.

## Riesgos / requisitos de revisión

La protección de Admin SDK depende de autorización del servidor: no se delega en Rules.
El servicio de sesiones sólo debe invocarse después de autenticar; sus UID no son entradas del
navegador. No exportar este servicio a APIs de afiliado/cliente sin una política específica.
La allowlist no sustituye el rol administrador. Las sesiones no tienen datos comerciales y la
lista es acotada, pero no hay purga automática ni cuota de creación en este incremento.
La revocación debe comprobarse cada llamada; el historial visual ya recibido no se puede retirar
del navegador. Las siguientes fases deben limpiar las proyecciones sensibles al revocar acceso.
Las guardas legales/financieras existentes permanecen intactas. El laboratorio completo sigue
pendiente y **no se validó** aquí entrega, pagos, PDF ni sincronización de tres perfiles en web.
