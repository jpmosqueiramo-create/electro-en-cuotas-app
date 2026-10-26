# Retirar registros de Administración y acceso a emisión definitiva

Base: `be58ed1e933f47884cc59ade32ffc2fc54710880`.

## Uso

- **Solicitudes:** Eliminar solicitud, motivo, verificación y confirmación. Con relaciones históricas, se archiva.
- **Presupuestos:** Eliminar presupuesto abre el flujo existente. «Eliminar de la bandeja» permite retirar el presupuesto conservando sus dependencias. La limpieza definitiva preexistente conserva sus validaciones, API y auditoría.
- **Contrato abierto:** Eliminar contrato en el encabezado. Un borrador se retira de forma recuperable; un contrato cerrado, congelado o con registros financieros se archiva. Los saldos, pagos, instrumentos y fechas originales no cambian.
- Activar «Mostrar eliminadas/os y archivadas/os» para restaurar solicitudes o presupuestos. En el contrato, Restaurar contrato permanece en el encabezado. Se exige otro motivo y confirmación.

Eliminar recuperablemente no equivale a rescindir un instrumento, cancelar deuda ni revocar accesos financieros legítimos. Los módulos de logística y cuotas conservan sus permisos y validaciones. El formulario privado de un contrato retirado queda bloqueado hasta su restauración.

## Persistencia y compatibilidad

La API autenticada `POST /api/admin/registros/eliminacion` admite PREVIEW y comandos REMOVE/RESTORE. Revalida Auth activa y verificada, identidad administrativa, inventario y versión antes de confirmar.

Se utiliza el espacio **ya denegado al SDK**:

```
presupuestos_v2/_administrative_records_v1/contracts/{sha256(subject)}
  commands/{commandId}
```

No se crea un documento raíz de presupuesto ficticio. El sujeto diferencia colección de solicitud, ID, tipo y versión contractual. El marcador contiene `schemaVersion: ADMIN_RECORD_STATE_V1`, `subject`, `state: ACTIVE|DELETED|ARCHIVED`, `revision` entera, `at` ISO UTC, `reason` y `by`. Cada comando inmutable contiene digest, sujeto, acción, actor, motivo, estado anterior, rutas consultadas que se conservan y resultado.

Primera retirada: marcador y comando atómicos. Restauración: actualización del marcador y un nuevo comando. El replay idéntico devuelve el resultado anterior sin escrituras; otra intención requiere nueva verificación. Un cambio entre PREVIEW y confirmación se rechaza. No se modifica ni elimina ningún documento canónico. No se necesita migración ni cambio de Rules, índices o Storage. Las rutas consultadas son referencias preservadas, no un inventario de borrado recursivo.

Los registros históricos sin marcador siguen activos. La lista de presupuestos y las páginas de solicitudes incorporan el estado administrativo sin reescribir los originales. Se bloquean nuevas escrituras contractuales, vistas previas y congelamiento de contratos retirados; SAVE/ISSUE/aceptación de presupuestos retirados y creación desde una solicitud retirada también se rechazan. Restaurar devuelve el acceso al flujo anterior, sujeto a sus controles.

## Emisión definitiva con CH

El acceso existente ahora aparece directamente en el paso **Contrato y pagaré**, como «Emisión definitiva del contrato y pagaré». La asignación irreversible se identifica como «Asignar CH y preparar emisión». No se sustituye por una descarga de borrador ni se construye otro motor.

Este PR **no activa producción** ni inventa aprobaciones. `finalPackages.json` sigue vacío y las guardas permanecen intactas. Para habilitar la emisión faltan:

1. Instalar mediante revisión el paquete exacto con versiones/hashes y las referencias formales exigidas por el catálogo. Registrar su aprobación identificada con profesional, fecha y evidencia; una declaración del propietario no se registra como profesional inexistente.
2. Revisar y autorizar el cambio exacto de configuración: `PRODUCTION_OPERATIONS_ENABLED=true` y `PRODUCTION_OPERATION_ADMIN_UIDS` con el UID administrativo verificado. Laboratorio y ARCA permanecen deshabilitados.
3. Autorizar el expediente concreto con conformidad vigente, identidad, READY, fechas/lugares y desglose explícito que concilie con el total persistido. No equiparar automáticamente capital/servicios y CFT.
4. Confirmar la asignación CH y la emisión de esa operación. Nunca reinicializar el contador ni consumir un número durante las pruebas.

No se cambian textos jurídicos, importes, cuotas, fórmulas, firmas o evidencias de entrega. La emisión sintética de regresión usa exclusivamente los motores existentes en `demo-cuenta-hogar`, sin efectos reales.

## Verificación

Ver `VALIDATION.md`. Capturas de interfaz con datos sintéticos en `screenshots/`.
