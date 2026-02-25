# Claude Code UI Bridge — Spec

## What It Is

A lightweight local Node server that gives Claude Code a browser-based UI layer for rich interactions — image selection, confirmation dialogs, result display — without interrupting the terminal workflow. Installable and runnable via `npx`.

---

## Core Flow

1. Claude Code starts the server via `npx ui-bridge` (or it's already running)
2. Server picks a free port, writes it to `/tmp/ui-bridge.port`, prints the URL to the terminal
3. User opens the URL in the browser
4. Claude Code sends a POST to the server with a JSON payload
5. The browser receives the payload via SSE and renders the UI
6. User interacts (clicks a choice, confirms, dismisses)
7. Server resolves the pending request and returns the result to Claude Code
8. Claude Code receives the response and continues
9. When the user closes the tab, the server detects the SSE connection drop and shuts down cleanly

Claude Code's side looks like this:

```bash
PORT=$(cat /tmp/ui-bridge.port)
RESULT=$(curl -s -X POST localhost:$PORT/ui --json @payload.json)
```

The curl blocks until the user acts. No polling. No extra tooling.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ui` | Send a UI event. Blocks until user responds. |
| GET | `/events` | SSE stream the browser listens to |
| GET | `/static/*` | Serve local files (images, etc.) by absolute path |

---

## Payload Types

All payloads share a `type` field. Claude Code picks the type based on what it needs.

### `display` — Show content, no input needed

```json
{
  "type": "display",
  "title": "Redesign complete",
  "body": "Full paragraph or markdown content here..."
}
```

Browser shows the content. Request returns immediately with `{ "ok": true }`.

---

### `confirm` — Yes / No decision

```json
{
  "type": "confirm",
  "title": "Send WhatsApp pitch?",
  "body": "You're about to message 3 businesses. Continue?"
}
```

Returns `{ "confirmed": true }` or `{ "confirmed": false }`.

---

### `choose` — Pick one from a list (with optional images)

```json
{
  "type": "choose",
  "title": "Pick the best redesign",
  "options": [
    { "label": "Option A", "image": "/abs/path/to/a.png" },
    { "label": "Option B", "image": "/abs/path/to/b.png" }
  ]
}
```

Images are served via `/static/*`. Returns `{ "chosen": "Option A" }`.

---

### `pick_many` — Pick multiple from a list

Same structure as `choose` but allows multiple selections. Returns `{ "chosen": ["Option A", "Option C"] }`.

---

## Frontend

Single HTML file served at `/`. User keeps it open in a browser tab.

- Connects to `/events` (SSE) on load
- Replaces its content on each new event
- Sends user response back via `POST /response`

---

## Shutdown Behavior

**When the tab closes, the server dies.** Simple.

- The browser maintains an SSE connection to `/events`
- When that connection drops, the server waits 60 seconds (grace period for accidental refresh)
- If no reconnection within 60s, it deletes `/tmp/ui-bridge.port` and exits cleanly
- No ghost processes, no manual cleanup needed

---

## Browser Opening

The server does **not** try to auto-open the browser. Environments vary too much (SSH, devcontainers, WSL) and silent failures are annoying.

Instead, on startup it prints clearly to the terminal:

```
UI Bridge running → http://localhost:52341
Open this in your browser to continue.
```

Claude Code's `CLAUDE.md` instructs it to remind the user to open the URL if no browser seems connected yet.

---

## Design

**Dark, minimal, with room to breathe.**

- Background: `#0f0f0f`
- Surface (cards, panels): `#1a1a1a`
- Border: `#2a2a2a`
- Text primary: `#e8e8e8`
- Text muted: `#666`
- Accent: `#7c6af7` (purple — for selected state and primary buttons)
- Font: system-ui or Inter if available
- Max content width: `720px`, centered
- Padding: `48px` top/bottom, `24px` sides
- Image grid: auto-fit columns, min `200px`, gap `16px`
- Buttons: minimal border, no fill by default — filled on hover/selected

No frameworks. Vanilla CSS. No animations except a subtle fade-in on content swap.

---

## Server

- Runtime: Node.js, no build step
- Dependencies: `express` only
- Single file: `server.js` with a shebang (`#!/usr/bin/env node`)
- `package.json` has a `bin` entry so `npx ui-bridge` works out of the box
- Port: auto-detected by binding to port `0` — OS assigns a free one
- Port written to `/tmp/ui-bridge.port` immediately on startup
- One pending request in memory at a time — fine for this use case

---

## CLAUDE.md

Shipped inside the package. When Claude Code operates in a project where `ui-bridge` is present, it reads this file automatically and knows:

- How to start the server if not running
- How to read the port file
- How to structure payloads for each type
- To remind the user to open the browser URL if needed

---

## File Structure

```
ui-bridge/
├── package.json    # bin entry, dependencies
├── server.js       # Express server + SSE logic (shebang at top)
├── index.html      # Frontend (served as static)
├── CLAUDE.md       # Instructions for Claude Code
└── spec.md         # This file
```

---

## Out of Scope (for now)

- Auth (it's localhost, fine)
- Multiple concurrent UI requests
- Persistence / history of interactions
- Mobile layout
- Auto-opening the browser
- Idle timeout / countdown
