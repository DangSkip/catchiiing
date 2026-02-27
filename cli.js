#!/usr/bin/env node

/**
 * cli.js — Markdown CLI for promptui
 *
 * Usage:
 *   promptui                  # no args → start server (backward compat)
 *   promptui workflow.md      # parse MD → post to server → print result
 *   cat workflow.md | promptui -   # read from stdin
 */

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const parseMd = require('./parse-md');

const PORT_FILE = '/tmp/promptui.port';
const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 5000;

// --- Helpers ---

function readPort() {
  try { return parseInt(fs.readFileSync(PORT_FILE, 'utf8').trim(), 10); }
  catch { return null; }
}

function isServerAlive(port) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/', timeout: 1000 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function startServer() {
  const serverPath = path.join(__dirname, 'server.js');
  const child = spawn(process.execPath, [serverPath], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

async function ensureServer() {
  let port = readPort();
  if (port && await isServerAlive(port)) return port;

  // Stale or missing — (re)start
  try { fs.unlinkSync(PORT_FILE); } catch {}
  startServer();

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    port = readPort();
    if (port && await isServerAlive(port)) return port;
  }

  throw new Error('Failed to start promptui server within 5s');
}

function postPayload(port, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/ui',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error(`Invalid server response: ${body}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Convert server JSON response → plain text for stdout.
 */
function formatResponse(json) {
  if (json.error) return { text: `error: ${json.error}`, code: 1 };
  if (json.results !== undefined) {
    return {
      text: json.results.map(r => `- ${r.label}: ${r.action || 'skipped'}`).join('\n'),
      code: 0,
    };
  }
  if (json.chosen !== undefined) {
    if (Array.isArray(json.chosen))
      return { text: json.chosen.map(c => `- ${c}`).join('\n'), code: 0 };
    return { text: String(json.chosen), code: 0 };
  }
  if (json.confirmed !== undefined) return { text: json.confirmed ? 'yes' : 'no', code: 0 };
  if (json.action !== undefined) return { text: String(json.action), code: 0 };
  if (json.text !== undefined) return { text: String(json.text), code: 0 };
  if (json.ok) return { text: 'ok', code: 0 };
  return { text: JSON.stringify(json), code: 0 };
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

// --- Main ---

async function main() {
  const arg = process.argv[2];

  // No args → start server in foreground (backward compat)
  if (!arg) {
    require('./server');
    return;
  }

  // Read markdown from file or stdin
  let md;
  if (arg === '-') {
    md = await readStdin();
  } else {
    const filePath = path.resolve(arg);
    if (!fs.existsSync(filePath)) {
      process.stderr.write(`promptui: file not found: ${arg}\n`);
      process.exit(1);
    }
    md = fs.readFileSync(filePath, 'utf8');
  }

  // Parse markdown → JSON payload
  const payload = parseMd(md);

  // Ensure server is running
  let port;
  try {
    port = await ensureServer();
  } catch (e) {
    process.stderr.write(`promptui: ${e.message}\n`);
    process.exit(1);
  }

  // Post and print result
  try {
    const response = await postPayload(port, payload);
    const { text, code } = formatResponse(response);
    process.stdout.write(text + '\n');
    process.exit(code);
  } catch (e) {
    process.stderr.write(`promptui: ${e.message}\n`);
    process.exit(1);
  }
}

main();
