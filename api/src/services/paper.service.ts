import { AccessStatus, PaperStatus, Prisma, UserRole } from '@prisma/client';

import {
  CreatePaperInput,
  ListPapersQuery,
  UpdatePaperInput,
  CreateQuestionsInput,
  CreateQuestionInput,
  UpdateQuestionsInput,
  UpdateSubQuestionInput,
} from '../schemas/paper.schema';
import { AuthenticatedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const paperListSelect = {
  id: true,
  title: true,
  description: true,
  durationMinutes: true,
  startDate: true,
  endDate: true,
  earlySubmissionRestrictionMinutes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { questions: true, submissions: true },
  },
} as const;

const paperDetailInclude = {
  questions: {
    orderBy: { position: 'asc' },
    include: {
      subQuestions: {
        orderBy: { position: 'asc' },
      },
    },
  },
} as const;

type PaperListItem = Prisma.QuestionPaperGetPayload<{
  select: typeof paperListSelect;
}> & {
  accessStatus?: AccessStatus | null;
  hasSubmitted?: boolean;
};

type PaperDetailResponse = Prisma.QuestionPaperGetPayload<{
  include: typeof paperDetailInclude;
}> & {
  accessStatus?: AccessStatus | null;
  hasSubmitted?: boolean;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

const normalizePagination = (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  // Handle cases where page/limit arrive as strings from query parsing.
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? Math.floor(pageNumber) : DEFAULT_PAGE;
  const requestedLimit =
    Number.isFinite(limitNumber) && limitNumber > 0 ? Math.floor(limitNumber) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit };
};

const validateDates = (start: Date, end: Date) => {
  if (end.getTime() <= start.getTime()) {
    throw new HttpError(400, 'End date must be after the start date');
  }
};

const buildQuestionData = (questions?: CreateQuestionInput[]) => {
  if (!questions || questions.length === 0) {
    return undefined;
  }

  return {
    create: questions.map((question) => ({
      contentHtml: question.contentHtml,
      marks: question.marks,
      position: question.position,
      subQuestions: {
        create: question.subQuestions.map((sub) => ({
          label: sub.label,
          question: sub.question,
          marks: sub.marks,
          position: sub.position,
          questionType: (sub.questionType ?? 'DESCRIPTIVE') as any,
          mcqOptions: sub.mcqOptions ?? undefined,
        })),
      },
    })),
  };
};

const listWhere = (
  actor: AuthenticatedUser,
  query?: ListPapersQuery
): Prisma.QuestionPaperWhereInput => {
  const where: Prisma.QuestionPaperWhereInput = {};

  if (query?.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query?.status) {
    where.status = query.status;
  }

  if (query?.startDateFrom || query?.startDateTo) {
    where.startDate = {};
    if (query.startDateFrom) {
      where.startDate.gte = query.startDateFrom;
    }
    if (query.startDateTo) {
      where.startDate.lte = query.startDateTo;
    }
  }

  if (actor.role === UserRole.STUDENT) {
    where.status = PaperStatus.PUBLISHED;
    // Students can see all published papers, not just ones they have access to
    // Access control is handled at the individual paper level and in the UI
  }

  return where;
};

const assertNoSubmissions = async (paperId: string) => {
  const submission = await prisma.submission.findFirst({
    where: { paperId },
    select: { id: true },
  });

  if (submission) {
    throw new HttpError(400, 'Cannot modify questions after submissions exist');
  }
};

type QuestionWithSubQuestions = Prisma.QuestionGetPayload<{
  include: { subQuestions: true };
}>;

