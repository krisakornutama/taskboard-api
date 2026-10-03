import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DatabaseSync } from 'node:sqlite';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Schema lives next to the compiled output as `dist/db/schema.sql`, and next to
 * the TypeScript source when running through tsx (`src/db/schema.sql`).
 */
function resolveSchemaPath(): string {
  const candidates = [
    resolve(here, 'schema.sql'),
    resolve(process.cwd(), 'src/db/schema.sql'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `Unable to locate schema.sql. Looked in:\n  ${candidates.join('\n  ')}`,
    );
  }
  return found;
}

export type Db = DatabaseSync;

/**
 * Opens the SQLite database, applies pragmas and runs migrations.
 *
 * Uses `node:sqlite` (built into Node >= 22.5) so the project has zero native
 * dependencies and cannot break on a customer's machine during `npm install`.
 */
export function openDatabase(dbPath: string): Db {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  // Enforce referential integrity (disabled by default in SQLite).
  db.exec('PRAGMA foreign_keys = ON');
  if (dbPath !== ':memory:') {
    // WAL is not supported for in-memory databases.
    db.exec('PRAGMA journal_mode = WAL');
  }
  db.exec('PRAGMA busy_timeout = 5000');

  db.exec(readFileSync(resolveSchemaPath(), 'utf8'));

  return db;
}

export function closeDatabase(db: Db): void {
  try {
    db.close();
  } catch {
    // Closing twice is harmless; never throw during shutdown.
  }
}