import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

/**
 * Registra un producto automáticamente en el catálogo de productos de Firestore (colección "productos")
 * si no existe previamente. El producto se crea obligatoriamente con activo: false y publicado: false
 * para que no aparezca en la portada o catálogo público hasta que el administrador lo apruebe.
 */
export const registrarProductoBorradorSiNoExiste = async (
  nombreProd: string,
  precioContado: number = 0,
  imagenUrl: string = "",
  proveedor: string = ""
) => {
  if (!nombreProd || !nombreProd.trim()) return;
  const cleanName = nombreProd.trim();

  try {
    const prodSnap = await getDocs(collection(db, "productos"));
    const exists = prodSnap.docs.some(d => {
      const pName = (d.data().nombre || "").trim().toLowerCase();
      return pName === cleanName.toLowerCase();
    });

    if (!exists) {
      const contado = Number(precioContado) || 0;
      let c12 = 0;
      let c8 = 0;
      if (contado > 0) {
        const r = (0.60) / 12; // 60% TNA base
        c12 = Math.round((contado * r * Math.pow(1 + r, 12)) / (Math.pow(1 + r, 12) - 1));
        c8 = Math.round((contado * r * Math.pow(1 + r, 8)) / (Math.pow(1 + r, 8) - 1));
      }

      await addDoc(collection(db, "productos"), {
        nombre: cleanName,
        precioContado: contado,
        cuota12: c12,
        cuota8: c8,
        tasaInteresTna: 60,
        tasaMora: 0.5,
        activo: false,       // ⚠️ DESACTIVADO (NO PUBLICADO)
        publicado: false,    // ⚠️ OCULTO DE LA TIENDA PÚBLICA
        destacado: false,
        imagenUrl: imagenUrl || "",
        imagenUrls: imagenUrl ? [imagenUrl] : [],
        categoria: "Electrodomésticos",
        proveedor: proveedor || "Carga Automática de Presupuesto",
        descripcion: "Producto incorporado automáticamente desde presupuestos solicitados por clientes. Edite datos y active para publicar en el sitio.",
        stock: [],
        fechaCreacion: new Date().toISOString()
      });

      console.log("▶ Producto registrado automáticamente como BORRADOR (Desactivado):", cleanName);
    }
  } catch (err) {
    // ⚠️ SILENT CATCH: Si el cliente anónimo no tiene permisos en Firestore para escribir en "productos",
    // omitir silenciosamente sin interrumpir el registro de la solicitud del usuario.
    console.warn("Aviso: Registro automático de producto borrador omitido por permisos de cliente público.");
  }
};
