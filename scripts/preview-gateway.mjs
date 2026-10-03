import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const SPA_DIR = path.join(ROOT_DIR, 'frontend', 'public-spa');
const PORT = Number(process.env.FRONTEND_PORT || 5173);
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 8080);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function proxyToJakartaBackend(clientReq, clientRes, bodyBuffer, attempt = 1) {
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: `${BACKEND_HOST}:${BACKEND_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', () => {
    // If the Java 21 Jakarta Servlet backend is still booting up, wait and retry transparently
    if (attempt < 40) {
      setTimeout(
        () => proxyToJakartaBackend(clientReq, clientRes, bodyBuffer, attempt + 1),
        400
      );
    } else {
      clientRes.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      clientRes.end(
        JSON.stringify({ error: 'Java 21 Jakarta Servlet backend is starting up...' })
      );
    }
  });

  if (bodyBuffer && bodyBuffer.length > 0) {
    proxyReq.write(bodyBuffer);
  }
  proxyReq.end();
}

const server = http.createServer((req, res) => {
  const reqUrl = req.url || '/';
  const pathname = reqUrl.split('?')[0];

  // CORS / iframe headers for E2B preview host
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Client-SHA256'
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy all /api/* requests to the Java 21 Jakarta Servlet 6.1 container on :8080
  if (pathname.startsWith('/api/')) {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const bodyBuffer = Buffer.concat(chunks);
      proxyToJakartaBackend(req, res, bodyBuffer);
    });
    return;
  }

  // Serve static SPA assets from frontend/public-spa
  let filePath = path.join(SPA_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(SPA_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(SPA_DIR, 'index.html');
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(data);
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Error loading SPA bundle');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[CyberFusion X] Web Application Gateway listening on http://0.0.0.0:${PORT} -> proxying /api/* to Java 21 Servlet Container (127.0.0.1:${BACKEND_PORT})`
  );
});
