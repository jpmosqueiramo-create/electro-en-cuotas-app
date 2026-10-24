import './requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { createServer, request as proxyRequest } from 'node:http';
import { connect } from 'node:net';
import { readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { NextRequest } from 'next/server';
import { runtimeData, type ProductionRuntime } from '../../src/lib/productionV2/runtime';
/** Local-only HTTP harness: the real Next UI and the existing route exports.
 * Route modules share the test-only opaque runtime with the fixture process.
 * No endpoint, mock response, role bypass or fixture hook is shipped in the app.
 */
export async function startProductionBrowserServer(runtime: ProductionRuntime) {
    assert(runtimeData(runtime).test);
    Object.assign(process.env,{NODE_ENV:'development'}); // Same local origin policy as Next dev.
    assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
    const root = resolve('src/app/api'), routes = readdirSync(root, { recursive: true, withFileTypes: true }).filter(f => f.isFile() && f.name === 'route.ts').map(f => {
        const file = resolve(f.parentPath, f.name), parts = relative(root, file).split('/').slice(0, -1), keys: string[] = [];
        const pattern = parts.map(p => { if (p.startsWith('[') && p.endsWith(']')) {
            keys.push(p.slice(1, -1));
            return p.startsWith('[...') ? '(.+)' : '([^/]+)';
        } return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('/');
        return { file, keys, regex: new RegExp('^/api/' + pattern + '/?$') };
    }).sort((a,b)=>Number(a.keys.some(k=>k.startsWith('...')))-Number(b.keys.some(k=>k.startsWith('...'))));
    const calls: {
        method: string;
        path: string;
        status: number;
    }[] = [];
    const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...(process.env.LOCAL_BROWSER_WEBPACK === '1' ? ['--webpack'] : []), '--hostname', 'localhost', '--port', '3001'], { env: { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-cuenta-hogar.firebaseapp.com', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-cuenta-hogar.appspot.com', NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key', NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-app', NEXT_PUBLIC_E2E_TEST_MODE: '1', NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }, stdio: 'inherit' });
    const server = createServer(async (req, res) => {
        try {
            assert(runtimeData(runtime).test);
            assert.equal(req.headers.host, 'localhost:3000');
            const url = new URL(req.url!, 'http://localhost:3000'), chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of req) {
                size += chunk.length;
                if (size > 12 * 1024 * 1024)
                    throw Error('TEST_REQUEST_TOO_LARGE');
                chunks.push(Buffer.from(chunk));
            }
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers))
                if (v && !['host', 'connection', 'content-length', 'accept-encoding'].includes(k))
                    headers.set(k, Array.isArray(v) ? v.join(',') : v);
            const body = chunks.length ? Buffer.concat(chunks) : undefined;
            const init = { method: req.method, headers, ...(body ? { body: new Uint8Array(body) } : {}) };
            const route = routes.find(r => r.regex.test(url.pathname));
            let response: Response;
            if (route) {
                const match = route.regex.exec(url.pathname)!, params = Object.fromEntries(route.keys.map((k, i) => [k.startsWith('...') ? k.slice(3) : k, k.startsWith('...') ? match[i + 1].split('/').map(decodeURIComponent) : decodeURIComponent(match[i + 1])])), routeModule = await import(pathToFileURL(route.file).href), handler = routeModule[req.method!];
                response = handler ? await handler(new NextRequest(url, init), { params: Promise.resolve(params) }) : new Response(null, { status: 405 });
                calls.push({ method: req.method!, path: url.pathname, status: response.status });
                if(response.status>=400)console.error('LOCAL_ROUTE_REJECTED',relative(root,route.file),params,await response.clone().text());
            }
            else {
                await new Promise<void>((resolve, reject) => { const proxy = proxyRequest({ hostname: 'localhost', port: 3001, path: req.url, method: req.method, headers: { ...req.headers, host: 'localhost:3001' } }, upstream => { res.writeHead(upstream.statusCode || 502, upstream.headers); upstream.pipe(res); upstream.once('end', resolve); }); proxy.once('error', reject); proxy.end(body); });
                return;
            }
            res.writeHead(response.status, Object.fromEntries([...response.headers].filter(([k]) => !['content-encoding', 'transfer-encoding', 'content-length'].includes(k))));
            res.end(Buffer.from(await response.arrayBuffer()));
        }
        catch (error) {
            console.error('LOCAL_TEST_HTTP_ERROR', req.url?.split('?')[0], error instanceof Error ? error.message : 'unknown');
            res.writeHead(500);
            res.end('Local test harness failed');
        }
    });
    // Preserve Next's development websocket; otherwise HMR can repeatedly reload Auth.
    server.on('upgrade', (req, socket, head) => { const upstream = connect(3001, 'localhost', () => { upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` + Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n'); if (head.length)
        upstream.write(head); socket.pipe(upstream).pipe(socket); }); upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy()); socket.on('close', () => upstream.destroy()); });
    const stop = async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); next.kill('SIGTERM'); if (next.exitCode === null && next.signalCode === null)
        await new Promise<void>(resolve => next.once('close', () => resolve())); };
    try {
        await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(3000, 'localhost', () => resolve()); });
        for (let i = 0; i < 120; i++) {
            try {
                if ((await fetch('http://localhost:3000/login', { signal: AbortSignal.timeout(3000) })).ok)
                    return { calls, stop };
            }
            catch { /* Await local Next. */ }
            await new Promise(r => setTimeout(r, 500));
        }
        throw Error('LOCAL_NEXT_NOT_READY');
    }
    catch (e) {
        await stop();
        throw e;
    }
}
