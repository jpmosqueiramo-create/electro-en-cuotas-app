# Propuesta V4 y traslado externo — no habilitada en producción

Base: `5bb6b7ec800bbb79f6a98bfffe793e93e172ec0f`. Esta propuesta reemplaza la decisión anterior de lugar de pago del cliente. No instala paquetes, aprueba textos, consume números CH ni activa el adaptador.

## Fuentes exactas

| Original aportado | SHA-256 |
|---|---|
| Contrato de Mandato Comercial - Cuenta Hogar SRL V3.pdf | `2ccd7587c39db88c8a7bdecddbf634ea1700d961e1f2b33b95fced3a598df7a4` |
| Pagaré a la Vista (Sin Garante) - Cuenta Hogar SRL.pdf | `41e8c28175b221519b7ade3f79351656edd2be7330bad2dca1d5295f40b46736` |

Se leyeron los archivos de Downloads aportados y se cotejaron sus textos. El original del mandato dice efectivamente «una (2) cuotas». Los originales aportados no fijan una tasa de punitorios: las propuestas técnicas anteriores incluían campos adicionales. V4 conserva la política explícita de cero punitorios de la propuesta V2, sin atribuir ese agregado al original.

## Diferencias para validación profesional

| Área | Original / propuesta anterior | Propuesta actual | Estado |
|---|---|---|---|
| Mandato, cuarta | «una (2) cuotas»; propuesta técnica V2: una (1) | Dos (2) cuotas mensuales consecutivas habilitan reclamar el saldo. Mora individual conservada | Decisión del titular; validar texto exacto |
| Pagaré, lugar de pago | Caracas 1101 «o donde la acreedora lo indique»; V3: domicilio del suscriptor | Exclusivamente Caracas 1101, CABA, CP 1431 | Rectificación expresa del titular; validar eliminación de alternativa unilateral |
| Pagaré, naturaleza | A LA VISTA, SIN PROTESTO | Conservada; sin condición técnica de dos impagos | Validar coherencia del párrafo original de caducidad y cobro |
| Pagaré, competencia | Ciudad pendiente y renuncia de fueros | Párrafo conservado, ciudad pendiente, sin inferir CABA | Validación específica en relaciones de consumo |
| Punitorios | Propuesta V2 de cero punitorios | Conservada, sin recargos ni capitalización | Aprobación profesional exacta pendiente |
| Representante | Socio Gerente en original | Gerente Titular en propuesta nueva | Designación y aceptación documentadas; facultades pendientes |
| Economía/CFT | Desglose original Neto+Gestión/Logística y CFT | Campos pendientes; se muestran importes contractuales persistidos sin equiparar servicios con CFT | Validación contable/jurídica del desglose |
| Entrega | Firma de remito o acuse de recibo | Cláusula original conservada; documento de traslado externo y constancia de recepción | Confirmar tipo aplicable con contador/abogado |
| Otros textos | Objeto, factura, garantía, responsabilidades, garantía mediante pagaré | Sin cambios adicionales | No se declara validada su exigibilidad |

[Nombramiento, aceptación, fotografías y hashes ya identificados](../document-review-v1/CORPORATE_EVIDENCE.md). No se vuelve a pedir evidencia del cargo. Faltan los folios de facultades/limitaciones y el instrumento que respalda la rectificación Charcas → Caracas; se mantiene Caracas 1101.

