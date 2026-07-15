import test from 'node:test';
import assert from 'node:assert/strict';
import { spaceService } from './spaceService.js';
import { spaceRepository } from '../repositories/spaceRepository.js';
import { userRepository } from '../repositories/userRepository.js';

// spaceRepository/userRepository are exported as plain objects, so we can
// monkey-patch their methods per test (see AGENTS.md: mock the repository
// module rather than hitting the real Turso DB) and restore the originals
// afterwards so tests don't leak state into each other.
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

// A tiny stateful fake standing in for the users table's favourite_space_id
// column, so setFavourite/clearFavourite/listWithFavourite can be exercised
// together the way they'd behave against a real DB.
function fakeFavouriteStore(initial = null) {
  let favouriteId = initial;
  return {
    get: () => favouriteId,
    getFavouriteSpaceId: async () => favouriteId,
    setFavouriteSpaceId: async (_userId, spaceId) => {
      favouriteId = spaceId;
    },
  };
}

test('listWithFavourite resolves the stored favourite when it is in the accessible space list', async (t) => {
  const restoreSpaces = stub(spaceRepository, {
    listForUser: async () => [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
  });
  const restoreUser = stub(userRepository, { getFavouriteSpaceId: async () => 2 });
  t.after(() => {
    restoreSpaces();
    restoreUser();
  });

  const result = await spaceService.listWithFavourite(42);
  assert.deepEqual(result, {
    spaces: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    favouriteId: 2,
    favouriteStale: false,
  });
});

test('listWithFavourite reports no favourite (not stale) when none is stored', async (t) => {
  const restoreSpaces = stub(spaceRepository, {
    listForUser: async () => [{ id: 1, name: 'A' }],
  });
  const restoreUser = stub(userRepository, { getFavouriteSpaceId: async () => null });
  t.after(() => {
    restoreSpaces();
    restoreUser();
  });

  const result = await spaceService.listWithFavourite(42);
  assert.equal(result.favouriteId, null);
  assert.equal(result.favouriteStale, false);
});

test('listWithFavourite resolves a stale favourite (space no longer accessible) to null + favouriteStale', async (t) => {
  const restoreSpaces = stub(spaceRepository, {
    // The user still has access to space 1, but their stored favourite (99)
    // isn't in this list -- e.g. access was revoked or the space is gone.
    listForUser: async () => [{ id: 1, name: 'A' }],
  });
  const restoreUser = stub(userRepository, { getFavouriteSpaceId: async () => 99 });
  t.after(() => {
    restoreSpaces();
    restoreUser();
  });

  const result = await spaceService.listWithFavourite(42);
  assert.deepEqual(result, {
    spaces: [{ id: 1, name: 'A' }],
    favouriteId: null,
    favouriteStale: true,
  });
});

test('setFavourite then setFavourite again on another space replaces it (single-favourite model)', async (t) => {
  const store = fakeFavouriteStore(null);
  const restoreUser = stub(userRepository, {
    getFavouriteSpaceId: store.getFavouriteSpaceId,
    setFavouriteSpaceId: store.setFavouriteSpaceId,
  });
  t.after(restoreUser);

  await spaceService.setFavourite(7, 1);
  assert.equal(store.get(), 1);

  await spaceService.setFavourite(7, 2);
  assert.equal(store.get(), 2, 'favouriting space 2 should replace space 1 as the favourite');
});

test('clearFavourite clears when the given space is the current favourite', async (t) => {
  const store = fakeFavouriteStore(5);
  const restoreUser = stub(userRepository, {
    getFavouriteSpaceId: store.getFavouriteSpaceId,
    setFavouriteSpaceId: store.setFavouriteSpaceId,
  });
  t.after(restoreUser);

  await spaceService.clearFavourite(7, 5);
  assert.equal(store.get(), null);
});

test('clearFavourite is a no-op when the given space is not the current favourite', async (t) => {
  const store = fakeFavouriteStore(5);
  const restoreUser = stub(userRepository, {
    getFavouriteSpaceId: store.getFavouriteSpaceId,
    setFavouriteSpaceId: store.setFavouriteSpaceId,
  });
  t.after(restoreUser);

  await spaceService.clearFavourite(7, 999);
  assert.equal(store.get(), 5, 'clearing a non-current favourite must not touch the stored one');
});

test('requireAccess throws notFound for an unknown space (backs the 403/404 the favourite routes rely on)', async (t) => {
  const restoreSpaces = stub(spaceRepository, {
    findById: async () => null,
    findMembership: async () => { throw new Error('should not be called when the space does not exist'); },
  });
  t.after(restoreSpaces);

  await assert.rejects(
    () => spaceService.requireAccess(123, 7),
    (err) => {
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test('requireAccess throws forbidden when the user has no membership in an existing space', async (t) => {
  const restoreSpaces = stub(spaceRepository, {
    findById: async () => ({ id: 123, name: 'Someone else\'s kitchen' }),
    findMembership: async () => null,
  });
  t.after(restoreSpaces);

  await assert.rejects(
    () => spaceService.requireAccess(123, 7),
    (err) => {
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test('requireAccess grants access to a plain member, not just the owner -- members can favourite a shared space', async (t) => {
  const restoreSpaces = stub(spaceRepository, {
    findById: async () => ({ id: 123, name: "Owner's kitchen" }),
    findMembership: async () => ({ space_id: 123, user_id: 7, role: 'member' }),
  });
  t.after(restoreSpaces);

  const { space, role } = await spaceService.requireAccess(123, 7);
  assert.equal(space.id, 123);
  assert.equal(role, 'member');
});
