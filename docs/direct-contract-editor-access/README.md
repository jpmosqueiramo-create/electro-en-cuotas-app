# Acceso directo a la confección contractual

## Defecto reproducido

Una operación `READY_TO_FORMALIZE` anterior al editor comercial no tiene `commercialPreparation`. Emisión exige guardar ese panel, pero el compositor ocultaba el formulario por el estado READY y ofrecía «Volver a borrador» en otra sección. El navegador previo partía artificialmente de DRAFT y no cubría esta entrada real. El historial de auditoría no era el motivo de rechazo.

## Corrección

- «Completar datos del contrato» aparece junto a Emisión cuando falta el panel guardado.
- El clic explícito abre la edición mediante el comando existente `RETURN_TO_DRAFT` y su auditoría/revisión optimista; luego enfoca los datos prellenados. No hay cambios al cargar la página.
- La revisión previa ofrece «Editar datos del contrato», sin selector técnico de motivo ni confirmación adicional. No registra conformidad ni aprobación automáticamente.
- La vista previa se conserva como opción colapsada, separada de los PDF definitivos descargables e imprimibles.
- Documentos emitidos, recuperación e historial se conservan. La emisión y sus validaciones, CH, cálculos, tasas, impuestos, textos, firmas y entrega no se modifican.

## Verificación

Se amplió `scripts/testSimpleContractIssuanceEmulator.ts` para iniciar con una operación READY sin preparación comercial, como la publicada: comprobar que cargar no cambia la revisión ni consume CH; abrir la edición desde emisión; guardar el panel; registrar conformidad sintética vigente; emitir ambos PDF por las rutas reales; corregir el plan con el mismo CH e historial inmutable. Capturas desktop/mobile y generación documental usan exclusivamente Emulator `demo-cuenta-hogar` con Firestore 8080, Auth 9099 y Storage 9199.

Controles finales: TypeScript, ESLint diferencial, build, test:safe y recorrido integrado de navegador/Emulator. No se ejecutaron escrituras productivas, emisión real, cambios de Rules/configuración ni modificación del catálogo o renderizador.

Publicación: revisar este PR, merge manual y rollout del SHA autorizado. No se despliega automáticamente como parte de la corrección.

Resultados: TypeScript PASS; ESLint diferencial PASS; test:safe PASS; navegador desktop/mobile y Emulator PASS. Se comprobó entrada desde READY, edición por clic explícito, ausencia de consumo CH al abrir, emisión del par de documentos, revisiones concurrentes idempotentes y conservación del historial. Las capturas adjuntas usan datos sintéticos. Build final PASS.
