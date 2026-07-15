// A slot could only ever hold one dish (UNIQUE(space_id,date,slot)). Rebuild
// the table so a slot can hold several dishes, while still forbidding the
// same dish twice in one slot (UNIQUE now includes dish_id). SQLite has no
// ALTER TABLE ... DROP CONSTRAINT, so this is the standard rebuild-and-swap.
// The max-dishes-per-slot cap is enforced in planService, not here.

/** @type {import('umzug').MigrationFn<import('./connection.js')>} */
export const up = async ({ context: { executeMultiple } }) => {
  await executeMultiple(`
CREATE TABLE plan_entries_new (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id  INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  slot      TEXT NOT NULL,
  dish_id   INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  UNIQUE (space_id, date, slot, dish_id)
);

INSERT INTO plan_entries_new (id, space_id, date, slot, dish_id)
  SELECT id, space_id, date, slot, dish_id FROM plan_entries;

DROP TABLE plan_entries;

ALTER TABLE plan_entries_new RENAME TO plan_entries;
  `);
};

// No down migration, by policy — see AGENTS.md §5. Undo a change by writing
// a new forward migration instead of reverting this one.
