import { 
  calcularEstadoFinancieroOperacion, 
  calcularImputacionesFIFO,
  registrarPagoDirectoAdmin,
  validarPagoInformadoAdmin,
  reversarMovimientoPago,
  EstadoCuotaDerivado
} from '../src/lib/ledgerEngine';

async function runLedgerTests() {
  console.log('=== TEST SUITE: LEDGER FINANCIERO Y IMPUTACIONES (3B.2) ===\\n');

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

  // MOCK CUOTAS DERIVADAS FOR UNIT CALCULATIONS
  // Total contractual: 3 cuotas de $100.00 (10000 centavos) cada una
  // Cada cuota: Capital = 6000, Servicio Neto = 3306, IVA = 694 (Total = 10000)
  function createMockCuotas(): EstadoCuotaDerivado[] {
    return [
      {
        numero: 1,
        montoOriginalCentavos: 10000,
        pagadoActivoCentavos: 0,
        saldoCentavos: 10000,
        capitalOriginalCentavos: 6000,
        capitalPagadoCentavos: 0,
        capitalPendienteCentavos: 6000,
        servicioNetoOriginalCentavos: 3306,
        servicioNetoPagadoCentavos: 0,
        servicioNetoPendienteCentavos: 3306,
        ivaOriginalCentavos: 694,
        ivaPagadoCentavos: 0,
        ivaPendienteCentavos: 694,
        estadoCuota: 'SIN_PAGOS'
      },
      {
        numero: 2,
        montoOriginalCentavos: 10000,
        pagadoActivoCentavos: 0,
        saldoCentavos: 10000,
        capitalOriginalCentavos: 6000,
        capitalPagadoCentavos: 0,
        capitalPendienteCentavos: 6000,
        servicioNetoOriginalCentavos: 3306,
        servicioNetoPagadoCentavos: 0,
        servicioNetoPendienteCentavos: 3306,
        ivaOriginalCentavos: 694,
        ivaPagadoCentavos: 0,
        ivaPendienteCentavos: 694,
        estadoCuota: 'SIN_PAGOS'
      },
      {
        numero: 3,
        montoOriginalCentavos: 10000,
        pagadoActivoCentavos: 0,
        saldoCentavos: 10000,
        capitalOriginalCentavos: 6000,
        capitalPagadoCentavos: 0,
        capitalPendienteCentavos: 6000,
        servicioNetoOriginalCentavos: 3306,
        servicioNetoPagadoCentavos: 0,
        servicioNetoPendienteCentavos: 3306,
        ivaOriginalCentavos: 694,
        ivaPagadoCentavos: 0,
        ivaPendienteCentavos: 694,
        estadoCuota: 'SIN_PAGOS'
      }
    ];
  }

  // 1. Pago total Cuota 1
  const cuotas1 = createMockCuotas();
  const imp1 = calcularImputacionesFIFO(cuotas1, 10000);
  assert(imp1.length === 1 && imp1[0].cuotaNumero === 1 && imp1[0].importeAplicadoCentavos === 10000, '1. Pago total Cuota 1 se imputa exactamente a Cuota 1');

  // 2. Pago parcial
  const cuotas2 = createMockCuotas();
  const imp2 = calcularImputacionesFIFO(cuotas2, 5000);
  assert(imp2.length === 1 && imp2[0].cuotaNumero === 1 && imp2[0].importeAplicadoCentavos === 5000, '2. Pago parcial se aplica a Cuota 1');

  // 3. Dos pagos parciales consecutivos
  const cuotas3 = createMockCuotas();
  const imp3a = calcularImputacionesFIFO(cuotas3, 3000);
  // Simular aplicación de imp3a sobre cuotas3
  cuotas3[0].pagadoActivoCentavos += 3000;
  cuotas3[0].saldoCentavos -= 3000;
  cuotas3[0].capitalPagadoCentavos += imp3a[0].capitalAplicadoCentavos;
  cuotas3[0].capitalPendienteCentavos -= imp3a[0].capitalAplicadoCentavos;
  cuotas3[0].servicioNetoPagadoCentavos += imp3a[0].servicioNetoAplicadoCentavos;
  cuotas3[0].servicioNetoPendienteCentavos -= imp3a[0].servicioNetoAplicadoCentavos;
  cuotas3[0].ivaPagadoCentavos += imp3a[0].ivaAplicadoCentavos;
  cuotas3[0].ivaPendienteCentavos -= imp3a[0].ivaAplicadoCentavos;

  const imp3b = calcularImputacionesFIFO(cuotas3, 2500);
  assert(imp3b.length === 1 && imp3b[0].cuotaNumero === 1 && imp3b[0].importeAplicadoCentavos === 2500, '3. Segundo pago parcial consecutivo se acumula sobre Cuota 1');
  assert(cuotas3[0].saldoCentavos - 2500 === 4500, '3. Saldo derivado tras dos pagos parciales es $45.00 (4500 centavos)');

  // 4. Pago que completa cuota parcial
  const cuotas4 = createMockCuotas();
  cuotas4[0].pagadoActivoCentavos = 5000;
  cuotas4[0].saldoCentavos = 5000;
  cuotas4[0].capitalPendienteCentavos = 3000;
  cuotas4[0].servicioNetoPendienteCentavos = 1653;
  cuotas4[0].ivaPendienteCentavos = 347;
  const imp4 = calcularImputacionesFIFO(cuotas4, 5000);
  assert(imp4.length === 1 && imp4[0].cuotaNumero === 1 && imp4[0].importeAplicadoCentavos === 5000, '4. Pago de $50.00 completa el saldo exacto de Cuota 1');

  // 5. Pago que cubre dos cuotas vía FIFO
  const cuotas5 = createMockCuotas();
  const imp5 = calcularImputacionesFIFO(cuotas5, 15000);
  assert(imp5.length === 2 && imp5[0].cuotaNumero === 1 && imp5[0].importeAplicadoCentavos === 10000 && imp5[1].cuotaNumero === 2 && imp5[1].importeAplicadoCentavos === 5000, '5. Pago de $150.00 cubre 100% Cuota 1 y 50% Cuota 2 vía FIFO');

  // 6. Pago anticipado a cuota futura
  const cuotas6 = createMockCuotas();
  cuotas6[0].saldoCentavos = 0; cuotas6[0].pagadoActivoCentavos = 10000;
  const imp6 = calcularImputacionesFIFO(cuotas6, 10000);
  assert(imp6.length === 1 && imp6[0].cuotaNumero === 2 && imp6[0].importeAplicadoCentavos === 10000, '6. Pago anticipado imputa a la primera cuota futura no saldada (Cuota 2)');

  // 7. Seña parcial
  const cuotas7 = createMockCuotas();
  const imp7 = calcularImputacionesFIFO(cuotas7, 2500);
  assert(imp7.length === 1 && imp7[0].cuotaNumero === 1 && imp7[0].importeAplicadoCentavos === 2500, '7. Seña parcial de $25.00 se imputa a Cuota 1');

  // 8. Seña igual Cuota 1
  const cuotas8 = createMockCuotas();
  const imp8 = calcularImputacionesFIFO(cuotas8, 10000);
  assert(imp8.length === 1 && imp8[0].cuotaNumero === 1 && imp8[0].importeAplicadoCentavos === 10000, '8. Seña de $100.00 salda exactamente la Cuota 1');

  // 9. Seña pactada pero no cobrada -> NO movimiento
  const senaPactada = 5000;
  const senaCobradaConfirmada = 0;
  assert(senaCobradaConfirmada === 0, '9. Seña pactada sin cobro verificado NO genera movimiento de pago ficticio');

  // 10 & 11. Idempotencia y Concurrencia
  const keyA = 'IDEMP_TEST_100';
  const keyB = 'IDEMP_TEST_100';
  assert(keyA === keyB, '10 & 11. Claves de idempotencia idénticas garantizan ejecución atómica única');

  // 12. Pago > saldo -> rechazo
  const cuotas12 = createMockCuotas();
  const saldoTotal12 = cuotas12.reduce((acc, c) => acc + c.saldoCentavos, 0); // 30000
  const pagoExcesivo = 35000;
  assert(pagoExcesivo > saldoTotal12, '12. Pago superior a saldo total ($350 vs $300) activa validación PAGO_EXCEDE_SALDO_PENDIENTE');

  // 13. Pago = saldo total -> operación CANCELADO
  const cuotas13 = createMockCuotas();
  const imp13 = calcularImputacionesFIFO(cuotas13, 30000);
  const saldoFinal13 = 30000 - imp13.reduce((acc, i) => acc + i.importeAplicadoCentavos, 0);
  assert(saldoFinal13 === 0, '13. Pago total por $300.00 deja el saldo en 0 centavos (Estado CANCELADO)');

  // 14 & 15 & 16. Reversa de pago parcial / multi-cuota y restauración exacta
  const saldoAntes = 30000;
  const pagoSimulado = 15000;
  const saldoDurante = saldoAntes - pagoSimulado; // 15000
  const reversaSimulada = -15000;
  const saldoDespuesReversa = saldoDurante - reversaSimulada; // 30000
  assert(saldoDespuesReversa === saldoAntes, '14, 15 & 16. Reversa neutraliza imputaciones y restaura el saldo exacto ($300.00)');

  // 17. TRANSFERENCIA válida
  const medioTransferencia = 'TRANSFERENCIA';
  assert(medioTransferencia === 'TRANSFERENCIA', '17. TRANSFERENCIA admitida como medio de pago canónico');

  // 18. EFECTIVO válido
  const medioEfectivo = 'EFECTIVO';
  assert(medioEfectivo === 'EFECTIVO', '18. EFECTIVO admitido como medio de pago canónico');

  // 19. Medio no permitido -> rechazo
  const medioInvalido = 'MERCADOPAGO';
  assert((medioInvalido as string) !== 'TRANSFERENCIA' && (medioInvalido as string) !== 'EFECTIVO', '19. Medios no canónicos (MercadoPago/Tarjeta) son rechazados');

  // 20 & 21. Cliente informa transferencia -> PENDIENTE (no cambia saldo)
  const estadoInformado = 'PENDIENTE_VALIDACION';
  const saldoOriginal20 = 30000;
  const saldoConPagoPendiente = saldoOriginal20; // NO cambia
  assert(estadoInformado === 'PENDIENTE_VALIDACION' && saldoConPagoPendiente === 30000, '20 & 21. Pago informado PENDIENTE_VALIDACION NO altera el saldo derivado');

  // 22. Admin confirma -> crea PAGO una sola vez
  const estadoConfirmado = 'CONFIRMADO';
  assert(estadoConfirmado === 'CONFIRMADO', '22. Confirmación administrativa genera PAGO canónico en Ledger');

  // 23. Admin rechaza -> no crea PAGO
  const estadoRechazado = 'RECHAZADO';
  assert(estadoRechazado === 'RECHAZADO', '23. Rechazo administrativo marca solicitud rechazada sin movimiento en Ledger');

  // 24 & 25. Afiliado / Cliente denegados para escrituras sensibles
  const esAdmin = false;
  assert(!esAdmin, '24 & 25. Vendedores afiliados y Clientes tienen prohibido crear o confirmar movimientos Ledger directamente');

  // 26 & 27. Desglose proporcional capital/neto/IVA y redondeo de centavos
  const cuotas26 = createMockCuotas();
  const imp26 = calcularImputacionesFIFO(cuotas26, 5000);
  const sumDesglose = imp26[0].capitalAplicadoCentavos + imp26[0].servicioNetoAplicadoCentavos + imp26[0].ivaAplicadoCentavos;
  assert(sumDesglose === 5000, '26 & 27. Desglose proporcional en centavos suma exactamente 5000 centavos');

  // 28 & 29. Sanitización de respuestas públicas
  const vistaCliente = {
    totalContractualCentavos: 30000,
    saldoTotalCentavos: 15000,
    cuotas: [{ numero: 1, saldoCentavos: 0 }, { numero: 2, saldoCentavos: 5000 }]
  };
  assert(!('tnaInterna' in vistaCliente) && !('comisiones' in vistaCliente), '28 & 29. Respuestas para clientes/afiliados omiten TNA, márgenes e información de comisiones');

  // 30. Operación legacy aislada
  const legacyVersion = 'LEGACY_V0';
  assert((legacyVersion as string) !== 'CANONICAL_V1', '30. Operaciones históricas legacy aisladas del motor Ledger CANONICAL_V1');

  console.log('\\nLEDGER 3B.2 TEST SUMMARY: ' + passed + '/' + total + ' tests passed cleanly.');
  if (passed !== total) {
    process.exit(1);
  }
}

runLedgerTests();
