import test from 'node:test';
import assert from 'node:assert/strict';
import { dishService } from './dishService.js';
import { dishRepository } from '../repositories/dishRepository.js';

// dishRepository is exported as a plain object, so we can monkey-patch its
// methods per test (see AGENTS.md / spaceService.test.js: mock the
// repository module rather than hitting the real Turso DB) and restore the
// originals afterwards so tests don't leak state into each other.
function stub(obj, overrides) {
  const originals = {};
  for (const key of Object.keys(overrides)) {
    originals[key] = obj[key];
    obj[key] = overrides[key];
  }
  return () => {
    for (const key of Object.keys(originals)) obj[key] = originals[key];
  };
}

test('create throws badRequest when name is missing', async (t) => {
  const restore = stub(dishRepository, {
    create: async () => { throw new Error('should not be called'); },
  });
  t.after(restore);

  await assert.rejects(
    () => dishService.create(1, 7, { name: '  ', notes: 'some notes' }),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});

test('create defaults notes to an empty string when omitted', async (t) => {
  let capturedData;
  const restore = stub(dishRepository, {
    create: async (spaceId, userId, data) => {
      capturedData = data;
      return { id: 1, name: data.name, ingredients: data.ingredients, tags: data.tags, notes: data.notes };
    },
  });
  t.after(restore);

  await dishService.create(1, 7, { name: 'Pasta' });
  assert.equal(capturedData.notes, '');
});

test('create trims whitespace-only notes down to an empty string', async (t) => {
  let capturedData;
  const restore = stub(dishRepository, {
    create: async (spaceId, userId, data) => {
      capturedData = data;
      return { id: 1, ...data };
    },
  });
  t.after(restore);

  await dishService.create(1, 7, { name: 'Pasta', notes: '   ' });
  assert.equal(capturedData.notes, '');
});

test('create trims leading/trailing whitespace on a provided note', async (t) => {
  let capturedData;
  const restore = stub(dishRepository, {
    create: async (spaceId, userId, data) => {
      capturedData = data;
      return { id: 1, ...data };
    },
  });
  t.after(restore);

  await dishService.create(1, 7, { name: 'Pasta', notes: '  double the garlic  ' });
  assert.equal(capturedData.notes, 'double the garlic');
});

test('update throws notFound when the dish does not exist in the space', async (t) => {
  const restore = stub(dishRepository, {
    findById: async () => null,
    update: async () => { throw new Error('should not be called'); },
  });
  t.after(restore);

  await assert.rejects(
    () => dishService.update(1, 999, { name: 'Pasta' }),
    (err) => {
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test('update replaces notes when a new value is provided in the body', async (t) => {
  let capturedData;
  const restore = stub(dishRepository, {
    findById: async () => ({ id: 5, name: 'Pasta', ingredients: [], tags: [], notes: 'old note' }),
    update: async (id, spaceId, data) => {
      capturedData = data;
      return { id, ...data };
    },
  });
  t.after(restore);

  await dishService.update(1, 5, { name: 'Pasta', notes: 'new note' });
  assert.equal(capturedData.notes, 'new note');
});

test('update falls back to the existing note when notes is omitted from the body (does not clear it)', async (t) => {
  let capturedData;
  const restore = stub(dishRepository, {
    findById: async () => ({ id: 5, name: 'Pasta', ingredients: [], tags: [], notes: 'keep me' }),
    update: async (id, spaceId, data) => {
      capturedData = data;
      return { id, ...data };
    },
  });
  t.after(restore);

  // Body only updates the name; notes is not present at all.
  await dishService.update(1, 5, { name: 'Renamed Pasta' });
  assert.equal(capturedData.notes, 'keep me', 'omitting notes on update must preserve the existing note, not clear it');
});

test('update clears the note when the body explicitly sends an empty string', async (t) => {
  let capturedData;
  const restore = stub(dishRepository, {
    findById: async () => ({ id: 5, name: 'Pasta', ingredients: [], tags: [], notes: 'keep me' }),
    update: async (id, spaceId, data) => {
      capturedData = data;
      return { id, ...data };
    },
  });
  t.after(restore);

  await dishService.update(1, 5, { name: 'Pasta', notes: '' });
  assert.equal(capturedData.notes, '', 'an explicit empty string must clear the note, unlike an omitted field');
});

test('update falls back to an empty string when both the body and the existing dish have no notes', async (t) => {
  let capturedData;
  const restore = stub(dishRepository, {
    // Simulates a dish created before the notes migration: repository maps
    // row.notes ?? '' so existing.notes is '' here, never null/undefined.
    findById: async () => ({ id: 5, name: 'Pasta', ingredients: [], tags: [], notes: '' }),
    update: async (id, spaceId, data) => {
      capturedData = data;
      return { id, ...data };
    },
  });
  t.after(restore);

  await dishService.update(1, 5, { name: 'Pasta' });
  assert.equal(capturedData.notes, '');
});
