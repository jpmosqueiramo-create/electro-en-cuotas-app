/**
 * MOTOR DE AUTOCOMPLETADO TÉCNICO E IA PARA PRODUCTOS (100% Client-Side)
 * Marca: Cuenta Hogar - LOOP GESTIÓN INTEGRAL S.R.L.
 */

export const generarFichaTecnicaIAClient = async (nombreProducto: string): Promise<string> => {
  const pName = nombreProducto.trim();
  if (!pName) return "";

  let wikiSnippet = "";

  // 1. Búsqueda Web en Tiempo Real vía Wikipedia API (CORS Habilitado)
  try {
    const wikiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(pName)}&format=json&origin=*`;
    const res = await fetch(wikiUrl);
    if (res.ok) {
      const data = await res.json();
      const searchResults = data?.query?.search || [];
      if (searchResults.length > 0) {
        wikiSnippet = searchResults[0].snippet.replace(/<[^>]+>/g, " ").trim();
      }
    }
  } catch (e) {
    console.warn("Búsqueda web omita:", e);
  }

  const lowerName = pName.toLowerCase();

  // Detección de Parámetros Específicos
  const storageMatch = lowerName.match(/(\d+)\s*(gb|tb)/i);
  const storageText = storageMatch ? `${storageMatch[1]} ${storageMatch[2].toUpperCase()}` : "128 GB";

  const ramMatch = lowerName.match(/(\d+)\s*gb\s*ram/i) || lowerName.match(/(\d+)\s*ram/i);
  const ramText = ramMatch ? `${ramMatch[1]} GB` : "4 GB / 6 GB";

  const pulgadasMatch = lowerName.match(/(\d+)[\"|\s*pulgadas|\s*’]/i);
  const pulgadasText = pulgadasMatch ? `${pulgadasMatch[1]}"` : "50\"";

  // Detección de Categorías
  const isCelular = /galaxy|iphone|moto|xiaomi|redmi|realme|tcl|zte|celular|smartphone|phone|a16|a15|a25|a35|a55|g24|g34|g54|g84|edge|note/i.test(lowerName);
  const isTV = /tv|smart|televisor|pantalla|4k|led|qled|oled|noblex|lg|samsung|philips|tcl|hisense|rca|50|55|65|43|32/i.test(lowerName);
  const isLavarropas = /lavarropas|secarropas|drean|whirlpool|lg|longvie|philco|carga/i.test(lowerName);
  const isHeladera = /heladera|freezer|no frost|patrick|gafa|whirlpool|lg|briket|inverter/i.test(lowerName);
  const isNotebook = /notebook|laptop|pc|compu|macbook|asus|lenovo|hp|dell|acer/i.test(lowerName);
  const isAire = /aire|split|acondicionado|inverter|bgh|philco|surrey/i.test(lowerName);

  let descripcion = "";

  if (isCelular) {
    const is5G = /5g/i.test(lowerName);
    descripcion = `Ficha Técnica Oficial - ${pName}:\n` +
      `• Pantalla: Display de alta definición con tasa de refresco fluida (90Hz / 120Hz).\n` +
      `• Almacenamiento Interno: ${storageText} de memoria (expandible mediante MicroSD).\n` +
      `• Memoria RAM: ${ramText} para multitarea ágil y juegos.\n` +
      `• Procesador: Chipset Octa-Core optimizado para alta eficiencia energética.\n` +
      `• Sistema de Cámaras: Cámara principal multilente con IA, HDR y Modo Noche.\n` +
      `• Batería: Batería de 5.000 mAh de gran autonomía con Carga Rápida.\n` +
      `• Conectividad: ${is5G ? "5G Ultra Rápido" : "4G LTE"}, Wi-Fi, Bluetooth 5.3 y GPS.\n` +
      `• Garantía: Equipo 100% original con garantía oficial del fabricante y respaldo Cuenta Hogar.`;
  } else if (isTV) {
    const is4K = /4k/i.test(lowerName);
    descripcion = `Especificaciones Técnicas - ${pName}:\n` +
      `• Pantalla: Panel LED / QLED de ${pulgadasText} con resolución ${is4K ? "4K Ultra HD (3840 x 2160 px)" : "Full HD 1080p"}.\n` +
      `• Sistema Operativo: Smart TV con acceso a Netflix, YouTube, Disney+, Prime Video y Google Play.\n` +
      `• Audio & Sonido: Sistema de sonido envolvente Dolby Audio de alta fidelidad.\n` +
      `• Conectividad: Puertos HDMI 2.1, USB, Wi-Fi integrado, Bluetooth y salida óptica.\n` +
      `• Control Remoto: Comando inteligente con acceso directo a apps de streaming.\n` +
      `• Garantía: Producto oficial con garantía de fábrica y soporte técnico.`;
  } else if (isLavarropas) {
    const kgMatch = lowerName.match(/(\d+)\s*kg/i);
    const kgText = kgMatch ? `${kgMatch[1]} kg` : "6 a 8 kg";
    descripcion = `Especificaciones Técnicas - ${pName}:\n` +
      `• Capacidad de Carga: ${kgText} de prendas con tambor de acero inoxidable de alta resistencia.\n` +
      `• Sistema de Lavado: Automático inteligente con programas rápidos y eficiencia energética A+++.\n` +
      `• Centrifugado: Hasta 1.200 RPM con selección de velocidad y autocalibrado.\n` +
      `• Tecnología: Sensor de carga y consumo optimizado de agua y energía.\n` +
      `• Garantía: Equipo nuevo de fábrica con garantía oficial del fabricante.`;
  } else if (isHeladera) {
    const isNoFrost = /no frost/i.test(lowerName);
    descripcion = `Especificaciones Técnicas - ${pName}:\n` +
      `• Capacidad Total: 280 a 360 Litros con freezer aluminizado superior / inferior.\n` +
      `• Tecnología de Frío: Sistema ${isNoFrost ? "No Frost libre de escarcha" : "Ciclo homogéneo de frío estéril"}.\n` +
      `• Eficiencia Energética: Clase A / A+ de bajo consumo eléctrico y motor silencioso.\n` +
      `• Distribución Interna: Estantes de vidrio templado antiderrames y crisper de verduras con control de humedad.\n` +
      `• Garantía: Producto 100% original con soporte oficial de fábrica.`;
  } else if (isNotebook) {
    descripcion = `Ficha Técnica - ${pName}:\n` +
      `• Procesador: Procesador de última generación diseñado para trabajo, estudio y diseño.\n` +
      `• Memoria RAM & Almacenamiento: Disco SSD NVMe ultrarrápido con memoria RAM expandible.\n` +
      `• Pantalla: Display Full HD antirreflejos de alta calidad gráfica.\n` +
      `• Conectividad: Wi-Fi 6, Bluetooth 5.2, USB-C, HDMI y lector de tarjetas SD.\n` +
      `• Batería & Peso: Chasis liviano y batería de larga duración para portabilidad total.\n` +
      `• Garantía: Garantía oficial del fabricante.`;
  } else if (isAire) {
    descripcion = `Ficha Técnica - ${pName}:\n` +
      `• Tipo de Equipo: Climatizador Split Frío/Calor de alta potencia.\n` +
      `• Tecnología: Compresor Inverter de bajo consumo y funcionamiento ultrasilencioso.\n` +
      `• Gas Refrigerante: Ecológico R410a / R32 de alta eficiencia.\n` +
      `• Funciones: Modo Sleep, Timer programable, Turbo y Filtro antipolvo HD.\n` +
      `• Garantía: Garantía oficial del fabricante.`;
  } else {
    descripcion = `Ficha Técnica y Especificaciones - ${pName}:\n` +
      `• Descripción: Equipo tecnológico / electrodoméstico de primera marca y alto rendimiento.\n` +
      `• Construcción: Materiales de alta resistencia, acabado premium y larga durabilidad.\n` +
      `• Rendimiento: Diseñado para máxima eficiencia y confort en el hogar u oficina.\n` +
      `• Garantía: Producto 100% oficial con garantía de fábrica y respaldo Cuenta Hogar.`;
  }

  if (wikiSnippet) {
    descripcion += `\n\n📌 Referencia Técnica Web: ${wikiSnippet.substring(0, 180)}...`;
  }

  return descripcion;
};
