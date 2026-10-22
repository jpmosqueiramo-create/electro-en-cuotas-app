import Image from 'next/image';
import { BRAND_LOGO } from '@/lib/brand';
/** Crop only the supplied white canvas in the viewport; the official asset is unchanged. */
export function CuentaHogarLogo({className = 'h-16', priority = false}:{className?:string;priority?:boolean}) {
  const scale = BRAND_LOGO.canvas / BRAND_LOGO.content;
  return <span className={`relative inline-block aspect-square shrink-0 overflow-hidden rounded-full align-middle ${className}`} data-brand-logo="official"><Image src={BRAND_LOGO.src} alt={BRAND_LOGO.alt} width={2000} height={2000} unoptimized preload={priority} style={{position:'absolute',width:`${scale*100}%`,maxWidth:'none',height:`${scale*100}%`,left:`${-BRAND_LOGO.inset/BRAND_LOGO.content*100}%`,top:`${-BRAND_LOGO.inset/BRAND_LOGO.content*100}%`}} /></span>;
}
