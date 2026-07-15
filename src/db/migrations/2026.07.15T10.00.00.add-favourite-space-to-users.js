// Lets a user pin one accessible space as their favourite, auto-selected on
// app open. Nullable FK, not enforced by SQLite (foreign_keys pragma is off
// here) — spaceService resolves it against the user's current space list on
// every read, so a stale reference (e.g. to a deleted space) just reads back
// as null instead of needing a cascade.

/** @type {import('umzug').MigrationFn<import('./connection.js')>} */
export const up = async ({ context: { executeMultiple } }) => {
  await executeMultiple(`
ALTER TABLE users ADD COLUMN favourite_space_id INTEGER REFERENCES spaces(id);
  `);
};

// No down migration, by policy — see AGENTS.md §5. Undo a change by writing
// a new forward migration instead of reverting this one.
