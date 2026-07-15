import 'dotenv/config';
import { Umzug } from 'umzug';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { execute, executeMultiple, all, get, run } from './connection.js';
import { libsqlStorage } from './storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsGlob = join(__dirname, 'migrations', '*.js').replace(/\\/g, '/');

// Template used by `create` (via the CLI below) for new migration files.
// Umzug's built-in .js template emits CommonJS (`exports.up = ...`), which
// breaks under this project's `"type": "module"` — so this project supplies
// its own ESM template instead.
const migrationTemplate = (filepath) => [[
  filepath,
  `/** @type {import('umzug').MigrationFn<import('./connection.js')>} */
export const up = async ({ context: { execute, executeMultiple, all, get, run } }) => {
};

// No down migration, by policy — see AGENTS.md §5. Undo a change by writing
// a new forward migration instead of reverting this one.
`,
]];

export const umzug = new Umzug({
  migrations: { glob: migrationsGlob },
  context: { execute, executeMultiple, all, get, run },
  storage: libsqlStorage,
  logger: console,
  create: { folder: join(__dirname, 'migrations'), template: migrationTemplate },
});

export async function migrateToLatest() {
  await umzug.up();
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  await umzug.runAsCLI();
}
