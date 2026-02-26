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

## Caching large pickers

When building a picker from many files or a slow command (>~20 items), cache the
payload to avoid regeneration on future runs.

**Cache directory** (per-project, never committed):
```bash
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
if [ -n "$GIT_DIR" ]; then
  CACHE_DIR="$GIT_DIR/promptui-cache"
else
  HASH=$(pwd | shasum | cut -c1-8)
  CACHE_DIR="/tmp/promptui-cache-$HASH"
fi
mkdir -p "$CACHE_DIR"
KEY=$(echo "$SOURCE" | shasum | cut -c1-12)
CACHE="$CACHE_DIR/$KEY.json"
```

**Staleness check** — diff the actual source items against what's cached:
```bash
USE_CACHE=false
if [ -f "$CACHE" ]; then
  DIFF=$(diff \
    <(jq -r '._cache.items[]' "$CACHE" 2>/dev/null | sort) \
    <(ls "$SOURCE"/*.png 2>/dev/null | xargs -n1 basename | sed 's/\.png$//' | sort) \
  )
  [ -z "$DIFF" ] && USE_CACHE=true
fi
```

**Cache file format** (payload JSON + embedded metadata):
```json
{
  "_cache": { "source": "/abs/path", "items": ["label-a", "label-b"] },
  "type": "choose",
  "title": "...",
  "options": [...]
}
```

Build and save when stale, then POST:
```bash
if [ "$USE_CACHE" = "false" ]; then
  # Build OPTIONS_JSON and FULL_PAYLOAD_JSON, then:
  echo "$FULL_PAYLOAD_JSON" | jq \
    --arg src "$SOURCE" \
    --argjson items "$ITEMS_JSON_ARRAY" \
    '. + {"_cache": {"source": $src, "items": $items}}' \
    > "$CACHE"
fi
PORT=$(cat /tmp/promptui.port)
RESULT=$(curl -s -X POST localhost:$PORT/ui --json @"$CACHE")
```

For command-generated lists (git branches, etc.), `SOURCE` = the command string,
`items` = sorted output lines, diff against `$($SOURCE_CMD | sort)`.

**Rules:**
- Never cache `confirm`, `review`, or `display` — contextual and cheap
- Always use absolute paths as `SOURCE` for unambiguous cache keys
- `items` must be sorted consistently (use `sort`) for reliable diffing
