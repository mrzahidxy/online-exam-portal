import { OrganizerRole, PlatformRole, Prisma } from '@prisma/client';

import { ListUsersQuery, UpdateUserInput } from '../schemas/user.schema';
import { AuthenticatedUser, SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

type PaginatedResponse<T> = {
  data: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
};

type UserListItem = SanitizedUser;
type UserDetail = UserListItem;

const sanitizeUser = <T extends { passwordHash?: string; platformRole: PlatformRole }>(user: T): SanitizedUser => {
  const { passwordHash: _passwordHash, ...rest } = user;
  return {
    ...(rest as unknown as SanitizedUser),
    schoolCode: (rest as Record<string, any>).schoolCode ?? null,
  };
};

const normalizePagination = (page: number, limit: number) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);
  return { page: safePage, limit: safeLimit };
};

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  platformRole: true,
  schoolCode: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const userService = {
  list: async (actor: AuthenticatedUser, query?: ListUsersQuery): Promise<PaginatedResponse<UserListItem>> => {
    if (actor.organizerRole !== OrganizerRole.OWNER || !actor.activeOrganizerId) {
      throw new HttpError(403, 'You do not have permission to list users');
    }

    try {
      const { page: currentPage, limit: currentLimit } = normalizePagination(query?.page ?? DEFAULT_PAGE, query?.limit ?? DEFAULT_LIMIT);
      const skip = (currentPage - 1) * currentLimit;

      const userWhere: Prisma.UserWhereInput = {
        memberships: {
          some: {
            organizerId: actor.activeOrganizerId,
            role: query?.role ?? OrganizerRole.STUDENT,
          },
        },
      };

      if (query?.search) {
        userWhere.OR = [
          { email: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
          { schoolCode: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [users, totalItems] = await prisma.$transaction([
        prisma.user.findMany({
          where: userWhere,
          select: USER_SELECT,
          skip,
          take: currentLimit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where: userWhere }),
      ]);

      return {
        data: users.map((user) => sanitizeUser(user)),
        meta: {
          page: currentPage,
          limit: currentLimit,
          totalItems,
          totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / currentLimit),
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to list users');
      throw error;
    }
  },

  getById: async (userId: string, actor: AuthenticatedUser): Promise<UserDetail> => {
    if (actor.id !== userId && actor.organizerRole !== OrganizerRole.OWNER) {
      throw new HttpError(403, 'You do not have permission to view this user');
    }

    const user = await prisma.user.findFirst({
      where: actor.id === userId ? { id: userId } : {
        id: userId,
        memberships: { some: { organizerId: actor.activeOrganizerId, role: OrganizerRole.STUDENT } },
      },
      select: USER_SELECT,
    });

    if (!user) throw new HttpError(404, 'User not found');
    return sanitizeUser(user);
  },

  update: async (userId: string, input: UpdateUserInput, actor: AuthenticatedUser): Promise<UserDetail> => {
    if (actor.id !== userId) {
      throw new HttpError(403, 'You do not have permission to update this user');
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new HttpError(404, 'User not found');

    if (input.email && input.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: input.email } });
      if (duplicate) throw new HttpError(409, 'A user with this email already exists');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email ?? existing.email,
        name: input.name === undefined ? existing.name : input.name,
        schoolCode: input.schoolCode === undefined ? existing.schoolCode : input.schoolCode ?? null,
      },
      select: USER_SELECT,
    });

    return sanitizeUser(updated);
  },

  remove: async (_userId: string, _actor: AuthenticatedUser): Promise<void> => {
    throw new HttpError(403, 'Deleting users is not available');
  },
};
