import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChain } from './src/chain.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const chain = await createChain();
const notes = new Map();
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

async function body(request) {
  let raw = '';
  for await (const part of request) {
    raw += part;
    if (raw.length > 4096) throw new Error('Request too large');
  }
  return JSON.parse(raw || '{}');
}

async function snapshot() {
  const data = await chain.state();
  data.notes = Object.fromEntries(notes);
  return data;
}

function send(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/api/state' && request.method === 'GET') return send(response, 200, await snapshot());
    if (url.pathname.startsWith('/api/') && request.method === 'POST') {
      const input = await body(request);
      if (url.pathname === '/api/open') {
        const before = (await chain.state()).bounties.length;
        await chain.open(input.task, input.amountEth, input.deadlineSeconds);
        notes.set(before, { task: input.task.trim(), proof: '' });
      } else if (url.pathname === '/api/submit') {
        await chain.submit(input.id, input.proof);
        notes.get(Number(input.id)).proof = input.proof.trim();
      } else if (url.pathname === '/api/approve') await chain.approve(input.id, input.reviewer);
      else if (url.pathname === '/api/refund') await chain.refund(input.id);
      else if (url.pathname === '/api/advance') await chain.advanceLocalTime(input.seconds);
      else return send(response, 404, { error: 'Unknown action' });
      return send(response, 200, await snapshot());
    }
    if (request.method !== 'GET') return send(response, 405, { error: 'Method not allowed' });
    const name = url.pathname === '/' ? '/index.html' : url.pathname;
    if (!['/index.html', '/styles.css', '/app.js'].includes(name)) return send(response, 404, { error: 'Not found' });
    const file = path.join(root, name);
    const contents = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': `${types[path.extname(file)]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(contents);
  } catch (error) {
    send(response, 400, { error: error.shortMessage || error.reason || error.message || 'Request failed' });
  }
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`PatchPledge at http://127.0.0.1:${port}\n`);
});
