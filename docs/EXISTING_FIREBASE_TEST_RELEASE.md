# Publicación de pruebas sobre Firebase existente — pendiente de aprobación

Destino: `negocio-facil-page`, backend `cuenta-hogar`, región `us-central1`,
[www.cuentahogar.com.ar](https://www.cuentahogar.com.ar).
No se crea staging ni se modifica IAM. Este PR prepara cambios; no los despliega.

## Estado verificado (2026-10-20)

Main base: `9c96f84916964b423e0a77f0c57ecdcfeba703f4`, limpio al comenzar.
Publicado: `fb2735fda7ce1b3e2b8c1a4cd5f3211620ddc163`, build
`build-2026-10-19-001`, READY, tráfico 100 %. Rollouts automáticos deshabilitados.
El SHA candidato es el commit de este PR, que se informará en la entrega; no
publicar una punta de rama ni sustituirlo por un merge SHA sin nueva verificación.

Email/password de Authentication habilitado; administrador de las Rules existe y
está habilitado. No se cambia contraseña ni se efectúa login con credenciales reales.
Las pruebas de autenticación usan usuarios sintéticos de Emulator.

## Correcciones mínimas de configuración

`apphosting.yaml` configura `NEXT_PUBLIC_ADMIN_EMAIL` en BUILD y RUNTIME con la
identidad que ya autorizan las Rules. No es una contraseña ni una credencial.
Corrige el bucket `.appspot.com` al bucket realmente existente
`negocio-facil-page.firebasestorage.app`.

Ya están presentes en build/runtime las variables públicas Firebase de proyecto,
auth domain, API key, app ID y messaging sender ID. `NEXT_PUBLIC_ADMIN_EMAIL` aún
no está desplegada: el nuevo bundle debe construirse con ella. No copiar secretos.
No configurar Emulator ni E2E en App Hosting. Se conserva la capacidad actual
(min 0, max 10, CPU 1, 512 MiB); no se cambia infraestructura en este PR.

## Rules propuestas y efectos

Firestore: publicar el archivo ya versionado `firestore.rules`. La diferencia con
lo desplegado excluye diez raíces contractuales y el subárbol `contracts` de
presupuestos del acceso directo, incluso admin. Sus APIs autorizadas usan Admin SDK.
Las pruebas verifican acceso legítimo de Budget, Acceptance, P4 y otros módulos.

Storage: publicar `storage.private.rules` mediante la configuración explícita
`firebase.test-release.json`. El baseline histórico `storage.rules` y `firebase.json`
se conservan; NO usar el config default para este despliegue. Esta configuración
no incluye Classic Hosting.

- Imágenes de catálogo públicas; escrituras admin para JPEG/PNG/WebP de hasta 10 MiB.
- Comprobantes legacy y documentación P4/V2: sin acceso SDK directo, incluso admin.
- Documentación P4 autorizada por servidor continúa operativa. Las muestras
  contractuales siguen exclusivas de Emulator; no se habilitan en producción.
- Cargas legacy desde Cliente/Afiliado y carga manual de Validaciones dejarán de
  funcionar con estas Rules. No usarlas en esta publicación de pruebas; no se
  migran ni se simulan uploads exitosos. Catálogo/Budget/Acceptance/Contrato/READY
  y consulta del expediente son el alcance de prueba.

### Enlaces legacy: autorización adicional necesaria

Hay 15 objetos en `comprobantes/**`; los 15 tienen tokens de descarga permanentes.
Las Rules NO revocan esos enlaces. Antes de declarar privada esa documentación,
se requiere aprobación expresa para revocar exclusivamente los tokens de esos 15
objetos, conservando sus bytes. Eso rompe enlaces históricos de descarga; no borra
archivos ni debe tocar imágenes de catálogo. No se implementa ni ejecuta en este PR.
No se descargó contenido documental ni se guardaron/imprimieron los tokens.

## Inventario y propuesta de limpieza

Inventario read-only por nombres de colección y cantidades, incluyendo búsqueda
recursiva de subcolecciones. Sin copiar campos personales de documentos:

| Colección | Documentos | Propuesta |
| --- | ---: | --- |
| alertas_admin | 17 | Operativos posiblemente ficticios; candidatos, sin borrar |
| notificaciones | 16 | Operativos posiblemente ficticios; candidatos, sin borrar |
| pagos_comisiones | 1 | Origen/dependencias pendientes; sin borrar |
| productos | 8 | Conservar referencias privadas y configuración comercial |
| catalogo_publico | 6 | Conservar; proyecciones dependientes de productos |
| shipping_settings | 2 | Conservar configuración |
| vendedores | 5 | Conservar; relaciones con usuarios/comisiones no verificadas |

Total: 55 documentos. No aparecieron presupuestos, solicitudes ni contratos V2.
La ausencia de esos datos permite empezar las pruebas SIN limpieza previa.
Los 34 documentos operativos candidatos no se consideran ficticios demostrados
sólo por la afirmación general ni por sus nombres. Revisar referencias a vendedores,
operaciones y pagos antes de autorizar una limpieza. Ningún borrado autorizado.

Authentication: 2 usuarios password, ambos habilitados. Conservar ambos hasta
identificar expresamente qué usuario de prueba podría eliminarse; no copiar usuarios.
Storage principal: 27 objetos: 7 imágenes de productos, 15 comprobantes y 5 de
origen no clasificado. Bucket recovery-vault: 4 objetos de origen no clasificado;
fuera de la limpieza propuesta. No se inspeccionaron contenidos ni nombres personales.

## Orden de operaciones, sólo tras aprobación

1. Revisar/aprobar el PR y el SHA exacto. Mantener rollouts automáticos deshabilitados.
2. Aprobar separadamente el diff de Rules y la revocación de tokens de los 15
   comprobantes, con el impacto legacy descrito. No hay borrados en este plan.
3. Reconfirmar proyecto, bucket, identidad admin y ausencia de env Emulator;
   guardar identificadores de Rules/build anteriores, sin exportar datos personales.
4. Revocar los tokens autorizados conservando archivos y desplegar Rules con
   destino explícito, sólo Firestore y Storage:

   ```sh
   npx firebase-tools deploy --project negocio-facil-page \
     --config firebase.test-release.json --only firestore:rules,storage
   ```

5. Publicar exclusivamente el SHA aprobado:

   ```sh
   npx firebase-tools apphosting:rollouts:create cuenta-hogar \
     --project negocio-facil-page --git-commit <SHA_APROBADO>
   ```

6. Verificar SHA del build servido, variables por presencia, login admin,
   catálogo, Budget V2, aceptación, borrador, READY y expediente en desktop/mobile.
   Usar sólo datos sintéticos nuevos. Un smoke sobre la URL publicada queda pendiente
   hasta esa autorización; los smokes de esta preparación son locales con Emulator.

TERMS_FROZEN, contador real, emisión definitiva, pagaré definitivo y FORMALIZED
siguen bloqueados. No activar endpoints ni modificar las guardas para probarlos.

## Rollback

En App Hosting Console → backend → Rollouts → History, abrir el menú del build
`build-2026-10-19-001` y elegir **Roll back to this build**. Verificar tráfico 100 %
al SHA anterior y que continúe deshabilitada la política automática. El rollback
instantáneo reutiliza el código y las variables de aquel build, incluido su bucket
legacy incorrecto; no asumir que conservará la corrección de configuración.
[Procedimiento oficial](https://firebase.google.com/docs/app-hosting/rollouts#restore-a-previous-rollout). Si la consola requiere reconstrucción, usar
el SHA anterior explícito y esperar su build antes de cambiar tráfico.
No restaurar Rules inseguras: mantener productos privado, raíces contractuales
protegidas y Storage privado. Si un módulo falla, detener esa funcionalidad o
revertir aplicación; no abrir permisos. La revocación de tokens es deliberadamente
independiente del rollback de aplicación: no reabrir enlaces privados.
Los datos sintéticos creados no se eliminan automáticamente por un rollback.

## Diff final respecto de Rules desplegadas

### Firestore

```diff
--- /tmp/cuenta-hogar-existing-plan/firestore.deployed.rules	2026-10-20 01:26:47
+++ firestore.rules	2026-10-19 20:49:01
@@ -172,9 +172,30 @@
       allow read, write: if isAdmin();
     }

+    function isContractServerOnlyRoot(root) {
+      return root in [
+        "contractSnapshotsV2", "contractNumbersV2", "contractOriginsV2",
+        "contractOriginEvidenceV2", "contractNumberingV2",
+        "contractInfrastructureCommandsV2", "contractInfrastructureEventsV2",
+        "contractInfrastructureFixturesV2", "contractClientDataRequests",
+        "contractClientDataLimits"
+      ];
+    }
+
+    // Preserve existing Admin access outside the server-mediated contract subtree.
+    match /presupuestos_v2/{budgetId} {
+      allow read, write: if isAdmin();
+    }
+    match /presupuestos_v2/{budgetId}/{section}/{document=**} {
+      allow read, write: if section != "contracts" && isAdmin();
+    }
+
     // Reglas por defecto para el resto de colecciones de la aplicación: Default Fail-Closed (Admin only)
     match /{collection}/{document=**} {
-      allow read, write: if collection != "catalogo_publico" && isAdmin();
+      allow read, write: if collection != "catalogo_publico"
+        && collection != "presupuestos_v2"
+        && !isContractServerOnlyRoot(collection)
+        && isAdmin();
     }
   }
 }
```

### Storage

```diff
--- /tmp/cuenta-hogar-existing-plan/storage.deployed.rules	2026-10-20 01:26:48
+++ storage.private.rules	2026-10-20 01:28:25
@@ -1,21 +1,22 @@
 rules_version = '2';
-
 service firebase.storage {
   match /b/{bucket}/o {
-
-    // 1. Catálogo de Productos: Todos ven, solo Admin modifica.
+    function isAdmin() {
+      return request.auth != null && request.auth.token.email == "jpmosqueiramo@gmail.com";
+    }
+    // Public catalog images, never private documentation.
     match /productos/{imageId} {
       allow read: if true;
-      allow write: if request.auth != null && request.auth.token.email == "jpmosqueiramo@gmail.com";
+      allow create, update: if isAdmin()
+        && request.resource.size <= 10 * 1024 * 1024
+        && request.resource.contentType.matches('image/(jpeg|png|webp)');
+      allow delete: if isAdmin();
     }
-
-    // 2. Documentación confidencial (Legajos de Clientes)
-    match /comprobantes/{allPaths=**} {
-      // Nadie puede borrar ni subir basura, solo usuarios autenticados:
-      allow write: if request.auth != null;
-
-      // Permitir la lectura de descarga a la URL con 'Token Criptográfico'
-      allow read: if true;
-    }
+    // Legacy download URLs must not be created by browser uploads.
+    match /comprobantes/{path=**} { allow read, write: if false; }
+    // Private documents are served through authorized server handlers.
+    match /budget-documentation-v2/{path=**} { allow read, write: if false; }
+    match /contract-documents-v2/{path=**} { allow read, write: if false; }
+    match /{path=**} { allow read, write: if false; }
   }
 }
```

## Verificación de la preparación

- Firestore Emulator: PASS, 1.374 denegaciones y 115 accesos legítimos.
- Storage privado: PASS, 93 denegaciones, Admin SDK y catálogo público verificados.
- Autenticación y aislamiento: PASS en Emulator.
- Smoke general: 12/12 PASS, tres roles y cuatro viewports. Conserva ruido de
  permisos preexistente en Cliente/Afiliado cuando `clienteEmail` está ausente;
  las assertions de navegación/autorización pasan. No se corrige ese defecto aquí.
- Browser Contract V2, READY y expediente documental: PASS desktop/mobile,
  incluidas compatibilidad histórica y muestras exclusivamente en Emulator.
- Modelos puros Contract V2, READY, infraestructura y política documental: PASS.
- `npm run test:safe`: PASS. ESLint del único TypeScript nuevo: PASS.
- TypeScript y build final con la configuración propuesta: PASS.
- HTTP/TLS actual: `/login` responde 200 y certificado válido, sin iniciar sesión.
- Smoke de la nueva versión publicada: PENDING, porque no hubo deploy.
- Mutaciones de servicios reales, borrados, merge y deploy: 0.

Un primer arranque de Chrome no abrió CDP; un reintento con perfil temporal nuevo
completó todas las assertions sin cambios ni relajación de los tests. Un build
con caché compartido con Next dev falló al resolver fuentes; se repite el build
final con caché limpio, sin cambiar fuentes ni dependencias.
