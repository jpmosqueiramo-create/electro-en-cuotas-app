# Auditoría focalizada y cierre de preparación — PR #80

HEAD recibido: `a8e2978f58ed79ecb838d623a0af61c7ff0299e0`. Main remoto comprobado: `70b47ef75ae94ba8decc61550b6ea98b096a72ee`.

**La preparación y las correcciones de este cierre no habilitan el lanzamiento de instrumentos reales.** Hay pendientes documentales exactos y recuperación de emisión todavía no implementada. El PR se conserva en borrador; no se recomienda activar emisión real mediante este estado.

## Matriz breve de lanzamiento

| Clasificación | Funcionalidad | Resultado / siguiente requisito |
|---|---|---|
| Lista técnicamente para uso vigente | Administración, solicitudes, presupuestos/Acceptance, datos, revisión crediticia, proveedor y seguimiento | Se conserva la operatoria existente; correcciones de lecturas y Auth verificadas. No supone una nueva autorización comercial |
| Implementada, requiere configuración | Adaptador normal de congelamiento/CH, documentos privados, tres firmas y custodia, entrega, activación única del ledger, pagos/reversas/recibos y portales | Prueba local integral PASS. Requiere catálogo exacto aprobado, inicialización CH autorizada, UID/roles existentes y autorización por operación. Cerrar pendientes técnicos antes de emitir |
| Requiere aprobación documental/jurídica | Mandato, pagaré y remito definitivos | Originales identificados, cambios derivados cotejados; faltan versiones finales exactas, evidencia profesional, representación/facultades y jurisdicción. Remito aprobado no identificado. Catálogo vacío |
| Defecto o capacidad técnica pendiente | Recuperación tras vencimiento de autorización de emisión; fecha efectiva al cambiar el día UTC | No se debe operar con reparaciones manuales de snapshot/fecha. Ver P1 y P2; no se retiraron validadores para aprobar el circuito |
| No habilitada | ARCA real y liquidaciones productivas de comisiones | Fuera de la activación de este PR; recibo no equivale a comprobante fiscal. Devengos/reversas siguen el motor existente |

## Qué se auditó

Los 93 archivos de la revisión recibida comprenden **44 archivos src, 10 scripts, 10 documentos/resultados, 23 PNG y 6 PDF**; no son 93 motores de negocio. [REVIEWED_FILES.md](REVIEWED_FILES.md) enumera cada ruta y superficie. Revisión estática focalizada de fronteras y flujos, con regresiones pertinentes; no es una auditoría de infraestructura productiva ni una certificación jurídica.

| Riesgo | Evidencia y conclusión |
|---|---|
| Roles / acceso cruzado | Runtime opaco en servidor, proyecto exacto y allowlist; HTTP verifica Auth. Cliente requiere UID y vínculo activo, afiliado requiere asignación vigente. Token revocado/cuenta deshabilitada/rol anterior ahora rechazados por el helper administrativo compartido |
| Duplicación de pagaré | Origen/snapshot/número determinísticos, transacción única; tres rutas Storage create-only vinculadas al mismo snapshot, generación y hash; concurrencia/replay/recuperación no crean otro instrumento |
| PDF alterado o reemplazado | Bytes, tamaño, SHA-256 y generación comprobados fuera de transacciones; manifiesto conjunto; no URLs permanentes públicas. Hash del renderer estabilizado y gate de build |
| Históricos | Aprobaciones históricas se prueban contra paquete instalado inmutable, sin exigir renderer actual para leerlas. Nuevas aprobaciones/emisiones sí exigen renderer exacto. No se reescriben hashes, aceptaciones ni `updateTime` históricos |
| Pagos / vencimientos | Un único snapshot y ledger; importes en centavos, FIFO, recibo concordante, comando idempotente, revisión optimista y reversa auditada. Economía/fechas originales intactas |
| Comisiones | Se devengan por imputación acreditada y se revierten en la misma transacción financiera; beneficiario/porcentaje congelados; no se suman a deuda del cliente |
| Revocación | Permiso revocado bloquea nuevos actos, conserva lectura e historia; aprobación de paquete revocada bloquea pruebas de escritura. La renovación de autorización vencida no se improvisa |
| Firmas y custodia | Tres firmas y evidencias de los documentos emitidos, identidad, originales y ausencia de incidencias. Se corrigió el bloqueo circular que impedía terminar una transferencia de originales después de entrega |
| Aislamiento de tests | Sólo proyecto demo y hosts locales; runtime de test rechaza proyecto real/credenciales/entorno productivo. Browser usa exports de rutas existentes en un proceso local aislado. No se desplegó endpoint de test ni se utilizaron cuentas productivas |
| Seguridad de activación | Catálogo vacío, flag y allowlist de servidor, contador no inicializado automáticamente, READY/identidad/crédito/conformidad y autorización por operación. Desplegar código o declarar aprobación no basta |

## Correcciones de este cierre

