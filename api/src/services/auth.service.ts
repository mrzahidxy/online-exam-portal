import { MembershipStatus, OrganizerRole, PlatformRole } from '@prisma/client';

import { LoginInput, RegisterInput } from '../schemas/auth.schema';
import { SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import { createAccessToken } from '../utils/jwt';

const sanitizeUser = <T extends { passwordHash?: string; platformRole: PlatformRole; memberships?: any[] }>(user: T): SanitizedUser => {
  const { passwordHash: _passwordHash, memberships, ...rest } = user;
  const membership = memberships?.[0];
  const organizer = membership?.organizer;
  return {
    ...(rest as unknown as SanitizedUser),
    schoolCode: (rest as Record<string, any>).schoolCode ?? null,
    organizerId: membership?.organizerId,
    activeOrganizerId: membership?.organizerId,
    activeOrganizer: organizer
      ? {
          id: organizer.id,
          name: organizer.name,
          slug: organizer.slug,
          status: organizer.status,
          subscriptionStatus: organizer.subscriptionStatus,
        }
      : undefined,
    membershipId: membership?.id,
    membership: membership
      ? {
          role: membership.role,
          status: membership.status,
        }
      : undefined,
    membershipRole: membership?.role,
    organizerRole: membership?.role,
    membershipStatus: membership?.status,
  };
};

const buildAuthResponse = (user: SanitizedUser) => {
  const { token, expiresAt } = createAccessToken({
    userId: user.id,
    platformRole: user.platformRole,
    organizerId: user.organizerId ?? user.activeOrganizerId,
    activeOrganizerId: user.activeOrganizerId ?? user.organizerId,
    membershipId: user.membershipId,
    membershipRole: user.membershipRole ?? user.organizerRole,
    organizerRole: user.organizerRole ?? user.membershipRole,
    membershipStatus: user.membershipStatus,
  });

  return {
    accessToken: token,
    accessTokenExpiresAt: expiresAt,
    user,
  };
};

const userWithMembershipInclude = {
  memberships: {
    orderBy: { createdAt: 'asc' as const },
    take: 1,
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          subscriptionStatus: true,
        },
      },
    },
  },
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

const resolveRegistrationOrganizer = async (input: RegisterInput) => {
  const slug = input.organizerSlug ?? input.schoolCode;
  if (!slug) {
    throw new HttpError(400, 'Organizer slug or school code is required');
  }

  const organizer = await prisma.organizer.findUnique({ where: { slug } });
  if (organizer) return organizer;

  if (input.schoolCode) {
    const userWithSchoolCode = await prisma.user.findFirst({
      where: { schoolCode: input.schoolCode },
      include: { memberships: { include: { organizer: true }, take: 1 } },
    });
    const fallbackOrganizer = userWithSchoolCode?.memberships[0]?.organizer;
    if (fallbackOrganizer) return fallbackOrganizer;
  }

  throw new HttpError(400, 'Organizer could not be resolved for registration');
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

    if (input.registrationType === 'ORGANIZER') {
      const slug = input.organizerSlug ?? slugify(input.organizerName!);
      if (!slug) {
        throw new HttpError(400, 'Organizer slug is required');
      }

      const existingOrganizer = await prisma.organizer.findUnique({ where: { slug } });
      if (existingOrganizer) {
        throw new HttpError(409, 'Organizer slug is already in use');
      }

      const user = await prisma.$transaction(async (tx) =>
        tx.user.create({
          data: {
            email: input.email,
            name: input.name,
            schoolCode: slug,
            passwordHash,
            platformRole: PlatformRole.USER,
            memberships: {
              create: {
                role: OrganizerRole.OWNER,
                status: MembershipStatus.ACTIVE,
                organizer: {
                  create: {
                    name: input.organizerName!,
                    slug,
                    status: 'ACTIVE',
                    subscriptionStatus: 'TRIAL',
                  },
                },
              },
            },
          },
          include: userWithMembershipInclude,
        })
      );

      return buildAuthResponse(sanitizeUser(user));
    }

    const organizer = await resolveRegistrationOrganizer(input);
    const user = await prisma.$transaction(async (tx) =>
      tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          schoolCode: input.schoolCode ?? organizer.slug,
          passwordHash,
          platformRole: PlatformRole.USER,
          memberships: {
            create: {
              organizerId: organizer.id,
              role: OrganizerRole.STUDENT,
              status: MembershipStatus.ACTIVE,
            },
          },
        },
        include: userWithMembershipInclude,
      })
    );

    return buildAuthResponse(sanitizeUser(user));
  },

  login: async (input: LoginInput) => {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: userWithMembershipInclude,
    });

    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const matches = await comparePassword(input.password, user.passwordHash);
    if (!matches) {
      throw new HttpError(401, 'Invalid credentials');
    }

    return buildAuthResponse(sanitizeUser(user));
  },

  refreshSession: async (_refreshToken: string | undefined) => {
    throw new HttpError(501, 'Refresh tokens are currently disabled');
  },

  logout: async (_refreshToken?: string) => {
    return;
  },

  getProfile: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        schoolCode: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          include: {
            organizer: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                subscriptionStatus: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    return sanitizeUser(user);
  },
};
