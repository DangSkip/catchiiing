# /promptui — Browser UI prompts for Claude Code

Use this skill whenever you need the user to interact visually — choose between options, confirm a decision, review a draft, or pick from a large filtered list.

## How it works

1. Ensure the server is running:
```bash
if [ ! -f /tmp/promptui.port ]; then
  npx promptui &
  sleep 1
fi
PORT=$(cat /tmp/promptui.port)
```

2. POST a payload — curl blocks until the user responds:
```bash
RESULT=$(curl -s -X POST localhost:$PORT/ui --json '<payload>')
```

3. Parse the result and continue.

## Payload shapes

**Choose one** (text buttons):
```json
{ "type": "choose", "title": "Which approach?", "options": [{"label":"A"},{"label":"B"}] }
```
Returns: `{"chosen":"A"}`

**Choose one** (images, use absolute paths):
```json
{ "type": "choose", "title": "Pick the best shot", "options": [{"label":"A","image":"/abs/path/a.jpg"}] }
```
Returns: `{"chosen":"A"}`

**Pick many** (checklist, with optional filter + infinite scroll):
```json
{ "type": "pick_many", "title": "Select tests", "filter": true, "options": [...] }
```
Returns: `{"chosen":["A","C"]}`

**Confirm**:
```json
{ "type": "confirm", "title": "Deploy to prod?", "body": "This will affect live users." }
```
Returns: `{"confirmed":true}` or `{"confirmed":false}`

**Review** (markdown/HTML body, 1–3 custom actions):
```json
{ "type": "review", "title": "Draft", "body": "## Markdown here", "actions": ["Send","Rewrite","Skip"] }
```
Returns: `{"action":"Send"}`

**Display** (no input, returns immediately):
```json
{ "type": "display", "title": "Done", "body": "Here's what happened." }
```

## When $ARGUMENTS is given

Use the argument as context for what to prompt. Examples:
- `/promptui photos in the photos folder` → find images, present as visual picker
- `/promptui which branch to merge` → list git branches as options
- `/promptui review this draft` → show content with approve/reject actions

Infer sensible options from context. Use absolute paths in the `image` field for local files.

## Rules
- Use `choose` for single pick, `pick_many` for multiple
- Add `"filter": true` for lists longer than ~10 items
- Keep titles short — they're headings
- The window opens automatically, closes on response, focus returns here
