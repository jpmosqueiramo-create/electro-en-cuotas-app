import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cuenta-hogar.web.app"),
  title: {
    default: "Cuenta Hogar | Comisionista Capital a Provincia, Traslado de Compras y Cuotas sin Tarjeta",
    template: "%s | Cuenta Hogar"
  },
  description: "Servicio de comisionista en Buenos Aires para el interior, traslado de compras CABA, retiro de mercadería en Once y Capital Federal, mandatos de compra y financiación propia para comprar electrodomésticos y tecnología en cuotas sin tarjeta.",
  keywords: [
    "comisionista capital a provincia",
    "comisionistas en buenos aires para el interior",
    "viajes y comisiones a capital federal",
    "servicio de comisiones puerta a puerta",
    "comprar en once desde el interior comisionista",
    "comprador personal en buenos aires",
    "quien hace mandatos de compra en caba",
    "encargar electrodomésticos a buenos aires",
    "enviar compras de buenos aires al interior",
    "transporte de compras personales caba",
    "comisionista para retirar mercadería en capital",
    "fletes y encomiendas desde capital federal",
    "comprar en cuotas sin tarjeta en el interior",
    "financiamiento propio para tecnología buenos aires",
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
    title: "Cuenta Hogar | Comisionista Capital a Provincia y Traslado de Compras",
    description: "Retiro de mercadería en CABA, comisiones puerta a puerta al interior, mandatos de compra y financiación propia en cuotas sin tarjeta.",
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
    title: "Cuenta Hogar | Comisionista CABA al Interior y Cuotas sin Tarjeta",
    description: "Comisión puerta a puerta, retiro de compras en Once y Capital Federal, y financiamiento propio para tecnología y hogar.",
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
  "description": "Servicio de comisionista capital a provincia, retiro de mercadería en Once y CABA, comprador personal, traslado de compras personales y financiación propia para comprar tecnología y electrodomésticos en cuotas sin tarjeta en el interior."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
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
        className={geistSans.variable + " " + geistMono.variable + " antialiased bg-[#121316] text-zinc-100"}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
