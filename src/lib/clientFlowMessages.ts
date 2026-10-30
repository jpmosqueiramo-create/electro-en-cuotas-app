/** Text supplied by the owner in MENSAJE DE ACEPTACION PROPUESTA CLIENTES CUENTA HOGAR.docx.
 * Source annotations in parentheses are not customer copy. Keep versions immutable. */
export const DATA_AUTHORIZATION_VERSION='LOOP_DATA_AUTHORIZATION_20261030_V1';
export const DATA_AUTHORIZATION_TITLE='AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS Y EVALUACIÓN CREDITICIA.';
export const DATA_AUTHORIZATION_PARAGRAPHS=[
 'El solicitante declara haber sido informado de que LOOP GESTIÓN INTEGRAL S.R.L., que opera comercialmente bajo el nombre de fantasía CUENTA HOGAR, tratará los datos personales suministrados con la finalidad de registrar y evaluar su solicitud de gestión de compra, verificar su identidad, analizar su capacidad económica y determinar la viabilidad de las condiciones de pago solicitadas.',
 'A tales efectos, el solicitante autoriza expresamente, en la medida en que resulte legalmente necesario, la consulta de información patrimonial y crediticia ante fuentes y prestadores de información comercial y crediticia legalmente habilitados, exclusivamente para las finalidades informadas.',
 'Los datos serán tratados conforme a la Ley 25.326, su reglamentación y demás disposiciones aplicables. El solicitante será informado de la identidad y domicilio del responsable de la base de datos, los destinatarios o categorías de destinatarios, el carácter obligatorio o facultativo de las respuestas, las consecuencias de proporcionar o no los datos y los mecanismos para ejercer sus derechos de acceso, rectificación, actualización y supresión.',
 'La presentación de esta solicitud no implica aprobación de financiación ni constituye autorización para adquirir productos en nombre del solicitante. Cualquier operación quedará sujeta a evaluación, aprobación interna y posterior aceptación expresa de una propuesta comercial determinada.',
] as const;
export const DATA_AUTHORIZATION_TEXT=[DATA_AUTHORIZATION_TITLE,...DATA_AUTHORIZATION_PARAGRAPHS].join('\n\n');
export function clientDataRequestMessage(link:string){return `${DATA_AUTHORIZATION_TEXT}\n\nHola, necesitamos completar algunos datos para preparar la documentación de tu operación con Cuenta Hogar. Podés leer la autorización y cargar tus datos desde este enlace: ${link}`;}
export function dataAuthorizationPayload(input:unknown,required:boolean){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Datos inválidos.');
 const {dataAuthorization,...payload}=input as Record<string,unknown>;
 if(dataAuthorization===undefined&&!required)return {payload,authorized:false};
 if(!dataAuthorization||typeof dataAuthorization!=='object'||Array.isArray(dataAuthorization))throw Error('Aceptá la autorización para enviar los datos.');
 const consent=dataAuthorization as Record<string,unknown>;
 if(Object.keys(consent).length!==2||consent.version!==DATA_AUTHORIZATION_VERSION||consent.accepted!==true)throw Error('Aceptá la autorización vigente para enviar los datos.');
 return {payload,authorized:true};
}

export function clientMessagePhone(raw:string){const n=raw.replace(/\D/g,'');return n.length===10?'549'+n:n.startsWith('54')&&n.length===12?'549'+n.slice(2):n;}
