# Presupuestos ↔ Catálogo: auditoría y arquitectura de unificación P1

Estado: **DISEÑO, NO IMPLEMENTADO**. Base auditada: `7a0ce6739bcabbf1633cd716556af0367d447d82` (main). Repositorio: `/Users/juanpablomosqueiramorales/Developer/CUENTA-HOGAR-CODEX`.

P1 realiza análisis estático y crea este documento. No consulta producción, no modifica aplicación, motores, Rules ni datos y no prueba uploads. Las afirmaciones de comportamiento se deducen del código de esta base; no son resultados de ejecución ni un inventario productivo nuevo. Los nombres de interfaces, componentes y colecciones V2 siguientes son propuestas.

## 1. Decisiones y límites

Cuenta Hogar prepara propuestas de **gestión de compra mediante mandato**. Un presupuesto nuevo contiene 1..N alternativas del bien solicitado, no una canasta acumulativa. Su aceptación identifica exactamente una opción. Puede registrar un plan preferido entre los ofrecidos, de forma opcional y sin constituir la condición contractual final. No suma alternativas ni rechaza individualmente las no seleccionadas.

Toda opción nueva utilizará el mismo configurador que Catálogo Admin V2: `CatalogReferenceDraft`, `CATALOGO_REFERENCIA_FACTORES_DEFAULT`, planes enteros 1..18, `calcularPlanReferenciaCatalogo()` y `NEXT_90_V1`. No se crea otro motor financiero. El cálculo de referencia no genera deuda, fiscalidad ni cronograma contractual.

Al emitir/archivar se congela una versión. Aceptar copia todos los planes ofrecidos de la opción elegida y, si se indica preferencia, su importe del snapshot; nunca vuelve a consultar o calcular desde catálogo. La aceptación lleva a `DOCUMENTACION`; no confecciona Contrato, Pagaré, Remito ni Entrega. Los cuatro documentos previstos son opcionales. Después de Documentación se confeccionará el contrato y se definirá/confirmará el plan contractual definitivo. P1 fija esta separación, pero no diseña las condiciones ni implementa la etapa contractual.

Históricos `CANONICAL_V1`, `MANUAL_FACTOR_V1`, `MIXED_V1` y formatos anteriores permanecen legibles, con sus importes, estructura y snapshots originales. `MANUAL_FACTOR_V1` será `HISTORICAL_COMPATIBILITY_ONLY`; esto es el destino diseñado, no el estado de la UI actual.

## 2. Fuentes y precedencia

Se usan AGENTS.md, CODEX_RUNTIME.md y las tres fuentes solicitadas de catálogo, junto con la aplicación y helpers referidos abajo. C0 describe una etapa histórica: sus ubicaciones del antiguo editor, propuesta inicial de redondeo y consumidores públicos no reemplazan al código C1–C5. C3 y el cierre C5 acreditan el estado posterior. La privacidad cerrada del catálogo no equivale a una auditoría de todos los documentos de solicitudes o Storage.

| Fuente en esta base | Responsabilidad revisada / evidencia |
| --- | --- |
| `src/app/admin/presupuestos/page.tsx` | Lectura de ambas solicitudes, editor completo, lista, incorporación, persistencia, PDF y WhatsApp |
| `src/lib/manualBudgetProduct.ts` | Tipos, defaults, cálculo, snapshots, alta privada legacy, duplicación y allowlists |
| `src/lib/budgetEditorLifecycle.ts` | Apertura, edición histórica, invalidación, upsert, duplicación y vinculación de leads |
| `src/lib/catalogReference.ts:6` | Defaults C1, cálculo, redondeo, adaptador legacy y DTO público |
| `src/lib/catalogReferenceEditor.ts:6` | Draft C3, inicialización y patch privado |
| `src/components/admin/catalog/CatalogReferenceWorkspace.tsx:41` | Editor, seis secciones, uploads, save privado y comandos C2 separados |
| `src/components/admin/catalog/CatalogReferencePreview.tsx:4` | Preview exclusivamente desde DTO público |
| `src/app/admin/validaciones/page.tsx` | Segundo editor legacy, aceptación, documentos, contrato, logística y cobranza |
| `src/lib/pdfGenerator.ts:1098` | Contrato de entrada y render del presupuesto; otros generadores legales/recibos delimitan los consumidores posteriores |
| `src/app/api/admin/calcular-pricing/route.ts` | Admin auth, capital/plazos privados y CANONICAL_V1 server-side |
| `src/app/api/propuesta/{crear,consultar,aceptar}/route.ts` y `src/app/propuesta/page.tsx` | Circuito electrónico separado basado en `propuestas`, token y OTP |
| `src/lib/adminDocumentacionReadModel.ts` / `adminDocumentacionReader.ts` | Normalización documental sin mutaciones y sin importar handlers legacy |
| `src/lib/budgetAlertRouting.ts`, `HomeTechCatalog.tsx`, `PublicCatalog.tsx`, `solicitar/page.tsx` | Intake y derivación a Administración |
| `src/app/cliente/page.tsx`, `src/app/afiliado/page.tsx` | Cargas actuales y validaciones documentales obligatorias |
| `firestore.rules`, `firebase.json`, `src/lib/catalogReferenceImages.ts` | Acceso, límites de emulación y riesgo de reutilizar uploads de imágenes públicas |

## 3. Configurador actual: dos ramas que no equivalen a C3

### 3.1 CATALOGO / CANONICAL_V1

`presupuestos/page.tsx:426` lee `productos` como Admin, lo que es compatible con su privacidad. Construye un modelo mínimo con `costoProducto`, nombre, descripción, `codigoProducto`, proveedor y una imagen. No conserva la configuración C3 completa de factores, SKU/EAN separados y múltiples imágenes. Los plazos provienen de arrays legacy o, como fallback UI, de claves truthy de `planesActivos`.

`handleCalcularPricing` (`:607`) llama `/api/admin/calcular-pricing` con producto, plazo y seña. El servidor verifica Admin, lee el costo desde Firestore (capitalCompraCentavos → costoCentavos → costoProducto → costo), exige arrays `plazosHabilitados`/`plazosHabilitadosProducto`/`plazos` y configuración global de TNA/IVA. No acepta factores del navegador como sustituto. La rama de plazo individual admite 1..18; el motor valida el dominio. El fallback UI desde `planesActivos` no existe en esa API: una ficha C3 puede aparecer seleccionable y fallar por configuración canónica ausente.

`createCatalogBudgetItem` conserva `pricingSnapshot` canónico y un único plazo elegido. Los importes de centavos se convierten/redondean a pesos para el item; se preserva además el resultado original. El `precioContado` del item se toma del total comercial, no del costo ni necesariamente del parámetro homónimo. La cantidad no se aplica de la misma manera que en manuales. No debe inferirse equivalencia de esos aliases.

