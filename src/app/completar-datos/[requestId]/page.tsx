import type { Metadata } from 'next';
import { ContractClientDataForm } from './public-form';
export const metadata:Metadata={title:'Completá tus datos | Cuenta Hogar',robots:{index:false,follow:false,noarchive:true},referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{requestId:string}>}){return <ContractClientDataForm requestId={(await params).requestId}/>;}
