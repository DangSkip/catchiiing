#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const PORT_FILE = '/tmp/ui-bridge.port';
const CHROME_PROFILE = '/tmp/ui-bridge-chrome';
const SHUTDOWN_GRACE_MS = 60_000;
const WIN_W = 780, WIN_H = 580;

let sseRes = null;
let shutdownTimer = null;
let pendingResolve = null;
let sseWaiters = [];
let serverPort = null;
let frontApp = null; // used only for centering

function captureFrontApp() {
  return new Promise((resolve) => {
    exec(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`, (err, stdout) => {
      resolve(err ? null : stdout.trim());
    });
  });
}

function centerWindow(callback) {
  const W = WIN_W, H = WIN_H;
  const script = frontApp ? `
try
  tell application "System Events"
    tell process "${frontApp}"
      set {px, py} to position of window 1
      set {pw, ph} to size of window 1
    end tell
  end tell
  set cx to px + (pw - ${W}) div 2
  set cy to py + (ph - ${H}) div 2
on error
  set cx to 200
  set cy to 200
end try
tell application "Google Chrome" to set bounds of front window to {cx, cy, cx + ${W}, cy + ${H}}
` : `
tell application "Finder" to set sb to bounds of window of desktop
set cx to (item 3 of sb - ${W}) div 2
set cy to (item 4 of sb - ${H}) div 2
tell application "Google Chrome" to set bounds of front window to {cx, cy, cx + ${W}, cy + ${H}}
`;
  const child = exec('osascript', () => { if (callback) callback(); });
  child.stdin.write(script);
  child.stdin.end();
}

async function openBrowser() {
  frontApp = await captureFrontApp();
  const url = `http://localhost:${serverPort}`;
  // Isolated Chrome profile: no other windows in this profile, so when it
  // closes macOS naturally returns focus to whatever was active before.
  exec(
    `open -na "Google Chrome" --args --app=${url} --window-size=${WIN_W},${WIN_H} ` +
    `--user-data-dir=${CHROME_PROFILE} --no-first-run --no-default-browser-check`,
    (err) => { if (err) exec(`open "${url}"`); }
  );
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
  centerWindow(() => {
    if (sseRes) sseRes.write(`data: ${JSON.stringify({ type: '_ready' })}\n\n`);
  });

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
  console.log(`\nUI Bridge running → http://localhost:${serverPort}\n`);
});