### 3.2 MANUAL_PRESUPUESTO / MANUAL_FACTOR_V1

`manualBudgetProduct.ts:12,342,397` deriva los defaults de `FACTORES_PREDETERMINADOS` (`financialEngine.ts:7`): 1..12,18,24. La unión con mapas custom puede admitir más claves positivas. Faltan 13..17 en el default; existe 24 fuera de C1. El default de activación es todos activos; una clave distinta de false se interpreta activa. Un factor inválido puede sustituirse por fallback, a diferencia de C1.

Cálculo actual: total = round(costo × factor), saldo = max(total − anticipo, 0), cuota = round(saldo / cuotas). No usa NEXT_90_V1. `precioContado` explícito se respeta o se deriva del factor 12; las referencias cuota8/12 se generan con reglas legacy. El plazo inválido/inactivo cae a un fallback; no garantiza que un borrador con todos los planes inactivos se rechace.

El editor muestra costo, proveedor, código mixto, categoría, descripción comercial, observaciones internas, URL única visible, plazo y anticipo. Los tipos soportan marca/modelo y arrays de imágenes, pero la UI visible no es el editor C3 de hasta cuatro imágenes. Incorporar crea snapshot manual con factores, habilitación, resultados de planes, fecha, seña y plazo; la opción comercial conserva **un plazo seleccionado**, no una oferta explícita de todos los planes activos. La cantidad multiplica valores manuales. Duplicar conserva snapshots, cambia itemId y desactiva el guardado opcional.

### 3.3 Divergencias concretas

| Aspecto | Presupuesto actual | Catálogo C1/C3 / objetivo nuevo |
| --- | --- | --- |
| Modelo de edición | Dos formularios y otro editor en Validaciones | Un solo draft/modelo y componente compartido |
| Pricing de referencia | Catálogo canónico TNA/IVA; manual factor legacy | C1 de referencia; sin alterar CANONICAL_V1 global |
| Factores de ejemplo (8/12/18) | Manual 2.12 / 2.50 / 3.25 | 2.31 / 3.00 / 4.04 |
| Dominio de planes | Manual 1..12,18,24 + custom; catálogo depende de arrays | Exactamente 1..18; 24 sólo histórico |
| Activación inicial | Manual todos activos; fallback activo salvo false | Nuevo draft todos inactivos; selección explícita |
| Factor inválido | Fallback manual | Error explícito, no inventar factor |
| Redondeo | Math.round; canónico en centavos con residual | NEXT_90_V1 para referencia comercial |
| Identificación | codigoProducto mixto | skuInterno y codigoBarras separados; privados |
| Imágenes | URL visible única; arrays parciales en tipos | Lista ordenada hasta cuatro, mismo comportamiento compartido |
| Planes ofertados | Un plazo por item; resultados internos manuales | Lista explícita de todos los planes ofrecidos por opción |
| Anticipo | Modifica cuota actual | No introducir en C1 una fórmula nueva; ver límite abajo |
| Guardar privado | Constructor legacy y setDoc completo | Patch C3 / alta privada explícita, publicación separada |
| Persistencia histórica | Puede editar/reemplazar y resetear estado | Versión emitida congelada, revisión explícita |

NEXT_90_V1 preserva miles exactos: 145000 → 145000, 230000 → 230000. En otro caso busca la próxima terminación 90 mayor o igual: 42137 → 42190; 78412 → 78490; 145833 → 145890; 145890 → 145890; 145891 → 145990; 99999 → 100090. Estos son ejemplos de la regla leída, no resultados de una suite ejecutada en P1.

No trasladar la seña legacy al cálculo de referencia restándola y recalculando cuotas: C1 no acepta anticipo. V2 inicial no ofrecerá esa modificación financiera. Si se requiere una seña nueva, necesita política comercial explícita posterior y snapshot propio; los anticipos históricos se conservan. Tampoco se deriva un precio contado nuevo del costo o de factor12.

## 4. Multiopción actual y persistencia

`InternalBudgetItem` contiene itemId, source, pricingMode, productoId opcional, información comercial y administrativa, pricingSnapshot/manualSnapshot. La lista permite agregar, editar, duplicar y eliminar opciones (`budgetEditorLifecycle.ts:370–480`; UI `presupuestos/page.tsx:1458`). Upsert por itemId mantiene posición, append incorpora al final y eliminar filtra; no hay reorder explícito. Los IDs nuevos usan fecha/azar; históricos sin ID reciben `item-hist-${idx}`. Índice y nombre no son una identidad durable para aceptación.

`buildEffectiveItemsForSave` incorpora el borrador pendiente sin duplicarlo en el mismo guardado. `handleGuardarPresupuesto` serializa items completos en `presupuestos[]`, dentro de `solicitudes` o `solicitudes_cuenta`; conserva campos internos y snapshots. El agregado superior usa principalmente la primera opción, **no una suma uniforme**. `MIXED_V1` distingue mezcla de modos. El historial tiene además entradas sintéticas Pendiente, que no son presupuestos persistidos.

Problemas actuales de persistencia (`presupuestos/page.tsx:750–966`):

- Reutiliza ID al editar, reemplaza la versión y fija `Generado`, aunque el presupuesto previo se hubiera enviado. No hay guardia de inmutabilidad por estado en la acción Editar.
- Reemplaza arrays leídos previamente con getDoc/updateDoc; no transacción. Dos administradores pueden perder cambios. La ref local savingInFlight sólo evita doble clic en esa instancia.
- Alta opcional de manual en `productos` ocurre antes del presupuesto. Un fallo posterior puede dejar referencia huérfana. El ID determinístico budget/item ayuda al retry, pero setDoc completo puede reemplazar campos ya existentes; no hace compare-and-create ni preserva todo el schema C3.
- Ese constructor no fija activo/publicado false ni todos los campos C3. No llama C2 ni publica `catalogo_publico`; no confundir ausencia de publicación con corrección del alta privada legacy.
- Nueva solicitud requiere confirmación, pero addDoc no aporta idempotencia durable en reintentos. Solicitud vinculada faltante falla sin crear otra silenciosamente: preservar esa protección.
- Hay búsquedas por nombre, resolución por ID sin colección y deduplicación que omite colección. Mantener `sourceCollection + documentId` durante todo V2, incluso con IDs iguales en ambas fuentes.

### 4.1 Dónde se suman importes

