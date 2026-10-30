import type { Metadata } from 'next';
import { ContractClientDataForm } from './public-form';
const title = 'GESTIONAMOS TU COMPRA';
const description = 'Completá tus datos personales para continuar con la gestión de tu compra en Cuenta Hogar.';
const image = 'https://www.cuentahogar.com.ar/logo-cuenta-hogar-oficial.png';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    siteName: 'Cuenta Hogar',
    url: 'https://www.cuentahogar.com.ar',
    type: 'website',
    locale: 'es_AR',
    images: [{ url: image, width: 800, height: 600, alt: 'Cuenta Hogar Logo' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
  robots: { index: false, follow: false, noarchive: true },
  referrer: 'no-referrer',
};
export default async function Page({params}:{params:Promise<{requestId:string}>}){return <ContractClientDataForm requestId={(await params).requestId}/>;}
