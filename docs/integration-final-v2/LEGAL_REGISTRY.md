# Registro de aprobación documental por versión

Acceso: Administración → Documentación → Aprobación documental. API administrativa `/api/admin/aprobaciones-documentales`.

Se conserva la declaración del titular («la última») como OWNER_REPORTED. No se inventan fecha, profesional ni evidencia. VERIFIED exige fecha válida no futura, profesional y referencia de su validación. La confirmación administrativa identifica versión y hash exactos; registrar una referencia no habilita emisión.

Cada documento posee hash SHA-256 del contenido canónico de sus cláusulas/texto, identificación societaria, tipo y versión. Es un hash del texto de plantilla, distinto del hash del PDF particular, renderer o snapshot económico. Las versiones históricas de referencia y las propuestas de `docs/legal-review` no reciben aprobación por asociación.

Persistencia inmutable: `presupuestos_v2/_legal_registry_v1/contracts/registry/records/{commandId}`. El subtree existente es exclusivamente de servidor bajo las Rules actuales. Cada registro guarda actor, fecha del servidor, tipo, versión, hash, clasificación, fecha de aprobación, profesional, referencia y evidencia privada opcional. Un commandId idéntico devuelve el registro previo; otro payload o actor con ese ID es rechazado. No se escribe un registro por consultar la pantalla.

La evidencia opcional recibida por API debe estar bajo `legal-approvals/{id}/{archivo}`, sin tokens de descarga, con generación exacta y SHA-256 coincidente. Se verifica tamaño máximo de 10 MiB, contenido y generación antes/después, fuera de transacciones Firestore. El registro fija esa generación; no crea URLs públicas ni uploads. La pantalla inicial permite registrar la referencia profesional sin archivo; no se implementa un cargador nuevo que duplique el archivo documental existente.

`legalIssuanceAssessment` comprueba ambas versiones exactas, registros profesionales válidos, ausencia de pendientes y datos formales completos. Devuelve siempre emisión productiva deshabilitada: no existe un flag que transforme esta validación en autorización. Los templates actuales conservan pendientes y advertencia de borrador. Se requiere una implementación y autorización productiva independiente para emitir.

Pruebas: identidad/hash distinto bloquea, declaración no sustituye validación, fechas inválidas rechazadas, campos formales pendientes bloquean, concurrencia y replay sin updateTime, evidencia privada válida/hash falso, API sin sesión o con usuario cliente rechazada. Sólo demo-cuenta-hogar; no hay migración, cambios de Rules ni escrituras productivas.

Resultados ejecutados: modelo puro PASS; Emulator con evidencia Storage sintética PASS; navegador administrativo desktop/mobile y registro de declaración PASS; TypeScript, ESLint diferencial, build y test:safe PASS. Capturas en `docs/evidence/legal-approval-registry/`. Los datos creados por el runner nunca acreditan aprobación jurídica real.

Actualización de integración: main `e39186b1495940539b9137a91659b53d48160e0e`, con #74 conservado. Sin conflictos textuales ni cambios de validación jurídica. Revalidado junto a #76/#77 en `9cda5b03f0a463d5d792e979ed10ffca64312f6d`: TypeScript, ESLint diferencial, build, test:safe, Emulator jurídico y navegador desktop/mobile PASS. Ninguna declaración o registro administrativo habilita emisión definitiva.
