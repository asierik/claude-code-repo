// The single SQLite connection, shared by every repository.
// Uses Node's built-in driver — no native build step.
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.MEALMATE_DB || join(__dirname, '..', '..', 'mealmate.db');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
