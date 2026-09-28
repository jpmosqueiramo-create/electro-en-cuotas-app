/**
 * UTILIDAD DE SANITIZACIÓN Y FORMATEO DE TELÉFONOS PARA WHATSAPP
 * Convierte números ingresados por usuarios (ej: "011 15-2345-6789", "11 23456789", "2364123456")
 * al formato internacional estandarizado de WhatsApp de Argentina: "549" + código de área + número.
 */

export function sanitizePhoneWhatsApp(phone: string): string {
  if (!phone) return "5491125659686"; // Fallback al número central de Cuenta Hogar

  let digits = phone.replace(/\D/g, "");
  if (!digits) return "5491125659686";

  if (digits.startsWith("549") && digits.length >= 12) {
    return digits;
  }

  if (digits.startsWith("54") && !digits.startsWith("549") && digits.length >= 11) {
    const areaAndNum = digits.substring(2);
    const cleanAreaNum = areaAndNum.replace(/^0/, "").replace(/^15/, "");
    return `549${cleanAreaNum}`;
  }

  if (digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  if (digits.startsWith("1115") && digits.length === 10) {
    digits = "11" + digits.substring(4);
  } else if (digits.length === 12 && digits.substring(2, 4) === "15") {
    digits = digits.substring(0, 2) + digits.substring(4);
  } else if (digits.length === 12 && digits.substring(3, 5) === "15") {
    digits = digits.substring(0, 3) + digits.substring(5);
  }

  if (digits.length === 10) {
    return `549${digits}`;
  }

  if (!digits.startsWith("549")) {
    return `549${digits}`;
  }

  return digits;
}
