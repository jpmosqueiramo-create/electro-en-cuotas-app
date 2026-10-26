# Editor contractual y desglose incluido

## Operatoria

Administración → operación aceptada → Contrato y pagaré → Confeccionar contrato y pagaré.

El panel trae los datos personales y laborales guardados, producto, cantidad, condición, plan y vencimientos. Permite corregirlos y elegir otro plazo entre los factores existentes del snapshot aceptado. Guardar datos del contrato persiste todo en una única revisión. Si cambian las condiciones confirmadas, debe registrarse la conformidad efectivamente recibida del cliente. Emitir contrato y pagaré confirma expresamente la emisión: el servidor selecciona el paquete actual, el lugar guardado y el día local argentino, sin selector técnico ni otra casilla de aprobación.

La emisión definitiva conserva CH, snapshot, hashes, auditoría, permisos e idempotencia existentes. Firmas, custodia y documentación externa de entrega siguen siendo requisitos para activar cuotas. No hay emisión fiscal ARCA ni escritura productiva como parte de estas pruebas.

## Política confirmada por el propietario

Sobre la diferencia entre total contractual y capital aplicado: 40% servicios/logística/traslados de asistencia técnica durante 12 meses; 60% financiación. El propietario confirmó IVA del 21% incluido. Se extrae de ambos componentes; no se agrega al total, pagaré ni cuotas. Esos porcentajes distribuyen importes y no son TNA, TEA ni una tasa anual de CFT.

| Concepto del ejemplo | Neto | IVA incluido | Total |
| --- | ---: | ---: | ---: |
| Capital aplicado | — | — | $400.000,00 |
| Servicios (40% de $800.000) | $264.462,81 | $55.537,19 | $320.000,00 |
| Financiación (60% de $800.000) | $396.694,21 | $83.305,79 | $480.000,00 |
| Total contractual y pagaré | | | $1.200.000,00 |

Doce cuotas de $100.000 conservan el total. La participación informativa del servicio se distribuye proporcionalmente en las cuotas existentes, ajustando centavos por acumulación. No crea otra deuda ni recalcula vencimientos en el PDF. El concepto monetario CFT del original recibe el componente bruto de financiación; el primer concepto del original recibe capital más servicios brutos. Se conservan las cláusulas originales; se agrega el detalle numérico confirmado, sin inventar tasas anuales.

## Persistencia y compatibilidad

Campo opcional `commercialPreparation` en el borrador: `CONTRACT_COMMERCIAL_PREPARATION_V1`, política `OWNER_SERVICE40_FINANCE60_INCLUDED_VAT21_V1`, lugar de emisión e importes enteros en centavos. El servidor deriva los importes de `economicTerms`; no acepta valores económicos enviados por el navegador. `SAVE_CONTRACT_EDITOR` usa la revisión optimista, recibo idempotente y auditoría del motor existente. No modifica el presupuesto emitido, la aceptación ni sus snapshots.

La preparación entra en el digest de conformidad y revisión READY. En el snapshot se incluye como JSON en el mapa de parámetros existente y queda protegida por su hash. El renderizador valida la reconciliación antes de imprimir. Los borradores históricos sin el campo siguen el camino anterior y no reciben valores por defecto. Los PDF históricos almacenados no se reescriben.

La nueva propuesta técnica del paquete usa V4; los textos originales y sus hashes conservan V1. V4 no puede heredar una aprobación/hash de otro paquete. El catálogo versionado prepara la instalación posterior; este PR no instala el catálogo, cambia configuración, consume CH ni emite obligaciones reales.

## Verificación

Los comandos y evidencias de la revisión final se registran en `VALIDATION.md`. Todas las escrituras de pruebas usan `demo-cuenta-hogar`, Auth/Firestore/Storage Emulator. Las muestras son documentos sintéticos sin validez contractual o fiscal.
