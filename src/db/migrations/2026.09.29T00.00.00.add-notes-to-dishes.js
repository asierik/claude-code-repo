// Free-text notes field on dishes, shared across the space (same visibility
// as name/ingredients/tags). Nullable, no backfill — existing rows just read
// back with notes: null.

/** @type {import('umzug').MigrationFn<import('./connection.js')>} */
export const up = async ({ context: { executeMultiple } }) => {
  await executeMultiple(`
ALTER TABLE dishes ADD COLUMN notes TEXT;
  `);
};

// No down migration, by policy — see AGENTS.md §5. Undo a change by writing
// a new forward migration instead of reverting this one.
