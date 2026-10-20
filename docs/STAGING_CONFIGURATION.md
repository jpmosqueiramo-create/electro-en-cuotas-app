# Configuración aislada de staging (preparación sin recursos)

El proyecto solicitado `cuenta-hogar-staging` no fue creado: Google Cloud rechazó
la creación por cuota. Esta rama no crea recursos, modifica IAM, vincula facturación,
despliega Rules ni publica la aplicación. No hay URL ni bucket verificados todavía.

## Configuración requerida antes de cualquier rollout

Configurar explícitamente `NEXT_PUBLIC_APP_ENV=staging`,
`GCLOUD_PROJECT=cuenta-hogar-staging` y
`NEXT_PUBLIC_FIREBASE_PROJECT_ID=cuenta-hogar-staging` en build y runtime.
Completar con la web app nueva y el bucket realmente creado:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (`cuenta-hogar-staging.firebaseapp.com`)
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (confirmado en el nuevo proyecto)
- `NEXT_PUBLIC_ADMIN_EMAIL` (administrador independiente de staging)

No copiar variables ni identidades productivas. No hay valores de API, app ID ni
bucket inventados en esta rama. El email configurado no es una credencial; nunca
agregar contraseñas, claves privadas ni archivos ADC. Firebase Admin usará ADC de
la identidad de runtime propia del proyecto, sin claves privadas locales.
La configuración ausente, cruzada con producción o con Emulator se rechaza.
Recompilar al cambiar variables NEXT_PUBLIC: quedan incorporadas al bundle.

La autorización administrativa usa el mismo email configurado en cliente y servidor,
además de verificar el ID token con el proyecto seleccionado. Un claim `admin` por
sí solo no concede acceso. Sin email configurado, ninguna identidad es admin.
También producción deberá definir `NEXT_PUBLIC_ADMIN_EMAIL` explícitamente antes
de desplegar esta corrección; no se cambia su identidad ni su configuración remota.

Las Rules tienen su propia política de identidad. Antes de desplegar staging deben
alinearse con su administrador independiente y verificarse en Emulator. Las Rules
productivas y sus archivos quedan intactos en esta rama. Las notificaciones externas
a destinatarios productivos están deshabilitadas en staging (HTTP 503 explícito).

## Verificación local reproducible

```sh
npx tsx scripts/testStagingConfiguration.ts
GCLOUD_PROJECT=demo-cuenta-hogar NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar \
NEXT_PUBLIC_ADMIN_EMAIL=admin.staging@example.invalid \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
npx firebase-tools emulators:exec --project demo-cuenta-hogar --only auth,firestore \
'npx tsx scripts/testStagingAuthEmulator.ts'
```

La suite fuerza proyecto demo y hosts locales antes de importar Admin. Sólo crea
usuarios sintéticos locales. Incluye token extranjero, claim genérico, usuario común,
autorización válida y bloqueo de notificaciones. No usa ADC ni servicios reales.
No modifica Budget, Acceptance, cronogramas ni documentos contractuales. Las guardas
Emulator de congelamiento, numeración y muestras documentales permanecen intactas.

El primer rollout sigue pendiente: aprobación del PR, creación futura autorizada,
configuración completa, Rules y credenciales de prueba independientes verificadas.
No activar rollouts automáticos. No usar Classic Hosting.

## Resultados de esta revisión

Base: `4db92f2d616a2353a80e3546444a3c09b15f1dc7`.

- TypeScript, build y `npm run test:safe`: PASS.
- `testStagingConfiguration.ts`: PASS (campos faltantes, proyectos cruzados,
  bucket/auth domain, credenciales locales y configuración heredada).
- `testStagingAuthEmulator.ts`: PASS; siete rutas también rechazan claim admin
  genérico. El token extranjero se construye desde un token unsigned de Emulator
  cambiando issuer/audience; no se consulta otro proyecto real.
- Regresiones puras Contract V2, READY e infraestructura contractual: PASS.
- ESLint del núcleo, AuthProvider y pruebas nuevas: PASS.
- ESLint de todos los archivos tocados: 69 errores históricos (71 en la base),
  0 nuevos y 2 resueltos. Comparación por archivo, regla, mensaje y cantidad,
  sin usar números de línea que cambian con los imports. No se afirma lint global limpio.
- No se ejecutaron navegador ni pruebas contra staging real: no existe el proyecto.
- No se cambiaron Rules, contratos, IAM, recursos ni configuración desplegada.
