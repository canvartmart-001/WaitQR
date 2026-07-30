import http from 'node:http';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const server = http.createServer(app);

app.use('/api', createProxyMiddleware({
  target: 'http://127.0.0.1:4000',
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/': '/api/' },
}));

const socketProxy = createProxyMiddleware({
  target: 'http://127.0.0.1:4000',
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/': '/socket.io/' },
});

app.use('/socket.io', socketProxy);

server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/socket.io')) {
    socketProxy.upgrade(req, socket, head);
    return;
  }

  socket.destroy();
});

app.use(express.static(join(__dirname, '..', 'dist')));

app.get(/.*/, (_req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

server.listen(port, () => {
  console.log(`WaitQR proxy preview listening on port ${port}`);
});
