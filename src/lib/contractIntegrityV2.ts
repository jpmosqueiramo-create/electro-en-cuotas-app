import { createHash } from 'node:crypto';
import { types } from 'node:util';

export const CONTRACT_CANONICALIZATION = 'CH_CONTRACT_JSON_V1' as const;
export class ContractInfrastructureError extends Error {}
export function infrastructureReject(code = 'INVALID_CONTRACT_INFRASTRUCTURE_DATA'): never {
  // Codes only: never interpolate PII, payloads or credentials into errors.
  throw new ContractInfrastructureError(code);
}

/** UTF-16 code-unit key order; JSON escaping/numbers; no normalization or toJSON.
 * Absent object keys stay absent; null is explicit; undefined is always rejected.
 * Arrays are dense and ordered. Only own enumerable data properties are accepted.
 */
export function canonicalizeContract(value: unknown): string {
  const visiting = new Set<object>();
  const unicode = (s: string) => {
    if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s)) infrastructureReject();
    return JSON.stringify(s);
  };
  function encode(v: unknown, depth: number): string {
    if (depth > 64) infrastructureReject('CONTRACT_DEPTH_LIMIT');
    if (v === null) return 'null';
    if (typeof v === 'string') return unicode(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') {
      if (!Number.isFinite(v) || Object.is(v, -0)) infrastructureReject();
      return JSON.stringify(v);
    }
    if (typeof v !== 'object' || types.isProxy(v) || visiting.has(v)) infrastructureReject();
    if (Object.getOwnPropertySymbols(v).length) infrastructureReject();
    visiting.add(v);
    let out: string;
    if (Array.isArray(v)) {
      if (Object.getPrototypeOf(v) !== Array.prototype || Object.getOwnPropertyNames(v).length !== v.length + 1) infrastructureReject();
      const parts: string[] = [];
      for (let i = 0; i < v.length; i++) {
        const d = Object.getOwnPropertyDescriptor(v, String(i));
        if (!d || !d.enumerable || !Object.hasOwn(d, 'value')) infrastructureReject();
        parts.push(encode(d.value, depth + 1));
      }
      out = '[' + parts.join(',') + ']';
    } else {
      if (![Object.prototype, null].includes(Object.getPrototypeOf(v))) infrastructureReject();
      out = '{' + Object.getOwnPropertyNames(v).sort().map(k => {
        const d = Object.getOwnPropertyDescriptor(v, k)!;
        if (!d.enumerable || !Object.hasOwn(d, 'value')) infrastructureReject();
        return unicode(k) + ':' + encode(d.value, depth + 1);
      }).join(',') + '}';
    }
    visiting.delete(v);
    return out;
  }
  const result = encode(value, 0);
  if (Buffer.byteLength(result, 'utf8') > 900000) infrastructureReject('CONTRACT_BYTE_LIMIT');
  return result;
}
export function contractValueHash(value: unknown): string {
  return createHash('sha256').update(CONTRACT_CANONICALIZATION + '\0' + canonicalizeContract(value), 'utf8').digest('hex');
}
