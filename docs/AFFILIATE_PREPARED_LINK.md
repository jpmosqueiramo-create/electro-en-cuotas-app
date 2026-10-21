# Vinculación administrativa preparada

La pantalla `/admin/comisiones` conserva el alta habitual. La sección desplegable
**Vinculación administrativa preparada** permite ingresar un manifiesto autorizado:
ID de perfil, ID de comando, UID de Auth, nombre, correo, localidad, porcentaje y
motivo. No incluye datos reales precargados ni fixtures de producción.

## Verificación y confirmación

1. Ingresar los valores exactos aprobados. No se generan ni sustituyen IDs.
2. **Verificar vinculación preparada** utiliza el mismo `POST
   /api/admin/vendedores/registro` con `mode: PREVIEW` y `preparedLink: true`.
   Esta operación sólo lee Auth y Firestore.
3. El resumen muestra datos, cuatro rutas, motivo y vigencia desde el guardado
   efectivo. La casilla de confirmación es obligatoria. Editar cualquier campo
   invalida el resumen y exige nueva verificación.
4. **Confirmar vinculación preparada** utiliza la sesión administrativa existente
   y el mismo endpoint, sin `mode`. El token sólo se utiliza en memoria para el
   encabezado de la petición; no se imprime, exporta ni persiste.

El servidor autoriza cada llamada independientemente del navegador. En esta
modalidad exige cuenta Auth activa y verificada, correo coincidente, perfil
activo, revisión inicial cero, UID y correo sin otro perfil, ausencia de los
cuatro destinos y ausencia de configuraciones previas del perfil.
La comprobación de Firestore se repite dentro de la transacción de guardado.
Auth se verifica fuera de ella: no existe transacción distribuida Auth/Firestore;
las lecturas posteriores siguen sujetas a la autorización vigente del afiliado.

## Escrituras y compatibilidad

La transacción existente crea exclusivamente:

- `vendedores/{id}`: perfil, revisión 1, fecha y administrador.
- `vendedores_configuraciones_comision/registry_{id}_{commandId}`:
  porcentaje en puntos básicos, vigencia desde fecha del servidor, motivo y actor.
- `vendedores/{id}/registryHistory/{commandId}`: estado anterior nulo,
  datos confirmados, revisión, motivo y actor.
- `vendedores/{id}/registryCommands/{commandId}`: digest y resultado idempotente.

No se modifica el modelo persistido ni el cálculo de comisiones. `preparedLink`
y `mode` son controles de la petición, no nuevos campos del perfil. El digest y
la forma del resultado de guardado siguen siendo compatibles con los comandos
existentes. Un replay idéntico, incluso concurrente, devuelve el resultado
anterior sin escrituras. Un contenido diferente con el mismo comando se rechaza.
En verificación, un comando idéntico ya persistido se informa como confirmado y
no se ofrece un nuevo guardado. El replay usa el mismo administrador original.

No crea usuarios, asignaciones, comisiones, liquidaciones o saldos. No actualiza
registros históricos ni cambia Rules, IAM, secretos o configuración. El alta
habitual conserva su comportamiento y sus IDs automáticos.

## Recuperación

Si se pierde la respuesta, conservar exactamente el manifiesto y reintentar con
la misma sesión administrativa: el recibo evita efectos duplicados. Ante un
conflicto, detenerse y revisar; no generar otro comando para ocultarlo.
Una desactivación posterior requiere autorización, revisión vigente, motivo y
nuevo comando auditado mediante la API existente. No elimina documentos ni
borra el UID: una desvinculación de identidad requiere otro procedimiento
explícitamente autorizado. No se ejecuta ninguna recuperación automáticamente.

## Pruebas locales

Requieren exclusivamente proyecto `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y
Storage Emulator 9199. Configurar `NEXT_PUBLIC_ADMIN_EMAIL=admin.prepared@example.test`
y las guardas locales habituales; no suministrar credenciales productivas.

- `npx tsx scripts/testPreparedAffiliateLinkEmulator.ts`: preview sin escrituras,
  cuatro documentos atómicos, concurrencia, replay y updateTime, conflicto,
  identidad inexistente/deshabilitada/no verificada/incompatible, UID ocupado,
  destino parcial ocupado, permisos y registros históricos inalterados.
- `npx tsx scripts/runPreparedAffiliateLinkBrowser.ts`: arranca Next local,
  comprueba IDs, confirmación, invalidación al editar y vista de afiliado,
  desktop/móvil y ausencia de peticiones Firebase externas.
- Regresión: `scripts/testAffiliateUnifiedEmulator.ts`.

Capturas sintéticas fuera de Git: `/tmp/cuenta-hogar-prepared-affiliate/`.

La vinculación real requiere integrar/revisar este cambio, autorizar su publicación
y repetir el preflight del manifiesto. Este PR no ejecuta vinculaciones productivas.
