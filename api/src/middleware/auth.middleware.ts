import { MembershipStatus, OrganizerRole, OrganizerStatus, PlatformRole } from '@prisma/client';
import { NextFunction, Response } from 'express';

import { assertActiveSubscription } from '../services/subscription-rules';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { env } from '../utils/env';
import type { AuthenticatedRequest } from '../types/http';
import { HttpError } from '../utils/http-error';

export const requireAuth = () => async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    const cookieToken = req.cookies?.[env.ACCESS_TOKEN_COOKIE_NAME];
    if (cookieToken) {
      token = cookieToken;
    } else {
      const header = req.headers.authorization;
      if (header?.startsWith('Bearer ')) {
        token = header.replace('Bearer ', '').trim();
      }
    }

    if (!token) {
      throw new HttpError(401, 'Authentication token missing');
    }

    const payload = verifyAccessToken(token);
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        schoolCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      throw new HttpError(401, 'User could not be found');
    }

    req.auth = payload;
    req.user = {
      ...dbUser,
      schoolCode: dbUser.schoolCode ?? null,
      organizerId: payload.organizerId ?? payload.activeOrganizerId,
      activeOrganizerId: payload.activeOrganizerId ?? payload.organizerId,
      membershipId: payload.membershipId,
      membershipRole: payload.membershipRole ?? payload.organizerRole,
      organizerRole: payload.organizerRole ?? payload.membershipRole,
      membershipStatus: payload.membershipStatus,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireOrganizerMembership = () => async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.auth) {
      throw new HttpError(401, 'Unauthorized');
    }

    if (req.user.platformRole === PlatformRole.ADMIN) {
      throw new HttpError(403, 'Platform admins do not have organizer assessment access');
    }

    const organizerId = req.auth.organizerId ?? req.auth.activeOrganizerId;
    if (!organizerId || !req.auth.membershipId) {
      throw new HttpError(403, 'Organizer membership required');
    }

    const membership = await prisma.organizerMembership.findFirst({
      where: {
        id: req.auth.membershipId,
        userId: req.user.id,
        organizerId,
      },
      include: { organizer: true },
    });

    if (!membership) {
      throw new HttpError(403, 'Organizer membership required');
    }

    req.organizer = {
      organizerId: membership.organizerId,
      membershipId: membership.id,
      organizerRole: membership.role,
      membershipStatus: membership.status,
      organizerStatus: membership.organizer.status,
      subscriptionStatus: membership.organizer.subscriptionStatus,
    };

    req.user.organizerId = membership.organizerId;
    req.user.activeOrganizerId = membership.organizerId;
    req.user.membershipId = membership.id;
    req.user.membershipRole = membership.role;
    req.user.organizerRole = membership.role;
    req.user.membershipStatus = membership.status;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireOrganizerRole = (role: OrganizerRole) => (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  if (!req.organizer) return next(new HttpError(403, 'Organizer membership required'));
  if (req.organizer.organizerRole !== role) {
    return next(new HttpError(403, 'Insufficient organizer permissions'));
  }
  next();
};

export const requireOwner = () => requireOrganizerRole(OrganizerRole.OWNER);
export const requireStudent = () => requireOrganizerRole(OrganizerRole.STUDENT);

export const requireActiveOrganizer = () => async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.organizer) throw new HttpError(403, 'Organizer membership required');
    if (req.organizer.membershipStatus !== MembershipStatus.ACTIVE) {
      throw new HttpError(403, 'Organizer membership is suspended');
    }
    if (req.organizer.organizerStatus !== OrganizerStatus.ACTIVE) {
      throw new HttpError(403, 'Organizer is suspended');
    }
    const subscription = await prisma.subscription.findUnique({
      where: { organizerId: req.organizer.organizerId },
      select: { status: true, currentPeriodEnd: true },
    });
    assertActiveSubscription(subscription, 'Organizer subscription does not permit access');
    next();
  } catch (error) {
    next(error);
  }
};
