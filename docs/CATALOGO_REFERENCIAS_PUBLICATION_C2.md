# Catálogo de referencias — protocolo de publicación C2

Base: `f4847d346972063ca8dfb023fe9889bd654d0341`. Implementación sin UI ni migración de consumidores, Rules, Storage, pricing contractual o documentos legales. No implica deploy ni publicación productiva.

## Contrato y coexistencia

Las decisiones C2 precisan la propuesta C0: **guardar cambios internos no publica**. No hay trigger, listener ni dual write que sincronice automáticamente `productos/{id}` con `catalogo_publico/{id}`. El servicio no escribe en productos. Existencia/contenido de la proyección es la autoridad del catálogo nuevo; los flags legacy activo/publicado permanecen intactos y continúan sirviendo a los consumidores anteriores.

El adaptador y mapper C1 se reutilizan sin modificarlos. Sólo la copia en memoria usada para publicar se marca publicado=true, independientemente de flags legacy. La proyección tiene exactamente los siete campos C1: referenciaId, nombre, descripcion, imagenUrls, planesPublicados (cuotas y cuotaEstimada), publicado y schemaVersion. No se persisten fingerprints, costos, factores, stock, códigos ni metadata adicional. Los defaults C1 sólo cubren factores ausentes; overrides inválidos no se sustituyen.

No se modifica firestore.rules. `productos` mantiene lectura pública legacy y `catalogo_publico` aún no tiene permiso público de lectura. **PUBLIC_PRODUCT_EXPOSURE_FIXED = NO**. C2 no incorpora escrituras de navegador: los comandos pasan por endpoints autenticados. Esto no elimina los permisos SDK cliente que las reglas actuales pudieran otorgar a Admin mediante su catchall; cerrar esos permisos y la lectura legacy pertenece a una fase autorizada de Rules. No se promete privacidad final en C2.

## Endpoints y respuestas

Todos reutilizan verifyAdminAuth: token Bearer verificado mediante Firebase Admin y política del Administrador Único existente. No se acepta un claim admin alternativo. El runtime es Node; parámetros de ruta se esperan como Promise conforme Next 16. Se validan IDs de documento (sin rutas, vacíos, controles, nombres reservados o tamaño fuera del límite). Respuestas del servicio usan Cache-Control: no-store.

| Método y ruta | Entrada / efecto |
| --- | --- |
| GET `/api/admin/catalogo/referencias/[id]/preview` | Retorna DTO, validation, fingerprint, hasPublicProjection y hasUnpublishedChanges. Transacción sólo de lectura. Ficha inválida devuelve 400 con validation y DTO/fingerprint null |
| POST `/api/admin/catalogo/referencias/[id]/publicar` | Body exacto `{ expectedFingerprint: string }`; se rechazan otros campos. Relee privado, valida y compara dentro de transacción. Retorna PUBLISHED o ALREADY_CURRENT |
| POST `/api/admin/catalogo/referencias/[id]/despublicar` | Sólo usa ID de ruta; elimina la proyección, conserva privado sin cambios. Retorna UNPUBLISHED o ALREADY_UNPUBLISHED |

401 sin token válido; 403 usuario autenticado no Admin; 404 privado inexistente; 400 ID/comando/configuración inválidos; 409 REFERENCE_CHANGED_SINCE_PREVIEW si el contenido público actual difiere del revisado. Ninguno crea ni modifica proyección. Error inesperado devuelve 500 genérico sin detalles privados. Despublicar permite retirar una ficha con contenido privado inválido mientras exista el documento privado; no requiere que sea publicable.

## Concurrencia, reemplazo y fingerprint

Serialización canónica ordena claves de objetos, conserva orden significativo de arrays y vuelve a aplicar allowlist pública, incluidos planes anidados. SHA-256 de esos bytes, sin dependencias nuevas, identifica contenido público: cambiar proveedor/SKU/stock o parámetros que produzcan el mismo resultado público no cambia el fingerprint. No es hash de la ficha privada ni clave de autorización.

Publish relee productos y proyección en una transacción server-side. Valida y compara el fingerprint antes de escribir; Firestore puede reintentar ante cambios concurrentes. El administrador no puede enviar el DTO ni parámetros económicos para sustituir el guardado privado. El ID público es exactamente el privado, sin addDoc ni versiones paralelas. Una publicación idéntica no hace set; se conserva updateTime.

La comparación de la proyección existente considera todas sus claves, no sólo su subconjunto permitido. Si contiene una clave residual sensible, deja de ser ALREADY_CURRENT: set sin merge reemplaza todo el documento por el DTO nuevo. El fingerprint de preview se calcula exclusivamente del candidato sanitizado, nunca del documento contaminado. Despublicar lee ambos documentos en transacción y sólo borra público; un segundo intento no escribe.

El fingerprint protege la revisión de contenido público. No es una revisión monotónica de eventos privados ni una revocación de previews después de despublicar: una acción posterior explícita puede volver a publicar el mismo contenido privado. No hay jobs asíncronos que restauren proyecciones. Cambios a texto público o imágenes deben revisarse por su contenido: la allowlist de claves no detecta que una persona escriba un dato interno dentro de una descripción.

## Verificación reproducible

Prueba pura sin Firebase: `npm run test:catalog-c2`. C1: `node --import tsx scripts/testCatalogReference.ts`. La suite pura comprueba determinismo de claves/referencias, cambios públicos y privados, validación, redondeo, planes y detector recursivo de claves sensibles, incluido un control positivo anidado.

La suite Emulator importa primero la guarda compartida, exige exactamente demo-cuenta-hogar y puertos locales 8080/9099, y rechaza credenciales administrativas. Comando:

```sh
GCLOUD_PROJECT=demo-cuenta-hogar \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
npx firebase-tools emulators:exec --project demo-cuenta-hogar --only auth,firestore 'npm run test:emulator:catalog-c2'
```

Los handlers Next se invocan directamente con NextRequest y params, sin servidor HTTP ni navegador. La verificación del token sí usa el patrón real existente con dos cuentas locales de Auth Emulator; no hay cuentas ni credenciales productivas. Se cubren los 24 casos solicitados, reemplazo de contaminación anidada, ningún write al previsualizar o republicar idéntico, flags legacy intactos y dos publicaciones concurrentes con un solo write confirmado.

Escrituras Firestore limitadas a productos y catalogo_publico de fixtures con prefijo C2. El test intercepta operaciones de transacción reales, rechaza cualquier ruta fuera del alcance antes de escribir y cuenta únicamente intentos confirmados; las seeds se cuentan por separado en el mismo total. Los fallos de autorización/comando no escriben. Se comprueba también que no aparecen otras colecciones. Los conteos se imprimen por ejecución; no se borran colecciones ajenas para preparar la suite. No se usan uploads Storage ni se modifican reglas en disco o producción.

Gates adicionales: git diff --check, tsc --noEmit, ESLint de archivos nuevos/tocados, npm run test:safe y npm run build. Los resultados ejecutados se informan con sus conteos y límites, sin equiparar clasificación de suite con PASS. No commit, push, PR ni deploy en C2.
