// Temporary A-Z server: static client bundle, plus a proxy to the existing API.
// Local test controls can fail one creation before it reaches the backend.
import http from 'node:http';
import https from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.argv[2] || 'dist/app/browser');
const port = Number(process.argv[3] || 4200);
let failNextCreate = false;
const observations = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) { res.writeHead(403).end(); return; }
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (req.headers.origin && req.headers.origin !== `http://127.0.0.1:${port}` && req.headers.origin !== `http://localhost:${port}`) { res.writeHead(403).end(); return; }
  if (url.pathname === '/__test/fail-next-create' && req.method === 'POST') { failNextCreate = true; res.end('armed'); return; }
  if (url.pathname === '/__test/observations') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(observations)); return; }
  if (url.pathname.startsWith('/api/')) {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const record = { path: url.pathname, method: req.method };
    if (url.pathname.endsWith('/add')) {
      try { const data = JSON.parse(body); record.hasPassword = data.has_password; record.fileCount = data.files?.length || 0; record.passwordLeaked = Object.hasOwn(data, 'password'); record.ciphertext = !data.message || data.message.startsWith('U2FsdGVkX1'); } catch {}
      if (failNextCreate) { failNextCreate = false; record.injectedFailure = true; observations.push(record); res.writeHead(503, { 'Content-Type': 'application/json' }).end('{"testFailure":true}'); return; }
    }
    const upstream = https.request('https://stellaruisecretapiappprod.azurewebsites.net' + url.pathname, {
      method: req.method, headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    }, incoming => {
      record.status = incoming.statusCode; observations.push(record);
      res.writeHead(incoming.statusCode, { 'Content-Type': incoming.headers['content-type'] || 'application/json' }); incoming.pipe(res);
    });
    upstream.on('error', () => { record.status = 502; observations.push(record); res.writeHead(502).end(); });
    upstream.end(body); return;
  }
  try {
    let path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { if (!(await stat(path)).isFile()) path = resolve(root, 'index.html'); } catch { path = resolve(root, 'index.html'); }
    res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream'); res.end(await readFile(path));
  } catch { res.writeHead(500).end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`A-Z app ready: http://127.0.0.1:${port}`));
