# UI Bridge

A lightweight local server that gives Claude Code a browser-based UI layer.

## Starting the server

If `/tmp/ui-bridge.port` does not exist, start the server:

```bash
npx ui-bridge
```

Then remind the user to open the URL printed to the terminal in their browser before continuing.

## Reading the port

```bash
PORT=$(cat /tmp/ui-bridge.port)
```

## Sending UI events

All events are POSTed to `/ui`. The request blocks until the user responds.

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

Images are optional. Without images, options are rendered as buttons.

### pick_many — pick multiple options

Same structure as `choose`. Returns: `{"chosen":["Option A","Option C"]}`

## Checking if the browser is connected

If `/ui` returns `{"error":"No browser connected..."}`, remind the user to open the browser URL.

## Notes

- One pending request at a time — fine for sequential Claude Code flows
- Server shuts down 60 seconds after the browser tab closes
- Port file is deleted on shutdown — use this to detect if the server is running
