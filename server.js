#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const PORT_FILE = '/tmp/ui-bridge.port';
const SHUTDOWN_GRACE_MS = 60_000;

let sseRes = null;
let shutdownTimer = null;
let pendingResolve = null;
let sseWaiters = [];
let serverPort = null;

function openBrowser() {
  const url = `http://localhost:${serverPort}`;
  exec(`open -na "Google Chrome" --args --app=${url} --window-size=760,560`, (err) => {
    if (err) exec(`open "${url}"`);
  });
}

function waitForSSE(timeoutMs = 15000) {
  if (sseRes) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const waiter = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(() => {
      sseWaiters = sseWaiters.filter(fn => fn !== waiter);
      reject(new Error('No browser connected within 15s'));
    }, timeoutMs);
    sseWaiters.push(waiter);
  });
}

// --- SSE stream the browser listens to ---
app.get('/events', (req, res) => {
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseRes = res;

  const waiters = sseWaiters.slice();
  sseWaiters = [];
  waiters.forEach(fn => fn());

  req.on('close', () => {
    sseRes = null;
    shutdownTimer = setTimeout(() => {
      console.log('Browser disconnected — shutting down.');
      try { fs.unlinkSync(PORT_FILE); } catch (_) {}
      process.exit(0);
    }, SHUTDOWN_GRACE_MS);
  });
});

// --- Send a UI event, block until user responds ---
app.post('/ui', async (req, res) => {
  const payload = req.body;

  if (!sseRes) {
    openBrowser();
    try {
      await waitForSSE();
    } catch (e) {
      return res.status(503).json({ error: e.message });
    }
  }

  if (payload.type === 'display') {
    sseRes.write(`data: ${JSON.stringify(payload)}\n\n`);
    return res.json({ ok: true });
  }

  // Block until /response comes back
  const result = await new Promise((resolve) => {
    pendingResolve = resolve;
    sseRes.write(`data: ${JSON.stringify(payload)}\n\n`);
  });

  pendingResolve = null;
  res.json(result);
});

// --- Browser posts response back here ---
app.post('/response', (req, res) => {
  if (pendingResolve) {
    pendingResolve(req.body);
  }
  res.json({ ok: true });
});

// --- Serve local files by absolute path ---
app.get('/static/*', (req, res) => {
  const filePath = '/' + req.params[0];
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(filePath);
});

// --- Serve frontend ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start ---
const server = app.listen(0, '127.0.0.1', () => {
  serverPort = server.address().port;
  fs.writeFileSync(PORT_FILE, String(serverPort));
  console.log(`\nUI Bridge running → http://localhost:${serverPort}`);
  console.log('Open this in your browser to continue.\n');
});
