// Immutable catalog edition. Source: INDEC, Censo 2010, p. 4 (jurisdiction table).
// https://redatam.indec.gob.ar/redarg/censos/cpv2010rad/Docs/codigos_provincias.pdf
// Never edit this edition in place: introduce a new version and retain this mapping.
export const PERSONAL_ADDRESS_VERSION = 'AR_INDEC_2010_ADDRESS_V1' as const;
export const jurisdictions = [
  ['02','Ciudad Autónoma de Buenos Aires'], ['06','Buenos Aires'],
  ['10','Catamarca'], ['14','Córdoba'], ['18','Corrientes'], ['22','Chaco'],
  ['26','Chubut'], ['30','Entre Ríos'], ['34','Formosa'], ['38','Jujuy'],
  ['42','La Pampa'], ['46','La Rioja'], ['50','Mendoza'], ['54','Misiones'],
  ['58','Neuquén'], ['62','Río Negro'], ['66','Salta'], ['70','San Juan'],
  ['74','San Luis'], ['78','Santa Cruz'], ['82','Santa Fe'],
  ['86','Santiago del Estero'], ['90','Tucumán'],
  ['94','Tierra del Fuego, Antártida e Islas del Atlántico Sur'],
] as const;
export function validProvince(value: string): boolean {
  return jurisdictions.some(([code]) => code === value);
}
export function provinceLabel(value: string): string {
  return jurisdictions.find(([code]) => code === value)?.[1] ?? value;
}
// Structural validation only; no assertion that an address exists or matches a province.
export const postalCodePattern = /^(?:[0-9]{4}|[A-Z][0-9]{4}[A-Z]{3})$/;
