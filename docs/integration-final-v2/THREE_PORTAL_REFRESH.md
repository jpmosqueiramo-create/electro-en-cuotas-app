# Actualización del plan en los tres portales

Base actual: `main` en `2d79baf85482112b4e39cb89dd85e2e62c9fa5b7`, con #74 y #76 integrados. No habilita emisión ni cobranza productiva.

`financialSummary` agrega al modelo de lectura la cantidad de cuotas abonadas, las pendientes (incluidas las parciales) y el saldo de la primera cuota pendiente. Los tres roles reciben esos valores desde el servidor autorizado; no hay otro saldo local, colección nueva ni cambios de imputación FIFO, importes, vencimientos o estados persistidos.

El componente compartido consulta al recuperar conexión, foco o visibilidad, y cada 30 segundos mientras está visible. No consulta automáticamente durante un comando o la paginación. Cada respuesta se identifica por secuencia: una respuesta antigua no puede reemplazar una más reciente. Un fallo de autorización limpia la vista financiera. Los comandos mantienen su identificador para reintentos y no se duplican por el refresco. La paginación sigue acotada y comprueba la revisión.

No es un canal push: otro cambio puede tardar hasta 30 segundos en una pestaña visible; al volver a ella se revalida. El refresco vuelve a la primera página de recibos para no mezclar revisiones. Los datos ya vistos no pueden retirarse de la memoria de una persona; el servidor vuelve a comprobar autorización en cada consulta. El costo adicional es como máximo dos consultas periódicas por minuto y operación visible, además de foco/reconexión; el costo real depende de las lecturas internas y cantidad de operaciones montadas. Antes de escalar deberá evaluarse una consulta agregada o suscripción mediada por servidor.

Pruebas: resumen parcial, cancelación y reversa; tres roles con igual saldo; navegador desktop/mobile, reconexión tras reversa y respuesta anterior liberada después de la nueva; paginación de 51 recibos; aislamiento de UID y ausencia de cambios en presupuesto, Acceptance y borrador.

## Preparación para merge de #77

Se incorporó main sin conflictos textuales y se cambió la base del mismo PR a main. El diff funcional contiene exclusivamente `OperationFinancialWorkspace.tsx`, `operationFinancialV2.ts` y sus dos runners financieros. El resto son informes y evidencia sintética. Los archivos fiscales, de revocación #74, Rules y configuración no difieren de main. No se incluyó #75, que sigue siendo independiente.

| Validación ejecutada nuevamente | Resultado |
| --- | --- |
| TypeScript, ESLint diferencial, build, test:safe | PASS |
| Fiscal puro y Emulator: IVA incluido, replay, concurrencia | PASS |
| Recorrido integral: 22 etapas | PASS |
| Contrato, entrega y controles financieros: 21 controles | PASS |
| Cliente: revocación activa, concurrencia, múltiples servicios | PASS |
| Finanzas: parciales, completos, FIFO, reversas, recibos y permisos | PASS |
| Afiliados: asignación, comisiones, recuperación y aislamiento | PASS |
| Navegador desktop/mobile, paginación de 51 recibos | PASS |
| Red offline real mediante CDP, reconexión, foco y evento de visibilidad | PASS |
| Respuesta anterior retenida después de reversa | PASS |
| Cliente revocado: HTTP directo 403, reconexión, respuesta retenida y recarga | PASS |
| PDF comparado con snapshot: 12 importes y vencimientos exactos | PASS |

Se amplió el runner de navegador: captura una respuesta válida antes de revocar mediante el comando administrativo existente, comprueba que una consulta posterior denegada limpia el estado y libera la respuesta anterior para verificar que no restaura saldo ni recibos. Después comprueba URL directa y recarga. No se modificó la lógica de autorización ni el motor financiero.

El primer lanzador local incluyó por error `testLegalApprovalEmulator.ts`, exclusivo de #75 y ausente de este main: esa invocación quedó bloqueada por archivo inexistente. Se corrigió el lanzador local y se ejecutaron todas las suites aplicables indicadas arriba; no se incorporó código de #75 ni se alteraron assertions para obtener PASS.

### Importes preservados

- Capital: $580.000; servicios brutos: $1.160.000; total: $1.740.000.
- Cronograma: 12 cuotas de $145.000, idéntico en contrato, snapshot y ledger. Pagaré por $1.740.000.
- Ejemplo fiscal exclusivamente sintético al 21%: neto $958.677,69 + IVA contenido $201.322,31 = servicios $1.160.000. No se agrega IVA a la deuda.
- Pago parcial visual de $72.500: saldo $1.667.500 y remanente de primera cuota $72.500 en los tres perfiles.
- Pagos completos y reversas conservan imputación, recibos y cronograma. Las comisiones se calculan y recuperan en sus registros separados, sin alterar la deuda del cliente.

### Evidencia y límites

Capturas nuevas de Administración, afiliado, cliente y cliente revocado, comparación PDF y hashes de logs: `docs/evidence/pr77-main/`.

El refresco no es push: hasta 30 segundos mientras la pestaña está visible, o al recuperar foco/conexión/visibilidad. Una vista previamente recibida puede permanecer visible hasta la siguiente revalidación; al denegarse acceso se limpia y una respuesta antigua no la restaura. Los refrescos vuelven a la primera página para no mezclar revisiones.

La simulación fiscal no equivale a facturación ARCA. La aprobación jurídica documental exacta y la habilitación productiva financiera siguen pendientes. No se modificaron producción, Rules, IAM, secretos, archivos históricos ni configuración. No hubo merge de PR ni deploy. El script local no versionado permanece intacto y excluido.
