import {assertOwnerFinalCatalog} from './helpers/assertOwnerFinalCatalog';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { buildSync } from 'esbuild';
import manifest from '../src/lib/productionV2/rendererManifest.json';
import { FINAL_RENDERER_HASH, FINAL_RESOURCES_HASH } from '../src/lib/productionV2/pdf';
// Offline only: no Firebase imports, credentials, accounts, documents or requests.
execFileSync(process.execPath, ['scripts/verifyProductionRendererManifest.mjs'], { stdio: 'inherit' });
const sha = (x: Uint8Array) => createHash('sha256').update(x).digest('hex');
for (const [file, hash] of Object.entries(manifest.sources)) assert.equal(sha(readFileSync(file)), hash);
assert(manifest.sources['src/lib/contractDocuments/amountWords.ts']);
assert(manifest.sources['src/lib/logoBase64.ts']);
assert(manifest.sources['src/lib/productionV2/catalog.ts']);
assert(!Object.hasOwn(manifest.sources, 'src/lib/productionV2/finalPackages.json'), 'Package content is independently hashed, never recursively included in its own renderer hash');
assertOwnerFinalCatalog(JSON.parse(readFileSync('src/lib/productionV2/finalPackages.json', 'utf8')));
assert(!readFileSync('src/lib/productionV2/pdf.ts', 'utf8').includes('.toString()'));
const folder = mkdtempSync(join(tmpdir(), 'ch-renderer-hash-'));
const entry = join(folder, 'entry.ts');
writeFileSync(entry, `import {FINAL_RENDERER_HASH,FINAL_RESOURCES_HASH} from ${JSON.stringify(resolve('src/lib/productionV2/pdf.ts'))}; console.log(JSON.stringify({renderer:FINAL_RENDERER_HASH,resources:FINAL_RESOURCES_HASH}));`);
for (const minify of [false, true]) {
 const outfile = join(folder, minify ? 'min.cjs' : 'plain.cjs');
 buildSync({ entryPoints: [entry], outfile, bundle: true, minify, platform: 'node', format: 'cjs', logLevel: 'silent' });
 assert.deepEqual(JSON.parse(execFileSync(process.execPath, [outfile], { encoding: 'utf8' }).trim()), { renderer: FINAL_RENDERER_HASH, resources: FINAL_RESOURCES_HASH });
}
console.log('PRODUCTION_RENDERER_MANIFEST PASS: source bytes, dependency lock, plain/minified bundle identity; zero Firebase access.');
