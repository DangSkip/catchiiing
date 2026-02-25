# promptui

Browser-based UI prompts for Claude Code — image pickers, confirmations, reviews, checklists — without leaving the terminal.

```
npx promptui
```

The server opens a Chrome app window automatically when needed, waits for your input, then closes and snaps focus back to your terminal.

---

## Usage from Claude Code

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

The `/promptui` Claude Code skill is installed automatically on `npm install`.

**Global install** — skill goes to `~/.claude/commands/promptui.md` (available in every project):

```bash
npm install -g promptui
```

**Local install** — skill goes to `<your-project>/.claude/commands/promptui.md`:

```bash
npm install promptui
```

Then type `/promptui` in any Claude Code session to trigger a UI prompt. Claude will gather options from context, open the window, and act on your response.

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
