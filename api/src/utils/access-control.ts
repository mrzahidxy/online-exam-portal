import { OrganizerRole } from '@prisma/client';

import type { AuthenticatedRequest } from '../types/http';
import type { AuthenticatedUser } from '../types/user';
import { HttpError } from './http-error';

export const requireAuthenticatedUser = (req: AuthenticatedRequest) => {
  if (!req.user) throw new HttpError(401, 'Unauthorized');
  return req.user;
};

export const getActorOrganizerId = (actor: Pick<AuthenticatedUser, 'activeOrganizerId' | 'organizerId'>) => {
  const organizerId = actor.activeOrganizerId ?? actor.organizerId;
  if (!organizerId) throw new HttpError(403, 'Organizer membership required');
  return organizerId;
};

export const getRequestOrganizerId = (req: AuthenticatedRequest) => getActorOrganizerId(requireAuthenticatedUser(req));

export const assertOrganizerRole = (actor: Pick<AuthenticatedUser, 'organizerRole'>, role: OrganizerRole, message: string) => {
  if (actor.organizerRole !== role) throw new HttpError(403, message);
};

export const assertOwner = (actor: Pick<AuthenticatedUser, 'organizerRole'>, message = 'Only owners can perform this action') => {
  assertOrganizerRole(actor, OrganizerRole.OWNER, message);
};

export const assertStudent = (actor: Pick<AuthenticatedUser, 'organizerRole'>, message = 'Only students can perform this action') => {
  assertOrganizerRole(actor, OrganizerRole.STUDENT, message);
};

export const getOwnerRequestOrganizerId = (req: AuthenticatedRequest, message = 'Only owners can perform this action') => {
  const user = requireAuthenticatedUser(req);
  assertOwner(user, message);
  return getActorOrganizerId(user);
};
