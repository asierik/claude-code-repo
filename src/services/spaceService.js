import { spaceRepository } from '../repositories/spaceRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { badRequest, forbidden, notFound } from '../util/errors.js';

export const spaceService = {
  async createForOwner(name, ownerId) {
    const id = await spaceRepository.create({ name, ownerId, createdAt: Date.now() });
    await spaceRepository.addMember(id, ownerId, 'owner');
    return await spaceRepository.findById(id);
  },

  async listForUser(userId) {
    return await spaceRepository.listForUser(userId);
  },

  // Spaces plus which one (if any) is the user's favourite. A stored
  // favourite that's no longer in the user's accessible list (space
  // deleted, access revoked) resolves to null rather than being trusted —
  // favouriteStale tells the caller that happened, so it can say so.
  async listWithFavourite(userId) {
    const spaces = await spaceRepository.listForUser(userId);
    const rawFavouriteId = await userRepository.getFavouriteSpaceId(userId);
    const favouriteId = spaces.some((s) => s.id === rawFavouriteId) ? rawFavouriteId : null;
    const favouriteStale = rawFavouriteId != null && favouriteId == null;
    return { spaces, favouriteId, favouriteStale };
  },

  // Caller must have already verified the user has access to spaceId.
  async setFavourite(userId, spaceId) {
    await userRepository.setFavouriteSpaceId(userId, spaceId);
  },

  async clearFavourite(userId, spaceId) {
    const current = await userRepository.getFavouriteSpaceId(userId);
    if (current === spaceId) await userRepository.setFavouriteSpaceId(userId, null);
  },

  // Used by access-control middleware: returns { space, role } or throws.
  async requireAccess(spaceId, userId) {
    const space = await spaceRepository.findById(spaceId);
    if (!space) throw notFound('Space not found');
    const membership = await spaceRepository.findMembership(spaceId, userId);
    if (!membership) throw forbidden('You do not have access to this space');
    return { space, role: membership.role };
  },

  async listMembers(spaceId) {
    return await spaceRepository.listMembers(spaceId);
  },

  // Owner-only: grant another user collaborator access by username.
  async share(spaceId, actingRole, rawUsername, actingUserId) {
    if (actingRole !== 'owner') throw forbidden('Only the owner can share this space');
    const username = String(rawUsername || '').trim().toLowerCase();
    if (!username) throw badRequest('Username required');
    const target = await userRepository.findByUsername(username);
    if (!target) throw notFound(`No user named "${username}"`);
    if (target.id === actingUserId) throw badRequest('That space is already yours');
    await spaceRepository.addMember(spaceId, target.id, 'member');
    return { shared_with: target.username };
  },
};
