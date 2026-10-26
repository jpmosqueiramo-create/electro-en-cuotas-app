# Preparación y emisión simplificadas — PR #93

## Recorrido manual

1. Abrir la operación aceptada y «Confeccionar contrato y pagaré», también disponible en ventana independiente.
2. Completar los cinco pasos: solicitud/presupuesto/aceptación, datos personales, datos laborales, condiciones económicas y cronograma. El producto y la conformidad vigente forman parte del origen aceptado. Los campos laborales opcionales conservan su régimen actual.
3. Guardar los cambios. El botón de emisión no acepta cambios locales sin guardar.
4. En «Emitir contrato y pagaré», revisar la versión instalada, lugar y fecha efectiva de emisión. Si el original exige desglose económico, completar sus importes explícitos y referencia de conformidad; deben sumar el total guardado. No se equiparan servicios y CFT ni se inventan tasas.
5. Confirmar como titular los documentos exactos y la operación, y pulsar «Emitir contrato y pagaré». El servidor registra revisión técnica, aprobación del titular por hash y autorización de la operación; reserva una única numeración y genera ambos archivos privados.
6. Abrir ambos documentos. Ahora se puede vincular expresamente una cuenta existente y verificada e invitarla al portal, antes de la entrega. Este acceso no crea cuotas ni acredita firmas.
7. Continuar a logística. Firmas, originales, custodia, documentación externa y recepción/entrega conservan sus validaciones para activar las cuotas.

## Política autorizada y controles

El propietario autorizó expresamente retirar evaluación crediticia y verificación documental manual como requisitos adicionales de emisión, integrar aprobación exacta y autorización por operación en una confirmación, y permitir portal posterior a documentos sin esperar entrega. El rechazo inicial de revisión automática correspondía a un alcance anterior; la autorización específica posterior sustenta estos cambios.

La evaluación crediticia sigue disponible como herramienta administrativa. No se inventa una aprobación profesional, verificación documental, conformidad ni firma. Se conservan identidad coherente, origen aceptado, datos completos, cronograma íntegro, conformidad vigente, permisos administrativos verificados, habilitación del servidor, paquete exacto instalado, hashes, numeración, auditoría y revocación. La aprobación expresa del titular no se ejecuta al cargar una página.

El nuevo comando `ISSUE_PREPARED` almacena una intención inmutable en la subcolección `simpleIssuanceCommands` del registro productivo de la operación. Guarda digest, actor, revisión, paquete, contexto formal, fecha de autorización y resultado; no almacena tokens. Sus fases usan los recibos idempotentes de los motores existentes. La caducidad de autorización y la recuperación explícita de archivos incompletos conservan su procedimiento vigente. Los nuevos permisos abarcan emisión y continuidad del circuito con las verificaciones independientes de cada etapa.

Los registros históricos no se migran ni se reescriben. Correcciones previas a firmas/entrega conservan CH e historial. No cambian cláusulas, renderer, versiones de plantillas, catálogo instalado, Rules, Auth, configuración, fórmulas, ledger ni contador productivo. ARCA continúa separada. No hay merge ni deploy en esta entrega.

## Evidencia ejecutada

| Verificación | Resultado | Entorno/evidencia |
| --- | --- | --- |
| Cinco pasos y datos completos sin marca de formulario recibido | PASS | 11 casos unitarios + 9 grupos de lectura en Emulator, etapa inicial de este mismo PR |
| Emisión integrada, paquete exacto, administrador, conformidad, concurrencia, replay, archivos y portal sin entrega | PASS | 7 grupos con paquete sintético; 8 grupos finales con el paquete original instalable, demo-cuenta-hogar |
| Identidad incompatible, administrador no verificado, archivo sustituido y acceso de otro rol | PASS | Suite `testSimpleContractIssuanceEmulator.ts`; sin consumo CH en rechazos previos |
| Portal antes de entrega sin deuda; activación financiera/entrega sin evidencias rechazada | PASS | Misma operación sintética de la suite anterior |
| Contratos, recuperación P1, revocación, numeración, entrega externa, pagos, parciales, reversas, saldos y permisos de tres roles | PASS | 32 grupos `testProductionAdapterEmulator.ts`, aprobación del titular y documentación externa |
| Correcciones con mismo CH, edición concurrente, historial inmutable, bloqueo tras firmas/entrega/finanzas | PASS | `testContractDocumentRevisionEmulator.ts` |
| Evaluación crediticia independiente, documentos privados, decisiones, permisos y concurrencia | PASS | `testCreditReviewV2Emulator.ts` |
| Ficha, datos recibidos, conformidad, control de revisión, origen y permisos | PASS | `testOperationWorkspaceV2Emulator.ts`, identidad sintética @example.invalid requerida por esa suite |
| Botón único mediante HTTP real y UI Next, desktop 1280×900/mobile 390×844, sin desbordamiento | PASS | Chrome local; handlers reales conectados a runtime opaco exclusivamente Emulator |
| PDF | PASS | Mandato 3 páginas + pagaré 1; revisión visual de todas, texto seleccionable, logo sólo en mandato |
| TypeScript, ESLint diferencial, build y test:safe | PASS | Ejecutados localmente; manifiesto reproducible del renderer sin cambios |

Los fixtures usan capital $580.000, servicios brutos con IVA incluido $1.160.000, total/pagaré $1.740.000 y 12 cuotas de $145.000. Vencimientos del caso original: 05/12/2026 al 05/11/2027. El desglose original también usa valores sintéticos explícitos; **no constituye una distribución comercial aprobada ni una regla servicios=CFT**. No se calcula otro total ni se suma IVA en el PDF.

Las capturas muestran una operación sintética recorrida desde el navegador; los PDF adjuntos corresponden al caso sintético de concurrencia de la misma suite (CH-000001 local). La emisión de navegador reserva CH-000002 local: no se mezclan ambas como si fueran el mismo expediente. Ambos casos viven únicamente en Emulator.

[Desktop](evidence/issuance/desktop.png) · [Mobile](evidence/issuance/mobile.png) · [Emitidos en mobile](evidence/issuance/issued-mobile.png) · [Mandato sintético](evidence/issuance/mandato-sintetico.pdf) · [Pagaré sintético](evidence/issuance/pagare-sintetico.pdf) · [Resultados](evidence/issuance/results.json).

### Límites y observaciones

No se emitieron instrumentos reales ni se consumió CH productivo. No se probaron estas modificaciones en producción porque aún no están mergeadas ni desplegadas. La aceptación final productiva requiere su publicación autorizada y el recorrido manual del propietario.

La primera ejecución de dos suites relacionadas encontró expectativas de crédito anteriores a la política autorizada; se actualizaron para comprobar datos/conformidad, sin retirar pruebas de integridad. Otra ejecución de ficha se detuvo por su exigencia explícita de correo sintético @example.invalid; pasó al usar su configuración correcta. Durante los navegadores, el listener directo de alertas del dashboard recibió una denegación de Rules con la identidad sintética: no se cambiaron Rules para evitarla. Los handlers del recorrido contractual pasaron; no se presenta esa alerta general como verificada.

## Publicación pendiente

Revisión y merge manual del PR #93; verificar SHA resultante y ejecutar preflight antes de solicitar un rollout específico. Este PR no necesita cambiar las variables productivas ya autorizadas, instalar otro catálogo ni reinicializar CH. Después, el propietario podrá emitir desde la interfaz con su administrador autorizado y datos completos. No se ejecutará una primera emisión real durante la verificación automática.
