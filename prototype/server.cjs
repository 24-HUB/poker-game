const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !types[path.extname(target)]) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(target, (error, data) => { if (error) { res.writeHead(404); return res.end('Not found'); } res.writeHead(200, {'Content-Type':types[path.extname(target)], 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(data); });
}).listen(4173, '127.0.0.1', () => console.log('Lobby prototype: http://127.0.0.1:4173'));
