import { execute, all } from './connection.js';

const TABLE = '_migrations';

async function ensureTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      name   TEXT PRIMARY KEY,
      run_at INTEGER NOT NULL
    )
  `);
}

// Umzug storage backed by a table in the same libSQL/Turso DB the app uses,
// so "which migrations have run" travels with the data instead of living
// only on whichever machine last ran them.
export const libsqlStorage = {
  async logMigration({ name }) {
    await ensureTable();
    await execute(`INSERT INTO ${TABLE} (name, run_at) VALUES (?, ?)`, [name, Date.now()]);
  },
  async unlogMigration({ name }) {
    await ensureTable();
    await execute(`DELETE FROM ${TABLE} WHERE name = ?`, [name]);
  },
  async executed() {
    await ensureTable();
    const rows = await all(`SELECT name FROM ${TABLE} ORDER BY run_at ASC`);
    return rows.map((row) => row.name);
  },
};
