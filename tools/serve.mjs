import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.mp4': 'video/mp4' };
http.createServer(async (request, response) => { if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'Content-Type': 'text/plain' });
    response.end('Local preview does not submit Netlify forms or call Groq.');
    return;
} try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(root + path.sep))
        throw Error('Forbidden');
    if (relative.split(/[\\/]/).some(segment => segment.startsWith('.') || ['backend', 'tools', 'node_modules', 'reference portfolio design'].includes(segment)))
        throw Error('Forbidden');
    if ((await stat(file)).isDirectory())
        file = path.join(file, 'index.html');
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : content);
}
catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
} }).listen(port, '127.0.0.1', () => console.log(`Portfolio preview: http://127.0.0.1:${port}`));
