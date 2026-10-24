import { jurisdictions, postalCodePattern, provinceLabel } from './contractAddress';
import { contractValueHash } from './contractIntegrityV2';

export interface PaymentAddressSource { address: string; locality: string; province?: string; postalCode?: string }
export interface PaymentAddressConformity { confirmedPaymentAddressHash?: string | null }

/** No issuer fallback, geocoding, inferred street number or mutable customer lookup. */
export function contractPaymentAddress(source: PaymentAddressSource) {
    const text = (value: unknown) => {
        if (typeof value !== 'string' || !value.trim() || value.length > 500 || /[<>\x00-\x1f\x7f]/.test(value))
            throw Error('CLIENT_PAYMENT_ADDRESS_INCOMPLETE');
        return value.trim().normalize('NFC');
    };
    const address = text(source.address), locality = text(source.locality);
    const province = provinceLabel(text(source.province)), postalCode = text(source.postalCode);
    if (!jurisdictions.some(([, label]) => label === province) || !postalCodePattern.test(postalCode))
        throw Error('CLIENT_PAYMENT_ADDRESS_INCOMPLETE');
    const fields = { address, locality, province, postalCode };
    return { ...fields, display: `${address}, ${locality}, ${province}, CP ${postalCode}`,
        hash: contractValueHash({ policy: 'CLIENT_PAYMENT_ADDRESS_V1', ...fields }) };
}

export function paymentAddressHashOrNull(source: PaymentAddressSource) {
    try { return contractPaymentAddress(source).hash; } catch { return null; }
}

/** Legacy consents keep their original digest; they do not prove a payment address. */
export function recordedPaymentAddressIsCurrent(source: PaymentAddressSource, consent: PaymentAddressConformity) {
    if (!Object.hasOwn(consent, 'confirmedPaymentAddressHash')) return true;
    const hash = paymentAddressHashOrNull(source);
    return hash !== null && consent.confirmedPaymentAddressHash === hash;
}

export function assertPaymentAddressConformity(source: PaymentAddressSource, consent?: PaymentAddressConformity) {
    const address = contractPaymentAddress(source);
    if (consent?.confirmedPaymentAddressHash !== address.hash) throw Error('CLIENT_PAYMENT_ADDRESS_CONFORMITY_REQUIRED');
    return address;
}
