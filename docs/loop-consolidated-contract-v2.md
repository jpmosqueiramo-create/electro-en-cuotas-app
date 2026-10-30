# Paquete consolidado LOOP: mandato, anexos y pagaré

## Alcance

Implementa los cinco modelos contractuales entregados por el titular el 30/10/2026,
la memoria de cálculo y la tabla por tamaño del Excel proporcionado. La fuente de
cada PDF contractual y su SHA-256 están en
`src/lib/productionV2/proposedPackages/loop-consolidated-20261030.json`.
La autorización del titular sustituye las leyendas editoriales de modelo/revisión
pendiente; no se atribuye una certificación fiscal al software.

El PDF MANDATE contiene contrato y anexos I, II y III. PAGARE es un PDF separado,
sin logo, con monto en letras/números, lugar de pago y un vencimiento único fijo.
El Anexo III se completa al entregar: emitirlo no registra recepción o firmas.
No se emiten comprobantes fiscales ni se modifica ARCA.

## Catálogo y tarifas

- `productos/{id}.categoriaLogistica`: campo privado opcional `A|B|C|D|null`.
  Los productos existentes permanecen sin categoría hasta su clasificación expresa.
- `configuracion_general/loop_tarifas_servicios`: documento privado administrado
  por API autenticada. `schemaVersion=LOOP_SERVICE_TARIFFS_V1`, `revision` entero,
  `tariffs` con A/B/C/D y tres importes enteros en centavos por categoría:
  `managementCents`, `deliveryCents`, `assistanceCents`. Todos incluyen IVA.
  Guarda `updatedBy` y `updatedAt`; cada revisión se conserva en `revisions/{n}`.
- GET/POST `/api/admin/catalogo/tarifas-servicios` verifican identidad administrativa.
  POST exige `expectedRevision`; una escritura concurrente no sobrescribe tarifas.
- Las tarifas del Excel se muestran como referencia editable. No se activan hasta
  que Administración las guarda. Ninguna escritura productiva forma parte de tests.
- `categoriaLogisticaSnapshot`, opcional, se conserva en las referencias privadas
  de presupuestos. Los snapshots antiguos sin este campo mantienen su identidad.
  La allowlist pública de presupuestos/catálogo no se amplía con costos o proveedor.

## Importes y fechas

Los motores de factores y redondeo no cambian. Se utiliza el costo, factor,
cuota y total de las condiciones guardadas. El Excel sin redondeo y el sistema
NEXT_90_V1 pueden arrojar importes distintos: nunca se sustituye el total aceptado.

El nuevo `commercialPreparation.loop` usa `version=LOOP_MANDATE_BREAKDOWN_V2`,
con categoría, revisión de tarifas, tarifas exactas, otros servicios, desglose
neto/IVA, precio sin financiación, fechas y amortización. Reutiliza el contenedor
comercial anterior con política discriminada `LOOP_REAL_SERVICE_TARIFFS_V2`.
Los valores históricos 40/60 se siguen validando con su política original.

```
precio sin financiación = capital proveedor + servicios brutos
financiación bruta = total guardado - precio sin financiación
capital + servicios netos + IVA servicios + interés neto + IVA interés = total
```

Se calcula XIRR con días efectivos y año de 365 días. La primera cuota ocurre en
la fecha de entrega guardada; la TNA equivalente de referencia usa 12 períodos
mensuales. La tasa implícita de los flujos incluye IVA financiero y no se denomina
CFT validado. CFT y su criterio son datos expresamente informados por Administración;
no se inventan a partir del factor ni se sustituyen por la TEA. Los informes fuente
no fijan el criterio normativo del CFT ni el calendario fiscal.

La amortización se concilia en centavos mediante diferencias acumuladas; cada fila
separa interés neto e IVA incluido. La suma del IVA por filas puede diferir un
centavo de la división global: es una conciliación contractual informativa, no una
factura ni una política de devengamiento fiscal.

Los servicios no pueden exceder el total. Un pago único íntegro en la entrega con
diferencia financiera positiva no define una tasa por tiempo: requiere corregir
las condiciones. No se inventan factores para los planes vacíos del Excel ni se
importa su caída del factor de 18 cuotas. Se conservan los factores del sistema.

## Integridad y compatibilidad

Guardar la nueva preparación usa tarifas leídas en la transacción del servidor;
el navegador no puede enviar importes de tarifa arbitrarios. Una preparación
existente conserva su revisión hasta que se aplica explícitamente una vigente.
Cambios en tarifas generales no cambian contratos ni conformidades existentes.
Cambiar condiciones contractuales invalida la conformidad por el digest existente.

Antes de emitir se validan conciliación con el cronograma, proveedor/CUIT, CFT y
criterio informado, fechas/canal de la respuesta original y pagaré completo.
La referencia de aceptación proviene de la conformidad vigente, no de un texto
inventado por el emisor. La fecha de aceptación es la informada por Administración;
no se presenta como verificación independiente del mensaje original. Es necesario
conservar propuesta y respuesta originales como requieren los modelos.

La ampliación de longitud se limita a `commercialPreparationJson` (20.000 caracteres)
para incluir hasta 18 filas; los demás parámetros conservan sus límites previos.
El snapshot y el paquete siguen protegidos por hashes; no hay migración de contratos
emitidos ni regeneración de PDFs históricos. El nuevo paquete se agrega al catálogo
inmutable. La numeración, auditoría, permisos e idempotencia existentes se reutilizan.

El alcance no cambia los motores de cobro, precancelación, liquidaciones, factura
fiscal ni firma/entrega. Las cláusulas describen el régimen del nuevo paquete;
registrar firmas/recepción o calcular una cancelación real son acciones distintas.
El PR #114 de enlaces de conformidad sigue siendo un cambio independiente.

## Verificación

- `scripts/testLoopContractDisclosure.ts`: ejemplo numérico, XIRR, IVA, saldo final,
  cambios de fechas, tarifas inválidas, redondeo preservado y privacidad de DTO.
- `scripts/testLoopConsolidatedEmulator.ts`: revisiones concurrentes de tarifas,
  snapshots, pérdida de vigencia de conformidad, emisión sintética, recuperación
  idempotente y lectura privada de ambos PDF. Con `LOOP_BROWSER=1`, prueba API,
  guardado desde la UI y tamaños 1280/390 contra Emulator.
- Regresiones: catálogo, referencias de presupuesto y motor canónico; tsc, eslint,
  build y manifiesto del renderizador. No se despliega desde estas suites.

## Fuentes de cálculo revisadas

| Archivo proporcionado | SHA-256 |
| --- | --- |
| 06_Logica_Calculo_Loop.pdf | `6109f76383e23723d27aa5f7fdef4265b85511ef1ce05e2bcb120dc2bb8dd849` |
| 07_Informe_para_Contador_Loop.pdf | `348b1b4ad104ea1a70bf8acc70dea6f3c13efcdabb278ec3854b61e31256e3ec` |
| 08_Super_Calculadora_Loop_Factores_y_Tamanos.xlsx | `7c125c3293f989c25f975c3a7111ae0f3634e9db501855a80ad3c3f197ce4bb6` |
