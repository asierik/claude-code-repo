import { executeMultiple } from './connection.js';

// Creates all tables if they don't exist. Called once at startup.
export async function migrate() {
  await executeMultiple(`
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT UNIQUE NOT NULL,
  pass_hash  TEXT NOT NULL,
  salt       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS spaces (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

-- Who can see/edit a space. The owner is stored here too, with role 'owner'.
CREATE TABLE IF NOT EXISTS space_members (
  space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role     TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (space_id, user_id)
);

CREATE TABLE IF NOT EXISTS dishes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id    INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  ingredients TEXT NOT NULL DEFAULT '[]',  -- JSON: [{name, amount}]
  tags        TEXT NOT NULL DEFAULT '[]',  -- JSON: ["quick","vegan"]
  created_by  INTEGER REFERENCES users(id),
  created_at  INTEGER NOT NULL
);

-- One dish per (space, date, slot). slot is breakfast|lunch|dinner.
CREATE TABLE IF NOT EXISTS plan_entries (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id  INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  slot      TEXT NOT NULL,
  dish_id   INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  UNIQUE (space_id, date, slot)
);

-- Ingredients the user has ticked off the grocery list (per space).
CREATE TABLE IF NOT EXISTS grocery_checked (
  space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  PRIMARY KEY (space_id, item_key)
);

-- Freeform items added directly to the grocery list (not tied to any dish).
CREATE TABLE IF NOT EXISTS grocery_custom_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id   INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL
);
  `);
}