| Lugar | Operación observada | Tratamiento V2 |
| --- | --- | --- |
| `presupuestos/page.tsx:1172,1269,1282`, `totalCuota` | reduce de todas las cuotas; fallback de importe mostrado y habilitación PDF; primera opción suele dominar el display | Ningún agregado entre alternativas, ni fallback financiero combinado |
| `validaciones/page.tsx:947–951` | Suma valorCuota, contado/precioContado/costoProveedor y valorCuota×cuotas entre seleccionados | Sustituir sólo para V2 por una selección única del snapshot |
| `validaciones/page.tsx:1147,1267–1268` | Editor contractual vuelve a sumar cuota/contado/total; sumTotal se calcula allí pero no se utiliza en el resultado mostrado | Nunca enviar alternativas V2 a ese editor acumulativo |
| `validaciones/page.tsx:2537` | Suma costo proveedor de todas las alternativas como total administrativo | No presentarlo como costo de operación aceptada |
| `pdfGenerator.ts:341` y consumidores de contrato | Acumulación de bienes contractuales, contexto legal histórico | Conservar histórico; fuera del happy path V2 |
| `validaciones/page.tsx:4202–4204` | Sumas de cuotas pagadas/pendientes de un cronograma | Son cobranza de una operación, no alternativas; no eliminar por esta unificación |

Conclusión: hoy hay **ambas semánticas según el flujo**. PDF/WhatsApp llaman alternativas a los items; aceptación y contrato pueden tratarlos como bienes acumulativos, incluso con plazos distintos.

## 5. Aceptación actual problemática y circuitos equivalentes

### 5.1 Handler legacy de Validaciones

`toggleItemSelection` (`:902`) opera con índices, permite 1..N, impide deseleccionar el último y por defecto selecciona todos. El historial usa checkboxes (`:2485–2505`) y habilita Aceptar para Enviado (`:2568`). No hay selector de un plan entre varios ofrecidos por una opción.

`handleAceptarPresupuesto` (`:925–991`):

1. Busca presupuesto y filtra items por índices, o crea fallback legacy de un item.
2. Exige al menos uno, no exactamente uno. Combina cuotas, contado y total; toma el número de cuotas del primer item. El total calculado no incorpora el anticipo explícito.
3. Confirma “opciones/productos” y “Cuota Mensual Combinada”.
4. Marca presupuesto Aceptado e incorpora itemsSeleccionados. Marca **los otros presupuestos de la solicitud** Rechazado, aunque no sean opciones del mismo presupuesto. No marca individualmente como rechazadas las alternativas no elegidas del array; conservar esta distinción al corregir el modelo.
5. Escribe itemsContrato, productoDeseado concatenado con ` + `, precioContado/costoProducto/costoBien, montoCuota, totalFinanciado, planElegido y estado `Aprobado_Presupuesto`.
6. Ofrece confeccionar Contrato/Pagaré/Remito (`:984,2605`). **No genera los PDFs automáticamente al pulsar aceptar**, pero orienta el circuito directamente al editor contractual, sin etapa Documentación explícita.

La colección se deduce por presencia del ID en aperturas. Es ambiguo con IDs iguales. No hay transacción ni guardia durable de aceptación única/opción/plan. Aceptar nuevamente puede sobrescribir la elección. `handleOpenContratoEditor` (`:1129`) usa catálogo vivo por nombre, defaults y reconstrucciones financieras si falta información; no sirve como lector inmutable de aceptación V2.

Además existe un editor completo dentro de Validaciones (`:227–321,742–900,2214`): factores legacy, cálculo inverso desde cuota y TNA, borradores, edición de Enviado con estado reiniciado, WhatsApp y PDF directos. No basta con reemplazar el formulario de `/admin/presupuestos`: los puntos de creación legacy deben quedar cerrados para NUEVOS V2 cuando el rollout esté listo, manteniendo lectura histórica.

### 5.2 Propuestas electrónicas: sistema separado

`/api/propuesta/crear` guarda otro array `propuestas`, IDs/versiones, un plan por propuesta y validación de total/seña. `/propuesta` selecciona propuesta única. `/api/propuesta/aceptar` está detrás de habilitación explícita/proveedor WhatsApp, token/DNI/OTP, transacción y snapshot `propuestaAceptada`; cambia a `PROPOSAL_ACCEPTED`, no al estado legacy. `/consultar` aplica una allowlist comercial, pero también devuelve mensajeAdmin libre.

No equivale a `presupuestos[]`, no resuelve la conservación de todos los planes de una opción con preferencia opcional por optionId ni habilita su reutilización automática. La resolución de solicitud prueba colecciones por orden. Los reintentos posteriores pueden fallar por OTP usado/token revocado/aceptación existente en vez de devolver el mismo resultado. P4 necesita un comando V2 común con identidad completa; una eventual integración electrónica deberá mantener autenticación y evidencias y no reinterpretar presupuestos históricos. P1 no activa ese feature gate ni cambia contratos/OTP.

## 6. Arquitectura objetivo compartida

Propuesta: extraer de Workspace C3 un `ReferenceConfigurator` controlado y un reducer puro alrededor de `CatalogReferenceDraft`. Los dos contenedores consumen exactamente el mismo componente/modelo para identificación, información interna, planes, descripción e imágenes. La sección de publicación sigue siendo responsabilidad exclusiva del contenedor Catálogo. Presupuestos muestra sus propias acciones Incorporar opción / Guardar presupuesto y, si corresponde, Guardar también como referencia.

El modelo puro expone inicialización, cambios de campo/factor/activación, reset explícito de factores, validación y construcción del snapshot. No contiene Firestore, Storage ni comandos C2. No duplica fórmulas o defaults. Los adaptadores de persistencia e imágenes se inyectan desde los contenedores. Cambiar factor no activa un plan; reset de factores no cambia planes activos.

- Referencia existente: cargar ficha privada por ID como Admin, adaptar con C1 y copiar a draft independiente; modificar el draft del presupuesto no edita la ficha ni su publicación.
- Nueva referencia para presupuesto: mismo configurador, opcionalmente nombre solicitado precargado, resto sin inventar. Al menos nombre/costo válidos y un plan ofrecido válido antes de emitir; misma validación compartida de imágenes. Publicar en catálogo conserva sus exigencias propias (descripción/1..4 imágenes), sin imponer publicación al presupuesto.
- `plansOffered` se obtiene sólo de los planes que Admin decide ofrecer y que tienen factor/importe válido. No activar ausentes ni interpretar 24 como 18. Conservar todos esos planes en el snapshot; no guardar sólo el plazo visual seleccionado.
- Opciones son alternativas del mismo pedido; cantidad de alternativa V2 inicial es una referencia, no soporte implícito de bundles o suma de cantidades legacy.
- Validar nuevamente el draft en servidor Admin antes de emitir, utilizando C1. Emitir confirma esa revisión calculada, luego aceptar/PDF/WhatsApp sólo leen el snapshot. No recalcular silenciosamente una oferta emitida.

### 6.1 Guardado opcional de referencia privada

Por defecto sólo snapshot, sin escritura en productos. Con “Guardar también como referencia”, crear ficha privada con schema/patch C3, flags `activo:false`, `publicado:false` e identidad persistente de origen. Nunca invocar publishCatalogReference ni escribir catalogo_publico. Una ficha existente seleccionada no se sobrescribe al guardar presupuesto.

