# Logo oficial de Cuenta Hogar

## Fuente y presentación

El PNG suministrado por el propietario se conserva byte por byte en `public/logo-cuenta-hogar-oficial.png`.
SHA256: `f4da4d3be0517fa40e169d771590ca450c8b2c5824a77b11f5333c619188647b`.
Su lienzo es 2000 × 2000 y el contenido ocupa el cuadrado 450,450–1550,1550.
`brand.ts` centraliza estos datos; `CuentaHogarLogo` y `pdfBranding` encuadran el margen blanco sólo durante la presentación, sin cambiar píxeles ni proporciones.
`logoBase64.ts` es una representación generada del mismo PNG para los renderers offline; el test comprueba su igualdad exacta. No es otra variante gráfica.

## Inventario de aplicación

| Superficie | Implementación / decisión |
| --- | --- |
| Homepage, header, footer | Componente compartido; conserva navegación y estilos |
| Login cliente y vendedor afiliado | Sustituye la imagen anterior |
| Administración desktop/mobile | Sustituye el escudo del encabezado por el logo oficial |
| Portal cliente y portal del vendedor afiliado | Encabezados con el mismo componente |
| Formulario personal/laboral y confirmación exitosa | Logo compartido; campos, envío y capacidades intactos |
| Activación de cliente | Encabezado con logo; sin habilitar invitaciones productivas |
| Solicitar, Nosotros, términos, arrepentimiento y páginas públicas históricas de propuesta/firma | Sustituye identidad gráfica; no habilita acciones ni altera su lógica |
| Fallbacks de imágenes de catálogo | Conservan el URL canónico, cuyo contenido ahora es oficial |
| Presupuesto V2 y PDF de opciones | Logo al inicio de cada página, mismo DTO allowlisted y datos |
| Mandato de operación y mandato de referencia Emulator | Logo en cada página; hashes del renderer incluyen recurso y función de presentación |
| Pagaré de operación, de referencia y legacy | Exclusión obligatoria: no se llama al helper; tests comprueban cero imágenes |
| Recibo histórico, remitos y estado de cuenta | Branding nuevo sólo al generar ejemplares; ninguna reescritura de archivos guardados |
| Recibos V2 | Branding de su sección existente; no se agrega un nuevo motor ni un PDF financiero V2 |
| Iconos y metadata social | Un solo PNG oficial; se retiran iconos file-based antiguos que prevalecían sobre metadata |
| PNG antiguos duplicados | Retirados por no tener consumidores vigentes; disponibles en el historial Git |

## Imágenes institucionales con marca incrustada

Las ilustraciones y fotografías existentes no son assets de logo independientes. La revisión visual detectó otra variante de marca incrustada en `home-hero-operacion-cuenta-hogar.jpg`; también deben revisarse las imágenes de vehículos, uniformes y centros operativos antes de afirmar que no queda ninguna marca antigua dentro de fotografías.
El propietario decidió expresamente conservar las fotografías y limitar este PR a logos independientes, interfaces y PDF. La marca incrustada queda pendiente documentada. No se editaron ni regeneraron fotografías y no se presenta este punto como terminado.

## Límites y riesgos anteriores

- No cambia fórmulas, DTOs, cobros, cuotas, permisos, Rules, infraestructura ni datos productivos.
- Los PDF almacenados/congelados no se regeneran. La nueva identidad sólo se aplica a nuevos renderizados autorizados.
- Renderers legacy contienen identificaciones fiscales y textos anteriores, por ejemplo `pdfGenerator.ts` y `/propuesta`; este PR no los corrige ni los declara aprobados jurídicamente ni reactiva sus circuitos.
- Las muestras son sintéticas. El recibo lleva una advertencia expresa de que no corresponde a un pago real.
- No se habilita emisión definitiva, numeración, formalización, entrega ni cobranza productivas.

## Validaciones

- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS, sin red para Google Fonts ni cambios de dependencias.
- `npm run test:safe`: PASS.
- `tsx scripts/testOfficialBrand.ts`: PASS. PNG/base64 iguales, recorte PDF sin pintar/consumir el path, presupuesto/mandato/recibo con imágenes, pagarés sin imágenes, fuentes inmutables y PDF determinista.
- `tsx scripts/testOperationDraftDocuments.ts`: PASS, plazos 1–18 y bloqueos de identidad/conformidad.
- `tsx scripts/testContractDocuments.ts`: PASS, layout de referencia e integridad del pagaré sin cambios de su contenido.
- Emulator + `tsx scripts/runOfficialBrandBrowser.ts`: PASS. Homepage y formulario 1280×900 y 390×844; regresiones existentes del preview y producto; ninguna conexión Firebase productiva.
- ESLint diferencial: cero diagnósticos nuevos. Permanecen 65 anteriores (29 errores y 36 advertencias) en cliente, firma histórica, logins, Nosotros, propuesta y pdfGenerator. El inventario con reglas, líneas y mensajes está en `evidence/official-brand/eslint-baseline.json`; no se modificaron reglas ni se ocultaron diagnósticos.
- Inspección visual: presupuesto, mandato, recibo y pagaré renderizados; capturas de homepage y formulario desktop/mobile. Pagaré sin logo.

Para repetir pruebas con escrituras se requiere únicamente `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199; se aplican las guardas del repositorio. No usar credenciales ni datos productivos.

## Archivos del cambio

- `docs/OFFICIAL_BRAND.md`
- `docs/evidence/official-brand/eslint-baseline.json`
- `docs/evidence/official-brand/formulario-1280.png`
- `docs/evidence/official-brand/formulario-390.png`
- `docs/evidence/official-brand/homepage-1280.png`
- `docs/evidence/official-brand/homepage-390.png`
- `docs/evidence/official-brand/mandato-1.png`
- `docs/evidence/official-brand/manifest.json`
- `docs/evidence/official-brand/pagare-1.png`
- `docs/evidence/official-brand/presupuesto-1.png`
- `docs/evidence/official-brand/recibo-1.png`
- `public/favicon.ico`
- `public/logo-cuenta-hogar-oficial.png`
- `public/logo-cuenta-hogar.png`
- `public/logo.png`
- `scripts/runOfficialBrandBrowser.ts`
- `scripts/testOfficialBrand.ts`
- `scripts/testOfficialBrandBrowser.ts`
- `src/app/afiliado/page.tsx`
- `src/app/arrepentimiento/page.tsx`
- `src/app/cliente/page.tsx`
- `src/app/completar-datos/[requestId]/public-form.tsx`
- `src/app/favicon.ico`
- `src/app/firmar-contrato/[id]/FirmarContratoClient.tsx`
- `src/app/icon.png`
- `src/app/layout.tsx`
- `src/app/login-afiliado/page.tsx`
- `src/app/login/page.tsx`
- `src/app/nosotros/page.tsx`
- `src/app/propuesta/page.tsx`
- `src/app/solicitar/page.tsx`
- `src/app/terms/page.tsx`
- `src/components/CuentaHogarLogo.tsx`
- `src/components/Footer.tsx`
- `src/components/Header.tsx`
- `src/components/admin/AdminAppShell.tsx`
- `src/components/operations/ClientActivationV2.tsx`
- `src/components/operations/OperationFinancialWorkspace.tsx`
- `src/lib/brand.ts`
- `src/lib/budgetV2Pdf.ts`
- `src/lib/contractDocuments/operationDraftPdf.ts`
- `src/lib/contractDocuments/pdf.ts`
- `src/lib/logoBase64.ts`
- `src/lib/pdfBranding.ts`
- `src/lib/pdfGenerator.ts`
