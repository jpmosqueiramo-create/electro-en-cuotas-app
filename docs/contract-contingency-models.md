# Modelos manuales para contingencia

Administración → Documentación → Modelos para contingencia. El editor de contrato incluye un acceso directo a esa sección. Conviene descargar los archivos previamente para imprimirlos si no hay conexión.

- Modelo-Contrato-Mandato-y-Anexos-I-II-III.pdf: ocho páginas. Concatena los PDF originales 01, 02, 03 y 04 aprobados por el titular; mantiene textos, blancos, notas editoriales de modelo y firmas. Incluye mandato, identificación y autorización de compra, liquidación económica, y remito/constancia de entrega.
- Modelo-Pagare-ARS-Vencimiento-Unico.pdf: una página, copia byte a byte del PDF 05 aprobado. En pesos y con vencimiento único. No incluye el pagaré en USD, que no integra este alcance.

La sección identifica que son modelos sin completar. Descargar no emite, no asigna CH, no crea contrato ni registra firma, entrega, aceptación o pagos. Los datos se completan manualmente y la documentación y la propuesta aceptada se conservan para incorporarlas al expediente. Los modelos mantienen sus casilleros de tasas/CFT en blanco; la descarga no calcula ni presupone condiciones financieras.

## Archivos y acceso

Los PDF se versionan en src/assets/contract-contingency. sources.json registra nombres y hashes de los cinco originales. contractContingencyModels define dos IDs fijos, nombres de descarga, número de páginas, tamaño y SHA-256. El archivo del contrato combinado cambia sólo su contenedor/metadata; el contenido textual de todas sus páginas coincide con los originales en orden. No se modifican los archivos de origen ni paquetes legales congelados del renderer.

GET /api/admin/documentacion/modelos-contingencia?modelo=contrato-anexos o pagare-pesos exige verifyAdminAuth. No admite rutas o nombres arbitrarios. Verifica tamaño/hash antes de responder y devuelve application/pdf, Content-Disposition attachment, private/no-store, nosniff y noindex. No publica archivos bajo public, no utiliza Storage y no escribe Firestore. Next standalone incluye explícitamente los dos PDF mediante outputFileTracingIncludes. No requiere migración, Rules ni colecciones nuevas.

La interfaz usa la sesión administrativa para descargar el blob, evita solicitudes simultáneas y recupera los controles si falla la petición. Presentación verificada en escritorio y móvil.

## Verificación

scripts/testContractContingencyEmulator.ts comprueba 401/403, IDs inválidos, headers, nombres, bytes/hash y ausencia de registros de negocio. CONTINGENCY_BROWSER=1 descarga ambos archivos desde la pantalla real a disco y compara los hashes; verifica 1280/390 px, sin desborde ni conexiones Firebase externas. El build debe incluir ambos archivos en .next/standalone y en la traza de la ruta. Revisión PDF: igualdad del texto con las cinco fuentes y renderizado/inspección de las nueve páginas, conservando todos los espacios para completar.
