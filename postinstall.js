#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

if (os.platform() !== 'darwin') {
  console.warn('\x1b[33mpromptui: macOS only.\x1b[0m This package uses osascript and Chrome app-mode features that only work on macOS.');
  console.warn('The server and skill file will still be installed, but promptui will not function on this platform.');
  console.warn('');
}

const isGlobal = process.env.npm_config_global === 'true';
const src = path.join(__dirname, '.claude', 'skills', 'promptui', 'SKILL.md');

// Global → ~/.claude/skills/promptui/
// Local  → <project-root>/.claude/skills/promptui/  (INIT_CWD is where npm install was run)
const root = isGlobal
  ? os.homedir()
  : (process.env.INIT_CWD || process.env.npm_config_local_prefix || process.cwd());

const dest = path.join(root, '.claude', 'skills', 'promptui', 'SKILL.md');

try {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`promptui: /promptui skill installed → ${dest}`);
} catch (e) {
  console.warn(`promptui: could not install skill (${e.message})`);
  console.warn(`  Copy manually: cp ${src} ~/.claude/skills/promptui/SKILL.md`);
}
