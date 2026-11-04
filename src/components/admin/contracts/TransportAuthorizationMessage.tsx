'use client';

import {useId,useState} from 'react';
import {provinceLabel} from '@/lib/contractAddress';
import type {ContractDraftV2} from '@/lib/contractV2';
import {clientMessagePhone} from '@/lib/clientFlowMessages';
import {btn,control} from './ContractDataFields';

type SavedTransportData = Pick<ContractDraftV2,'personalData'|'acceptedReferenceSnapshot'|'productDetails'>;
const singleLine=(value?:string)=>value?.replace(/\s+/g,' ').trim()??'';

export function TransportAuthorizationMessage({draft,blocked=false}:{draft:SavedTransportData|null;blocked?:boolean}){
 const titleId=useId(),[prepared,setPrepared]=useState(false),[notice,setNotice]=useState('');
 const name=singleLine(draft?.personalData.fullName),product=singleLine(draft?.acceptedReferenceSnapshot.nombre);
 const street=singleLine(draft?.personalData.address),locality=singleLine(draft?.personalData.locality);
 const province=provinceLabel(singleLine(draft?.personalData.province)),postalCode=singleLine(draft?.personalData.postalCode);
 const missing=[!name&&'nombre del cliente',!product&&'producto (marca y modelo)',!street&&'calle y número',!locality&&'localidad',!province&&'provincia',!postalCode&&'código postal'].filter(Boolean);
 const destination=[street,locality,province,postalCode&&`CP ${postalCode}`].filter(Boolean).join(', ');
 const quantity=draft?.productDetails?.quantity;
 const item=quantity&&quantity>1?`${quantity} unidades de ${product}`:product;
 const phone=clientMessagePhone(draft?.personalData.whatsapp??'');
 const message=`Hola, ${name}. Somos Cuenta Hogar. ¿Nos autorizás a trasladar ${item} hasta ${destination}?

Si los datos son correctos, respondé a este mensaje: «Sí, autorizo el traslado al domicilio indicado».

Si cambió el domicilio, avisanos antes de confirmar. Gracias.`;
 const available=!blocked&&missing.length===0;
 return <section aria-labelledby={titleId} className="min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4">
  <h4 id={titleId} className="font-bold text-brand-primary">Autorización de traslado</h4>
  <p className="text-sm">Prepará el mensaje con el producto y el domicilio declarado. El cliente sólo tiene que responder confirmando el traslado.</p>
  {blocked?<p className="text-sm">Guardá los cambios de la ficha antes de preparar el mensaje.</p>:missing.length>0&&<p className="text-sm">Completá y guardá: {missing.join(', ')}.</p>}
  <button type="button" className={btn} disabled={!available} onClick={()=>{setNotice('');setPrepared(true);}}>Preparar autorización de traslado</button>
  {available&&prepared&&<>
   <label className="block space-y-2"><span>Mensaje para el cliente</span><textarea className={`${control} min-h-52 w-full`} readOnly value={message}/></label>
   <div className="flex flex-wrap gap-2">
    <button type="button" className={btn} onClick={async()=>{try{await navigator.clipboard.writeText(message);setNotice('Mensaje copiado. Podés pegarlo en un correo o chat.');}catch{setNotice('Seleccioná el texto del mensaje y copialo manualmente.');}}}>Copiar mensaje</button>
    {/^[1-9]\d{9,14}$/.test(phone)&&<a className={btn} href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
   </div>
   <p className="text-sm">Revisá los datos antes de enviar. Conservá el mensaje y la respuesta juntos.</p>
   {notice&&<p role="status" className="text-sm">{notice}</p>}
  </>}
 </section>;
}
