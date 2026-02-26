#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const PORT_FILE = '/tmp/promptui.port';
const CHROME_PROFILE = '/tmp/promptui-chrome';
const SHUTDOWN_GRACE_MS = 60_000;
const WIN_W = 780, WIN_H = 580;

let sseRes = null;
let shutdownTimer = null;
let pendingResolve = null;
let sseWaiters = [];
let serverPort = null;
let frontApp = null;
let openBrowserDone = null; // resolves when window is positioned
let storedOptions = [];    // full option list for paginated/filtered payloads
const PAGE_SIZE = 48;

function captureFrontApp() {
  return new Promise((resolve) => {
    exec(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`, (err, stdout) => {
      resolve(err ? null : stdout.trim());
    });
  });
}

async function killStaleChromeWindows() {
  // Kill any existing promptui Chrome instances so we get a fresh window on the new port
  return new Promise((resolve) => {
    exec(`pkill -f 'user-data-dir=${CHROME_PROFILE}'`, () => resolve());
  });
}

async function openBrowser() {
  await killStaleChromeWindows();
  await new Promise((resolve) => setTimeout(resolve, 500));

  frontApp = await captureFrontApp();
  const W = WIN_W, H = WIN_H;
  const url = `http://localhost:${serverPort}`;

  const centerExpr = frontApp ? `
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
end try` : `
tell application "Finder" to set sb to bounds of window of desktop
set cx to (item 3 of sb - ${W}) div 2
set cy to (item 4 of sb - ${H}) div 2`;

  // Single AppleScript: calc position → launch Chrome with hint → poll and
  // set bounds the moment the window appears (catches it before user sees it)
  const script = `
${centerExpr}
do shell script "open -na 'Google Chrome' --args --app='${url}' --window-size=${W},${H} --window-position=" & (cx as text) & "," & (cy as text) & " --user-data-dir='${CHROME_PROFILE}' --no-first-run --no-default-browser-check"
repeat with i from 1 to 150
  delay 0.02
  try
    tell application "Google Chrome"
      if (count of windows) > 0 then
        set bounds of front window to {cx, cy, cx + ${W}, cy + ${H}}
        activate
        exit repeat
      end if
    end tell
  end try
end repeat`;

  openBrowserDone = new Promise((resolve) => {
    const child = exec('osascript', () => resolve());
    child.stdin.write(script);
    child.stdin.end();
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

  const sendReady = () => {
    if (sseRes) sseRes.write(`data: ${JSON.stringify({ type: '_ready' })}\n\n`);
  };

  if (openBrowserDone) {
    // Wait for the positioning AppleScript to finish before revealing
    openBrowserDone.then(sendReady);
    openBrowserDone = null;
  } else {
    // Reconnect — window already positioned
    sendReady();
  }

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
  let payload = req.body;

  if (!sseRes) {
    openBrowser();
    try {
      await waitForSSE();
    } catch (e) {
      return res.status(503).json({ error: e.message });
    }
  } else {
    // Browser already connected — bring window to front
    exec(`osascript -e 'tell application "Google Chrome" to activate'`);
  }

  if (payload.type === 'display') {
    sseRes.write(`data: ${JSON.stringify(payload)}\n\n`);
    return res.json({ ok: true });
  }

  // For filterable payloads: store full list server-side, send first page only
  if (payload.filter && Array.isArray(payload.options)) {
    storedOptions = payload.options;
    payload = {
      ...payload,
      options: storedOptions.slice(0, PAGE_SIZE),
      total: storedOptions.length,
      pageSize: PAGE_SIZE,
    };
  }

  const UI_TIMEOUT_MS = 5 * 60_000; // 5 minutes max wait for user interaction
  let result;
  try {
    result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingResolve = null;
        reject(new Error('UI timed out waiting for user response'));
      }, UI_TIMEOUT_MS);
      pendingResolve = (value) => { clearTimeout(timer); resolve(value); };
      sseRes.write(`data: ${JSON.stringify(payload)}\n\n`);
    });
  } catch (e) {
    pendingResolve = null;
    return res.status(504).json({ error: e.message });
  }

  pendingResolve = null;
  // Return focus to the app that launched the prompt
  if (frontApp) {
    exec(`osascript -e 'tell application "${frontApp}" to activate'`);
  }
  res.json(result);
});

// --- Paginated / filtered options ---
app.get('/ui/page', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || PAGE_SIZE;
  const filtered = q
    ? storedOptions.filter(o => o.label.toLowerCase().includes(q))
    : storedOptions;
  res.json({ items: filtered.slice(offset, offset + limit), total: filtered.length });
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
const server = app.listen(0, '127.0.0.1', async () => {
  serverPort = server.address().port;
  fs.writeFileSync(PORT_FILE, String(serverPort));
  // Kill any stale Chrome windows from a previous session pointing at a dead port
  await killStaleChromeWindows();
  console.log(`\nUI Bridge running → http://localhost:${serverPort}\n`);
});