Usar ID de comando estable y clave de creación basada en la tupla budgetId/optionId con codificación sin colisiones (no truncar/sanitizar ambiguamente). En retry, una ficha de ese origen idéntica se reutiliza; contenido distinto o ID ocupado produce conflicto, nunca setDoc destructivo. Si emisión y alta privada se confirman juntas, transacción Firestore con todas las lecturas antes de escrituras; no incluir uploads externos dentro de ella. Crear archivos primero con identificación temporal y confirmar metadata sólo al éxito; fallos quedan recuperables y visibles, sin publicar ni confirmar éxito parcial.

C2/C3 siguen siendo la vía explícita posterior: Previsualizar publicación → Publicar; Cambios sin publicar → Previsualizar cambios → Publicar cambios; Publicada actual → Ver publicación. No alterar endpoints C2 ni sus fingerprints.

## 7. Tipos conceptuales V2 (no implementados)

`MoneyARS` usa pesos con precisión contractual de referencia C1; cuotaEstimada es entero seguro positivo. `Timestamp` representa Timestamp Firestore en persistencia; los DTO de transporte convierten de forma explícita a ISO sin degradar referencias/sentinels ni serializar indiscriminadamente objetos SDK. Los readonly expresan intención; la inmutabilidad real debe imponerse en servidor.

```ts
type MoneyARS = number;
type SourceCollection = "solicitudes" | "solicitudes_cuenta";
type BudgetState = "BORRADOR" | "GENERADO" | "ENVIADO"
  | "ACEPTADO" | "RECHAZADO" | "CANCELADO";
type SourceIdentity = Readonly<{
  sourceCollection: SourceCollection;
  documentId: string;
}>;
type OfferedPlanV2 = Readonly<{
  cuotas: number; // entero 1..18, único dentro de la opción
  cuotaEstimada: MoneyARS; // salida C1 congelada
  // Sólo si fue definido, mostrado y congelado al emitir:
  totalComercial?: MoneyARS;
}>;
interface BudgetReferenceSnapshotV2 {
  readonly schemaVersion: 2;
  readonly referenceId: string | null;
  readonly source: "PRIVATE_REFERENCE" | "BUDGET_ONLY";
  readonly nombre: string;
  readonly descripcion: string;
  readonly imagenUrls: readonly string[];
  readonly planesOfrecidos: readonly OfferedPlanV2[];
  readonly fechaCotizacion: Timestamp;
  readonly calculationVersion: "CATALOG_REFERENCE_V1";
  readonly roundingStrategy: "NEXT_90_V1";
  readonly internal: Readonly<{
    costoProveedorSnapshot: MoneyARS;
    proveedorSnapshot: string;
    factoresSnapshot: Readonly<Record<number, number>>;
    planesActivosSnapshot: Readonly<Record<number, boolean>>;
    skuInternoSnapshot: string | null;
    codigoBarrasSnapshot: string | null;
    // Trazabilidad C1, no DTO cliente ni deuda contractual:
    calculosPorPlan: readonly Readonly<{
      cuotas: number;
      valorTotalReferencia: MoneyARS;
      cuotaBaseReferencia: MoneyARS;
    }>[];
  }>;
}
interface BudgetOptionV2 {
  readonly optionId: string; // UUID/ID opaco estable; nunca posición
  readonly snapshot: BudgetReferenceSnapshotV2;
}
interface BudgetV2 {
  readonly schemaVersion: 2;
  readonly budgetId: string;
  readonly budgetVersion: number;
  readonly source: SourceIdentity;
  readonly options: readonly BudgetOptionV2[]; // 1..N, orden congelado
  readonly createdAt: Timestamp;
  readonly createdBy: string;
  readonly issuedAt: Timestamp | null; // null sólo en borrador
  readonly validUntil: Timestamp | null; // política explícita, no default inferido
  readonly clientSnapshot: Readonly<{
    nombre: string; dni: string | null;
    whatsapp: string; localidad: string | null;
  }>;
  readonly publicNotes: string;
  readonly contentFingerprint: string;
  // estado y aceptación se almacenan aparte de la versión comercial
}
interface BudgetAcceptanceSnapshot {
  readonly schemaVersion: 2;
  readonly acceptanceId: string;
  readonly source: SourceIdentity;
  readonly budgetId: string;
  readonly budgetVersion: number;
  readonly contentFingerprint: string;
  readonly acceptedAt: Timestamp;
  readonly acceptedBy: string; // identidad Admin verificada en servidor
  readonly channel: "ADMIN_RECORDED";
  readonly acceptedOptionId: string;
  readonly referenceId: string | null;
  readonly nombreSnapshot: string;
  readonly descripcionSnapshot: string;
  readonly imagenUrlsSnapshot: readonly string[];
  readonly planesOfrecidosSnapshot: readonly OfferedPlanV2[]; // todos los de la opción aceptada
  readonly preferredPlanCuotas?: number; // preferencia inicial, no plan contractual
  readonly preferredPlanAmountSnapshot?: MoneyARS; // copiado del plan preferido ofrecido
  readonly workflowStage: "DOCUMENTACION";
}
type OptionalDocumentType = "DNI_FRENTE" | "DNI_DORSO"
  | "SERVICIO_DOMICILIO" | "RECIBO_SUELDO";
interface OptionalDocumentSlot {
  readonly slotId: string;
  readonly type: OptionalDocumentType;
  readonly required: false;
  readonly state: "SIN_CARGAR" | "CARGADO" | "OBSERVADO";
  readonly file: null | Readonly<{
    storagePath: string | null; // null para URL legacy no gestionada
    url: string | null; // referencia privada/legacy, nunca DTO público
    uploadedAt: Timestamp | null; // null si legacy desconocido
    uploadedBy: string | null;
    originalName: string | null; // sólo metadata privada saneada
    contentType: string | null;
    sizeBytes: number | null;
    legacyOrigin?: Readonly<{ source: SourceIdentity; fieldPath: string }>;
  }>;
  readonly observation: string | null;
}
```

`calculationVersion` identifica la referencia C1, no un motor financiero alternativo ni un renombrado falso de CANONICAL_V1. El schema V2 discrimina el lector. No introducir valores nuevos en los enums legacy y esperar que sus handlers los interpreten correctamente. El tipo de borrador debe permitir incompletos, pero emisión exige todas las invariantes de versión; el bloque anterior representa el contrato persistido conceptual.

La opción aceptada, los planes ofrecidos y la preferencia inicial registrada son evidencia congelada. Ejemplo: Heladera X ofrece 8, 12 y 18 cuotas; la aceptación puede indicar preferencia de 12 o no indicar ninguna. El contrato posterior puede definir 8, 12 o 18 según la confección/confirmación contractual, sin sobrescribir esa aceptación ni el presupuesto. El registro contractual separado deberá referenciar acceptanceId, budgetId y budgetVersion para auditar oferta, preferencia inicial y condición final; P1 no define sus importes, totales ni cronograma. Un cambio de plan contractual no se trata como cambio de opción ni obliga a reabrir la aceptación.