const upsertSubQuestions = async (
  tx: Prisma.TransactionClient,
  question: QuestionWithSubQuestions,
  subQuestionInputs: UpdateSubQuestionInput[]
) => {
  const subQuestionById = new Map(
    question.subQuestions.map((sub) => [sub.id, sub])
  );
  const subQuestionByPositionLabel = new Map(
    question.subQuestions.map((sub) => [`${sub.position}::${sub.label}`, sub])
  );
  const seenTargets = new Set<string>();
  const occupiedPositionLabels = new Set(
    question.subQuestions.map((sub) => `${sub.position}::${sub.label}`)
  );

  for (const subInput of subQuestionInputs) {
    const target =
      (subInput.id ? subQuestionById.get(subInput.id) : undefined) ??
      (subInput.position && subInput.label
        ? subQuestionByPositionLabel.get(
            `${subInput.position}::${subInput.label}`
          )
        : undefined);

    if (target) {
      if (seenTargets.has(target.id)) {
        throw new HttpError(
          400,
          'Duplicate sub-question updates found in request'
        );
      }
      seenTargets.add(target.id);

      const updatedLabel = subInput.label ?? target.label;
      const updatedPosition = subInput.position ?? target.position;
      const oldKey = `${target.position}::${target.label}`;
      const newKey = `${updatedPosition}::${updatedLabel}`;

      if (newKey !== oldKey && occupiedPositionLabels.has(newKey)) {
        throw new HttpError(
          400,
          'Another sub-question already uses this position and label'
        );
      }

      occupiedPositionLabels.delete(oldKey);
      occupiedPositionLabels.add(newKey);

      const data: Prisma.SubQuestionUpdateInput = {};

      if (subInput.label !== undefined) {
        data.label = subInput.label;
      }
      if (subInput.question !== undefined) {
        data.question = subInput.question;
      }
      if (subInput.marks !== undefined) {
        data.marks = subInput.marks;
      }
      if (subInput.position !== undefined) {
        data.position = subInput.position;
      }
      if (subInput.questionType !== undefined) {
        data.questionType = subInput.questionType as any;
      }
      if (subInput.mcqOptions !== undefined) {
        data.mcqOptions = subInput.mcqOptions;
      }

      if (Object.keys(data).length === 0) {
        continue;
      }

      await tx.subQuestion.update({
        where: { id: target.id },
        data,
      });
      continue;
    }

    // Create new sub-question when no target was found.
    if (
      subInput.label === undefined ||
      subInput.position === undefined ||
      subInput.question === undefined ||
      subInput.marks === undefined
    ) {
      throw new HttpError(
        400,
        'New sub-questions require label, position, question, and marks'
      );
    }

    const newKey = `${subInput.position}::${subInput.label}`;
    if (occupiedPositionLabels.has(newKey)) {
      throw new HttpError(
        400,
        'Another sub-question already uses this position and label'
      );
    }

    occupiedPositionLabels.add(newKey);

    await tx.subQuestion.create({
      data: {
        questionId: question.id,
        label: subInput.label,
        question: subInput.question,
        marks: subInput.marks,
        position: subInput.position,
        questionType: (subInput.questionType ?? 'DESCRIPTIVE') as any,
        mcqOptions: subInput.mcqOptions ?? undefined,
      },
    });
  }
};

