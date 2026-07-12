import {
  MockPaperStatus,
  MockSubmissionStatus,
  OrganizerRole,
  Prisma,
  QuestionType,
} from '@prisma/client';

import type {
  GenerateMockPaperInput,
  GradeMockSubmissionInput,
  ListMockSubmissionsQuery,
  SubmitMockPaperInput,
} from '../schemas/mock-paper.schema';
import type { AuthenticatedUser } from '../types/user';
import { assertOwner, assertStudent, getActorOrganizerId } from '../utils/access-control';
import { env } from '../utils/env';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { subscriptionService } from './subscription.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const questionForMockInclude = {
  subQuestions: { orderBy: { position: 'asc' as const } },
} as const;

const latestMockSubmissionSelect = {
  select: { id: true, status: true, submittedAt: true, reviewedAt: true },
  orderBy: { submittedAt: 'desc' as const },
  take: 1,
} as const;

const mockPaperQuestionInclude = {
  items: {
    orderBy: { position: 'asc' as const },
    include: { question: { include: questionForMockInclude } },
  },
} as const;

const mockPaperDetailInclude = {
  ...mockPaperQuestionInclude,
  submissions: latestMockSubmissionSelect,
} as const;

const mockSubmissionListInclude = {
  student: { select: { id: true, name: true, email: true, schoolCode: true } },
  mockPaper: { select: { id: true, title: true, status: true } },
} as const;

const mockSubmissionDetailInclude = {
  student: { select: { id: true, name: true, email: true, schoolCode: true } },
  answers: { select: { id: true, subQuestionId: true, answerText: true } },
  grades: { select: { id: true, subQuestionId: true, assignedMarks: true, comment: true, gradedById: true } },
  mockPaper: { include: mockPaperQuestionInclude },
} as const;

type PaginatedResponse<T> = {
  data: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
};

const normalizePagination = (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Math.floor(Number(page)) : DEFAULT_PAGE;
  const requestedLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : DEFAULT_LIMIT;
  return { page: safePage, limit: Math.min(requestedLimit, MAX_LIMIT) };
};

const assertMockPaperStudent = (actor: AuthenticatedUser) => assertStudent(actor, 'Only students can use mock papers');
const assertMockSubmissionOwner = (actor: AuthenticatedUser) => assertOwner(actor, 'Only owners can manage mock submissions');

const assertNoDuplicateIds = (ids: string[], message: string) => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new HttpError(400, message);
    seen.add(id);
  }
};