Un total de referencia costo×factor puede diferir de cuotas×cuotaEstimada por NEXT_90_V1. No transformar uno en otro al aceptar, PDF o WhatsApp. Sólo exponer un total comercial que realmente se haya definido y mostrado en esa versión; si no existe, omitirlo. Fiscalidad, tasa y cronograma no se deducen de esos importes estimados.

## 8. Persistencia, estados e inmutabilidad

Propuesta de espacio **privado** nuevo: `presupuestos_v2/{budgetId}` como metadata con source y versión activa; `presupuestos_v2/{budgetId}/versions/{version}` para BudgetV2; aceptación/documentación separadas, referenciadas por ID. Es una propuesta de schema para revisión de P2/P4, no un cambio de colección vigente ni una migración silenciosa. El catchall actual es Admin-only; los comandos servidor requieren igualmente autorización explícita porque Admin SDK omite Rules.

No insertar snapshots internos V2 en solicitudes legibles por titular. En solicitud conservar únicamente referencias opacas y estado mínimo compatible; el portal cliente consume un DTO por allowlist y autorización de pertenencia, nunca documento privado completo. No usar catalogo_publico para presupuestos personales. No aumentar permisos ni reabrir productos como rollback.

| Estado | Transición objetivo / mutabilidad |
| --- | --- |
| BORRADOR | Edición con revisión esperada/CAS; aún no es oferta emitida |
| GENERADO | Emisión/archivo: snapshot congelado y fingerprint; puede exportarse PDF |
| ENVIADO | Evento sobre la misma versión, sin cambiar contenido ni fecha de emisión |
| ACEPTADO | Una aceptación única de esa versión, transacción y paso a Documentación |
| RECHAZADO | Decisión explícita sobre presupuesto completo, no cada alternativa |
| CANCELADO | Decisión explícita auditada; no borrado de versión ni aceptación |

No esperar hasta ENVIADO para congelar si GENERADO ya produjo un PDF entregable. Modificar una versión emitida crea BORRADOR de revisión con nuevo número, origen y motivo. No sobrescribir ni “recalcular al abrir”. Los eventos de envío y estado son metadata separada, no cambios al snapshot. Enviado por wa.me registra intención/acción, no entrega ni lectura acreditada. Vigencia y notas públicas también forman parte del snapshot; no elegir automáticamente entre 2 días de WhatsApp y 7 del PDF legacy.

Al iniciar revisión conservar la versión anterior consultable. Al emitir una nueva, registrar explícitamente sustitución/eligibilidad; una versión reemplazada no se acepta por accidente desde otra pestaña. Una operación/source no puede recibir dos aceptaciones activas de presupuestos distintos sin flujo autorizado de corrección. Histórico ya aceptado nunca se reabre automáticamente.

Imágenes: copiar la lista congela referencias URL, no los bytes de un recurso remoto mutable. Para garantizar archivo reproducible, emisión debe fijar objetos versionados inmutables o un artefacto privado con hash/retención, sin borrar objetos compartidos. Si sólo existe URL externa, mostrar esa limitación; no prometer inmutabilidad binaria ni hacer descarga productiva en P1.

## 9. Registrar aceptación desde historial

En `/admin/presupuestos`, para versión emitida elegible mostrar Registrar aceptación. Modal lee exclusivamente opciones/planes de esa versión: radio obligatorio de una opción y selector opcional de plan preferido, con posibilidad explícita de no indicar preferencia; sin checks múltiples ni índices como identidad. Cambiar opción borra la preferencia previa. Confirmación muestra opción, todos sus planes ofrecidos, versión y fuente; si hay preferencia, muestra cuotas e importe como preferencia inicial, no como condición contractual final. No contiene costo/proveedor/factor. La ausencia de preferencia nunca impide registrar aceptación.

El servidor recibe identidad completa, budgetId, versión, fingerprint esperado, optionId, commandId estable y opcionalmente preferredPlanCuotas. No acepta importe del cliente como autoridad. Verifica sesión Admin, pertenencia de presupuesto a solicitud, estado vigente, fingerprint y que exactamente esa opción existe una sola vez. Copia todos sus planes ofrecidos válidos, enteros 1..18 y con importes seguros. Si se indica preferencia, exige que corresponda a uno de esos planes y copia su importe en preferredPlanAmountSnapshot; sin preferencia, omite ambos campos y no elige un default. No consulta catálogo, no usa defaults y no construye itemsContrato.

### 9.1 Idempotencia y concurrencia

Clave de aceptación determinística por identidad completa de solicitud + budgetId + budgetVersion, codificada sin colisiones; commandId persiste en el cliente durante reintentos. Además guardia por solicitud impide aceptar otro presupuesto/version como segunda operación. La transacción lee source, metadata/versión, guardia y aceptación antes de escribir:

1. Si ya existe la misma aceptación con mismo fingerprint/opción/preferencia opcional (incluida su ausencia), devolver snapshot y legajo existentes (sin duplicar eventos/slots/fechas).
2. Si existe aceptación con otra opción/versión, otra preferencia inicial (incluido pasar de ausente a presente) o guardia de otra oferta, responder conflicto y mostrar la registrada. No sobrescribir la evidencia de aceptación ni duplicar la operación. La posterior elección contractual usa su propio registro, no reenvía este comando para alterar la preferencia inicial.
3. Si no existe y es elegible, crear aceptación, enlace de expediente determinístico y cuatro slots opcionales, actualizar metadata a ACEPTADO y workflowStage DOCUMENTACION. Una única confirmación atómica; nunca alta aleatoria adicional ni rechazo automático de otros presupuestos.
4. Reintento concurrente o respuesta perdida se resuelve por guardia. Cancelación/revisión simultánea también lee la misma metadata y produce conflicto/retry consistente.

El snapshot de aceptación copia campos de la versión y **todos los planes ofrecidos de la opción aceptada**, con sus importes congelados. preferredPlanCuotas y preferredPlanAmountSnapshot son opcionales y se guardan juntos sólo si el cliente expresa preferencia; su importe sale de ese mismo snapshot. No almacena contractPlanCuotas, contractInstallmentAmount, contractTotal ni contractSchedule: pertenecen exclusivamente a la etapa CONTRATO. Las alternativas no seleccionadas permanecen íntegramente en options; no reciben estados de operación. Una corrección posterior exige comando separado, motivo/auditoría y política aprobada, fuera del happy path. Registrar aceptación administrativa no se presenta como firma legal/OTP del cliente.

