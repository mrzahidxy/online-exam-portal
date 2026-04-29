import { UserRole } from '@prisma/client';
import { NextFunction, Response } from 'express';

import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { env } from '../utils/env';
import type { AuthenticatedRequest } from '../types/http';
import type { SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';

type GuardOptions = UserRole[] | { roles?: UserRole[] };

const normalizeUser = (user: SanitizedUser): SanitizedUser => ({
  ...user,
  roles: user.roles ?? [user.role],
  schoolCode: user.schoolCode ?? null,
});

const normalizeOptions = (allowed?: GuardOptions): { roles?: UserRole[] } => {
  if (!allowed) return {};
  if (Array.isArray(allowed)) {
    return { roles: allowed };
  }
  return allowed;
};

export const requireAuth =
  (allowed?: GuardOptions) => async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      // Try to get token from cookie first, then fallback to Authorization header
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
      const guard = normalizeOptions(allowed);

      const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          schoolCode: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!dbUser) {
        throw new HttpError(401, 'User could not be found');
      }

      const effectiveRoles = (payload.roles ?? []).length > 0 ? payload.roles : [dbUser.role];

      const userWithRoles = normalizeUser({
        ...(dbUser as SanitizedUser),
        roles: effectiveRoles,
      });

      const hasRole =
        !guard.roles ||
        guard.roles.some((role) => effectiveRoles.includes(role) || userWithRoles.roles.includes(role));

      if (!hasRole) {
        throw new HttpError(403, 'You do not have permission to access this resource');
      }

      req.user = userWithRoles;
      req.auth = { ...payload, roles: effectiveRoles };
      next();
    } catch (error) {
      next(error);
    }
  };
