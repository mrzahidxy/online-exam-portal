import { UserRole } from '@prisma/client';

import { LoginInput, RegisterInput } from '../schemas/auth.schema';
import { SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import { createAccessToken } from '../utils/jwt';

const sanitizeUser = <T extends { passwordHash?: string; role: UserRole }>(user: T): SanitizedUser => {
  const { passwordHash: _passwordHash, role, ...rest } = user;
  return {
    ...(rest as unknown as SanitizedUser),
    role,
    roles: (rest as Record<string, any>).roles ?? [role],
    schoolCode: (rest as Record<string, any>).schoolCode ?? null,
  };
};

const buildAuthResponse = (user: SanitizedUser) => {
  const { token, expiresAt } = createAccessToken({
    userId: user.id,
    roles: user.roles ?? [user.role],
  });

  return {
    accessToken: token,
    accessTokenExpiresAt: expiresAt,
    user,
  };
};

export const authService = {
  register: async (input: RegisterInput) => {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new HttpError(409, 'A user with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        schoolCode: input.schoolCode ?? null,
        passwordHash,
        role: UserRole.STUDENT,
      },
    });

    const sanitized = sanitizeUser(user);

    return buildAuthResponse(sanitized);
  },

  login: async (input: LoginInput) => {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const matches = await comparePassword(input.password, user.passwordHash);
    if (!matches) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const sanitized = sanitizeUser(user);

    return buildAuthResponse(sanitized);
  },

  refreshSession: async (refreshToken: string | undefined) => {
    throw new HttpError(501, 'Refresh tokens are currently disabled');
  },

  logout: async (refreshToken?: string) => {
    return;
  },

  getProfile: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    return sanitizeUser(user);
  },
};
