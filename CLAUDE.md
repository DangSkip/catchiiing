# promptui — dev notes

## Build

```bash
npm run build   # tsc → dist/
```

## Architecture

- `src/cli.ts` — CLI entry point, auto-starts server, accepts Markdown or JSON via file/stdin
- `src/server.ts` — Express server: SSE to browser, POST /ui blocks until response, POST /api/upload for file uploads
- `src/parse-md.ts` — Markdown + frontmatter → JSON payload converter
- `src/types.ts` — All TypeScript interfaces and union types
- `index.html` — Single-file frontend (CSS + JS), renders all 14 prompt types
- `postinstall.js` — Copies SKILL.md into `.claude/skills/` on npm install

## Adding a new prompt type

1. Add to `PromptType` union and create payload/response interfaces in `src/types.ts`
2. Handle server-side state (if any) in `src/server.ts` POST /ui and POST /response
3. Add frontmatter passthrough block in `src/parse-md.ts`
4. Add response formatter in `src/cli.ts` `formatResponse()`
5. Add CSS + render function in `index.html`
6. Document in `.claude/skills/promptui/SKILL.md`
