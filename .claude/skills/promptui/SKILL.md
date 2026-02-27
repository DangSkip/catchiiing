---
name: promptui
description: Show browser-based UI prompts for Claude Code — choose between options, confirm decisions, review drafts, collect text input, or pick from large filtered lists.
argument-hint: "[what to prompt for]"
allowed-tools: Bash, Read, Glob, Grep
---

Use this skill whenever you need the user to interact visually — choose between options, confirm a decision, review a draft, or pick from a large filtered list.

## Markdown workflow (preferred)

Write a `.md` file (or heredoc) and pass it to `promptui`. The result comes back as plain text on stdout. No JSON, no curl, no port management.

```bash
# Write the prompt
cat > /tmp/pick.md << 'PROMPT'
# Pick the best layout

- Option A
- Option B
- Option C
PROMPT

# Run it — result is plain text
CHOICE=$(promptui /tmp/pick.md)
echo "$CHOICE"   # → "Option A"
```

Or pipe from stdin:
```bash
echo '# Deploy to production?

This will affect live users.' | promptui -
# → "yes" or "no"
```

### Markdown format

Optional YAML frontmatter between `---` fences, then a Markdown body:

```markdown
---
type: choose
filter: true
---
# Title goes here

Body text goes here (used for confirm/review/text types).

- Bullet items become options
- ![Alt text](/abs/path/image.png) for image options
```

### Frontmatter keys

| Key | Values | Purpose |
|-----|--------|---------|
| `type` | `choose`, `pick_many`, `confirm`, `review`, `text`, `display` | Prompt type (auto-inferred if omitted) |
| `filter` | `true` | Searchable list with infinite scroll |
| `actions` | `[Send, Rewrite, Skip]` | Action buttons for `review` type |
| `placeholder` | any string | Placeholder text for `text` type |
| `multi` | `true` | Alias — forces `pick_many` type |

### Auto-inference (skip frontmatter for common cases)

| Structure | Inferred type |
|-----------|---------------|
| Has bullet list | `choose` |
| `multi: true` in frontmatter | `pick_many` |
| `actions:` in frontmatter | `review` |
| `placeholder:` in frontmatter | `text` |
| Title + body text, no bullets | `confirm` |
| Title only, no body | `display` |

### Response format

The CLI prints plain text to stdout:

| Type | Output |
|------|--------|
| `choose` | The chosen label (one line) |
| `pick_many` | `- Item A\n- Item B` (bullet list) |
| `confirm` | `yes` or `no` |
| `review` | The action label (one line) |
| `text` | The user's text (possibly multi-line) |
| `display` | `ok` |

### Examples

**Choose with images:**
```markdown
---
type: choose
---
# Pick the best hero image

- ![Sunset](/abs/path/sunset.png)
- ![Mountain](/abs/path/mountain.png)
```
→ stdout: `Sunset`

**Pick many with filter:**
```markdown
---
type: pick_many
filter: true
---
# Select tests to run

- Unit tests
- Integration tests
- E2E tests
```
→ stdout: `- Unit tests\n- E2E tests`

**Review with actions:**
```markdown
---
actions: [Send, Rewrite, Skip]
---
# Draft email to client

Dear Client,

Thank you for your patience.
```
→ stdout: `Send`

**Text input:**
```markdown
---
placeholder: e.g. make the header larger, change the color to blue...
---
# What should we change?

Describe the modifications you want.
```
→ stdout: the user's typed response

**Simplest possible (no frontmatter):**
```markdown
# Which approach?

- Approach A: simple but limited
- Approach B: complex but flexible
```
→ auto-inferred as `choose`, stdout: `Approach A: simple but limited`

## When $ARGUMENTS is given

Use the argument as context for what to prompt. Examples:
- `/promptui photos in the photos folder` → find images, present as visual picker
- `/promptui which branch to merge` → list git branches as options
- `/promptui review this draft` → show content with approve/reject actions

Infer sensible options from context. Use absolute paths in image options for local files.

## Rules
- Use `choose` for single pick, `pick_many` for multiple
- Add `filter: true` for lists longer than ~10 items
- Keep titles short — they're headings
- The window opens automatically, closes on response, focus returns here
- Prefer the Markdown workflow — it's simpler and less error-prone

## JSON API (fallback)

If you need direct control, the server also accepts JSON POSTs:

```bash
if [ ! -f /tmp/promptui.port ]; then
  npx promptui &
  sleep 1
fi
PORT=$(cat /tmp/promptui.port)
RESULT=$(curl -s -X POST localhost:$PORT/ui --json '<payload>')
```

See CLAUDE.md for full JSON payload shapes.

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

**Rules:**
- Never cache `confirm`, `review`, or `display` — contextual and cheap
- Always use absolute paths as `SOURCE` for unambiguous cache keys
- `items` must be sorted consistently (use `sort`) for reliable diffing
