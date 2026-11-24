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
