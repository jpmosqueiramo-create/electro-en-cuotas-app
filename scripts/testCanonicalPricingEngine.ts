import { calcularPricingCanonico } from "../src/lib/canonicalPricingEngine";

function runTests() {
  console.log("=== TEST SUITE: CANONICAL PRICING ENGINE (3B.1) ===");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log("  ✓ PASS: " + msg);
      passed++;
    } else {
      console.error("  ✗ FAIL: " + msg);
      process.exitCode = 1;
    }
  }

  // TEST 1: Fail closed when plazosHabilitadosProducto is missing (legacy unconfigured product)
  try {
    calcularPricingCanonico({
      capitalCompraCentavos: 100000,
      plazoMeses: 6,
      tnaInterna: 50,
      alicuotaIva: 21
    });
    assert(false, "Should throw LEGACY_READ_ONLY_REQUIRES_CONFIG when product has no plazosHabilitados");
  } catch (err: unknown) {
    assert((err as Error).message.includes("LEGACY_READ_ONLY_REQUIRES_CONFIG"), "Fail closed when product lacks plazosHabilitados");
  }

  // TEST 2: Fail closed when TNA is missing
  try {
    calcularPricingCanonico({
      capitalCompraCentavos: 100000,
      plazoMeses: 6,
      tnaInterna: null,
      alicuotaIva: 21,
      plazosHabilitadosProducto: [1, 2, 3, 6, 12, 18]
    });
    assert(false, "Should throw PRICING_TNA_NO_CONFIGURADA when tnaInterna is null");
  } catch (err: unknown) {
    assert((err as Error).message.includes("PRICING_TNA_NO_CONFIGURADA"), "Fail closed when TNA is missing");
  }

  // TEST 3: Fail closed when IVA is missing
  try {
    calcularPricingCanonico({
      capitalCompraCentavos: 100000,
      plazoMeses: 6,
      tnaInterna: 50,
      alicuotaIva: null,
      plazosHabilitadosProducto: [1, 2, 3, 6, 12, 18]
    });
    assert(false, "Should throw PRICING_IVA_NO_CONFIGURADO when alicuotaIva is null");
  } catch (err: unknown) {
    assert((err as Error).message.includes("PRICING_IVA_NO_CONFIGURADO"), "Fail closed when IVA is missing");
  }

  // TEST 4: Term 1 cuota (TNA explicit, e.g. 24%)
  const res1 = calcularPricingCanonico({
    capitalCompraCentavos: 100000, // $1,000.00
    plazoMeses: 1,
    tnaInterna: 24, // 24% annual => 2% monthly
    alicuotaIva: 21,
    plazosHabilitadosProducto: [1, 2, 3, 6, 12, 18]
  });
  assert(res1.pricingSchemaVersion === "CANONICAL_V1", "Schema version is CANONICAL_V1");
  assert(res1.cuotas.length === 1, "Generates exactly 1 installment for plazoMeses=1");
  assert(res1.capitalCompraCentavos === 100000, "Capital centavos matches input");
  assert(res1.cuotas[0].capitalCentavos === 100000, "Capital in installment 1 matches total capital");

  // TEST 5: Term 12 cuotas integer centavos and exact rounding adjustment
  const res12 = calcularPricingCanonico({
    capitalCompraCentavos: 4500000, // $45,000.00
    plazoMeses: 12,
    tnaInterna: 150, // 150% TNA
    alicuotaIva: 21,
    senaMontoCentavos: 500000, // $5,000 seña
    plazosHabilitadosProducto: [1, 2, 3, 6, 12, 18]
  });

  assert(res12.cuotas.length === 12, "Generates 12 installments");

  // Verify sum of installments equals total contractual value
  const totalSumFromCuotas = res12.cuotas.reduce((sum, c) => sum + c.montoTotalCentavos, 0);
  assert(totalSumFromCuotas === res12.valorTotalContractualCentavos, "Sum of 12 installments exactly equals valorTotalContractualCentavos");

  // Verify sum of capital equals capitalCompraCentavos
  const capitalSum = res12.cuotas.reduce((sum, c) => sum + c.capitalCentavos, 0);
  assert(capitalSum === res12.capitalCompraCentavos, "Sum of capital in cuotas equals capitalCompraCentavos");

  // Verify seña is imputed to cuota 1
  assert(res12.senaMontoCentavos === 500000, "Seña recorded in result");

  // TEST 6: Term not in plazosHabilitadosProducto fails
  try {
    calcularPricingCanonico({
      capitalCompraCentavos: 100000,
      plazoMeses: 9,
      tnaInterna: 50,
      alicuotaIva: 21,
      plazosHabilitadosProducto: [1, 3, 6, 12]
    });
    assert(false, "Should throw PLAZO_NO_HABILITADO_PRODUCTO for unlisted term");
  } catch (err: unknown) {
    assert((err as Error).message.includes("PLAZO_NO_HABILITADO_PRODUCTO"), "Fails when term is not enabled for product");
  }

  // TEST 7: Seña exceeds cuota 1 total fails
  try {
    calcularPricingCanonico({
      capitalCompraCentavos: 100000,
      plazoMeses: 12,
      tnaInterna: 10,
      alicuotaIva: 21,
      senaMontoCentavos: 9999999,
      plazosHabilitadosProducto: [1, 2, 3, 6, 12, 18]
    });
    assert(false, "Should throw SENA_EXCEDE_CUOTA_1 when seña is too high");
  } catch (err: unknown) {
    assert((err as Error).message.includes("SENA_EXCEDE_CUOTA_1"), "Fails when seña exceeds cuota 1 total");
  }

  console.log("\nSUMMARY: " + passed + "/" + total + " tests passed cleanly.");
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
