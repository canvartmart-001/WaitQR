import http from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);

app.use('/api', createProxyMiddleware({
  target: 'http://127.0.0.1:4000',
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/': '/api/' },
}));

app.use('/socket.io', createProxyMiddleware({
  target: 'http://127.0.0.1:4000',
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/': '/socket.io/' },
}));

app.use(express.static(join(__dirname, '..', 'dist')));

app.get(/.*/, (_req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`WaitQR proxy preview listening on http://0.0.0.0:${port}`);
});
