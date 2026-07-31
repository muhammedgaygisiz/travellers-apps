import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(
  root,
  '../../apps/bite-tribe/src/assets/intro-story'
);

mkdirSync(outDir, { recursive: true });

const beats = [
  ['FakeUiDiscover', 'discover.webm'],
  ['FakeUiShare', 'share.webm'],
  ['FakeUiTribe', 'tribe.webm'],
  ['FakeUiGo', 'go.webm'],
];

for (const [id, file] of beats) {
  const out = path.join(outDir, file);
  console.log(`\n→ Rendering ${id} → ${out}`);
  const result = spawnSync(
    'npx',
    [
      'remotion',
      'render',
      id,
      out,
      '--codec=vp8',
      '--image-format=jpeg',
      '--overwrite',
    ],
    { cwd: root, stdio: 'inherit', shell: true }
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\n✓ Intro story videos written to apps/bite-tribe/src/assets/intro-story/');
