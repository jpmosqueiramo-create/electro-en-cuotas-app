"use client";
import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { buildCatalogPriceList, catalogPriceListFilename } from "@/lib/catalogPriceList";
import type { Producto } from "./catalogStockTypes";

export function CatalogPriceListExport({ products, disabled, onBusyChange }: { products: Producto[]; disabled: boolean; onBusyChange:(busy:boolean)=>void }) {
  const flight=useRef(false);
  const [progress,setProgress]=useState("");const [error,setError]=useState("");
  async function download(){
    if(disabled||flight.current||!products.length)return;
    flight.current=true;onBusyChange(true);setError("");setProgress("Preparando lista de precios…");
    try{
      const items=buildCatalogPriceList(products);
      const {loadCatalogPriceListImages,renderCatalogPriceList}=await import("@/lib/catalogPriceListPdf");
      const images=await loadCatalogPriceListImages(items,done=>setProgress(`Preparando fotos: ${done}/${items.length}`));
      const date=new Date();await renderCatalogPriceList(items,images,date).save(catalogPriceListFilename(date), { returnPromise: true });
      setProgress(`PDF preparado: ${items.length} productos. Incluye todo el catálogo, sin aplicar filtros.${images.some(image=>!image)?" Las fotos no disponibles se indican en la lista.":""}`);
    }catch{setError("No se pudo preparar el PDF. Volvé a intentar.");setProgress("");}
    finally{flight.current=false;onBusyChange(false);}
  }
  return <div className="max-w-md space-y-1">
    <button type="button" data-testid="catalog-price-list-export" disabled={disabled||!products.length} onClick={download} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-color bg-surface px-3 text-sm font-semibold text-brand-primary disabled:opacity-50"><Download size={18} aria-hidden="true"/>Exportar catálogo PDF</button>
    {progress&&<p role="status" className="text-xs text-text-secondary">{progress}</p>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
