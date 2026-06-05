import { spaceRepository } from '../repositories/spaceRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { badRequest, forbidden, notFound } from '../util/errors.js';

export const spaceService = {
  createForOwner(name, ownerId) {
    const id = spaceRepository.create({ name, ownerId, createdAt: Date.now() });
    spaceRepository.addMember(id, ownerId, 'owner');
    return spaceRepository.findById(id);
  },

  listForUser(userId) {
    return spaceRepository.listForUser(userId);
  },

  // Used by access-control middleware: returns { space, role } or throws.
  requireAccess(spaceId, userId) {
    const space = spaceRepository.findById(spaceId);
    if (!space) throw notFound('Space not found');
    const membership = spaceRepository.findMembership(spaceId, userId);
    if (!membership) throw forbidden('You do not have access to this space');
    return { space, role: membership.role };
  },

  listMembers(spaceId) {
    return spaceRepository.listMembers(spaceId);
  },

  // Owner-only: grant another user collaborator access by username.
  share(spaceId, actingRole, rawUsername, actingUserId) {
    if (actingRole !== 'owner') throw forbidden('Only the owner can share this space');
    const username = String(rawUsername || '').trim().toLowerCase();
    if (!username) throw badRequest('Username required');
    const target = userRepository.findByUsername(username);
    if (!target) throw notFound(`No user named "${username}"`);
    if (target.id === actingUserId) throw badRequest('That space is already yours');
    spaceRepository.addMember(spaceId, target.id, 'member');
    return { shared_with: target.username };
  },
};
