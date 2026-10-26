/** Offline authoring step. Writes local catalog DATA only; never accesses Firebase. */
import {writeFileSync} from 'node:fs';
import {ownerFinalTemplates,ownerFinalIssuer,OWNER_FINAL_PACKAGE_ID,OWNER_FINAL_PACKAGE_VERSION} from '../src/lib/productionV2/ownerFinalDocuments';
import {FINAL_RENDERER_HASH,FINAL_RESOURCES_HASH} from '../src/lib/productionV2/pdf';
import {packageHash,validateFinalPackage,type FinalPackage} from '../src/lib/productionV2/catalog';
const body={id:OWNER_FINAL_PACKAGE_ID,version:OWNER_FINAL_PACKAGE_VERSION,issuer:ownerFinalIssuer(),jurisdiction:'Tribunales del domicilio validado del cliente; campos del original proporcionado por el titular',deliveryDocumentPolicy:'EXTERNAL_TRANSFER_AND_RECEIPT_V1' as const,
 originalsPolicy:{version:'OWNER_ORIGINALS_V1' as const,mandateJurisdiction:'CLIENT_DOMICILE_COMPETENT_COURTS' as const,noteJurisdiction:'Localidad y provincia del cliente desde el expediente validado; texto y renuncia del original conservados',notePaymentPlace:'Caracas 1101, C.A.B.A., CP: 1431, o donde la acreedora lo indique',penaltyMonthlyPercent:'0',corporatePowersReference:'Datos declarados por el titular y texto del mandato final 2ccd7587c39db88c8a7bdecddbf634ea1700d961e1f2b33b95fced3a598df7a4. Sin atribuir verificación profesional.',addressAmendmentReference:'Domicilio Caracas 1101 declarado por el titular e identificado en los dos originales finales. No se presume evidencia societaria adicional.',economicAllocationPolicy:'EXPLICIT_RECONCILED_CLIENT_CONFORMITY' as const},templates:ownerFinalTemplates(),rendererHash:FINAL_RENDERER_HASH,resourcesHash:FINAL_RESOURCES_HASH};
const p:FinalPackage={...body,sha256:packageHash(body)};validateFinalPackage(p);
if(process.argv.slice(2).join(' ')!=='--write')throw Error('Explicit --write required');
writeFileSync('src/lib/productionV2/finalPackages.json',JSON.stringify([p],null,2)+'\n');
console.log(JSON.stringify({id:p.id,version:p.version,sha256:p.sha256,productionWrites:0}));
