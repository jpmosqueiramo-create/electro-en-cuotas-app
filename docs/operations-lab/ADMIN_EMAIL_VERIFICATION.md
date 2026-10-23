# Verificación del correo administrativo

En **Administración → Laboratorio de operaciones**, una cuenta administrativa cuyo correo
no está verificado dispone de **Enviar correo de verificación** y **Ya verifiqué mi correo**.
La sección funciona con el laboratorio deshabilitado. Una cuenta ya verificada no la ve al abrir
la pantalla; clientes, vendedores afiliados y visitantes no pueden utilizarla.

El envío es explícito y utiliza `sendEmailVerification(user)` de Firebase Auth, sin URL de
retorno personalizada. El propietario abre personalmente el enlace recibido. La aplicación no
muestra ni registra el enlace, códigos o tokens. No se cambian contraseñas, roles ni el atributo
`emailVerified` mediante Admin SDK.

**Ya verifiqué mi correo** ejecuta `reload(user)` y `getIdToken(user, true)`. Sólo informa éxito
si ambas respuestas se confirman y Firebase indica un correo verificado para la misma sesión.
Entonces vuelve a consultar la autorización real del laboratorio, sin recargar toda la página.
La verificación no habilita el laboratorio, no concede membresías y no sustituye la allowlist.

## Reintentos y errores

- Un bloqueo síncrono impide comandos duplicados mientras se procesa cualquier acción.
- Los dos botones quedan bloqueados durante una petición.
- El envío tiene una espera local de 60 segundos, incluso si se pierde la respuesta. Si Firebase
  limita los intentos, la espera es de cinco minutos. No hay reenvíos automáticos.
- La espera pertenece a la pantalla actual; Firebase sigue aplicando su protección de abuso
  independientemente del navegador. No constituye un rate limit distribuido nuevo.
- Los errores se muestran con mensajes acotados, sin el error crudo ni información sensible.
- Un cambio de cuenta o salida invalida las respuestas de la sesión anterior.

## Validación local

`scripts/testAdminEmailVerificationBrowser.ts` requiere exclusivamente proyecto
`demo-cuenta-hogar`, Auth Emulator en `127.0.0.1:9099`, Firestore Emulator en
`127.0.0.1:8080` y Next en `localhost:3000`. El runner crea únicamente cuentas sintéticas en
Auth Emulator; no escribe en Firestore. Los códigos de verificación se leen sólo en memoria y
se consumen mediante `applyActionCode`, sin asignar `emailVerified` administrativamente.

Ejecutar sin credenciales productivas, con las variables de aislamiento indicadas en AGENTS.md:

```sh
FIREBASE_DEBUG_PATH=/dev/null npx firebase-tools emulators:exec \
  --project demo-cuenta-hogar --config firebase.operations-lab.emulator.json \
  --only auth,firestore --log-verbosity QUIET \
  "npx tsx scripts/testAdminEmailVerificationBrowser.ts"
```

La verbosidad y el destino del debug evitan conservar los enlaces que Auth Emulator imprime
por defecto. Se conservan las assertions y la salida de resultados del runner. Las capturas se
guardan en `/tmp/cuenta-hogar-admin-email`.

Se prueban: apertura sin envío, cuenta no verificada, doble clic, respuesta perdida posterior al
envío, espera local, límite de Firebase, envío confirmado, fallos de recarga y renovación de token,
verificación real mediante código, nueva consulta de acceso, ausencia de activación automática,
cuenta ya verificada, cliente y anónimo, y tamaños desktop/mobile.

## Publicación y fases posteriores

Este ajuste requiere merge manual y autorización independiente de deploy. Ningún correo real
se envió durante el desarrollo. Después de publicarlo, el propietario podrá solicitar el correo
y completar la verificación. Se revalidará su estado antes de preparar cualquier habilitación.

Las cuentas independientes de cliente y vendedor afiliado sintéticos requieren autorización
específica de creación y de su mecanismo de verificación de prueba. No se reutiliza JP ni otra
cuenta comercial. Las variables de habilitación, allowlists y membresías se aplicarán únicamente
con autorización posterior, preservando los overrides existentes y las Rules restrictivas.
No se habilitan emisión definitiva, entrega ni finanzas reales ni ARCA productiva.
