# Bandeja unificada de Cobranzas

Cobranzas reúne las tareas del circuito actual: cuotas vencidas, informes de pago
pendientes de acreditación y efectivo pendiente de rendir por vendedores afiliados.
No agrega campos, colecciones, documentos ni formularios de carga. No cambia los
motores financieros, las comisiones, las reglas de Firestore ni las liquidaciones.

## Lectura y cantidades

- Usa las rutas administrativas existentes de presupuestos, contratos, saldos,
  informes de pago y vendedores afiliados. Conserva la autorización de cada ruta.
- Consulta todas las páginas de informes antes de publicar cantidad e importe.
  Elimina duplicados por ID y rechaza cursores repetidos, páginas inválidas o una
  consulta que no puede completarse. No presenta una primera página como total.
- Agrupa por presupuesto, versión e identidad inmutable de operación. Nunca por
  nombre, email o DNI. Los informes de primera cuota aparecen antes de activarse
  el plan. Una operación vencida con varios informes ocupa un solo caso.
- Cuotas vencidas: cantidad de cuotas con saldo y suma de sus saldos guardados,
  según la lectura financiera y el día de Argentina. No suma el saldo futuro.
- Pagos por confirmar: cantidad e importe de informes PENDING; no reduce la deuda.
- Rendiciones: cantidad de vendedores afiliados con saldo positivo en custodia y
  suma de esos saldos, incluidos los inactivos. Se conserva la comisión guardada
  de cada cobro; se revisa al confirmar la rendición en el formulario existente.
- No hay un total que mezcle estas tres etapas: pueden superponerse y el efectivo
  en custodia corresponde a pagos que ya fueron acreditados al cliente.
- Fallos independientes conservan las otras fuentes. Se informa lo no verificado,
  sin convertirlo en cero. Valores inválidos o negativos de custodia quedan sin
  verificar. Las sumas de presentación exigen enteros seguros en centavos.
- Actualiza al volver a la página, recuperar conexión, guardar un pago o rendición,
  modificar el registro de vendedores afiliados y cada 60 segundos si está visible.
  Cancela consultas sustituidas y limita cada GET a 25 segundos. Son lecturas
  independientes; no constituyen un cierre contable ni un snapshot global atómico.

## Trabajo del administrador

Las tarjetas del resumen filtran los casos. La búsqueda admite cliente, contrato
CH y vendedor afiliado, con/sin tildes. Muestra 20 casos por vez; el resto se puede
abrir sin truncar los totales. Los informes se revisan antes de recordar una cuota.

Desde un caso se abre la cobranza existente. Desde una rendición se abre la cuenta
del vendedor afiliado directamente en Efectivo y rendiciones. Se conservan los
mismos comandos, revisiones e idempotencia; el modal impide cerrarse durante un
registro o ante una respuesta incierta. Al cerrar devuelve el foco al origen o
al título de la bandeja si el pendiente dejó de existir.

La consulta completa de operaciones y próximos vencimientos queda plegada. Sus
fichas y contactos se montan al abrirla. El recordatorio por WhatsApp sólo se ofrece
si se verificó que la operación no tiene informes pendientes. Los informes y
registros históricos siguen accesibles por separado con sus fuentes originales;
no se migran ni se mezclan sus saldos con los contratos actuales.

## Verificación

- `node --import tsx scripts/testCollectionsInbox.ts`: saldos exactos con pagos
  parciales, agrupación, identidades homónimas distintas, informes previos a la
  activación, 51 informes paginados, deduplicación, cursores repetidos, fallo en
  segunda página, fuentes caídas, vendedor afiliado inactivo y estados visibles.
- `scripts/testCollectionsInboxEmulator.ts`: rutas administrativas reales con
  Auth/Firestore/Storage en emuladores, emisión, primera cuota informada y confirmada,
  vencimientos, efectivo, transferencia, rendición neta, pago directo parcial,
  prohibición a rol vendedor afiliado y ausencia de escrituras al leer la bandeja.
  Requiere las variables de aislamiento de AGENTS.md y una base demo nueva; admite
  `COLLECTIONS_INBOX_BROWSER=1` para revisión local por navegador.
- Regresión: CollectionsOverview, pagos entre tres paneles, rendiciones netas y
  simulación completa de 12/18 cuotas, además de TypeScript, ESLint y build.
- Las bases nombradas del emulador prueban dominio y autorización de rutas; tienen
  reglas abiertas y no demuestran validación por Firestore Rules. No se usan datos
  productivos ni se despliegan reglas.
