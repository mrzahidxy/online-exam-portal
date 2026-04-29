import { Prisma, UserRole } from '@prisma/client';

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
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

type UserListItem = SanitizedUser;

type UserDetail = UserListItem;

const sanitizeUser = <T extends { passwordHash?: string; role: UserRole }>(user: T): SanitizedUser => {
  const { passwordHash: _passwordHash, role, ...rest } = user;

  return {
    ...(rest as unknown as SanitizedUser),
    role,
    roles: (rest as Record<string, any>).roles ?? [role],
    schoolCode: (rest as Record<string, any>).schoolCode ?? null,
  };
};

const normalizePagination = (page: number, limit: number) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit };
};

const normalizeQuery = (
  query: ListUsersQuery | undefined
): {
  where: Prisma.UserWhereInput;
  page?: number;
  limit?: number;
} => {
  const where: Prisma.UserWhereInput = {};

  if (query?.role) {
    where.role = query.role;
  }

  if (query?.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
      { schoolCode: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return {
    where,
    page: query?.page,
    limit: query?.limit,
  };
};

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  schoolCode: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const userService = {
  list: async (
    actor: AuthenticatedUser,
    query?: ListUsersQuery
  ): Promise<PaginatedResponse<UserListItem>> => {
    if (actor.role !== UserRole.ADMIN) {
      throw new HttpError(403, 'You do not have permission to list users');
    }

    try {
      const { where, page, limit } = normalizeQuery(query);
      const { page: currentPage, limit: currentLimit } = normalizePagination(
        page ?? DEFAULT_PAGE,
        limit ?? DEFAULT_LIMIT
      );

      const skip = (currentPage - 1) * currentLimit;

      const [users, totalItems] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          select: USER_SELECT,
          skip,
          take: currentLimit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / currentLimit);

      const sanitizedUsers = users.map((user) => sanitizeUser(user));

      return {
        data: sanitizedUsers,
        meta: {
          page: currentPage,
          limit: currentLimit,
          totalItems,
          totalPages,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to list users');
      throw error;
    }
  },

  getById: async (userId: string, actor: AuthenticatedUser): Promise<UserDetail> => {
    if (actor.role !== UserRole.ADMIN && actor.id !== userId) {
      throw new HttpError(403, 'You do not have permission to view this user');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    return sanitizeUser(user);
  },

  update: async (
    userId: string,
    input: UpdateUserInput,
    actor: AuthenticatedUser
  ): Promise<UserDetail> => {
    if (actor.role !== UserRole.ADMIN && actor.id !== userId) {
      throw new HttpError(403, 'You do not have permission to update this user');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new HttpError(404, 'User not found');
    }

    if (input.email && input.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: input.email } });
      if (duplicate) {
        throw new HttpError(409, 'A user with this email already exists');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email ?? existing.email,
        name: input.name === undefined ? existing.name : input.name,
        schoolCode:
          input.schoolCode === undefined ? existing.schoolCode : input.schoolCode ?? null,
      },
      select: USER_SELECT,
    });

    return sanitizeUser(updated);
  },

  remove: async (userId: string, actor: AuthenticatedUser): Promise<void> => {
    if (actor.role !== UserRole.ADMIN) {
      throw new HttpError(403, 'You do not have permission to delete users');
    }

    if (actor.id === userId) {
      throw new HttpError(400, 'You cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new HttpError(404, 'User not found');
    }

    await prisma.user.delete({
      where: { id: userId },
    });
  },
};
