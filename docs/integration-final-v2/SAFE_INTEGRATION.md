# Preparación segura de PR #75, #76 y #77

Main confirmado: `e39186b1495940539b9137a91659b53d48160e0e`, con PR #74 mergeado. Se actualizó main local por fast-forward, luego las ramas existentes por integración de main sin reescribir historia. No se mergeó ningún PR ni se ejecutó deploy.

## Integración

- #75: actualizado contra main. Conserva la declaración del titular separada de la validación del tipo, versión y hash exactos. Ni OWNER_REPORTED ni un registro VERIFIED por sí solos habilitan emisión; `productiveIssuanceEnabled` permanece false y las plantillas con pendientes no son elegibles.
- #76: actualizado contra main. Agrega extracción de IVA contenido desde el bruto contractual persistido. Su código se estabilizó con TypeScript, ESLint, build, test:safe, modelo fiscal y Emulator antes de incorporarlo a #77.
- #77: conserva su dependencia de #76. Mantiene refresco por foco/reconexión/visibilidad, paginación, exclusión de respuestas antiguas y fuente financiera común. No incluye los commits de #75; ambos se combinaron sólo en una rama local de validación.
- Conflictos textuales: ninguno. La incompatibilidad funcional corregida fue recibir una base neta previamente calculada y atribuir todo el servicio a gestión en la fixture: ahora se recibe el bruto del snapshot y se usa un concepto agregado sin distribución.
- Se verificó igualdad exacta con main en los archivos funcionales de revocación del cliente, Rules y configuración.

## IVA contenido

`CONTRACT_SERVICES` con base `GROSS_INCLUDED` toma `serviceAmount` del snapshot. La base neta se calcula en centavos con enteros BigInt y redondeo HALF_UP; el IVA es el resto del bruto. El servidor revalida el importe contra el snapshot dentro de la transacción y rechaza un bruto distinto. No escribe términos económicos, cronograma ni cuotas.

Ejemplo exclusivamente sintético, con tasa explícita del 21 %:

| Concepto | Importe |
|---|---:|
| Servicios brutos persistidos | $1.160.000,00 |
| Base neta extraída | $958.677,69 |
| IVA contenido | $201.322,31 |
| Capital contractual intacto | $580.000,00 |
| Total contractual intacto | $1.740.000,00 |
| Cuotas intactas | 12 × $145.000,00 |

No se distribuyen porcentajes entre gestión de compra, entrega logística ni traslado para asistencia técnica por tres años. La tasa y tratamiento requieren una política explícita; la inscripción en IVA no los configura automáticamente. NET sigue siendo compatible con simulaciones anteriores, sin migración ni reescritura de sus documentos. El nuevo recorrido contractual usa exclusivamente el bruto canónico.

## Pruebas

Integración local de código validada: `9cda5b03f0a463d5d792e979ed10ffca64312f6d`.

| Validación | Resultado |
|---|---|
| TypeScript, ESLint diferencial, build, test:safe | PASS |
| Recorrido integral HTTP/browser de 22 etapas y 12 cuotas | PASS |
| 21 controles adicionales contractuales, entrega y finanzas | PASS |
| Registro jurídico: versión exacta, declaración, permisos y replay | PASS |
| IVA bruto: centavos, tasas sintéticas, conservación exacta, configuración faltante | PASS |
| Emisión mock: bruto alterado rechazado, concurrencia/replay, snapshot/updateTime intactos | PASS |
| Pagos parciales/completos, reversas, recibos y cronograma | PASS |
| Comisiones: atribución, reversas, idempotencia y porcentajes individuales | PASS |
| Cliente ACTIVE revocado, otra operación válida visible y aislamiento UID | PASS |
| Browser desktop/mobile: reconexión y descarte de respuesta antigua | PASS |
| Browser administrativo del registro jurídico desktop/mobile | PASS |
| PDF, snapshot y ledger: doce fechas/importes exactos | PASS |

Las pruebas usan exclusivamente `demo-cuenta-hogar` con Auth/Firestore/Storage Emulators y Next local. La tasa del 21 % pertenece a fixtures, no a configuración fiscal real. No hay un script npm `test`; se ejecutó `npm run test:safe` y las suites específicas.

## Riesgos y orden de revisión

#75 y #76 pueden revisarse independientemente contra main. #77 debe integrarse después de #76 y retargetearse a main cuando corresponda. Tras los merges manuales deberá revalidarse el SHA final antes de cualquier autorización de rollout.

Siguen pendientes evidencia profesional del texto exacto, datos jurídicos formales, tratamiento fiscal por concepto y homologación real. El adaptador fiscal sigue siendo mock: no solicita CAE ni usa credenciales ARCA. Los controles de redondeo de notas fiscales deben homologarse con el contador/adaptador definitivo; no son autorización para facturar.

El refresco financiero no es push: la pestaña visible revalida cada 30 segundos, además de foco/reconexión. La ficha contractual conserva la extensión de formularios documentada previamente. No se habilitan emisión definitiva, cierre de entrega, invitaciones ni cobranza productiva.

Producción intacta: cero escrituras y sin cambios de Rules, Auth real, IAM, secretos o configuración. El script local no versionado permanece intacto y excluido.