La competencia del pagaré no se deduce del lugar de pago: revisar [Ley 24.240, artículos 36 y 37](https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion). La documentación de traslado debe corresponder a la operatoria: [RG 1415, artículo 27](https://biblioteca.arca.gob.ar/search/query/norma.aspx?p=t%3ARAG%7Cn%3A1415%7Co%3A3%7Ca%3A2003%7Cf%3A07%2F01%2F2003) y [comprobantes equivalentes ARCA](https://www.arca.gob.ar/facturacion/comprobantes/). No cualquier comprobante fiscal acredita traslado o recepción. No hay integración ARCA automática.

## Política versionada y compatibilidad

`FinalPackage.deliveryDocumentPolicy = EXTERNAL_TRANSFER_AND_RECEIPT_V1` debe formar parte del hash del futuro paquete aprobado. En ese paquete sólo se emiten mandato y pagaré; el renderer rechaza la emisión interna de remito. La plantilla histórica de remito se conserva para reproducibilidad, no se emite ni requiere aprobación como instrumento nuevo. Un paquete histórico sin esta política conserva su validación y lectura de tres instrumentos. No se migran documentos ni se cambia su hash. Nuevos congelamientos y emisiones productivas rechazan paquetes históricos sin política externa; sólo las regresiones con contexto Emulator sellado pueden ejercitar el motor histórico. La lectura/replay de una emisión ya completa no regenera archivos.

El servidor deriva la política del paquete congelado: no puede seleccionarse desde el navegador. El manifiesto exige exactamente los tipos emitidos; no admite archivos extra ni un segundo pagaré. Recuperación, vencimiento, revocación, creación exclusiva de objetos e idempotencia siguen vigentes.

`delivery` agrega opcionalmente `documentPolicy`, `externalTransfer` y `externalReceipt`, y los copia en el evento inmutable. Los expedientes anteriores sin esos campos conservan su comportamiento. No hay migración.

- `externalTransfer`: archivo privado, hash, número, fecha, emisor, tipo, fundamento de aplicabilidad, operación, hash del snapshot, cliente y producto, administrador y fecha de comprobación.
- `externalReceipt`: evidencia privada firmada, hash del registro externo, fecha de recepción, observaciones, verificación de identidad/producto/legibilidad y auditor.
- Fotos: slots `EXTERNAL_TRANSFER` (PDF o imagen) y `DELIVERY_RECEIPT` (imagen); rutas existentes privadas, sin URL pública.
- Sólo Administración registra/verifica; el responsable físico confirma entrega. Las dos firmas de instrumentos, custodia de originales, recepción firmada, logística e incidencias siguen siendo obligatorias.
- Activación, pagos e invitaciones revalidan la evidencia del mismo snapshot y los objetos privados. Transferencias posteriores mantienen el evento de entrega original.

## Uso administrativo

Con un paquete aprobado y una autorización vigente, entrar a Proveedor y logística → Control documental y entrega. Preparar mandato y pagaré emitidos y verificar sus firmas. En Evidencia privada subir el documento externo, luego registrar su número, fecha, emisor, tipo y fundamento, cotejando destinatario/producto. Subir la constancia de recepción, verificarla y registrar observaciones. Confirmar la custodia de los originales. La entrega sólo se habilita al completar todos los requisitos y resolver incidencias.

## Habilitación futura, separada de este PR

1. Revisión y merge manual; verificar SHA exacto resultante.
2. Preflight y rollout sólo bajo autorización. Conservar `PRODUCTION_OPERATIONS_ENABLED=false` y laboratorio deshabilitado. No cambiar Rules, secretos ni IAM.
3. Obtener aprobación identificable de los textos/variables/hashes V4, competencia del pagaré y representación económica; completar facultades y respaldo del domicilio.
4. Instalar por revisión de código el paquete exacto con política externa, renderer y recursos. `finalPackages.json` permanece vacío en este PR.
5. Leer CH antes de activar. Según confirmación previa del propietario: secuencia 0 y CH-000001 disponible. Esta tarea no consulta ni modifica el contador productivo; no presenta ese dato como inventario nuevo.
6. Autorizar por separado configuración administrativa y operación concreta; verificar identidad, conformidad, permisos y documentos antes de cualquier emisión exigible. No reinicializar ni reutilizar CH.

Los PDF de `output/pdf/document-review-creditor-payment-v4/` son sintéticos, texto seleccionable, sin numeración, con leyenda de borrador. El mandato lleva logo; el pagaré no. Los importes de ejemplo son $580.000 + $1.160.000 = $1.740.000, doce cuotas de $145.000; no se sumó IVA ni se atribuyó una tasa de CFT.
