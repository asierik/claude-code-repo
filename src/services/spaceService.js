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
