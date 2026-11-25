import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3001);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const inside = path => { const rel = relative(root, path); return !rel.startsWith('..') && !isAbsolute(rel); };
const server = createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if (path === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (path.split('/').some(part => part.startsWith('.')) || path.includes('\0')) throw new Error('Ruta inválida');
    let file = resolve(root, '.' + path);
    if (!inside(file)) throw new Error('Ruta inválida');
    let info = await stat(file);
    if (info.isDirectory()) { file = join(file, 'index.html'); info = await stat(file); }
    if (!inside(await realpath(file)) || !info.isFile()) throw new Error('Ruta inválida');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = createReadStream(file);
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch { res.writeHead(404); res.end('No encontrado'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'El puerto ' + port + ' está ocupado. Usa PORT=3011 npm run dev.' : error); process.exitCode = 1; });
server.listen(port, process.env.HOST || '127.0.0.1', () => console.log('BRUMA · http://127.0.0.1:' + port));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
