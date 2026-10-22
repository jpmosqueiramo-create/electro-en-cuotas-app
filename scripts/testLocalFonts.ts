import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root=join(process.cwd(),'src/app/fonts');
const manifest=JSON.parse(readFileSync(join(root,'provenance.json'),'utf8')) as {repository:string;revision:string;modified:boolean;fonts:{file:string;source:string;licenseSource:string;sha256:string;licenseSha256:string;bytes:number}[]};
assert.equal(manifest.repository,'https://github.com/google/fonts');assert.match(manifest.revision,/^[a-f0-9]{40}$/);assert.equal(manifest.modified,false);assert.equal(manifest.fonts.length,2);
for(const font of manifest.fonts){
 const bytes=readFileSync(join(root,font.file)),license=readFileSync(join(root,font.file.split('/')[0],'OFL.txt'));
 assert.equal(bytes.subarray(0,4).toString('hex'),'00010000');assert.equal(bytes.length,font.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),font.sha256);assert.equal(createHash('sha256').update(license).digest('hex'),font.licenseSha256);assert.match(license.toString(),/SIL Open Font License, Version 1.1/);assert.ok(font.source.startsWith(`https://raw.githubusercontent.com/google/fonts/${manifest.revision}/ofl/`));assert.ok(font.licenseSource.endsWith('/OFL.txt'));
}
const layout=readFileSync('src/app/layout.tsx','utf8');assert.ok(layout.includes('next/font/local'));assert.ok(!layout.includes('next/font/google'));assert.ok(layout.includes('--font-manrope')&&layout.includes('--font-source-sans'));assert.ok(layout.includes('weight: "500 800"')&&layout.includes('weight: "400 700"'));for(const font of manifest.fonts)assert.ok(layout.includes('./fonts/'+font.file));
console.log('LOCAL_FONTS=PASS; PINNED_OFFICIAL_SOURCE; OFL_LICENSES; IMMUTABLE_BINARIES; EXISTING_FAMILIES_AND_WEIGHTS; NO_GOOGLE_FONT_LOADER');
