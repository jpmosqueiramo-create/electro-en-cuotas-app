import { Metadata } from "next";
import HomeTechCatalog from "@/components/HomeTechCatalog";

export const metadata: Metadata = {
  title: "Cuenta Hogar | Comprá en Capital, recibí en tu casa",
  description: "Mandato de compra, logística y envíos desde Buenos Aires directo a la puerta de tu hogar en el interior.",
};

export default function HomePage() {
  return <HomeTechCatalog />;
}
