import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_APP_ENV === "staging" ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "cuenta-hogar-staging") {
    return NextResponse.json({ success: false, error: "Notificaciones externas deshabilitadas en staging" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const { nombre, dni, whatsapp, localidad, necesidad, referente, tipo } = body;

    const isQuick = tipo === "contacto_rapido";
    const subject = isQuick 
      ? `📥 NUEVO PRESUPUESTO WEB: ${nombre} (${localidad || "Sin localidad"})`
      : `📋 NUEVA APERTURA DE CUENTA: ${nombre} (DNI: ${dni || "S/D"})`;

    const adminUrl = isQuick 
      ? "https://cuentahogar.com.ar/admin/presupuestos" 
      : "https://cuentahogar.com.ar/admin/validaciones?tab=aperturas";

    const emailContent = `
NUEVA SOLICITUD DESDE CUENTA HOGAR:

• Tipo de Solicitud: ${isQuick ? "Presupuesto / Contacto Rápido" : "Apertura de Cuenta"}
• Nombre y Apellido: ${nombre || "No especificado"}
• DNI: ${dni || "No especificado"}
• WhatsApp: ${whatsapp || "No especificado"}
• Localidad: ${localidad || "No especificada"}
• Producto / Necesidad: ${necesidad || "A definir"}
• Recomendado por: ${referente || "Ninguno"}

Puedes ver y responder esta solicitud en el Panel de Administración:
${adminUrl}
    `.trim();

    // 1. Send via FormSubmit AJAX API to jpmosqueiramo@gmail.com
    try {
      await fetch("https://formsubmit.co/ajax/jpmosqueiramo@gmail.com", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          _subject: subject,
          _template: "table",
          _captcha: "false",
          nombre: nombre,
          dni: dni,
          whatsapp: whatsapp,
          localidad: localidad,
          necesidad: necesidad,
          referente: referente || "Ninguno",
          mensaje: emailContent
        })
      });
    } catch(e) {
      console.error("FormSubmit error:", e);
    }

    // 2. Backup dispatch via Formspree API
    try {
      await fetch("https://formspree.io/f/mqazkzwj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "jpmosqueiramo@gmail.com",
          subject: subject,
          nombre,
          dni,
          whatsapp,
          localidad,
          necesidad,
          referente,
          message: emailContent
        })
      });
    } catch (e) {
      console.error("Formspree error:", e);
    }

    return NextResponse.json({ success: true, message: "Notificación enviada con éxito" });
  } catch (err: unknown) {
    console.error("Error al notificar presupuesto por email:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
