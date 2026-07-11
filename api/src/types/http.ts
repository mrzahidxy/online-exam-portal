import { Request } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import { MembershipStatus, OrganizerRole, OrganizerStatus, SubscriptionStatus } from '@prisma/client';
import type { DecodedAccessToken } from '../utils/jwt';
import type { AuthenticatedUser } from './user';

export type OrganizerContext = {
  organizerId: string;
  membershipId: string;
  organizerRole: OrganizerRole;
  membershipStatus: MembershipStatus;
  organizerStatus: OrganizerStatus;
  subscriptionStatus: SubscriptionStatus;
};

export interface AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  user?: AuthenticatedUser;
  auth?: DecodedAccessToken;
  organizer?: OrganizerContext;
}
