# ui-bridge

A lightweight local server that gives Claude Code a browser-based UI layer — visual image pickers, confirm dialogs, multi-select — without leaving the terminal.

```
npx ui-bridge
```

The server opens a Chrome app window (no address bar, no tabs) automatically when needed, waits for your input, then closes and snaps focus back to your terminal.

---

## Usage from Claude Code

```bash
PORT=$(cat /tmp/ui-bridge.port)

# Show a message
curl -s -X POST localhost:$PORT/ui --json '{"type":"display","title":"Done","body":"Redesign complete."}'

# Yes / No
curl -s -X POST localhost:$PORT/ui --json '{"type":"confirm","title":"Send it?","body":"3 messages queued."}'
# → {"confirmed":true}

# Pick one (with images)
curl -s -X POST localhost:$PORT/ui --json '{
  "type": "choose",
  "title": "Pick the best shot",
  "options": [
    {"label":"A","image":"/abs/path/a.jpg"},
    {"label":"B","image":"/abs/path/b.jpg"}
  ]
}'
# → {"chosen":"A"}

# Pick many
# same structure, "type":"pick_many" → {"chosen":["A","C"]}
```

---

## /pick skill

This repo ships a Claude Code skill at `.claude/commands/pick.md`.

When working in a project that has `ui-bridge` available, type `/pick` in Claude Code to trigger a visual picker. Claude will:

1. Ensure the server is running
2. Gather options from context (files, images, text choices)
3. Open the visual window
4. Get your selection and continue

**Install the skill globally** by copying it to your user commands folder:

```bash
cp .claude/commands/pick.md ~/.claude/commands/pick.md
```

---

## File structure

```
ui-bridge/
├── package.json          # bin entry → npx ui-bridge
├── server.js             # Express server + SSE
├── index.html            # Frontend (dark, minimal)
├── CLAUDE.md             # Instructions for Claude Code
├── .claude/
│   └── commands/
│       └── pick.md       # /pick skill
└── README.md
```

---

## Design

Dark, minimal. `#0f0f0f` background, `#7c6af7` accent. No frameworks, no build step.