const shuffle = <T>(items: T[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const generateMockPaperTitle = () => {
  const datePart = new Date().toISOString().slice(0, 10);
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Mock Paper ${datePart}-${randomPart}`;
};

const mapDuplicateSubmission = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new HttpError(409, 'Mock paper has already been submitted');
  }
  throw error;
};

const getMockSubmissionForActor = async (actor: AuthenticatedUser, submissionId: string) => {
  const orgId = getActorOrganizerId(actor);
  const submission = await prisma.mockSubmission.findFirst({
    where: {
      id: submissionId,
      organizerId: orgId,
      ...(actor.organizerRole === OrganizerRole.STUDENT ? { studentId: actor.id } : {}),
    },
    include: mockSubmissionDetailInclude,
  });

  if (!submission) throw new HttpError(404, 'Mock submission not found');
  return submission;
};

const collectSubQuestionsForMockPaper = (
  mockPaper: Prisma.MockPaperGetPayload<{ include: typeof mockPaperQuestionInclude }>
) => {
  const subQuestionById = new Map<string, { id: string; marks: number; questionType: QuestionType }>();

  for (const item of mockPaper.items) {
    for (const subQuestion of item.question.subQuestions) {
      subQuestionById.set(subQuestion.id, {
        id: subQuestion.id,
        marks: subQuestion.marks,
        questionType: subQuestion.questionType,
      });
    }
  }

  return subQuestionById;
};

export const mockPaperService = {
  generate: async (actor: AuthenticatedUser, input: GenerateMockPaperInput) => {
    assertMockPaperStudent(actor);
    const orgId = getActorOrganizerId(actor);
    assertNoDuplicateIds(input.categoryIds, 'Duplicate categories are not allowed');

    await subscriptionService.assertStudentMockPaperQuota({ organizerId: orgId, studentId: actor.id });

    const categories = await prisma.questionCategory.findMany({
      where: { organizerId: orgId, id: { in: input.categoryIds }, isActive: true },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            question: {
              include: questionForMockInclude,
            },
          },
        },
      },
    });

    if (categories.length !== input.categoryIds.length) {
      throw new HttpError(404, 'One or more question categories were not found');
    }

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const seenQuestionIds = new Set<string>();
    const questions = input.categoryIds.flatMap((categoryId) => {
      const category = categoryById.get(categoryId);
      if (!category) return [];
      return category.items
        .filter((item) => {
          if (seenQuestionIds.has(item.questionId) || item.question.subQuestions.length === 0) return false;
          seenQuestionIds.add(item.questionId);
          return true;
        })
        .map((item) => item.question);
    });

    if (questions.length < env.MOCK_PAPER_QUESTION_COUNT) {
      throw new HttpError(
        400,
        `Only ${questions.length} eligible unique questions are available in the selected categories. At least ${env.MOCK_PAPER_QUESTION_COUNT} are required.`
      );
    }

    const selectedQuestions = shuffle(questions).slice(0, env.MOCK_PAPER_QUESTION_COUNT);

    const created = await prisma.$transaction(async (tx) => {
      const existingGenerated = await tx.mockPaper.findFirst({
        where: { organizerId: orgId, studentId: actor.id, status: MockPaperStatus.GENERATED },
        select: { id: true },
      });
      if (existingGenerated) {
        throw new HttpError(409, 'You already have an unattempted generated mock paper');
      }

      await subscriptionService.incrementStudentMockPaperUsageOrThrow(tx, orgId, actor.id);

      const mockPaper = await tx.mockPaper.create({
        data: {
          organizerId: orgId,
          studentId: actor.id,
          title: input.title?.trim() || generateMockPaperTitle(),
        },
      });

      await tx.mockPaperItem.createMany({
        data: selectedQuestions.map((question, index) => ({
          organizerId: orgId,
          mockPaperId: mockPaper.id,
          questionId: question.id,
          position: index + 1,
        })),
      });

      return mockPaper;
    }).catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'You already have an unattempted generated mock paper');
      }
      throw error;
    });

    return prisma.mockPaper.findFirstOrThrow({
      where: { id: created.id, organizerId: orgId },
      include: mockPaperDetailInclude,
    });
  },

  listOwn: async (actor: AuthenticatedUser) => {
    assertMockPaperStudent(actor);
    const orgId = getActorOrganizerId(actor);
    return prisma.mockPaper.findMany({
      where: { organizerId: orgId, studentId: actor.id },
      include: { _count: { select: { items: true, submissions: true } }, submissions: latestMockSubmissionSelect },
      orderBy: { createdAt: 'desc' },
    });
  },

  getById: async (actor: AuthenticatedUser, mockPaperId: string) => {
    const orgId = getActorOrganizerId(actor);
    const mockPaper = await prisma.mockPaper.findFirst({
      where: {
        id: mockPaperId,
        organizerId: orgId,
        ...(actor.organizerRole === OrganizerRole.STUDENT ? { studentId: actor.id } : {}),
      },
      include: mockPaperDetailInclude,
    });
    if (!mockPaper) throw new HttpError(404, 'Mock paper not found');
    return mockPaper;
  },

  submit: async (actor: AuthenticatedUser, mockPaperId: string, input: SubmitMockPaperInput) => {
    assertMockPaperStudent(actor);
    const orgId = getActorOrganizerId(actor);
    await subscriptionService.assertStudentMockPaperAccess({ organizerId: orgId, studentId: actor.id });

    const mockPaper = await prisma.mockPaper.findFirst({
      where: { id: mockPaperId, organizerId: orgId, studentId: actor.id },
      include: mockPaperDetailInclude,
    });
    if (!mockPaper) throw new HttpError(404, 'Mock paper not found');
    if (mockPaper.status === MockPaperStatus.ARCHIVED) throw new HttpError(400, 'Archived mock papers cannot be submitted');
    if (mockPaper.status === MockPaperStatus.ATTEMPTED) throw new HttpError(409, 'Mock paper has already been submitted');

    const existingSubmission = await prisma.mockSubmission.findFirst({
      where: { organizerId: orgId, studentId: actor.id, mockPaperId },
      select: { id: true },
    });
    if (existingSubmission) throw new HttpError(409, 'Mock paper has already been submitted');

    const subQuestionById = collectSubQuestionsForMockPaper(mockPaper);
    const seenSubQuestionIds = new Set<string>();

    for (const answer of input.answers) {
      if (seenSubQuestionIds.has(answer.subQuestionId)) throw new HttpError(400, 'Duplicate sub-question answers are not allowed');
      seenSubQuestionIds.add(answer.subQuestionId);
      const subQuestion = subQuestionById.get(answer.subQuestionId);
      if (!subQuestion) throw new HttpError(400, 'One or more answers reference invalid sub-questions');
    }

    try {
      const submission = await prisma.$transaction(async (tx) => {
        const created = await tx.mockSubmission.create({ data: { organizerId: orgId, mockPaperId, studentId: actor.id } });
        if (input.answers.length > 0) {
          await tx.mockAnswer.createMany({
            data: input.answers.map((answer) => ({
              organizerId: orgId,
              mockSubmissionId: created.id,
              subQuestionId: answer.subQuestionId,
              answerText: answer.answerText,
            })),
          });
        }
        await tx.mockPaper.update({ where: { id: mockPaperId }, data: { status: MockPaperStatus.ATTEMPTED } });
        return created;
      });

      return prisma.mockSubmission.findFirstOrThrow({
        where: { id: submission.id, organizerId: orgId },
        include: mockSubmissionListInclude,
      });
    } catch (error) {
      return mapDuplicateSubmission(error);
    }
  },

  archiveOwn: async (actor: AuthenticatedUser, mockPaperId: string) => {
    assertMockPaperStudent(actor);
    const orgId = getActorOrganizerId(actor);
    const mockPaper = await prisma.mockPaper.findFirst({
      where: { id: mockPaperId, organizerId: orgId, studentId: actor.id },
      select: { id: true, status: true },
    });
    if (!mockPaper) throw new HttpError(404, 'Mock paper not found');
    if (mockPaper.status !== MockPaperStatus.GENERATED) {
      throw new HttpError(400, 'Only unattempted generated mock papers can be archived');
    }

    return prisma.mockPaper.update({
      where: { id: mockPaper.id },
      data: { status: MockPaperStatus.ARCHIVED },
      include: mockPaperDetailInclude,
    });
  },

  listSubmissions: async (actor: AuthenticatedUser, query?: ListMockSubmissionsQuery): Promise<PaginatedResponse<Prisma.MockSubmissionGetPayload<{ include: typeof mockSubmissionListInclude }>>> => {
    assertMockSubmissionOwner(actor);
    const orgId = getActorOrganizerId(actor);
    const { page, limit } = normalizePagination(query?.page, query?.limit);
    const skip = (page - 1) * limit;
    const where: Prisma.MockSubmissionWhereInput = {
      organizerId: orgId,
      studentId: query?.studentId,
      mockPaperId: query?.mockPaperId,
      status: query?.status,
    };

    const [submissions, totalItems] = await prisma.$transaction([
      prisma.mockSubmission.findMany({ where, include: mockSubmissionListInclude, skip, take: limit, orderBy: { submittedAt: 'desc' } }),
      prisma.mockSubmission.count({ where }),
    ]);

    return { data: submissions, meta: { page, limit, totalItems, totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit) } };
  },

  getSubmissionById: async (actor: AuthenticatedUser, submissionId: string) => getMockSubmissionForActor(actor, submissionId),

  gradeSubmission: async (actor: AuthenticatedUser, submissionId: string, input: GradeMockSubmissionInput) => {
    assertMockSubmissionOwner(actor);
    const orgId = getActorOrganizerId(actor);
    assertNoDuplicateIds(input.grades.map((grade) => grade.subQuestionId), 'Duplicate sub-question grades are not allowed');

    const submission = await prisma.mockSubmission.findFirst({
      where: { id: submissionId, organizerId: orgId },
      include: { mockPaper: { include: mockPaperQuestionInclude } },
    });
    if (!submission) throw new HttpError(404, 'Mock submission not found');

    const subQuestionById = collectSubQuestionsForMockPaper(submission.mockPaper);
    for (const grade of input.grades) {
      const subQuestion = subQuestionById.get(grade.subQuestionId);
      if (!subQuestion) throw new HttpError(400, 'Invalid sub-question for grading');
      if (grade.assignedMarks > subQuestion.marks) throw new HttpError(400, 'Assigned marks exceed the maximum for a sub-question');
    }

    await prisma.$transaction([
      ...input.grades.map((grade) =>
        prisma.mockGrade.upsert({
          where: { mockSubmissionId_subQuestionId: { mockSubmissionId: submissionId, subQuestionId: grade.subQuestionId } },
          update: { assignedMarks: grade.assignedMarks, comment: grade.comment ?? null, gradedById: actor.id },
          create: { organizerId: orgId, mockSubmissionId: submissionId, subQuestionId: grade.subQuestionId, assignedMarks: grade.assignedMarks, comment: grade.comment ?? null, gradedById: actor.id },
        })
      ),
      prisma.mockSubmission.update({ where: { id: submissionId }, data: { status: MockSubmissionStatus.REVIEWED, reviewedAt: new Date() } }),
    ]);

    return prisma.mockSubmission.findFirstOrThrow({ where: { id: submissionId, organizerId: orgId }, include: mockSubmissionListInclude });
  },

  getFeedback: async (actor: AuthenticatedUser, submissionId: string) => {
    assertMockPaperStudent(actor);
    const submission = await getMockSubmissionForActor(actor, submissionId);
    if (submission.status !== MockSubmissionStatus.REVIEWED) throw new HttpError(400, 'Mock submission has not been reviewed yet');
    return submission;
  },
};
