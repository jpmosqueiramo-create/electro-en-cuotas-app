import type { Metadata } from "next";
import { Manrope, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cuenta-hogar.web.app"),
  title: {
    default: "Cuenta Hogar | Envíos Low Cost CABA al Interior y Cuotas sin Tarjeta",
    template: "%s | Cuenta Hogar"
  },
  description: "Servicio de Envíos Low Cost desde Buenos Aires hacia el interior, recepción de compras en CABA (Caracas 1101), mandatos de compra y financiación propia en cuotas sin tarjeta.",
  keywords: [
    "Envíos Low Cost CABA",
    "transporte propio buenos aires",
    "compras en once envio al interior",
    "mandato de compra caba",
    "electrodomesticos en cuotas sin tarjeta",
    "financiacion propia interior",
    "Cuenta Hogar",
    "Loop Gestión Integral SRL"
  ],
  authors: [{ name: "LOOP GESTIÓN INTEGRAL S.R.L." }],
  creator: "LOOP GESTIÓN INTEGRAL S.R.L.",
  publisher: "LOOP GESTIÓN INTEGRAL S.R.L.",
  alternates: {
    canonical: "https://cuenta-hogar.web.app"
  },
  openGraph: {
    title: "Cuenta Hogar | Envíos Low Cost y Cuotas sin Tarjeta",
    description: "Recepción de compras en CABA, transporte propio a localidades de cobertura y financiación propia a sola firma.",
    url: "https://cuenta-hogar.web.app",
    siteName: "Cuenta Hogar",
    images: [
      {
        url: "/logo-cuenta-hogar-oficial.png",
        width: 800,
        height: 600,
        alt: "Cuenta Hogar Logo"
      }
    ],
    locale: "es_AR",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Cuenta Hogar | Envíos Low Cost CABA al Interior",
    description: "Recepción en CABA, transporte propio y financiación a sola firma.",
    images: ["/logo-cuenta-hogar-oficial.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Cuenta Hogar - Loop Gestión Integral S.R.L.",
  "image": "https://cuenta-hogar.web.app/logo-cuenta-hogar-oficial.png",
  "url": "https://cuenta-hogar.web.app",
  "telephone": "+5491125659686",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Caracas 1101",
    "addressLocality": "Ciudad Autónoma de Buenos Aires",
    "addressRegion": "CABA",
    "postalCode": "C1416AOS",
    "addressCountry": "AR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "-34.617478",
    "longitude": "-58.468205"
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "opens": "08:00",
    "closes": "20:00"
  },
  "priceRange": "$$",
  "description": "Envíos Low Cost desde CABA al interior, recepción en Caracas 1101, transporte propio y financiación a sola firma."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} ${sourceSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preload" href="/logo-cuenta-hogar-oficial.png" as="image" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="font-sans antialiased bg-[#F7F3EC] text-[#1F2928] selection:bg-[#173E3B] selection:text-white"
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
