import { Metadata } from "next";
import PublicCatalog from "@/components/PublicCatalog";

export const metadata: Metadata = {
  title: { absolute: "Servicio de Compra | Cuenta Hogar" },
  description: "Comprar en Capital, más simple desde el interior. Buscamos alternativas, gestionamos la compra mediante mandato, coordinamos la recepción y el traslado, y te ofrecemos un plan de cuotas.",
  keywords: [
    "Servicio de Compra Cuenta Hogar",
    "comprar en capital desde el interior",
    "gestion por mandato de compra",
    "plan de cuotas cuenta hogar",
    "recepcion en caba y envio al interior"
  ],
  alternates: {
    canonical: "https://cuenta-hogar.web.app/servicio-de-compra"
  }
};

export default function ServicioDeCompraPage() {
  return <PublicCatalog />;
}
