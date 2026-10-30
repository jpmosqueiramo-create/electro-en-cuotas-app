# Aviso de datos personales recibidos

Cada envío válido nuevo mediante el enlace privado crea una alerta no leída en la bandeja de Administración y su contador existente. «Revisar datos del cliente» abre la pestaña Datos del cliente de la operación y versión correspondientes. No aplica los datos ni registra conformidad automáticamente.

El servidor crea `alertas_admin/client_data_{requestId}` en la misma transacción que la presentación y el cambio a SUBMITTED. Reintentos idénticos no duplican el aviso ni restablecen su lectura. Abrir el enlace, errores de validación, enlaces vencidos o revocados no generan avisos. No se envían correos.

Schema aditivo `CLIENT_DATA_RECEIVED_ALERT_V1`: `tipo` DATOS_CLIENTE_RECIBIDOS, `mensaje` (nombre tomado del presupuesto guardado), `fechaCreacion` Timestamp del servidor, `leida` boolean, `budgetId` string, `budgetVersion` integer, `sourceCollection` string, `solicitudId` string y `submissionId` string. No copia documento, domicilio, contacto, información laboral ni token del enlace.

Consumidores: contador AdminAlertsLink, bandeja /admin y resolveAlertAction. Sin cambios de reglas, colecciones existentes ni migraciones; aplica también a enlaces vigentes anteriores al cambio. Las presentaciones históricas ya recibidas no se notifican retroactivamente.
