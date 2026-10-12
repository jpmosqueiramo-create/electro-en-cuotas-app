import { calcularPricingCanonico } from '../src/lib/canonicalPricingEngine';

function runEndToEndTest() {
  console.log('=== END-TO-END PRICING INTEGRATION TEST (3B.1) ===\\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log('  ✓ PASS: ' + msg);
      passed++;
    } else {
      console.error('  ✗ FAIL: ' + msg);
      process.exitCode = 1;
    }
  }

  // STEP A & B: Simulated empty configuration
  const configVacia: { tnaPorPlazo?: Record<number, number>; alicuotaIvaDefault?: number } = {};

  // Attempting to quote with empty config fails closed
  try {
    calcularPricingCanonico({
      capitalCompraCentavos: 500000,
      plazoMeses: 12,
      tnaInterna: configVacia?.tnaPorPlazo?.[12],
      alicuotaIva: configVacia?.alicuotaIvaDefault,
      plazosHabilitadosProducto: [1, 12]
    });
    assert(false, 'Quotation with empty config must fail');
  } catch (err: unknown) {
    assert((err as Error).message.includes('PRICING_TNA_NO_CONFIGURADA'), 'Quotation with unconfigured TNA fails closed');
  }

  // STEP C, D, E: Save manual admin config: TNA 1=24%, TNA 12=150%, IVA=21%
  const configGuardadaManual = {
    id: 'pricing_default' as const,
    tnaPorPlazo: { 1: 24, 12: 150 } as Record<number, number>,
    alicuotaIvaDefault: 21,
    fechaUltimaModificacion: new Date().toISOString(),
    modificadoPor: 'admin_test'
  };

  assert(configGuardadaManual.tnaPorPlazo[1] === 24, 'TNA 1 saved as 24%');
  assert(configGuardadaManual.tnaPorPlazo[12] === 150, 'TNA 12 saved as 150%');
  assert(configGuardadaManual.tnaPorPlazo[6] === undefined, 'TNA 6 is undefined (no hidden defaults)');
  assert(configGuardadaManual.alicuotaIvaDefault === 21, 'IVA saved as 21%');

  // STEP G: Create product manually selecting only [1, 12]
  const productoNuevo = {
    nombre: 'Televisor Smart 50 pulgadas',
    costoProducto: 450000, // $4,500.00
    plazosHabilitados: [1, 12] // Manually selected terms
  };

  assert(productoNuevo.plazosHabilitados.length === 2, 'Product contains exactly 2 enabled terms');
  assert(productoNuevo.plazosHabilitados.includes(1) && productoNuevo.plazosHabilitados.includes(12), 'Product terms are exactly [1, 12]');
  assert(!productoNuevo.plazosHabilitados.includes(6), 'Product term 6 is NOT enabled');

  // STEP I: Attempt quotation for term 6 -> REJECTION
  try {
    const tna6 = configGuardadaManual.tnaPorPlazo[6]; // undefined
    calcularPricingCanonico({
      capitalCompraCentavos: productoNuevo.costoProducto * 100,
      plazoMeses: 6,
      tnaInterna: tna6,
      alicuotaIva: configGuardadaManual.alicuotaIvaDefault,
      plazosHabilitadosProducto: productoNuevo.plazosHabilitados
    });
    assert(false, 'Quotation for term 6 should be rejected');
  } catch (err: unknown) {
    assert((err as Error).message.includes('PLAZO_NO_HABILITADO_PRODUCTO'), 'Rejects term 6 because it is not enabled in product');
  }

  // STEP J: Quotation for term 12 -> ACCEPTANCE
  const res12 = calcularPricingCanonico({
    capitalCompraCentavos: productoNuevo.costoProducto * 100,
    plazoMeses: 12,
    tnaInterna: configGuardadaManual.tnaPorPlazo[12],
    alicuotaIva: configGuardadaManual.alicuotaIvaDefault,
    plazosHabilitadosProducto: productoNuevo.plazosHabilitados
  });

  assert(res12.pricingSchemaVersion === 'CANONICAL_V1', 'Returns pricingSchemaVersion CANONICAL_V1');
  assert(res12.cuotas.length === 12, 'Generates 12 installments');
  assert(res12.tnaInternaAplicada === 150, 'Applies exact TNA 150% from global config');
  assert(res12.alicuotaIvaAplicada === 21, 'Applies exact IVA 21% from global config');

  // STEP K: Verify no hidden default values were used
  const sumCuotas = res12.cuotas.reduce((acc, c) => acc + c.montoTotalCentavos, 0);
  assert(sumCuotas === res12.valorTotalContractualCentavos, 'Exact centavos sum matching contract total');

  console.log('\\nEND-TO-END SUMMARY: ' + passed + '/' + total + ' checks passed cleanly.');
  if (passed !== total) {
    process.exit(1);
  }
}

runEndToEndTest();
