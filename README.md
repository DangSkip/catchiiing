# promptui

Browser-based UI prompts for Claude Code — image pickers, confirmations, reviews, checklists — without leaving the terminal.

Install globally and Claude Code handles the rest:

```bash
npm install -g @dangskipperms/promptui
```

A Chrome window opens when Claude needs your input, waits for your response, then closes and snaps focus back to your terminal.

---

## How it works

> Claude Code knows how to use this instantly — just install and go.

```bash
PORT=$(cat /tmp/promptui.port)

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

# Pick many with filter + infinite scroll
curl -s -X POST localhost:$PORT/ui --json '{
  "type": "pick_many",
  "title": "Select tests to re-run",
  "filter": true,
  "options": [...]
}'
# → {"chosen":["A","C"]}

# Review markdown with custom actions
curl -s -X POST localhost:$PORT/ui --json '{
  "type": "review",
  "title": "Draft",
  "body": "## Markdown or HTML here",
  "actions": ["Send it", "Rewrite", "Skip"]
}'
# → {"action":"Send it"}
```

---

## /promptui skill

The `/promptui` Claude Code skill is installed automatically on `npm install` — globally or per-project:

```bash
npm install -g @dangskipperms/promptui   # → ~/.claude/commands/promptui.md
npm install @dangskipperms/promptui      # → <your-project>/.claude/commands/promptui.md
```

Type `/promptui` in any Claude Code session, or reference it in your Claude Code configuration. For sub-agents, make sure to grant skill access explicitly.

---

## File structure

```
promptui/
├── package.json
├── server.js
├── index.html
├── CLAUDE.md
├── .claude/
│   └── commands/
│       └── promptui.md
└── README.md
```

---

## Design

Dark, minimal. `#0f0f0f` background, `#7c6af7` accent. No frameworks, no build step.
