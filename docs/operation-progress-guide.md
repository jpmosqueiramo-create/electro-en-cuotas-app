# Guía de la solicitud hasta cuotas vigentes

La ficha administrativa reúne el próximo paso, campos pendientes, checklist desplegable y accesos a los paneles existentes. «Cuotas y pagos» pasa a la navegación principal. Los datos laborales siguen siendo opcionales según las validaciones vigentes.

## Fuentes y compatibilidad

La guía es de presentación: no crea campos persistidos, colecciones, migraciones ni endpoints. Consulta los GET existentes de `credit-review`, `production`, `financial`, `fulfillment` y `delivery` de la versión del presupuesto, junto al borrador guardado, envíos recibidos y conformidad del compositor.

Los ocho pasos son ficha, datos personales, documentación/identidad, aprobación, contrato/cronograma, conformidad, emisión y plan de cuotas. Las respuestas no verificables se muestran como tales. La emisión no se utiliza como prueba de aprobación crediticia o documentos verificados. Sólo `financial.active` acredita el cronograma activo; entrega y firmas se muestran por separado.

Los cambios locales no completan pasos: se destaca primero el formulario que debe guardarse. Los accesos abren los desplegables y enfocan el panel correcto; un contrato bloqueado conserva los controles explícitos de edición/recuperación existentes. No se guardan datos al navegar ni se ejecutan aprobaciones, emisiones o pagos desde la guía.

Se actualiza al guardar el borrador, revisar crédito, registrar eventos financieros/logísticos/documentales, recuperar el foco, cada 60 segundos mientras la pestaña está visible y mediante «Actualizar guía». Se cancelan consultas al desmontar y se limita su espera a 15 segundos.

## Verificación

- `npx tsx scripts/testOperationProgress.ts`: campos faltantes, datos recibidos, documentos, rechazo/aprobación, conformidad, configuración, emisión, activación independiente de entrega, revisiones distintas y respuestas desconocidas.
- `scripts/testOperationProgressBrowser.ts`: navegador real y APIs con Auth/Firestore/Storage Emulators demo. Recorre aceptación, creación explícita del borrador, envío y aplicación de datos, navegación y cambios sin guardar, documentos, aprobación, editor, conformidad, emisión y primera cuota. Comprueba persistencia, numeración única y ausencia de cambios al presupuesto aceptado.
- Navegador a 1280, 390 y 320 px, sin desborde horizontal. Capturas temporales en `/tmp/cuenta-hogar-catalogo-c3/operation-guide-*.png`.
- TypeScript, ESLint de archivos modificados, build y manifiesto de renderizadores contractuales. El manifiesto legal conserva sus 38 archivos verificados.

El escenario de navegador utiliza un paquete contractual sintético y datos exclusivos de Emulator; no verifica configuración productiva ni realiza cobros, firmas o entregas reales.

## Corrección de bloqueos de emisión (fechas de aceptación)

El servidor exige fechas reales de envío y aceptación: formato válido, hora de Argentina, sin futuro, envío posterior a la cotización y aceptación posterior o igual al envío. Registrar la conformidad no modifica esas fechas. El panel ahora muestra diagnósticos por campo y abre el apartado correspondiente. Su validación visual es orientativa; la validación del servidor y los modelos congelados no cambian.

Después de registrar la conformidad con éxito, el compositor enfoca Emisión. Al guardar condiciones modificadas, avisa que falta la conformidad para esas condiciones. Emisión espera los requisitos de la revisión actual y distingue entre cambios sin guardar, consulta de requisitos y emisión en curso. Incluye una actualización explícita de requisitos sin mutaciones.

Verificación adicional: `testContractIssuanceGuidance.ts` cubre fechas, Argentina, orden y navegación. `testContractIssuanceGuidanceBrowser.ts` utiliza el paquete LOOP instalado con datos sintéticos en Auth/Firestore/Storage Emulators: reproduce fechas futuras, registra conformidad por UI, verifica el bloqueo, navega a las fechas, corrige y guarda, comprueba invalidación de la conformidad anterior, registra nueva conformidad y emite sin recarga. Verifica un solo comando/número CH, ausencia de conexiones Firebase externas y pantallas de 1280/390 px sin desborde.
