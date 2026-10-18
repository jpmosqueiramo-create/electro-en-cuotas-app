import { prepareCatalogPublication } from "../../src/lib/catalogPublicationContent";
import type { InventoryDocument } from "../../src/lib/catalogPrivacyInventory";
export function privacyFixtures(){
  const valid={nombre:"Referencia de fixture",descripcion:"Gestión de compra",imagenUrls:["/logo-cuenta-hogar-oficial.png"],costoProveedor:580000,proveedor:"PRIVATE_PROVIDER_SECRET",skuInterno:"PRIVATE_SKU_SECRET",codigoBarras:"PRIVATE_EAN_SECRET",factoresPlanes:{12:3},planesActivos:{12:true},activo:true,publicado:true,stock:[]};
  const privateDocs:InventoryDocument[]=[];const publicDocs:InventoryDocument[]=[];
  for(const id of ["ready-new","ready-update","current","disabled","invalid","malformed","conflict","review","c3-current","legacy-24"]){privateDocs.push({id,data:{...valid}});}
  privateDocs.find(doc=>doc.id==="disabled")!.data={...valid,publicado:false};
  privateDocs.find(doc=>doc.id==="invalid")!.data={...valid,costoProveedor:0};
  const {activo: _a, publicado: _p,...noFlags}=valid;void _a;void _p;
  privateDocs.find(doc=>doc.id==="review")!.data=noFlags;
  privateDocs.find(doc=>doc.id==="c3-current")!.data={...valid,activo:false,publicado:false,stock:0};
  privateDocs.find(doc=>doc.id==="legacy-24")!.data={...valid,planesActivos:{12:true,24:true}};
  for(const id of ["ready-update","current","malformed","conflict","orphan","c3-current"]){
    const dto=prepareCatalogPublication(id,valid).dto!;
    publicDocs.push({id,data:id==="ready-update"?{...dto,descripcion:"Versión anterior"}:id==="malformed"?{...dto,costoProveedor:580000}:id==="conflict"?{...dto,referenciaId:"different-id"}:{...dto}});
  }
  return {privateDocs,publicDocs};
}
