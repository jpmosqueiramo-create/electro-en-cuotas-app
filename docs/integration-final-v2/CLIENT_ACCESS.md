# Revocación administrativa de acceso del cliente

Base: main `b95395fbe678de2033f46d078449e2eae7448808`, que integra PR #73. No hay migración de históricos.

El comando `REVOKE_ACCESS` amplía la API administrativa existente de `client-portal`. Requiere operación exacta, revisión esperada, commandId y motivo. Sólo admite vínculos ACTIVE. La transición a REVOKED conserva UID, fecha de activación, índice de servicios y registros financieros; agrega el recibo idempotente y el evento auditado dentro del mismo subtree privado y transacción.

La revocación no cancela deuda ni cambia obligaciones. No permite volver a activar, reemplazar UID ni invitar automáticamente: una eventual rehabilitación requiere un procedimiento explícito futuro. Las invitaciones productivas siguen bloqueadas.

El portal omite únicamente servicios cuyo vínculo REVOKED corresponde al UID autenticado; otros errores siguen fallando de forma segura. El endpoint individual y el financiero vuelven a validar el vínculo ACTIVE. La revocación de una operación no hace desaparecer los demás servicios legítimos. No se modifican Rules, Auth, comisiones ni ledger.

Administración dispone de motivo obligatorio, confirmación explícita y botón protegido contra doble envío. El cliente ve «Mi compra / Mi plan de pagos», sobre el mismo componente financiero compartido.

Pruebas: revocación concurrente (cuatro comandos idénticos, una transición), replay sin cambio de updateTime, conflicto de payload, acceso individual denegado, segundo servicio conservado, reutilización de invitación rechazada, acceso anónimo y de cliente a API administrativa denegado, históricos intactos. Browser: invitación, verificación de email en Auth Emulator, dos servicios, revocación mediante formulario, segundo servicio conservado, desktop/mobile.

No se habilitan emisión, formalización, cierre de entrega, invitaciones ni cobranza productivos. Todos los datos escritos durante pruebas pertenecen a `demo-cuenta-hogar` en localhost.

Validación ejecutada: TypeScript PASS, ESLint diferencial sin diagnósticos, build PASS, test:safe PASS, suite `testOperationClientV2Emulator.ts` PASS y `testOperationClientV2Browser.ts` desktop/mobile PASS. Cero solicitudes externas a Firebase desde el navegador de pruebas. Los intentos iniciales fallaron por configuración de identidad de fixture y navegación del runner; no se retiraron assertions ni se modificaron Rules. El runner usa la identidad administrativa de la fixture existente en Auth Emulator, sin credenciales reales.

Capturas: `docs/evidence/client-active-revocation/`. El índice conservado permite auditoría; REVOKED no se reinterpreta como PREPARED. Un cliente con otros servicios activos continúa consultándolos.
