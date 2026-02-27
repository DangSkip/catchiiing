#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

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
