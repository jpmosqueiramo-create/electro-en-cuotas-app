/** Offline build gate. --write is an explicit authoring step, never run by build. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url));
const destination = 'src/lib/productionV2/rendererManifest.json';
// Immutable catalog DATA is separately bound by each package hash. It is not
// renderer code and cannot include its own renderer hash in the source digest.
const catalogData = 'src/lib/productionV2/finalPackages.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => readFileSync(path.join(root, file));
const files = new Map();
const options = { resolveJsonModule: true, moduleResolution: ts.ModuleResolutionKind.Bundler };
function visit(file) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  if (!relative.startsWith('src/') || (relative === destination || relative === catalogData) || files.has(relative)) return;
  const bytes = readFileSync(file); files.set(relative, sha(bytes));
  if (!/\.[cm]?tsx?$/.test(file)) return;
  for (const { fileName } of ts.preProcessFile(bytes.toString(), true, true).importedFiles) {
    const resolved = ts.resolveModuleName(fileName, file, options, ts.sys).resolvedModule;
    if (resolved) visit(resolved.resolvedFileName);
  }
}
if (!Array.isArray(JSON.parse(read(catalogData)))) throw Error('Final packages must be a JSON array');
visit(path.join(root, 'src/lib/productionV2/pdf.ts'));
const lock = JSON.parse(read('package-lock.json'));
function packageBytes(name) {
  const base = 'node_modules/' + name, hashes = {};
  function walk(dir) { for (const e of readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
    const file = dir + '/' + e.name;
    if (e.isSymbolicLink()) throw Error('Renderer dependencies cannot contain symlinks');
    if (e.isDirectory()) walk(file); else hashes[file.slice(base.length+1)] = sha(read(file));
  } }
  walk(base);
  const meta = JSON.parse(read(base + '/package.json')), pinned = lock.packages[base];
  if (meta.version !== pinned.version || !pinned.integrity) throw Error('Renderer dependency does not match lock');
  return { version: pinned.version, integrity: pinned.integrity, files: Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a<b?-1:a>b?1:0)) };
}
const manifest = { schemaVersion: 'PRODUCTION_RENDERER_SOURCE_MANIFEST_V1', sources: Object.fromEntries([...files].sort(([a],[b])=>a<b?-1:a>b?1:0)), resources: {
  font: 'Helvetica-WinAnsi', lockSha256: sha(read('package-lock.json')), packages: { jspdf: packageBytes('jspdf'), 'jspdf-autotable': packageBytes('jspdf-autotable') }
} };
const serialized = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.slice(2).some(a=>a!=='--write')) throw Error('Only --write is supported');
if (process.argv.includes('--write')) { writeFileSync(path.join(root,destination),serialized); console.log('Renderer manifest written; review the diff before approval.'); }
else {
  if (read(destination).toString() !== serialized) throw Error('PRODUCTION_RENDERER_MANIFEST_STALE: review changed sources/resources and explicitly regenerate the manifest before build.');
  console.log(`PRODUCTION_RENDERER_MANIFEST PASS (${files.size} source files, dependencies locked)`);
}
