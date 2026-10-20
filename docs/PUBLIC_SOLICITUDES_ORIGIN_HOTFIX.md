# Hotfix: orígenes de solicitudes públicas detrás de App Hosting

Base: `d1102df29d316b9b7f30fa311018f1d94bb3c6ae`, build
`build-2026-10-20-003`. No cambia persistencia, cupos, formularios ni infraestructura.

## Diagnóstico (2026-10-20)

- En el dominio oficial, un POST con `Origin: https://www.cuentahogar.com.ar`
  y cuerpo JSON `null` recibe 403, «Origen no permitido».
- El mismo cuerpo sin Origin recibe 400 de la validación de datos. Ninguna
  prueba puede persistir: el cuerpo es inválido antes de acceder al servicio.
- En esa base, el único retorno 403 del handler compara Origin con
  `new URL(req.url).origin`. Esto demuestra que el origen público recibido
  difiere del origen efectivo de Request en el runtime desplegado.
- No se instrumentó producción ni se registraron headers completos, PII o
  secretos. El hostname interno exacto no fue capturado. No se presume su valor.
- Next 16.2.1, `dist/server/next-server.js`, `attachRequestMeta`, puede construir
  `initURL` desde hostname/puerto del servidor; el standalone toma HOSTNAME/PORT.
  Por ello Request.url no constituye una lista de dominios públicos autorizados.
- La API read-only de App Hosting confirma el dominio técnico del backend
  `cuenta-hogar--negocio-facil-page.us-central1.hosted.app` y www con
  HOST_ACTIVE, OWNERSHIP_ACTIVE y CERT_ACTIVE. El apex está configurado como
  redirect; no se incorpora como origen del formulario.

Host y X-Forwarded-Host no se registran ni se usan como autoridad. Las pruebas
inyectan ambos con valores falsificados para demostrar que no alteran la decisión.

## Política explícita

Lista versionada, comparación literal exacta (esquema y puerto incluidos):

- `https://www.cuentahogar.com.ar`
- `https://cuenta-hogar--negocio-facil-page.us-central1.hosted.app`

No admite sufijos, comodines, paths, userinfo, listas ni el Origin opaco `null`.
No normaliza URLs arbitrarias para admitir variantes. HTTP y puertos alternativos
son rechazados; incluso `:443` explícito no coincide con el string autorizado.
Los navegadores serializan su origen HTTPS estándar sin ese puerto.

Sólo Next en modo development admite también `http://localhost:3000` y
`http://127.0.0.1:3000`. No se habilitan en un build production, ni por headers
ni por una variable de configuración adicional.

La ausencia del header Origin se permite expresamente, preservando clientes
HTTP no navegador y el comportamiento anterior. Un header presente vacío o
literal `null` se rechaza. Los formularios legítimos envían JSON mediante fetch
same-origin y su Origin público está en la lista.

Esta validación no autentica: un cliente HTTP puede omitir/falsificar Origin.
No se agregan cabeceras CORS permisivas. Validación del payload, idempotencia y
cuota HMAC transaccional permanecen independientes y sin modificaciones.
El límite por contacto no impide abuso mediante identidades diferentes.

## Verificación

`testPublicSolicitudOrigin.ts` usa exclusivamente Emulator y prueba entradas
públicas con Request.url interno distinto, Host/Forwarded-Host falsificados,
orígenes externos y similares, esquema/puerto incorrectos, ausencia y Origin
opaco, tres persistencias, cuarta 429/Retry-After y replay sin gasto de cupo.
Se repiten las suites de solicitudes públicas y rate limit de PR #36 y #37.

No se añaden logs productivos ni se requieren secretos, Rules o permisos nuevos.
El hotfix debe revisarse e integrarse antes de autorizar otro rollout.
