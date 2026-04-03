const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css',
  '.js'  : 'application/javascript',
  '.json': 'application/json',
  '.ico' : 'image/x-icon',
};

// ── Simple transparent proxy — avoids browser CORS restrictions ───────────────
function handleProxy(req, res) {
  const targetHeader = req.headers['x-proxy-target'];
  if (!targetHeader) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'X-Proxy-Target header is required' }));
  }

  let body = Buffer.alloc(0);
  req.on('data', chunk => { body = Buffer.concat([body, chunk]); });
  req.on('end', () => {
    const parsed = url.parse(targetHeader);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const outHeaders = { ...req.headers };
    delete outHeaders['x-proxy-target'];
    delete outHeaders['host'];
    outHeaders['host'] = parsed.hostname;
    if (body.length) outHeaders['content-length'] = body.length;

    const options = {
      hostname: parsed.hostname,
      port    : parsed.port || (isHttps ? 443 : 80),
      path    : parsed.path || '/',
      method  : req.method,
      headers : outHeaders,
    };

    const proxyReq = lib.request(options, proxyRes => {
      let chunks = [];
      proxyRes.on('data', c => chunks.push(c));
      proxyRes.on('end', () => {
        const responseBody = Buffer.concat(chunks);
        res.writeHead(proxyRes.statusCode, {
          'Content-Type'                : proxyRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin' : '*',
        });
        res.end(responseBody);
      });
    });

    proxyReq.on('error', err => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
    });

    if (body.length) proxyReq.write(body);
    proxyReq.end();
  });
}

// ── Static file server ────────────────────────────────────────────────────────
function handleStatic(req, res) {
  const reqPath = req.url.split('?')[0];
  const filePath = path.join(__dirname, 'public', reqPath === '/' ? 'index.html' : reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(__dirname, 'public', 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ── Main router ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin'  : '*',
      'Access-Control-Allow-Methods' : 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers' : '*',
    });
    return res.end();
  }

  if (req.url.startsWith('/proxy')) return handleProxy(req, res);
  handleStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Arapoint API Tester running → http://0.0.0.0:${PORT}`);
});
