/** Filesystem-safe public commercial labels only. Never include DNI or internal pricing. */
export function documentNamePart(text:string,max:number,fallback:string){return text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,max).replace(/-+$/,'')||fallback;}
export function issuedPdfFilename(kind:string,number:string,client:string,product:string,revision=1){
 const labels:Record<string,string>={MANDATE:'Contrato',PAGARE:'Pagare',REMITO:'Remito'};
 if(!labels[kind]||!/^CH-\d+$/.test(number)||!Number.isSafeInteger(revision)||revision<1)throw Error('DOCUMENT_FILENAME_ID_INVALID');
 return `${labels[kind]}-${number}-${documentNamePart(client,50,'Cliente')}-${documentNamePart(product,65,'Producto')}${revision>1?`-r${revision}`:''}.pdf`;
}