```text
PRESUPUESTO_ENVIADO (o GENERADO archivado, confirmación explícita)
    → CLIENTE_ELIGE_UNA_OPCION [preferencia de plan opcional]
    → ACEPTACION_REGISTRADA [opción y todos sus planes ofrecidos congelados]
    → DOCUMENTACION [4 slots opcionales]
    → CONFECCION_DE_CONTRATO
    → DEFINICION_CONFIRMACION_PLAN_CONTRACTUAL_DEFINITIVO
    → CONTRATO + PAGARE + CIRCUITO_POSTERIOR
```

La emisión, aceptación y Documentación no generan deuda, comisiones, stock, entregas, contratos ni pagarés. El tramo contractual posterior del diagrama es sólo un boundary: su diseño y ejecución quedan fuera de P1. No reutilizar fetchAperturas legacy: contiene migración automática con escrituras (`validaciones/page.tsx:1424–1477`). Un loader V2 debe ser de sólo lectura, como los lectores actuales de Solicitudes/Documentación.

## 10. Documentación opcional y compatibilidad

Todos los slots iniciales tienen required=false y SIN_CARGAR. Una carga confirmada marca CARGADO, no revisado/aprobado. OBSERVADO guarda comentario sin convertir el documento en requisito. No se incorpora NO_SOLICITADO inicialmente: SIN_CARGAR más required=false basta. Falta de cualquiera o de los cuatro no bloquea automáticamente el expediente ni dispara rechazo/scoring. Tampoco completar cuatro archivos avanza por sí solo: una acción explícita termina Documentación y entrega control a la confección de contrato, donde se definirá/confirmará el plan definitivo. Las condiciones, controles y ejecución de esa etapa no se definen en P1.

### 10.1 Infraestructura actual y obligatoriedad

Hay Firebase Storage SDK con uploadBytes/getDownloadURL. Cliente usa `comprobantes/{uid}/{fecha}_{tipo}_{nombre}`; afiliado usa `comprobantes/afiliados/{uid}/...`; Admin `comprobantes/cuenta_solicitudes/...` (`validaciones/page.tsx:414`). Todos guardan URLs en Firestore. Nombres actuales pueden incluir filename original; no extrapolar ese patrón a documentación sensible nueva.

`cliente/page.tsx:426` y `afiliado/page.tsx:261` rechazan si falta cualquier dniFrente/dniDorso/reciboSueldo/servicio, con mensaje de documentos obligatorios. Son intake legacy, no el nuevo post-presupuesto. `/solicitar` deshabilita las fotos iniciales y persiste textos sentinel, no archivos. Admin permite adjuntos de ingresos/domicilio individuales. El nuevo flujo debe tener validador propio por archivo presente, sin reutilizar la condición de cuatro obligatorios. No cambiar esos formularios históricos como efecto lateral de P4.

No se localizó Storage Rules versionado ni configuración de emulador Storage en firebase.json. Por eso **no se acreditan permisos efectivos del bucket, aislamiento ni cargas seguras productivas**. `catalogReferenceImages.ts` comprime imágenes comerciales y cae a Data URL si falla/vence upload; eso no es una estrategia segura para DNI/recibo y no debe reutilizarse. El timeout tampoco cancela necesariamente la carga.

### 10.2 Arquitectura preparada para imágenes, no activación

Usar adaptador `DocumentUploadPort` separado: validar y preparar upload → cargar en ruta privada opaca por expediente/slot/uploadId → confirmar metadata con revisión esperada. Elegir ID persistente para retry, nunca sobrescribir archivo ya confirmado; conservar historial de reemplazos sin borrado automático. URL se resuelve sólo para usuario autorizado; preferir storagePath con lectura autenticada o enlace efímero, sin token permanente en listas, WhatsApp/PDF/público/logs. URL legacy se conserva restringida sin imprimirla.

Política propuesta para aprobar en P4: JPEG/PNG/WebP, máximo 10 MiB por archivo, un archivo vigente por slot, validación real de firma/MIME/tamaño en frontera confiable, nombres opacos y originalName saneado sólo como metadata privada. Rechazar otros formatos sin ejecutar OCR ni análisis documental; los límites de formato/tamaño no evalúan contenido ni autenticidad. Errores de una carga no borran el archivo previo ni generan CARGADO falso. Upload exitoso + fallo Firestore queda pendiente de reconciliación, no doble slot ni éxito simulado.

Antes de habilitar cargas: auditar/definir autorización Storage (Admin y, sólo si se autoriza, titular del expediente); denegar cruces de usuarios y acceso público; validar MIME/tamaño/propiedad sin confiar en navegador; probar en Storage Emulator con tarea de configuración autorizada. Si eso no está disponible, probar el puerto fake y mantener upload deshabilitado. No enviar fixtures a Storage real para simular aislamiento. Rules/deploy futuros requieren aprobación específica; P1 no los modifica.

### 10.3 Adapter legacy: referencias, no copias

| Fuente/campo existente | Slot / interpretación segura |
| --- | --- |
| solicitudes.documentos.dniFrente | DNI_FRENTE |
| solicitudes.documentos.dniDorso | DNI_DORSO |
| solicitudes.documentos.servicio | SERVICIO_DOMICILIO |
| solicitudes.documentos.reciboSueldo | RECIBO_SUELDO |
| solicitudes_cuenta.dniFrenteURL | DNI_FRENTE |
| solicitudes_cuenta.dniDorsoURL | DNI_DORSO |
| solicitudes_cuenta.comprobanteDomicilioURL | SERVICIO_DOMICILIO |
| solicitudes_cuenta.comprobanteURL | Adjunto ambiguo; **no asignar automáticamente RECIBO_SUELDO** |
| planPagos[].comprobanteUrl | Pago, no documento de identidad/ingresos; fuera de estos cuatro slots |

El lector documental actual ya distingue comprobanteURL como adjunto. `/solicitar:132–134` lo duplica desde DNI/sentinel; algunas migraciones legacy lo trataron como sueldo. Nunca inferir significado por existencia o nombre. Mostrar adjunto legacy disponible para clasificación administrativa explícita; si se confirma su tipo, crear vínculo lógico al mismo objeto, no nuevo upload. Sin confirmación, el slot de sueldo queda SIN_CARGAR y opcional.

Aceptar sólo URL http(s) utilizable sin credenciales embebidas para el adapter, conservando origen/campo y null para metadata histórica desconocida. “Pendiente envío WhatsApp”, “No requerido en solicitud inicial”, vacío o malformado no son URLs ni documentos cargados. Archivo registrado no acredita revisión ni aprobación. Si hay URL igual en varios campos, compartir referencia, no copiar bytes ni asignar significados nuevos. Prioridad: carga V2 confirmada del slot → vínculo legacy inequívoco → SIN_CARGAR; una observación V2 no desaparece al releer legacy. Si existen registros replicados en ambas colecciones, usar enlace explícito, no DNI/nombre como merge automático.

## 11. PDF, WhatsApp y privacidad

