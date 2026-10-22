# Build remoto: fuentes institucionales locales

## Diagnóstico y límites de la causa raíz

Baseline: `f1914cbb7dc8433ba1b48d3bd75ff683a43cf538`. Build fallido: `build-2026-10-22-007`; Cloud Build `e8e45bc9-a297-4cad-b439-dcceef666a23`. Se leyeron todas las páginas del log: **1.170 entradas**, sin modificar el proyecto.

| Control remoto | Evidencia |
| --- | --- |
| Instalación | `npm ci --quiet --no-fund --no-audit`, NODE_ENV=development; exit exitoso, 1.076 paquetes |
| Runtime | Node 22.23.4, stack Ubuntu 22.04, builder `nodejs_20261022_RC00` |
| Adaptador | `NEXTJS_ADAPTER_VERSION: 14.0.21`; paso `apphosting-adapter-nextjs-build` |
| Framework | Next 16.2.1, `next build`, Turbopack |
| Fallo | 24 errores en CSS interno de Manrope; resolución de `@vercel/turbopack-next/internal/font/google/font` y `next/font/google queries have exactly one entry` |
| Acceso a Google Fonts | No aparecen ENOTFOUND, ETIMEDOUT, EAI_AGAIN, ECONN o errores de fetch a Fonts en el log completo |

El fallo inmediato está confirmado en el procesamiento/resolución interno de `next/font/google` por Turbopack. No se ha demostrado que falte una dependencia instalable ni que haya un fallo de conectividad con Google Fonts. No se agregó el nombre interno de Turbopack como dependencia npm.

El entorno habitual local usa Node 24.11.1/macOS; el remoto Node 22.23.4/Linux. Se creó una copia temporal desde git, sin node_modules, `.next`, `.env.local`, script no versionado ni credenciales servidor. `npm ci` con el lockfile vigente terminó con 1.071 paquetes en macOS. La diferencia de cantidad por plataforma no se utilizó como diagnóstico de un paquete faltante; el lockfile no cambió.

**El baseline sin corregir también compiló en esa copia bajo Node 22.23.4 y adaptador 14.0.21.** Por lo tanto, no se reprodujo localmente la condición específica del builder remoto y queda pendiente su causa de bajo nivel. No se afirma que sea exclusivamente la red, Node o el adaptador. No hay Docker disponible para reproducir exactamente la imagen Linux remota.

## Corrección acotada

Se sustituye únicamente el loader Google por `next/font/local` en `src/app/layout.tsx`. Se conservan Manrope, Source Sans 3, variables CSS, pesos, colores y componentes. Las fuentes oficiales se incluyen con revisión fija, hashes y licencias OFL 1.1 completas (sólo formato LF y eliminación de espacios finales; texto íntegro y hashes de origen conservados): [procedencia](../src/app/fonts/README.md).

Esta corrección elimina del grafo la integración Google Font que falló y las descargas de fuentes durante compilación. No cambia dependencias principales, lockfile, `next.config.ts`, App Hosting, Rules, IAM, secretos, bucket, contratos o motores económicos. El generador PDF mantiene su fuente y lógica existentes; el cambio afecta a la tipografía web.

## Compilación limpia equivalente

Se instaló el adaptador oficial **14.0.21 exclusivamente en caché temporal**, sin incorporarlo a las dependencias de la aplicación. Con Node **22.23.4** se ejecutó su binario `apphosting-adapter-nextjs-build`, equivalente al comando remoto `npm exec --prefix <directorio-del-adaptador> apphosting-adapter-nextjs-build`. El adaptador activó `NEXT_PRIVATE_STANDALONE=true`, aplicó sus overrides de Next Config, ejecutó `npm run build`, produjo `.apphosting` y restauró la configuración temporal.

