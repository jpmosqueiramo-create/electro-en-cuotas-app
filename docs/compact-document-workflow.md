# Recorrido documental compacto

## Experiencia desde la aceptación

La ficha tiene cuatro etapas: Datos y documentos, Contrato y pagaré, Logística,
y Cuotas y pagos. Datos y documentos reúne el enlace privado del cliente, la
revisión de datos recibidos, la edición manual, la identidad y los archivos.
`?section=client` sigue abriendo esa misma etapa; se conservan las rutas de
alertas y los accesos a campos concretos.

La guía muestra el próximo paso y deja el recorrido completo en un desplegable.
Las herramientas adicionales de contrato quedan agrupadas, conservando el editor
independiente. Una fila por documento muestra estado y archivos; se abre al
necesitar cargar o revisar. Los datos aplicados y documentos ya verificados se
presentan compactos; ingresos sigue siendo opcional. Cerrar filas o cambiar de
etapa no desmonta sus campos ni elimina observaciones en preparación.

Identidad y resolución administrativa se muestran por separado, sin el doble
desplegable anterior. La verificación sigue exigiendo archivo, resultado,
vigencia cuando corresponde y observación; se confirma su guardado con un aviso.
Los estados de documentos reutilizados se muestran aunque no haya copias locales.
Actualizar documentos renueva tanto la evaluación como la lista de archivos.

Actualizar la ficha rechaza la acción mientras hay datos personales o laborales
sin guardar. Solicitar o revocar un enlace también queda bloqueado durante esa
edición, para conservar el borrador. Las actualizaciones locales de revisión
usan el estado anterior para no pisar otros campos editados rápidamente.

## Compatibilidad y límites

No se modifican APIs, payloads persistidos, esquemas, reglas, consentimientos,
criterios de aprobación, snapshots, cálculos ni permisos. Preparar ficha y
solicitar datos siguen siendo acciones explícitas. Cargar un archivo no verifica
su contenido ni aprueba la operación. Navegar entre etapas no guarda ni emite.

## Pruebas

- `node --import tsx scripts/testOperationProgress.ts`: estados, requisitos,
  errores de lectura, navegación a campos y separación entre pago y entrega.
- `node --import tsx scripts/testContractV2.ts`: datos, snapshots, compatibilidad,
  importes y cronogramas.
- `scripts/testCompactIntakeEmulator.ts`: casos recién aceptados y con datos
  recibidos/aplicados mediante consentimiento vigente; revisión explícita,
  rechazo de versión desactualizada o archivo ajeno al tipo de documento,
  conservación exacta de presupuesto, aceptación, borrador y sus updateTime.
- `scripts/testCompactIntakeStorageEmulator.ts`: carga y descarga reales,
  reintentos, eliminación auditada, acceso privado, archivo inválido y origen
  incorrecto; preservación de presupuesto, aceptación, borrador e importes.

Las suites Firebase requieren explícitamente proyecto `demo-cuenta-hogar`,
Firestore local 8080 y Auth local 9099. La suite Storage exige además
`FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`,
`STORAGE_EMULATOR_HOST=http://127.0.0.1:9199` y
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-cuenta-hogar.appspot.com`.
Se debe iniciar Storage Emulator expresamente con reglas locales; la suite se
niega a usarlo si esos valores no coinciden. No asume aislamiento por la mera
existencia de firebase.json ni utiliza credenciales productivas.

La comprobación visual se realiza con la sesión demo y los emuladores, en
escritorio, móvil y tablet. Las pruebas guardan exclusivamente datos sintéticos.

## Retoma sobre la versión publicada 3c3a765

La aceptación muestra una continuación principal hacia Datos y documentos. Los
planes y la fecha de aceptación se conservan en un desplegable; registrar la
aceptación ya no abre otra grilla de archivos automáticamente en el presupuesto.
La consulta opcional de archivos desde esa vista sigue disponible.

Los envíos pendientes aparecen primero, con fecha argentina y cantidad de
campos diferentes. Los envíos anteriores quedan juntos en un historial plegado;
se mantiene la comparación y la aplicación explícita de cada envío. No se añaden
campos ni se altera qué datos reemplaza el comando existente.

Los paneles de datos, revisión documental y contrato permanecen montados al
pasar también a Logística y Cuotas y pagos. Las observaciones en preparación y
los campos editados se conservan durante la navegación interna. Para evitar que
un guardado pise otro borrador local, editar datos personales bloquea temporalmente
los laborales y el editor contractual; una edición contractual pendiente bloquea
la aplicación de envíos y la edición manual de datos. Cada grupo conserva su botón
de guardado existente. No hay guardados automáticos.

La guía no consulta emisión hasta que exista ficha. Ese paso se muestra pendiente
con su requisito previo, sin inventar una respuesta de emisión ni mostrar un error
por una consulta que todavía no corresponde. El estado `idle` pertenece sólo a la
presentación de lecturas; no es un estado persistido ni una autorización.

Cerrar o recargar la página puede descartar una edición local sin guardar. La
conservación comprobada corresponde a cambiar de etapa dentro de la ficha, no a
cerrar la pestaña ni a recuperar borradores después de un reinicio.
