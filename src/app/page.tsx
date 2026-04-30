import { Metadata } from 'next';
import PublicCatalog from '@/components/PublicCatalog';

export const metadata: Metadata = {
  title: 'Cuenta Hogar | Catálogo Premium',
  description: 'Lo que te haga falta, te lo llevamos y financiamos.',
};

export default function HomePage() {
  return <PublicCatalog />;
}
