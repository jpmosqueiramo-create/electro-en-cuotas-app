# Archivos finales identificados por el titular

Fuentes exactas recibidas el 25/10/2026: `mandate-original.pdf` (SHA-256 `2ccd7587c39db88c8a7bdecddbf634ea1700d961e1f2b33b95fced3a598df7a4`) y `pagare-original.pdf` (SHA-256 `41e8c28175b221519b7ade3f79351656edd2be7330bad2dca1d5295f40b46736`). Los TXT son extracciones completas, sin datos de clientes. La transcripción estructurada conserva todas las cláusulas y su orden; las pruebas comparan el texto completo ignorando únicamente espacios.

El catálogo `loop-owner-final-20261025-v1` identifica estos archivos, no los textos V4 anteriores. El mandato conserva literalmente «una (2) cuotas» y «Socio Gerente»; el pagaré conserva «o donde la acreedora lo indique», caducidad y renuncia de jurisdicción. No se corrigieron ni sustituyeron cláusulas. Los marcadores de localidad/provincia se completan desde el cliente validado, sin inventar un tribunal fijo. Moneda y año se completan con sus valores completos, evitando duplicar `$` o `20`.

Se reutiliza el renderer existente: logo oficial en mandato, pagaré sin logo, tablas alimentadas por importes y fechas persistidos, revisión y trazabilidad. El diseño generado refluye los textos; no es una reproducción de la paginación del archivo original. CFT y valor neto/gestión/logística siguen requiriendo importes explícitos reconciliados y conformidad, sin equiparar automáticamente servicios y CFT. El remito histórico permanece reproducible; nuevas entregas requieren documentación externa.

El catálogo de código no registra una aprobación profesional ni crea una aprobación del titular en Firestore. Tampoco activa el adaptador, inicializa/consume CH o emite instrumentos. La aprobación exacta del titular se registra mediante la interfaz ya existente, cuando su configuración esté autorizada. La primera emisión exige además autorización independiente de la operación y conformidad vigente.

## Publicación

1. Revisar y mergear este PR manualmente.
2. Verificar SHA exacto resultante y ejecutar preflight sobre ese SHA.
3. Publicar con `npx firebase-tools apphosting:rollouts:create cuenta-hogar --project negocio-facil-page --git-commit <SHA_MERGEADO_AUTORIZADO>`.
4. Mantener configuración existente, laboratorio deshabilitado y emisión real deshabilitada durante el smoke.
5. Revisar por separado la activación de variables y aprobación del paquete por el titular; no emitir ni consumir CH como prueba.

No desplegar nuevamente el SHA previo: no contiene este catálogo.
