import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { admin } from '../src/lib/firebaseAdmin';
import { createCatalogReferenceDraft, buildCatalogReferencePrivatePatch } from '../src/lib/catalogReferenceEditor';
import { previewCatalogReferencePublication, publishCatalogReference, unpublishCatalogReference } from '../src/lib/catalogPublicationService';
import { sensitiveCatalogPaths } from './helpers/catalogReferenceC2Fixtures';

async function main() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
  const db = admin.firestore();
  const id = `c3-editor-${process.pid}`, privateRef = db.doc(`productos/${id}`), publicRef = db.doc(`catalogo_publico/${id}`);
  const draft = createCatalogReferenceDraft();
  Object.assign(draft, { nombre:'Referencia C3', descripcion:'Descripción pública', costoProveedor:'580000', proveedor:'PROVEEDOR PRIVADO', skuInterno:'SKU-PRIVADO',codigoBarras:'0779000000000',imagenUrls:['/logo-cuenta-hogar-oficial.png'] });
  draft.planesActivos[12] = true;
  const stock = [{ id:'legacy-unit', localidad:'Lincoln',nserie:'SERIE-PRIVADA',estado:'Disponible' }];
  const legacy = { codigoProducto:'LEGACY',precioContado:777,cuota8:888,stock,tasaMora:0.5,activo:true,publicado:false };
  await privateRef.set({ ...legacy,...buildCatalogReferencePrivatePatch(draft) });
  assert.equal((await publicRef.get()).exists, false);
  const a = await previewCatalogReferencePublication(db,id); assert.ok(a.fingerprint && a.dto);
  await publishCatalogReference(db,id,a.fingerprint);
  const publicA=(await publicRef.get()).data();
  draft.nombre='Referencia C3 B';
  await privateRef.update(buildCatalogReferencePrivatePatch(draft,(await privateRef.get()).data()!));
  assert.deepEqual((await publicRef.get()).data(),publicA);
  const b=await previewCatalogReferencePublication(db,id); assert.ok(b.fingerprint && b.dto && b.hasUnpublishedChanges);
  await publishCatalogReference(db,id,b.fingerprint);
  assert.deepEqual((await publicRef.get()).data(),b.dto);
  assert.deepEqual((await privateRef.get()).data()!.stock,stock);
  assert.equal((await privateRef.get()).data()!.precioContado,777);
  assert.equal((await privateRef.get()).data()!.codigoProducto,'LEGACY');
  for (const zero of [[],0]) {
    await privateRef.update({ stock:zero });
    const preview=await previewCatalogReferencePublication(db,id); assert.ok(preview.validation.valid && preview.dto && preview.fingerprint);
    assert.equal(preview.dto.planesPublicados.length,1);
    await unpublishCatalogReference(db,id);
    await publishCatalogReference(db,id,preview.fingerprint);
    assert.deepEqual(sensitiveCatalogPaths((await publicRef.get()).data()),[]);
    assert.equal((await publicRef.get()).data()!.planesPublicados[0].cuotaEstimada,145000);
  }
  const before=(await privateRef.get()).data();
  await unpublishCatalogReference(db,id);
  assert.equal((await publicRef.get()).exists,false); assert.deepEqual((await privateRef.get()).data(),before);
  console.log('C3_EMULATOR_TESTS = PASS; PUBLICATION_WITH_ZERO_STOCK = PASS; PUBLIC_DTO_SENSITIVE_FIELDS = 0');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await Promise.all(admin.apps.map(app=>app?.delete()));});
