import { Metadata } from "next";
import PublicCatalog from "@/components/PublicCatalog";

export const metadata: Metadata = {
  title: "Planes Sugeridos | Cuenta Hogar",
  description: "Vidriera de equipos. Elegí el tuyo y armamos la gestión de compra a sola firma.",
};

export default function ProductosPage() {
  return <PublicCatalog />;
}
