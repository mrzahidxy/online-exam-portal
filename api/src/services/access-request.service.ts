import { AccessStatus, OrganizerRole, PaperStatus, Prisma } from '@prisma/client';

import {
  CreateAccessRequestInput,
  ListAccessRequestQuery,
  UpdateAccessRequestInput,
} from '../schemas/access-request.schema';
import { AuthenticatedUser } from '../types/user';
import { prisma } from '../utils/prisma';
import { HttpError } from '../utils/http-error';

const requestInclude = {
  student: {
    select: { id: true, name: true, email: true, schoolCode: true },
  },
  paper: {
    select: { id: true, title: true, status: true, startDate: true, endDate: true },
  },
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const normalizePagination = (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit };
};

export const accessRequestService = {
  create: async (actor: AuthenticatedUser, input: CreateAccessRequestInput) => {
    const paper = await prisma.questionPaper.findFirst({
      where: { id: input.paperId, organizerId: actor.activeOrganizerId },
      select: { id: true, organizerId: true, status: true, startDate: true },
    });

    if (!paper || paper.status !== PaperStatus.PUBLISHED) {
      throw new HttpError(400, 'Paper is not available for access requests');
    }

    const existing = await prisma.accessRequest.findUnique({
      where: {
        studentId_paperId: {
          studentId: actor.id,
          paperId: input.paperId,
        },
      },
    });

    if (existing) {
      if (existing.status === AccessStatus.REJECTED) {
        return prisma.accessRequest.update({
          where: { id: existing.id },
          data: {
            status: AccessStatus.PENDING,
            decidedAt: null,
            decidedById: null,
          },
          include: requestInclude,
        });
      }

      throw new HttpError(409, 'You have already requested access for this paper');
    }

    return prisma.accessRequest.create({
      data: {
        organizerId: actor.activeOrganizerId!,
        studentId: actor.id,
        paperId: input.paperId,
      },
      include: requestInclude,
    });
  },

  list: async (actor: AuthenticatedUser, query?: ListAccessRequestQuery) => {
    const { page, limit } = normalizePagination(query?.page, query?.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.AccessRequestWhereInput =
      actor.organizerRole === OrganizerRole.OWNER
        ? {
            organizerId: actor.activeOrganizerId,
            ...(query?.status ? { status: query.status } : {}),
            ...(query?.paperId ? { paperId: query.paperId } : {}),
            ...(query?.studentId ? { studentId: query.studentId } : {}),
          }
        : {
            organizerId: actor.activeOrganizerId,
            studentId: actor.id,
            ...(query?.status ? { status: query.status } : {}),
            ...(query?.paperId ? { paperId: query.paperId } : {}),
          };

    const [requests, totalItems] = await prisma.$transaction([
      prisma.accessRequest.findMany({
        where,
        include: requestInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.accessRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  },

  updateStatus: async (actor: AuthenticatedUser, requestId: string, input: UpdateAccessRequestInput) => {
    if (actor.organizerRole !== OrganizerRole.OWNER) {
      throw new HttpError(403, 'Only owners can update access requests');
    }

    const request = await prisma.accessRequest.findFirst({
      where: { id: requestId, organizerId: actor.activeOrganizerId },
      include: requestInclude,
    });

    if (!request) {
      throw new HttpError(404, 'Access request not found');
    }

    return prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status: input.status,
        decidedById: actor.id,
        decidedAt: new Date(),
      },
      include: requestInclude,
    });
  },
};
