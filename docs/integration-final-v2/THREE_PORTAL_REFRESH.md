# Actualización del plan en los tres portales

Este cambio se apoya en el PR fiscal, sin habilitar emisión ni cobranza productiva.

`financialSummary` agrega al modelo de lectura la cantidad de cuotas abonadas, las pendientes (incluidas las parciales) y el saldo de la primera cuota pendiente. Los tres roles reciben esos valores desde el servidor autorizado; no hay otro saldo local, colección nueva ni cambios de imputación FIFO, importes, vencimientos o estados persistidos.

El componente compartido consulta al recuperar conexión, foco o visibilidad, y cada 30 segundos mientras está visible. No consulta automáticamente durante un comando o la paginación. Cada respuesta se identifica por secuencia: una respuesta antigua no puede reemplazar una más reciente. Un fallo de autorización limpia la vista financiera. Los comandos mantienen su identificador para reintentos y no se duplican por el refresco. La paginación sigue acotada y comprueba la revisión.

No es un canal push: otro cambio puede tardar hasta 30 segundos en una pestaña visible; al volver a ella se revalida. El refresco vuelve a la primera página de recibos para no mezclar revisiones. Los datos ya vistos no pueden retirarse de la memoria de una persona; el servidor vuelve a comprobar autorización en cada consulta. El costo adicional es como máximo dos consultas periódicas por minuto y operación visible, además de foco/reconexión; el costo real depende de las lecturas internas y cantidad de operaciones montadas. Antes de escalar deberá evaluarse una consulta agregada o suscripción mediada por servidor.

Pruebas: resumen parcial, cancelación y reversa; tres roles con igual saldo; navegador desktop/mobile, reconexión tras reversa y respuesta anterior liberada después de la nueva; paginación de 51 recibos; aislamiento de UID y ausencia de cambios en presupuesto, Acceptance y borrador.
