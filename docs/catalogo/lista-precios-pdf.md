# Lista de precios PDF

Administración → Catálogo → **Exportar catálogo PDF** descarga todos los productos cargados, independientemente de los filtros o de su publicación. La fecha y el nombre del archivo usan la zona horaria de Buenos Aires.

Incluye nombre, marca, tipo, miniatura y todos los planes habilitados con su cuota estimada. Usa el motor existente del catálogo, sin modificar sus cálculos. Los productos sin planes o con configuración inválida permanecen en la lista con una indicación para consultar. No utiliza cuotas legacy como sustituto.

El documento utiliza una lista explícita de campos: no incluye costos, proveedores, factores, stock, identificadores, descripciones ni notas administrativas. Los nombres, marca y tipo son textos destinados a compartir y deben cargarse sin información privada.

Las fotos se descargan sin credenciales, se convierten a miniaturas JPEG y se incorporan al PDF. Si una foto falla, no se interrumpe la exportación: aparece “Sin foto”. No requiere escrituras, colecciones, campos, migraciones ni cambios de reglas. No publica automáticamente productos.

Verificación:

- `npx tsx scripts/testCatalogPriceList.ts`: precios, allowlist, productos sin planes, configuración inválida, fecha local y PDF multipágina.
- `scripts/testCatalogPriceListBrowser.ts`, bajo Firebase Emulators demo: descarga real con filtros activos, miniatura, tamaños 1280/390/320 y ausencia de mutaciones de productos.
- TypeScript, ESLint, build e integridad del manifiesto de los renderizadores existentes.
