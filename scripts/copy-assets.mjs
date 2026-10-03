/**
 * Copies non-TypeScript runtime assets into the build output.
 *
 * `tsc` only emits `.js` files, so `src/db/schema.sql` would be missing from
 * `dist/` and the compiled server could not open its database.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const assets = [['src/db/schema.sql', 'dist/db/schema.sql']];

for (const [from, to] of assets) {
  const source = join(root, from);
  const target = join(root, to);

  if (!existsSync(source)) {
    console.error(`[build] missing asset: ${from}`);
    process.exit(1);
  }

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log(`[build] copied ${from} -> ${to}`);
}