Estado actual:

- Presupuestos usa `toClientBudgetPayload`/`buildSanitizedPdfDatosFromBudget` y `buildClientWhatsAppMessage` (`manualBudgetProduct.ts:900–1146`). Filtran campos internos por allowlist. Multiopción se numera como alternativas, una cuota/plazo por item; el mapper no llena alternativasCuotas aunque el tipo lo contemple. WhatsApp no suma opciones.
- `generarPdfPresupuesto` (`pdfGenerator.ts:1119–1334`) imprime una fila por opción, declara alternativas independientes, pero calcula total por fila cuotas×valorCuota; no usa total guardado ni seña, no muestra realmente imagenUrls y no soporta todos los planes por opción. La paginación se controla después de filas, por lo que N grande requiere resolver saltos dentro del listado.
- PDF legacy fija validez 7 días, mientras helper WhatsApp usa default 2; incluye copy de scoring/verificación y post-venta que no debe copiarse al nuevo circuito opcional sin revisión comercial/legal. No modificar textos legales congelados en P1.
- Validaciones llama PDF con arrays raw y notas (`:862–899`); hoy el renderer no imprime proveedor/link aunque el tipo los admite. No equivale a una allowlist obligatoria en la frontera. Una descripción/nota libre puede incluir datos internos aun si se excluyen las claves.
- WhatsApp del editor puede mezclar nombre/datos de lead editables y fecha actual con presupuesto guardado; actualiza Enviado mediante array read-modify-write e ignora fallo antes de abrir wa.me. No acredita envío efectivo ni archivo inmutable.

Objetivo: un `ClientBudgetV2DTO` por allowlist explícita (también en anidados), con budgetId/versión/fecha/vigencia, datos mínimos del destinatario, opciones ordenadas con nombre/descripción/imágenes comerciales autorizadas y planesOfrecidos cuotas/cuotaEstimada. Excluir costo, proveedor, factores, SKU, EAN, márgenes, datos de configuración, observaciones internas, documento raw, rutas privadas y documentos personales. Reutilizar el principio de allowlists actual, no forzar V2 a la estructura de un item/unplan.

PDF y WhatsApp consumen **el mismo DTO de versión emitida**, sin catálogo vivo, Date.now de emisión ni recálculo de totales. Render por bloque Opción 1..N y filas de planes; nunca cuota/contado/total global de alternativas. Si se muestra total, procede literalmente del snapshot de ese plan. PDF pagina por bloque/fila y repite encabezados; no recorta N ni exige un máximo implícito de tres. WhatsApp segmenta mensajes largos con orden y budgetId/versión; conserva todas las alternativas/planes sin sumar ni truncar silenciosamente. No añadir enlace público ni autoenvío al proveedor como parte de P1.

Validar texto libre y revisión humana comercial antes de emitir: la allowlist de claves no detecta un proveedor escrito en descripción. Tests con canarios sensibles en nested fields y texto libre, URLs y nombres de archivo; no prometer garantía basada sólo en key filtering. Los PDFs legales/contrato y su división fiscal se mantienen fuera de esta fase.

### 11.1 Riesgo distinto al catálogo ya cerrado

`firestore.rules:57` permite al titular leer el documento completo solicitudes por email/UID/datosPersonales.email; Rules no filtra campos de un documento. El guardado actual puede incrustar presupuestos con costo/proveedor/factores/snapshots dentro de ese documento. Esto es un **riesgo estático condicionado a que existan esos datos en solicitudes accesibles**, no un leak productivo medido ni una reapertura del catálogo. No se consultó producción para determinar alcance. solicitudes_cuenta es Admin-only para lectura; tampoco conviene depender de esa diferencia para un schema común.

V2 debe mantener internos fuera de documentos legibles por cliente y probar autorización/DTO por rol en emulador antes de habilitar. El tratamiento de internos ya incrustados requiere auditoría y plan separado autorizado, sin migración ni borrado P1. El defecto conocido de permisos cuando clienteEmail falta y la deuda C6 permanecen independientes.

## 12. Intake, bandeja y continuidad

`HomeTechCatalog.tsx:124–210` crea contacto rápido en solicitudes_cuenta, intenta réplica solicitudes, alerta NUEVO_PRESUPUESTO con ID si disponible, notificación por `/api/notificar-presupuesto` y abre wa.me. Las reglas vigentes pueden rechazar los intentos incompatibles; los catches permiten continuar y no prueban persistencia. `PublicCatalog.tsx` y `/solicitar` usan la selección pública; cliente/afiliado tienen intake legacy a solicitudes. No se identificó un webhook WhatsApp que garantice alta automática: abrir wa.me no demuestra creación inbound por un proveedor.

`budgetAlertRouting.ts:342` construye ruta con alertaId/solicitudId y datos del lead; el resolver normaliza teléfono/DNI, desambigua y falla cerrado si no hay coincidencia. `budgetEditorLifecycle` evita reset por refetch, ignora async obsoleto y requiere vinculación/confirmación. Preservar esos comportamientos. Las vistas nuevas de Solicitudes conservan sourceCollection/documentId; los enlaces/resolución legacy de presupuesto aún pueden perder colección.

P3/P4 deberán transportar identidad completa hacia la confección y el historial, sin cambiar P1 la integración web/WhatsApp/notificaciones ni reutilizar loaders con mutaciones. Un lead sólo textual no se vincula por parecido de nombre: resolver explícitamente o confirmar alta nueva con idempotencia.

## 13. Compatibilidad y migración incremental

No modificar registros históricos ni recalcular al abrir/exportar. Adaptador de lectura con discriminación explícita: V2; CANONICAL_V1; MANUAL_FACTOR_V1; MIXED_V1; legacy sin schema. Mostrar importes almacenados y procedencia. Si faltan valores, indicar desconocido, sin rellenar desde catálogo/defaults ni fabricar oferta aceptable. Una identidad de presentación por índice legacy no autoriza aceptación V2. Las aceptaciones acumulativas ya existentes siguen visibles como tales; no convertirlas retroactivamente a opción única.

| Fase propuesta | Entrega y gate de salida |
| --- | --- |
| P2 | Extraer componente/reducer compartido y snapshots V2 puros; contrato de persistencia versionado, DTO e invariantes; Catálogo conserva comportamiento y endpoints. Paridad de18 planes/NEXT90 y cero cambios a motores/históricos |
| P3 | Presupuestos V2 1..N alternativas, snapshot-only/alta privada opcional, emisión inmutable/revisiones y listado dual. Nuevas creaciones convergen al configurador; ningún camino nuevo genera MANUAL_FACTOR_V1. Históricos siguen legibles sin editar importes |
| P4 | Aceptación archivada server-side transaccional, una opción con todos sus planes ofrecidos y preferencia opcional no definitiva, guardia por solicitud, Documentación opcional y adapter legacy; aprobación de seguridad Storage antes de activar upload. Nada de contrato/cronograma automático |
| P5 | DTO único PDF/WhatsApp, consistencia de versión/vigencia, integración legacy y E2E por roles; habilitación final sólo cuando los canales que compartan presupuesto consuman snapshot V2. Cierre de creadores legacy para nuevas operaciones y aceptación legacy inaccesible a V2 |

