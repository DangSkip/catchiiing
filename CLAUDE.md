# promptui

A lightweight local server that gives Claude Code a browser-based UI layer.

## Starting the server

If `/tmp/promptui.port` does not exist, start the server:

```bash
npx promptui
```

## Reading the port

```bash
PORT=$(cat /tmp/promptui.port)
```

## Sending UI prompts

All prompts are POSTed to `/ui`. The request blocks until the user responds.

### display — show content, no input needed

```bash
curl -s -X POST localhost:$PORT/ui \
  --json '{"type":"display","title":"Done","body":"The redesign is complete."}'
```

Returns: `{"ok":true}`

### confirm — yes / no

```bash
curl -s -X POST localhost:$PORT/ui \
  --json '{"type":"confirm","title":"Send message?","body":"You are about to message 3 people."}'
```

Returns: `{"confirmed":true}` or `{"confirmed":false}`

### choose — pick one option

```bash
curl -s -X POST localhost:$PORT/ui \
  --json '{
    "type": "choose",
    "title": "Pick the best layout",
    "options": [
      {"label":"Option A","image":"/abs/path/to/a.png"},
      {"label":"Option B","image":"/abs/path/to/b.png"}
    ]
  }'
```

Returns: `{"chosen":"Option A"}`

Images are optional. Without images, options render as buttons.

Add `"filter": true` for a searchable list with infinite scroll (good for large sets).

### pick_many — pick multiple options

Same structure as `choose`. Returns: `{"chosen":["Option A","Option C"]}`

### review — read content and decide

```bash
curl -s -X POST localhost:$PORT/ui \
  --json '{
    "type": "review",
    "title": "Draft message",
    "body": "## Markdown or HTML here...",
    "actions": ["Send it", "Rewrite", "Skip"]
  }'
```

Returns: `{"action":"Send it"}`

## Notes

- One pending request at a time — fine for sequential Claude Code flows
- Server shuts down 60 seconds after the browser tab closes
- Port file is deleted on shutdown — use this to detect if the server is running
