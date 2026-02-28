/**
 * parse-md.ts — Markdown → JSON payload converter for promptui
 *
 * Parses a Markdown string (with optional YAML frontmatter) into a
 * payload object that the promptui server understands.
 */

import {
  FrontmatterMeta,
  FrontmatterResult,
  OptionItem,
  ParsedBody,
  Payload,
  PromptType,
} from './types';

/**
 * Parse simple YAML frontmatter between --- fences.
 * Handles strings, booleans, and simple arrays like [a, b, c].
 */
function parseFrontmatter(raw: string): FrontmatterResult {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: {}, body: raw };

  const meta: FrontmatterMeta = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (!m) continue;
    const [, key, val] = m;
    const v = val.trim();
    if (v === 'true') meta[key] = true;
    else if (v === 'false') meta[key] = false;
    else if (/^\[.*\]$/.test(v))
      meta[key] = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    else meta[key] = v;
  }

  const body = raw.slice(match[0].length).replace(/^\r?\n/, '');
  return { meta, body };
}

/**
 * Parse the Markdown body into title, body text, and options.
 */
function parseBody(md: string): ParsedBody {
  const lines = md.split('\n');
  let title = '';
  const bodyLines: string[] = [];
  const options: OptionItem[] = [];
  const imgRe = /^!\[([^\]]*)\]\(([^)]+)\)$/;

  for (const line of lines) {
    const trimmed = line.trim();

    // First heading
    if (!title && /^#\s+/.test(trimmed)) {
      title = trimmed.replace(/^#\s+/, '');
      continue;
    }

    // Bullet item
    if (/^[-*]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*]\s+/, '');
      const imgMatch = content.match(imgRe);
      if (imgMatch) {
        options.push({ label: imgMatch[1], image: imgMatch[2] });
      } else {
        options.push({ label: content });
      }
      continue;
    }

    // Regular body text (skip blank lines before any body content)
    if (trimmed || bodyLines.length > 0) {
      bodyLines.push(line);
    }
  }

  // Trim trailing blank lines from body
  while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) {
    bodyLines.pop();
  }

  return { title, body: bodyLines.join('\n').trim(), options };
}

/**
 * Infer the prompt type from structure when not explicitly set.
 */
function inferType(
  meta: FrontmatterMeta,
  context: { options: OptionItem[]; body: string; hasImages: boolean },
): PromptType {
  if (meta.type) return meta.type as PromptType;
  if (meta.multi === true) return 'pick_many';
  if (meta.actions && context.options.length > 0) return 'review_each';
  if (meta.actions) return 'review';
  if (meta.placeholder) return 'text';
  if (context.options.length > 0) return 'choose';
  if (context.body) return 'confirm';
  return 'display';
}

/**
 * Main entry point: parse a Markdown string into a server payload.
 */
function parseMd(raw: string): Payload {
  const { meta, body: mdBody } = parseFrontmatter(raw);
  const { title, body, options } = parseBody(mdBody);
  const hasImages = options.some(o => o.image);

  const type = inferType(meta, { options, body, hasImages });

  const payload: Record<string, unknown> = { type };
  if (title) payload.title = title;
  if (body) payload.body = body;
  if (options.length > 0) payload.options = options;

  // Pass through frontmatter keys that the server understands
  if (meta.filter === true) payload.filter = true;
  if (meta.actions) payload.actions = meta.actions;
  if (meta.placeholder) payload.placeholder = meta.placeholder;

  return payload as unknown as Payload;
}

export default parseMd;