No big bang. Mantener V2 detrás de habilitación controlada hasta que aceptación y salidas estén listas; P3 no debe emitir ofertas a clientes por un canal legacy incompatible mientras P5 falta. No retirar rutas/lectores históricos ni migrar en background. Rollback deshabilita creación/aceptación V2 y deja lectura de snapshots; nunca recalcula historia, elimina aceptaciones, reabre productos ni publica privado.

## 14. Riesgos y gates de implementación posterior

| Riesgo | Severidad / control requerido antes de habilitar |
| --- | --- |
| Mezcla de alternativas y compras acumuladas | Alta: prohibir arrays múltiples en comando V2; prueba servidor con payload malicioso |
| Cambio silencioso de oferta emitida | Alta: versión/fingerprint/CAS, exportación reproducible y catálogo mutado después de emisión |
| Doble aceptación/concurrencia/retry | Alta: guardia transaccional por solicitud, IDs estables, conflictos de otra elección y respuesta perdida |
| Internos dentro de documento legible por cliente | Alta: persistencia privada V2 y DTO autorizado; auditoría legacy separada |
| Storage sin reglas acreditadas/URL permanente | Alta: acceso privado y pruebas aisladas antes de activar upload, sin fallback Data URL documental |
| Plazos/factores históricos o datos insuficientes | Media/alta: lector sin recálculo, revisión explícita, ningún fallback a 18/12/TNA |
| Contrato legacy reconstruye desde catálogo/defaults | Alta: no enrutar V2 allí; boundary posterior independiente |
| Alta privada antes de presupuesto / fullreplace | Media/alta: create/reuse por origen, atomicidad Firestore, no cambiar publicación ni stock |
| N grande y tamaño Firestore | Media: validar tamaño de versión y límites técnicos antes de escribir, sin truncar opciones; revisar partición si se necesita, no convertir N en un máximo comercial inventado |
| Imagen remota cambia | Media: objeto versionado/hash/retención; advertir límite de URL legacy |
| Copy/validez pública divergente | Media: un DTO y política de vigencia explícita, revisión comercial/legal de nuevos textos |

Gates que deberán ejecutarse sobre el SHA de cada implementación, **no ejecutados en P1**:

1. `git diff --check`, `npx tsc --noEmit`, ESLint de archivos tocados y build, más suites específicas del área y test:safe según runtime vigente.
2. Paridad C1/C3: defaults exactos, override inválido fail-closed,18 planes, activación explícita, redondeo miles exactos/siguientes90, sin tocar motores, fiscalidad o snapshots anteriores.
3. Snapshot: 1 y N opciones, orden/IDs estables tras duplicar/editar, varios planes, catálogo actualizado/eliminado sin cambiar oferta; fecha/vigencia/notas/imágenes reproducibles; emisión y revisión concurrentes.
4. Aceptación: exactamente una opción; aceptar sin preferencia y con cada preferencia ofrecida válida. Rechazar cero/múltiples opciones, opción desconocida, preferencia no ofrecida, otro source, mismoID en ambas fuentes, fingerprint obsoleto y versión sustituida. Verificar copia completa de todos los planes y ausencia de campos contractuales. Retry idéntico devuelve snapshot original; otra opción/preferencia produce conflicto; doble click/dos admins/timeout no duplican operación/legajo/slots. Caso de trazabilidad futura: oferta 8/12/18, preferencia12 y contrato8 o18 sin cambiar oferta ni preferencia inicial; el plan contractual no se implementa en P1.
5. Documentación: cero a cuatro archivos, ausencia de todos permite continuar explícitamente; observado no se convierte en requerido; adapter sin duplicados ni clasificación inventada; metadata desconocida null; reintentos/fallos de upload no simulan éxito. Pruebas Storage aisladas únicamente tras autorización/configuración adecuada.
6. Privacidad: allowlist profunda de DTO/PDF/WhatsApp, canarios en internos/texto/URLs, acceso por Admin/titular/otro/anon; productos sigue privado, catalogo_publico sólo proyección sanitizada y ningún Guardar publica.
7. Compatibilidad: fixtures CANONICAL/MANUAL/MIXED y legacy con importes idénticos antes/después; no disparar migradores al leer; no generar nuevo MANUAL_FACTOR_V1, no copiar mutation handlers de Validaciones.
8. Browser específico desktop1280/mobile390: intake→bandeja→presupuesto→emisión→aceptar una opción con/sin preferencia→Documentación opcional; PDF/WhatsApp por versión, sin overflow ni totales combinados; smoke general 12/12 en demo.

Las pruebas con escrituras requieren proyecto `demo-cuenta-hogar`, hosts explícitos de Auth/Firestore y guardas de CODEX_RUNTIME.md. Storage no está aislado hoy: no ejecutar uploads reales. No usar ADC/productivo. El cumplimiento diseñado no se etiqueta PASS hasta tener evidencia de ejecución en fases posteriores.

## 15. Resultado P1

- Actual: multiopción sí; aceptación legacy múltiple sí; combina importes sí; ofrece circuito contractual sin Documentación sí (sin generar documentos automáticamente).
- Objetivo diseñado: todas las opciones NUEVAS por configurador compartido, 1..18/NEXT_90_V1, alternativas no acumulativas, aceptación de una única opción con todos sus planes ofrecidos y preferencia opcional no definitiva, snapshots emitidos inmutables y Documentación opcional; definición/confirmación del plan definitivo al confeccionar contrato.
- Historia: preservación sin recálculo; MANUAL_FACTOR_V1 sólo compatibilidad de existentes cuando se implemente la transición.
- Imagen/upload: arquitectura definida; seguridad Storage y activación pendientes de fase autorizada. No se acreditan uploads ni nuevos controles implementados.
- Único artefacto P1: este documento. Sin cambios de código/Rules/datos, sin commit/push/deploy.

### Regla final de negocio aprobada

```text
EXACTLY_ONE_ACCEPTED_OPTION = YES
ACCEPTED_PLAN_CAN_BE_PREFERRED_BUT_NOT_FINAL = YES
FINAL_PLAN_DEFINED_AT_CONTRACT_STAGE = YES
ACCEPTANCE_SNAPSHOT_STORES_ALL_OFFERED_PLANS = YES
PREFERRED_PLAN_OPTIONAL = YES
CONTRACT_PLAN_DEFINED_IN_P1 = NO
```

Estas reglas son especificación documental; P1 no implementa el flujo ni condiciones contractuales.
