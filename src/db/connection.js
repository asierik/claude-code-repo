import { createClient } from '@libsql/client';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localDbPath = process.env.MEALMATE_DB || join(__dirname, '..', '..', 'mealmate.db');
const dbUrl = process.env.TURSO_DATABASE_URL || pathToFileURL(localDbPath).href;

const dbConfig = { url: dbUrl };
if (process.env.TURSO_AUTH_TOKEN) dbConfig.authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient(dbConfig);

export async function execute(sql, args = []) {
  return db.execute({ sql, args });
}

export async function executeMultiple(sql) {
  return db.executeMultiple(String(sql));
}

export async function all(sql, args = []) {
  const result = await execute(sql, args);
  return result.rows;
}

export async function get(sql, args = []) {
  const result = await execute(sql, args);
  return result.rows[0] || null;
}

export async function run(sql, args = []) {
  return execute(sql, args);
}
