# Ficha de operación y documentación simplificadas

Base: main `0363413f744619902f90104e41d18d07e255df44`.
Rama: `feature/operation-document-usability`, independiente del PR #101 de comisiones.

## Cambios visibles

- Cuatro tarjetas de documentos, en lugar de una lista para cargar y otra para revisar. Cada tarjeta reúne carga, estado, descarga, eliminación confirmada y revisión administrativa.
- La carga muestra progreso y confirmación; no verifica ni aprueba automáticamente el archivo. La revisión queda deshabilitada mientras se procesa el archivo.
- Al eliminar un archivo, la tarjeta muestra su ausencia y conserva separadamente el resultado anterior de revisión; no ofrece una referencia eliminada como si fuera un archivo reutilizable.
- Los documentos de una carpeta expresamente vinculada conservan su consulta privada. Se considera tanto presupuesto como versión de origen.
- Evaluación crediticia y vinculación de carpeta agrupadas en una sección secundaria cerrada. No se quitan ni modifican sus validaciones.
- Encabezado más compacto, acción sugerida secundaria y acción de confección conservada. Eliminar/restaurar se encuentra en **Administrar contrato**, con el mismo diálogo y confirmación existentes.
- Cuatro pasos con estado activo contrastado, visibles al desplazarse y con navegación/foco al contenido. Botón **Continuar** al final de cada paso. Consultas adicionales e historial quedan después del contenido principal.
- Menú global desplegable en móvil y opciones distribuidas en filas en escritorio. La ficha mantiene **Solicitudes** como sección activa; no requiere desplazar horizontalmente módulos.
- El estado `TERMS_FROZEN` ahora dice **Condiciones contractuales guardadas**: ese estado por sí solo no permite inferir que la operación pertenece a Emulator ni que los instrumentos fueron emitidos.
- La recomendación visual ya no redirige hacia evaluación crediticia como requisito de emisión. No cambia permisos, validaciones, estados persistidos ni el backend de emisión.

## Verificación

| Comprobación | Entorno / comando | Resultado |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | PASS |
| ESLint de todos los archivos de código modificados y test nuevo | `npx eslint …` | PASS, sin errores ni advertencias |
| Build | `npm run build` | PASS |
| Suites seguras | `npm run test:safe` | PASS |
| Cuatro tarjetas únicas; carga, revisión explícita, descarga reutilizada y eliminación | `scripts/testOperationDocumentUsabilityEmulator.ts` | PASS |
| Navegación de los cuatro pasos sin alterar borrador/presupuesto ni consumir CH | Mismo recorrido de navegador | PASS |
| Menú, contraste y ausencia de overflow | Chrome local: 1280×900, 768×900, 390×844 y 320×720 | PASS |
| Nuevos/recurrentes, vencidos, ambiguos, acceso y concurrencia documental | `scripts/testCreditReviewV2Emulator.ts` | PASS |
| Conformidad, revisiones concurrentes, origen y roles | `scripts/testOperationWorkspaceV2Emulator.ts` | PASS |

Todas las escrituras de pruebas usan exclusivamente `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199. Se usa el código real de rutas y motores, con la infraestructura local ya existente; no se introducen endpoints ni bypasses de prueba en la aplicación.

La suite de ficha exige expresamente un correo `@example.invalid`; se ejecuta con ese dominio. El navegador utiliza `admin@example.test`; durante la redirección transitoria al inicio, las Rules rechazan su lectura directa de alertas. No se alteran Rules para evitar ese rechazo. La cobertura de navegador de este cambio corresponde a la ficha y documentación, cuyas rutas no devolvieron errores de servidor; no valida el tablero de alertas ni producción.

## Capturas

Datos y archivos exclusivamente sintéticos:

- [Escritorio](screenshots/operation-document-usability/operation-documents-desktop.png).
- [Móvil](screenshots/operation-document-usability/operation-documents-390.png).
- [Móvil estrecho](screenshots/operation-document-usability/operation-documents-320.png).
- [Tablet](screenshots/operation-document-usability/operation-documents-768.png).

## Alcance

La proyección administrativa de revisión añade el booleano `fromThisOperation` para distinguir el origen de cada archivo, incluso cuando una carpeta combina referencias de varias operaciones. Es sólo metadato de lectura; no expone rutas Storage ni modifica documentos persistidos. Los consumidores anteriores pueden ignorarlo.

Sin nuevas funcionalidades financieras, cambios jurídicos, schemas persistidos, migraciones, Rules, permisos ni configuración. Sin escrituras productivas, emisión, consumo CH, merge o deploy. Las operaciones existentes mantienen sus motores, comprobaciones y trazabilidad. Publicación posterior del SHA mergeado sólo bajo autorización.
