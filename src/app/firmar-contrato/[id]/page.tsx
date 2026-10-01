import FirmarContratoClient from "./FirmarContratoClient";

export function generateStaticParams() {
  return [{ id: "ejemplo" }];
}

export default function Page() {
  return <FirmarContratoClient />;
}