export const paperService = {
  list: async (
    actor: AuthenticatedUser,
    query?: ListPapersQuery
  ): Promise<
    PaginatedResponse<PaperListItem>
  > => {
    const { page, limit } = normalizePagination(query?.page, query?.limit);
    const skip = (page - 1) * limit;
    const where = listWhere(actor, query);

    const [papers, totalItems] = await prisma.$transaction([
      prisma.questionPaper.findMany({
        where,
        select: paperListSelect,
        skip,
        take: limit,
        orderBy: { startDate: 'asc' },
      }),
      prisma.questionPaper.count({ where }),
    ]);

    let responsePapers: PaperListItem[] = papers;

    if (actor.role === UserRole.STUDENT && papers.length > 0) {
      const [accessRequests, submissions] = await prisma.$transaction([
        prisma.accessRequest.findMany({
          where: {
            studentId: actor.id,
            paperId: { in: papers.map((paper) => paper.id) },
          },
          select: { paperId: true, status: true },
        }),
        prisma.submission.findMany({
          where: {
            studentId: actor.id,
            paperId: { in: papers.map((paper) => paper.id) },
          },
          select: { id: true, paperId: true },
        }),
      ]);

      const accessStatusByPaperId = new Map(
        accessRequests.map((request) => [request.paperId, request.status])
      );
      const submissionByPaperId = new Map(
        submissions.map((submission) => [submission.paperId, submission])
      );

      responsePapers = papers.map((paper) => ({
        ...paper,
        accessStatus: accessStatusByPaperId.get(paper.id) ?? null,
        hasSubmitted: submissionByPaperId.has(paper.id),
        submissionId: submissionByPaperId.get(paper.id)?.id ?? null,
      }));
    }

    return {
      data: responsePapers,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  },

  getById: async (actor: AuthenticatedUser, paperId: string) => {
    const paper = await prisma.questionPaper.findUnique({
      where: { id: paperId },
      include: paperDetailInclude,
    });

    if (!paper) {
      throw new HttpError(404, 'Question paper not found');
    }

    if (actor.role !== UserRole.ADMIN) {
      const hasAccess = await prisma.accessRequest.findFirst({
        where: {
          paperId,
          studentId: actor.id,
          status: AccessStatus.APPROVED,
        },
      });

      if (!hasAccess) {
        throw new HttpError(403, 'You do not have access to this paper');
      }
    }

    return paper;
  },

  create: async (actor: AuthenticatedUser, input: CreatePaperInput) => {
    if (actor.role !== UserRole.ADMIN) {
      throw new HttpError(403, 'Only admins can create question papers');
    }

    validateDates(input.startDate, input.endDate);

    return prisma.questionPaper.create({
      data: {
        title: input.title,
        description: input.description,
        durationMinutes: input.durationMinutes,
        startDate: input.startDate,
        endDate: input.endDate,
        earlySubmissionRestrictionMinutes:
          input.earlySubmissionRestrictionMinutes,
        status: input.status ?? PaperStatus.DRAFT,
        createdBy: actor.id,
        questions: buildQuestionData(input.questions),
      },
      include: paperDetailInclude,
    });
  },

  update: async (
    actor: AuthenticatedUser,
    paperId: string,
    input: UpdatePaperInput
  ) => {
    if (actor.role !== UserRole.ADMIN) {
      throw new HttpError(403, 'Only admins can update question papers');
    }

    const existing = await prisma.questionPaper.findUnique({
      where: { id: paperId },
    });
    if (!existing) {
      throw new HttpError(404, 'Question paper not found');
    }

    if (
      (input.startDate ?? existing.startDate) &&
      (input.endDate ?? existing.endDate)
    ) {
      validateDates(
        input.startDate ?? existing.startDate,
        input.endDate ?? existing.endDate
      );
    }

    return prisma.questionPaper.update({
      where: { id: paperId },
      data: {
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        durationMinutes: input.durationMinutes ?? existing.durationMinutes,
        startDate: input.startDate ?? existing.startDate,
        endDate: input.endDate ?? existing.endDate,
        earlySubmissionRestrictionMinutes:
          input.earlySubmissionRestrictionMinutes === undefined
            ? existing.earlySubmissionRestrictionMinutes
            : input.earlySubmissionRestrictionMinutes,
        status: input.status ?? existing.status,
      },
      include: paperDetailInclude,
    });
  },

  addQuestions: async (
    actor: AuthenticatedUser,
    paperId: string,
    inputs: CreateQuestionsInput
  ) => {
    if (actor.role !== UserRole.ADMIN) {
      throw new HttpError(403, 'Only admins can modify questions');
    }

    const paper = await prisma.questionPaper.findUnique({
      where: { id: paperId },
    });
    if (!paper) {
      throw new HttpError(404, 'Question paper not found');
    }

    await assertNoSubmissions(paperId);

    // Enforce unique positions in the incoming payload and against existing questions.
    const inputPositions = inputs.map((q) => q.position);
    const duplicatePositions = inputPositions.filter(
      (pos, idx) => inputPositions.indexOf(pos) !== idx
    );
    if (duplicatePositions.length > 0) {
      throw new HttpError(
        400,
        'Question positions must be unique within the request'
      );
    }

    const existingPositions = new Set(
      (
        await prisma.question.findMany({
          where: { paperId },
          select: { position: true },
        })
      ).map((q) => q.position)
    );

    const conflicts = inputPositions.filter((pos) =>
      existingPositions.has(pos)
    );
    if (conflicts.length > 0) {
      throw new HttpError(
        400,
        `Question positions already exist on this paper: ${[
          ...new Set(conflicts),
        ].join(', ')}`
      );
    }

    await prisma.$transaction(
      inputs.map((input) =>
        prisma.question.create({
          data: {
            paperId,
            contentHtml: input.contentHtml,
            marks: input.marks,
            position: input.position,
            subQuestions: {
              create: input.subQuestions.map((sub) => ({
                label: sub.label,
                question: sub.question,
                marks: sub.marks,
                position: sub.position,
                questionType: (sub.questionType ?? 'DESCRIPTIVE') as any,
                mcqOptions: sub.mcqOptions ?? undefined,
              })),
            },
          },
        })
      )
    );

    return prisma.questionPaper.findUniqueOrThrow({
      where: { id: paperId },
      include: paperDetailInclude,
    });
  },

  updateQuestions: async (
    actor: AuthenticatedUser,
    paperId: string,
    inputs: UpdateQuestionsInput
  ) => {
    if (actor.role !== UserRole.ADMIN) {
      throw new HttpError(403, 'Only admins can modify questions');
    }

    const paper = await prisma.questionPaper.findUnique({
      where: { id: paperId },
    });
    if (!paper) {
      throw new HttpError(404, 'Question paper not found');
    }

    await assertNoSubmissions(paperId);

    const existingQuestions: QuestionWithSubQuestions[] =
      await prisma.question.findMany({
        where: { paperId },
        include: { subQuestions: true },
      });

    const questionsById = new Map(existingQuestions.map((q) => [q.id, q]));
    const questionsByPosition = new Map(
      existingQuestions.map((q) => [q.position, q])
    );

    const updates: {
      target: QuestionWithSubQuestions;
      input: UpdateQuestionsInput[number];
    }[] = [];
    const creations: UpdateQuestionsInput[number][] = [];

    const seenQuestionIds = new Set<string>();
    const occupiedPositions = new Set(existingQuestions.map((q) => q.position));
    const newPositions = new Set<number>();

    for (const input of inputs) {
      const target =
        (input.id ? questionsById.get(input.id) : undefined) ??
        (input.position ? questionsByPosition.get(input.position) : undefined);

      if (target) {
        if (seenQuestionIds.has(target.id)) {
          throw new HttpError(
            400,
            'Duplicate question updates found in request'
          );
        }
        seenQuestionIds.add(target.id);
        updates.push({ target, input });
        continue;
      }

      if (input.position === undefined) {
        throw new HttpError(
          400,
          'Position is required when creating a new question'
        );
      }

      if (
        occupiedPositions.has(input.position) ||
        newPositions.has(input.position)
      ) {
        throw new HttpError(
          400,
          `Question position already exists on this paper: ${input.position}`
        );
      }

      if (
        input.contentHtml === undefined ||
        input.marks === undefined ||
        !input.subQuestions ||
        input.subQuestions.length === 0
      ) {
        throw new HttpError(
          400,
          'New questions require position, contentHtml, marks, and at least one sub-question'
        );
      }

      newPositions.add(input.position);
      creations.push(input);
    }

    await prisma.$transaction(async (tx) => {
      for (const { target, input } of updates) {
        const data: Prisma.QuestionUpdateInput = {};

        if (input.contentHtml !== undefined) {
          data.contentHtml = input.contentHtml;
        }

        if (input.marks !== undefined) {
          data.marks = input.marks;
        }

        if (Object.keys(data).length > 0) {
          await tx.question.update({
            where: { id: target.id },
            data,
          });
        }

        if (input.subQuestions && input.subQuestions.length > 0) {
          await upsertSubQuestions(tx, target, input.subQuestions);
        }
      }

      for (const input of creations) {
        const subKeys = new Set<string>();
        for (const sub of input.subQuestions!) {
          if (sub.label === undefined || sub.position === undefined) {
            continue;
          }
          const key = `${sub.position}::${sub.label}`;
          if (subKeys.has(key)) {
            throw new HttpError(
              400,
              'Duplicate sub-question positions/labels within a question'
            );
          }
          subKeys.add(key);
        }

        await tx.question.create({
          data: {
            paperId,
            contentHtml: input.contentHtml as string,
            marks: input.marks as number,
            position: input.position as number,
            subQuestions: {
              create: input.subQuestions!.map((sub) => {
                if (
                  sub.label === undefined ||
                  sub.position === undefined ||
                  sub.question === undefined ||
                  sub.marks === undefined
                ) {
                  throw new HttpError(
                    400,
                    'New sub-questions require label, position, question, and marks'
                  );
                }
                return {
                  label: sub.label,
                  question: sub.question,
                  marks: sub.marks,
                  position: sub.position,
                  questionType: (sub.questionType ?? 'DESCRIPTIVE') as any,
                  mcqOptions: sub.mcqOptions ?? undefined,
                };
              }),
            },
          },
        });
      }
    });

    return prisma.questionPaper.findUniqueOrThrow({
      where: { id: paperId },
      include: paperDetailInclude,
    });
  },
};
