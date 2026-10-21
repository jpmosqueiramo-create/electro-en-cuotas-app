# Manifiesto pendiente — identidad y perfiles ficticios

Sólo diagnóstico; ninguna acción productiva ejecutada.

Proyecto: `negocio-facil-page`. Fecha de consulta: 2026-10-21T20:25:53.844Z.

La cuenta indicada por el propietario fue confirmada mediante el correo visible de la sesión y lookup administrativo exacto en Firebase Authentication: activa, correo verificado, sin perfiles vinculados por UID. No se infirió el correo ni se extrajeron tokens de la sesión. UID y correo completos no se publican en este documento.

Propuesta pendiente: crear un perfil V2 nuevo para esa cuenta, tras confirmar identidad y porcentaje individual. No reutilizar uno ficticio por semejanza de nombre. Falta autorización específica de la vinculación y definición del porcentaje; no se propone uno por defecto. No crear otra cuenta Auth ni modificar credenciales.

## Cinco perfiles existentes

| Alias | ID exacto del perfil | Dependencias encontradas | Eventos/comandos de registro | Propuesta |
|---|---|---:|---:|---|
| P1 | `Bvy3WwNocfDLsFxoog3j` | 0 | 0 | Conservar; cualquier limpieza requiere aprobación |
| P2 | `aEBuY4d9rzFW1ZieLMYB` | 0 | 0 | Conservar; cualquier limpieza requiere aprobación |
| P3 | `oLoAvszqpw0jtyiLjoMl` | 0 | 0 | Conservar; cualquier limpieza requiere aprobación |
| P4 | `wtSUHv6gJdCwnR8qnjM6` | 0 | 0 | Conservar; cualquier limpieza requiere aprobación |
| P5 | `yHlMvdSAHQs8z3bjUPQl` | 0 | 0 | Conservar; cualquier limpieza requiere aprobación |

Los cinco están activos, sin UID ni configuraciones porcentuales versionadas. El propietario los identifica como ficticios; no se convierten en identidades reales automáticamente.

## Alcance del inventario

Se consultaron referencias explícitas por ID de perfil y email registrado en `solicitudes`, `solicitudes_cuenta`, `ledger_comisiones_movimientos`, `liquidaciones_comision`, `vendedores_configuraciones_comision`, `rendiciones_efectivo`, `ledger_custodia_efectivo`, `notificaciones` y `pagos_comisiones`; asignaciones y custodia de `presupuestos_v2/*/contracts/*`, índice de asignaciones y subcolecciones `registryHistory` / `registryCommands`.

No se consultaron documentos personales ni se buscó por DNI o semejanza de nombre. La ausencia de referencias en estos campos no autoriza borrar: antes de una limpieza futura debe repetirse el inventario, verificar metadatos y aprobar la lista exacta. No hay propuesta de borrar comisiones, operaciones ni solicitudes.

El manifiesto técnico local con UID exacto permanece fuera de Git en `/tmp/ch-unified-affiliate-manifest.json`. Es evidencia temporal para preparar una autorización, no un script de aplicación.

IDENTITY_CHANGES_EXECUTED = 0
PROFILES_DELETED = 0
PROFILES_DEACTIVATED = 0
PRODUCTION_BUSINESS_WRITES = 0
