# /pick — Visual picker via UI Bridge

Use this skill whenever you need the user to visually choose between options — files, images, text choices, or anything else.

## How it works

1. Ensure the server is running:
```bash
if [ ! -f /tmp/ui-bridge.port ]; then
  cd /Users/imac1/projects/dangerouslyskippermissions/dang-projects/catchiiing && node server.js &
  sleep 1
fi
PORT=$(cat /tmp/ui-bridge.port)
```

2. Build a JSON payload and POST it — the curl blocks until the user picks:
```bash
PORT=$(cat /tmp/ui-bridge.port)
RESULT=$(curl -s -X POST localhost:$PORT/ui --json '<payload>')
```

3. Parse the result and continue.

## Payload shapes

**Text options** (no images):
```json
{
  "type": "choose",
  "title": "Your question here",
  "options": [
    {"label": "Option A"},
    {"label": "Option B"}
  ]
}
```
Returns: `{"chosen":"Option A"}`

**Image options** (use absolute paths):
```json
{
  "type": "choose",
  "title": "Your question here",
  "options": [
    {"label": "Name", "image": "/absolute/path/to/file.jpg"}
  ]
}
```
Returns: `{"chosen":"Name"}`

**Multiple picks**:
Same as above but `"type": "pick_many"`.
Returns: `{"chosen":["A","C"]}`

**Yes/No confirm**:
```json
{
  "type": "confirm",
  "title": "Are you sure?",
  "body": "This will do the thing."
}
```
Returns: `{"confirmed":true}` or `{"confirmed":false}`

**Display only** (no input, returns immediately):
```json
{
  "type": "display",
  "title": "Done",
  "body": "Here's what happened..."
}
```

## When $ARGUMENTS is given

Parse the argument as the topic/context for what to pick. For example:
- `/pick photos in the photos folder` → find image files, present them visually
- `/pick a color scheme` → present text options
- `/pick which file to delete` → list relevant files as options

Always infer sensible options from context. When options involve local files or images, use their absolute paths in the `image` field so they render in the browser.

## Rules
- Always use `choose` (not `pick_many`) unless the user explicitly wants multiple selections
- Keep titles short and clear — they're displayed as headings
- The window opens automatically, the user picks, it closes, focus returns here
- You get back exactly what they clicked — use it to proceed
