# Planes iniciales del presupuesto

Al agregar una referencia nueva a un presupuesto V2, los 18 planes comienzan seleccionados y usan los factores de referencia vigentes. Al ingresar el costo, el configurador muestra los importes calculados. Administración puede ajustar factores, seleccionar todos los planes o quitar todos y elegir algunos.

Una referencia existente conserva sus planes activos y factores. Editar, reabrir o revisar un presupuesto conserva su snapshot; no se aplican valores iniciales a documentos guardados. El catálogo mantiene su comportamiento de alta y publicación. No se cambian motores financieros, payloads, colecciones, Rules ni documentos contractuales.

## Verificación

- `npx tsc --noEmit`: correcto.
- ESLint de los archivos TypeScript modificados: correcto.
- `npm run build`: correcto; manifiesto del renderer contractual intacto.
- `testReferenceConfigurator.ts`, `testBudgetReferenceV2.ts`, `testCatalogReferenceEditor.ts`: correctos. Incluyen 18 planes iniciales, cálculo con costo 450.000, snapshot independiente y conservación de selecciones existentes.
- `runBudgetV2Browser.ts` con `LOCAL_BROWSER_WEBPACK=1`, Auth/Firestore Emulators y proyecto `demo-cuenta-hogar`: correcto a 1280 y 390 px. Selección inicial, cálculo, quitar/seleccionar todos, selección individual, persistencia, reapertura, emisión y PDF/WhatsApp. Incluye origen manual o solicitud y referencia nueva o existente. Cero publicaciones y mutaciones productivas durante las pruebas.

No hay migración ni deploy incluido en esta corrección.
