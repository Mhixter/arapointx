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

// ── Returns true when a buffer looks like an HTML page ────────────────────────
function isHtmlResponse(contentType, bodyBuf) {
  if (contentType && contentType.includes('text/html')) return true;
  const peek = bodyBuf.slice(0, 100).toString('utf8').trimStart().toLowerCase();
  return peek.startsWith('<!doctype') || peek.startsWith('<html');
}

// ── Transparent proxy — avoids browser CORS restrictions ─────────────────────
function handleProxy(req, res) {
  const targetHeader = req.headers['x-proxy-target'];
  if (!targetHeader) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'X-Proxy-Target header is required' }));
  }

  // Validate that the target URL is parseable
  let parsed;
  try {
    parsed = new URL(targetHeader);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error   : 'Invalid target URL: ' + e.message,
      targetUrl: targetHeader,
      hint    : 'The Base URL in ⚙ Configure should be just the origin — e.g. https://arapoint.com.ng (no path, no trailing slash).',
    }));
  }

  // Detect path pollution — warn when the base URL already contains a known API path
  if (/\/api\/v1/i.test(parsed.pathname)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error    : 'Base URL contains an API path segment.',
      targetUrl: targetHeader,
      hint     : 'Your Base URL in ⚙ Configure must be only the origin — e.g. https://arapoint.com.ng — not https://arapoint.com.ng/api/v1/…  The endpoint path is added automatically.',
    }));
  }

  const isHttps = parsed.protocol === 'https:';
  const lib     = isHttps ? https : http;

  let body = Buffer.alloc(0);
  req.on('data', chunk => { body = Buffer.concat([body, chunk]); });
  req.on('end', () => {
    const outHeaders = {};
    // Forward only safe headers
    const FORWARD = ['content-type','authorization','x-api-key','accept','accept-encoding','user-agent'];
    for (const k of FORWARD) {
      if (req.headers[k]) outHeaders[k] = req.headers[k];
    }
    outHeaders['host'] = parsed.hostname;
    if (body.length) outHeaders['content-length'] = String(body.length);

    const options = {
      hostname: parsed.hostname,
      port    : parsed.port || (isHttps ? 443 : 80),
      path    : parsed.pathname + (parsed.search || ''),
      method  : req.method,
      headers : outHeaders,
      timeout : 30000,
    };

    const proxyReq = lib.request(options, proxyRes => {
      let chunks = [];
      proxyRes.on('data', c => chunks.push(c));
      proxyRes.on('end', () => {
        const responseBody = Buffer.concat(chunks);
        const ct = proxyRes.headers['content-type'] || '';

        // If upstream returned an HTML page, convert to a helpful JSON error
        if (isHtmlResponse(ct, responseBody)) {
          const status = proxyRes.statusCode;
          res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            error     : `Upstream server returned ${status} (HTML page — not JSON)`,
            statusCode: status,
            targetUrl : targetHeader,
            hint      : status === 404
              ? 'The endpoint was not found on the target server. Check your Base URL in ⚙ Configure — it must be the root origin only (e.g. https://arapoint.com.ng) with no path suffix.'
              : status >= 500
              ? 'The Arapoint server returned a server error page. Check that your deployment is running correctly.'
              : 'The server returned an HTML page instead of JSON. Verify the Base URL is correct and the server is reachable.',
          }));
        }

        res.writeHead(proxyRes.statusCode, {
          'Content-Type'               : ct || 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(responseBody);
      });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.writeHead(504, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        error    : 'Request timed out after 30 seconds',
        targetUrl: targetHeader,
        hint     : 'The Arapoint server did not respond in time. Check that the server is running and accessible.',
      }));
    });

    proxyReq.on('error', err => {
      const isConnRefused = err.code === 'ECONNREFUSED';
      const isNotFound    = err.code === 'ENOTFOUND';
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        error    : err.message,
        code     : err.code,
        targetUrl: targetHeader,
        hint     : isConnRefused
          ? 'Connection refused — the server is not running at this address.'
          : isNotFound
          ? 'Hostname not found — check that the Base URL domain is correct.'
          : 'Network error while connecting to the Arapoint server.',
      }));
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
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin' : '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    return res.end();
  }

  if (req.url.startsWith('/proxy')) return handleProxy(req, res);
  handleStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Arapoint API Tester running → http://0.0.0.0:${PORT}`);
});
