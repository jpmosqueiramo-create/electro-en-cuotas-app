import { infrastructureFixture } from './contractInfrastructureFixtures';
// Structure equivalent to the production failure; no production personal data.
export function pendingBulletPreviewFixture(id:string){
 const source=infrastructureFixture(id).source,{budget:b,acceptance:a,draft:d}=source;
 const description='Características del producto sintético:\r\n• Capacidad de prueba\r\n• Garantía y gestión';
 const ref={...a.optionSnapshot.referenceSnapshot,descripcion:description};
 b.options=b.options.map(o=>o.optionId===a.acceptedOptionId?{...o,referenceSnapshot:ref}:o);
 a.optionSnapshot={...a.optionSnapshot,referenceSnapshot:ref};
 const {imagenUrls:images,...acceptedRef}=ref;void images;d.acceptedReferenceSnapshot=acceptedRef;
 b.clienteSnapshot.nombre='María Muñoz';d.personalData.fullName='Mari\u0301a Muñoz';d.personalData.dni=b.clienteSnapshot.dni||'12345678';
 d.personalData.address='Dirección sintética Nº 10 — “prueba”';d.personalData.email='';delete d.personalData.province;delete d.personalData.postalCode;
 d.economicTerms=null;d.paymentScheduleDraft=[];d.firstInstallmentDueDate=null;
 return source;
}