1. **Identidad administrativa vigente** — `adminAuth.ts`: `verifyIdToken(..., true)` y usuario Auth actual. Se rechazan revocación, deshabilitación y email/rol obsoletos, sin elevar roles ni cambiar Auth productivo. Coste operativo: una consulta actual de usuario adicional por comprobación administrativa; falla cerrada si Auth no responde.
2. **Hash reproducible del generador** — se reemplazó `Function.toString()` por un manifiesto versionado de 17 fuentes y recursos/dependencias bloqueadas. Misma identidad con tsx y bundle minificado. `prebuild` verifica bytes y falla ante cambios; sólo `--write` explícito regenera. Los datos del catálogo van en `finalPackages.json`, separado del manifiesto para evitar una dependencia circular de hashes. Sigue vacío. No cambió el texto ni el layout de los PDF.
3. **Lectura histórica** — `authorization.ts`: renderer actual exigido al registrar/autorizar una nueva emisión, no al leer una prueba histórica ya emitida. El paquete exacto instalado y hashes persistidos siguen siendo obligatorios. No se elimina ni migra el catálogo anterior.
4. **Custodia de originales posterior a entrega** — `gates.ts`: permite leer una transferencia pendiente para que los participantes autorizados la concluyan. Sigue bloqueando nuevos pagos, activaciones e invitaciones mientras esté pendiente. Reproducido antes del arreglo con `PRODUCTION_DELIVERY_REQUIRED`; probado después con confirmación de emisor/receptor y evento de entrega intacto.

No se modificaron cláusulas, fórmula económica, snapshot histórico, Rules, IAM, secretos, usuarios, configuración ni documentos productivos. El adaptador Emulator anterior y los módulos del Laboratorio no tienen cambios.

## Pendientes precisos

### P1 — Recuperación después de vencer la autorización

`authorization.ts` exige vigencia para ISSUANCE; `documents.ts` revalida en cada etapa. Si se congeló y la escritura de archivos se interrumpió hasta después de vencer el permiso, la recuperación se bloquea. `authorizeOperation` parte de READY y no renueva un snapshot ya congelado. Es un bloqueo seguro, pero no una solución operativa completa.

Antes de emitir: implementar/revisar un comando de recuperación con autorización independiente, ligado al mismo snapshot, número, paquete y hashes; revocable, idempotente y auditable, que no cambie la fecha ni genere otro pagaré. No editar directamente la autorización anterior ni quitar la caducidad. Prueba necesaria: interrupción, vencimiento, rechazo, autorización exacta de recuperación y ausencia de segundo instrumento. Esta capacidad no se declara PASS ni habilitada.

### P2 — Fecha efectiva y límites del panel

- `freeze.ts` compara la fecha formal con el día UTC (`toISOString().slice(0,10)`). En Argentina puede ser el día siguiente después de las 21:00. No inferir otra fecha legal ni pedir al operador falsificarla: fijar y probar una política explícita de fecha/lugar efectivos antes de habilitar emisión en esa franja.
- `overview.ts` limita aprobaciones a 50 y autorizaciones a 20. No filtra el acceso, pero puede ocultar una aprobación antigua todavía válida. Añadir búsqueda/paginación antes de superar esos volúmenes; no cargar toda la colección sin límite.
- La revocación por operación sí tiene API/UI; la revocación global de un paquete se verifica en servidor pero no tiene comando administrativo de registro en este PR. Procedimiento disponible: pausa global de escrituras y revocación de permisos individuales autorizadas. No borrar aprobaciones ni catálogo.
- El día de emisión y el número se fijan al congelar. Una cancelación posterior no debe reutilizar ese número; requiere procedimiento de conservación/anulación definido, sin eliminación.

### Observaciones de interfaz no bloqueantes del circuito local

Las pantallas conservan algunos estados técnicos (`DELIVERED`, `AFFILIATE`) y formularios largos. No hay desbordamiento horizontal en las capturas revisadas; una mejora de etiquetas puede separarse del cierre de integridad. El aviso de alertas SDK denegadas con el admin sintético es preexistente en el harness (no afecta las APIs servidor del recorrido); no se relajaron Rules. No se afirma ausencia absoluta de mensajes de consola.

## Pruebas realizadas y reutilizadas

Los comandos y resultados de este cierre están en [CLOSURE_TEST_RESULTS.md](CLOSURE_TEST_RESULTS.md). Se repitió sólo lo afectado: identidad/hash, adaptador/custodia/históricos y navegador por el cambio de Auth. Se conservaron las suites previamente aprobadas sin repetirlas por documentación.

La prueba integral del adaptador usa un paquete **ficticio**, sólo instalado en el factory de Emulator, marcado sin validez. Demuestra conexión técnica y controles, no aprobación del mandato/pagaré/remito finales todavía ausentes.

## Recomendación

Mantener el PR en revisión hasta resolver P1 y decidir/cerrar la fecha efectiva; en paralelo, completar la evidencia documental exacta. La [configuración preparada](LAUNCH_CONFIGURATION.md) separa merge, publicación cerrada, catálogo, numeración, roles y autorizaciones reales. No se ejecutó ninguna de esas mutaciones ni se recomienda retirar controles para acelerar el lanzamiento.