- Baseline limpio con el loader anterior: PASS local; no reproduce el fallo Linux.
- Código corregido, sin caché `.next` del baseline: PASS con el mismo adaptador y Turbopack.
- En esta última compilación se configuraron HTTP_PROXY/HTTPS_PROXY/ALL_PROXY en `http://127.0.0.1:9` (sin servicio), NO_PROXY=localhost,127.0.0.1. Esto verifica la construcción sin un proxy externo utilizable; no se presenta como una certificación de aislamiento de red a nivel de sistema operativo.
- Se compararon SHA256 de los dos archivos fuente con los TTF incluidos en `.next/static/media`: idénticos. Lockfile idéntico al checkout.
- Sólo se pasaron al build los valores públicos de configuración web necesarios; no se copiaron secretos, tokens, cuentas de servicio ni ADC. No se inició ese bundle contra servicios productivos ni se ejecutaron acciones Firebase.

Comandos reproducibles (directorio limpio, Node 22.23.4 en PATH y variables públicas web presentes; sin credenciales servidor):

```sh
NODE_ENV=development npm ci --quiet --no-fund --no-audit
NODE_ENV=production FRAMEWORK_VERSION=16.2.1 npm exec --prefix <adaptador-oficial-14.0.21> apphosting-adapter-nextjs-build
npx tsc --noEmit
npx eslint src/app/layout.tsx scripts/testLocalFonts.ts scripts/testOperationDraftDocumentsBrowser.ts
npx tsx scripts/testLocalFonts.ts
npm run test:safe
npm run build
```

El adaptador y el runtime son herramientas de validación local. No se fijaron ni modificaron versiones del backend productivo.

## Regresiones y revisión visual

Las suites con escrituras se ejecutan exclusivamente con `demo-cuenta-hogar` y Emulators Auth 9099, Firestore 8080 y Storage 9199. Se conservan todas las assertions del runner documental y se agrega comprobación de carga efectiva de ambas tipografías y ausencia de recursos Fonts externos en desktop 1280×900 y mobile 390×844.

Las regresiones abarcan ambos PDF, pendientes, viñetas, caracteres españoles, integridad, economía guardada 1–18 cuotas, datos no guardados excluidos, identidad/conformidad, reintentos y autorización. No se alteran registros ni documentos históricos. El script local `scripts/testBudgetV2HttpIdempotency.ts` permanece intacto y excluido.

## Publicación y recuperación propuestas

1. Revisar y hacer merge manual de este único PR. Obtener el SHA de merge; no usar automáticamente la punta de feature.
2. Autorizar expresamente ese SHA y revalidar configuración/Rules/bucket/HMAC/rate limit/rollouts automáticos y guardas productivas.
3. Ejecutar sólo después de esa autorización:

```sh
npx firebase-tools apphosting:rollouts:create cuenta-hogar \
  --project negocio-facil-page --git-commit <SHA_MERGE_APROBADO>
```

4. Confirmar READY/SUCCEEDED y 100 % del tráfico. Smoke de lectura de la operación anteriormente afectada, ambos PDF y tipografía desktop/mobile; no completar datos ni registrar conformidades.
5. Si falla de nuevo el build, detenerse, conservar logs y verificar que `build-2026-10-22-006` o el build estable vigente mantiene el tráfico. No repetir rollouts, cambiar infraestructura ni restaurar Rules sin autorización. Si ya se sirvió una versión defectuosa, proponer recuperación al build estable y solicitar autorización separada antes de ejecutarla.

Riesgos restantes: la condición de bajo nivel que disparó el error remoto no fue reproducida en macOS; la validación definitiva del builder Linux queda para el rollout autorizado. Los TTF completos pesan ~792 KiB antes de compresión/transporte. No hay migraciones, nuevos permisos o recursos requeridos. Continúan los bloqueos contractuales, financieros y de entrega; aprobación jurídica pendiente.

## Resultado y evidencias

PASS: instalación limpia, build del adaptador 14.0.21/Node 22.23.4, build normal, TypeScript, ESLint diferencial, test:safe, hashes/licencias de fuentes, unitarias de preview, HTTP Emulator, regresiones documentales, texto PDF y browser desktop/mobile. La revisión visual conserva colores, jerarquías y legibilidad, sin desbordamiento móvil.

[Desktop](evidence/apphosting-local-fonts/desktop.png), [mobile](evidence/apphosting-local-fonts/mobile.png) y [matriz de validación](evidence/apphosting-local-fonts/validation.json), exclusivamente con datos sintéticos. Sin merge, rollout ni mutaciones productivas durante esta tarea.
