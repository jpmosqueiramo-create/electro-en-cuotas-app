'use client';
import {AccountEmailActivation} from './AccountEmailActivation';
export function AffiliateActivation({vendorId,invitationId}:{vendorId:string;invitationId:string}){return <AccountEmailActivation role="AFFILIATE" accountId={vendorId} invitationId={invitationId}/>;}
