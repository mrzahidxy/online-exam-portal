import { OrganizerRole, PaperStatus, Prisma, QuestionType } from '@prisma/client';

import type {
  AddExistingQuestionToCategoryInput,
  CreateCategoryQuestionInput,
  CreateQuestionCategoryInput,
  SourceQuestionsQuery,
  UpdateQuestionCategoryInput,
} from '../schemas/question-category.schema';
import type { AuthenticatedUser } from '../types/user';
import { assertOwner, getActorOrganizerId } from '../utils/access-control';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';

const categoryInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  items: {
    orderBy: { position: 'asc' as const },
    include: {
      question: {
        include: {
          paper: { select: { id: true, title: true, status: true, organizerId: true } },
          subQuestions: { orderBy: { position: 'asc' as const } },
        },
      },
    },
  },
} as const;

const categoryListSelect = {
  id: true,
  organizerId: true,
  title: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} as const;

const sourceQuestionInclude = {
  paper: { select: { id: true, title: true, status: true, organizerId: true } },
  subQuestions: { orderBy: { position: 'asc' as const } },
} as const;

const tenantId = getActorOrganizerId;
const assertCategoryOwner = (actor: AuthenticatedUser) => assertOwner(actor, 'Only owners can manage question categories');

const normalizeQuestionType = (questionType?: QuestionType): QuestionType => questionType ?? QuestionType.DESCRIPTIVE;

const mapKnownUniqueConflicts = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new HttpError(409, 'Question already exists in this category, title already exists, or position is already used');
  }
  throw error;
};

const assertCategoryExists = async (organizerId: string, categoryId: string) => {
  const category = await prisma.questionCategory.findFirst({ where: { id: categoryId, organizerId }, select: { id: true } });
  if (!category) throw new HttpError(404, 'Question category not found');
  return category;
};

const assertNoDuplicateSubQuestionKeys = (input: CreateCategoryQuestionInput) => {
  const keys = new Set<string>();
  for (const subQuestion of input.subQuestions) {
    const key = `${subQuestion.position}::${subQuestion.label}`;
    if (keys.has(key)) throw new HttpError(400, 'Duplicate sub-question positions/labels within a question');
    keys.add(key);
  }
};

export const questionCategoryService = {
  list: async (actor: AuthenticatedUser) => {
    assertCategoryOwner(actor);
    return prisma.questionCategory.findMany({
      where: { organizerId: tenantId(actor) },
      select: categoryListSelect,
      orderBy: { createdAt: 'desc' },
    });
  },

  listActive: async (actor: AuthenticatedUser) => {
    return prisma.questionCategory.findMany({
      where: { organizerId: tenantId(actor), isActive: true },
      select: categoryListSelect,
      orderBy: { title: 'asc' },
    });
  },

  getById: async (actor: AuthenticatedUser, categoryId: string) => {
    const orgId = tenantId(actor);
    const category = await prisma.questionCategory.findFirst({ where: { id: categoryId, organizerId: orgId }, include: categoryInclude });
    if (!category) throw new HttpError(404, 'Question category not found');
    if (actor.organizerRole !== OrganizerRole.OWNER && !category.isActive) throw new HttpError(404, 'Question category not found');
    return category;
  },

  create: async (actor: AuthenticatedUser, input: CreateQuestionCategoryInput) => {
    assertCategoryOwner(actor);
    try {
      return await prisma.questionCategory.create({
        data: {
          organizerId: tenantId(actor),
          title: input.title,
          description: input.description,
          isActive: input.isActive ?? true,
          createdById: actor.id,
        },
        include: categoryInclude,
      });
    } catch (error) {
      return mapKnownUniqueConflicts(error);
    }
  },

  update: async (actor: AuthenticatedUser, categoryId: string, input: UpdateQuestionCategoryInput) => {
    assertCategoryOwner(actor);
    const orgId = tenantId(actor);
    await assertCategoryExists(orgId, categoryId);
    try {
      return await prisma.questionCategory.update({
        where: { id: categoryId },
        data: { title: input.title, description: input.description, isActive: input.isActive },
        include: categoryInclude,
      });
    } catch (error) {
      return mapKnownUniqueConflicts(error);
    }
  },

  delete: async (actor: AuthenticatedUser, categoryId: string) => {
    assertCategoryOwner(actor);
    const orgId = tenantId(actor);
    await assertCategoryExists(orgId, categoryId);
    await prisma.questionCategory.delete({ where: { id: categoryId } });
    return { id: categoryId };
  },

  listSourceQuestions: async (actor: AuthenticatedUser, query: SourceQuestionsQuery) => {
    assertCategoryOwner(actor);
    const orgId = tenantId(actor);
    return prisma.question.findMany({
      where: {
        paperId: query.paperId,
        paper: { organizerId: orgId, status: PaperStatus.PUBLISHED },
        ...(query.search ? { contentHtml: { contains: query.search, mode: 'insensitive' as const } } : {}),
      },
      include: sourceQuestionInclude,
      orderBy: [{ paper: { title: 'asc' } }, { position: 'asc' }],
    });
  },

  addExistingQuestion: async (actor: AuthenticatedUser, categoryId: string, input: AddExistingQuestionToCategoryInput) => {
    assertCategoryOwner(actor);
    const orgId = tenantId(actor);
    await assertCategoryExists(orgId, categoryId);

    const sourceQuestion = await prisma.question.findFirst({
      where: { id: input.questionId, paper: { organizerId: orgId, status: PaperStatus.PUBLISHED } },
      select: { id: true },
    });
    if (!sourceQuestion) throw new HttpError(400, 'Only questions from published papers in this organizer can be added to a category');

    try {
      return await prisma.questionCategoryItem.create({
        data: { organizerId: orgId, categoryId, questionId: input.questionId, position: input.position },
        select: { id: true, organizerId: true, categoryId: true, questionId: true, position: true },
      });
    } catch (error) {
      return mapKnownUniqueConflicts(error);
    }
  },

  createCategoryQuestion: async (actor: AuthenticatedUser, categoryId: string, input: CreateCategoryQuestionInput) => {
    assertCategoryOwner(actor);
    const orgId = tenantId(actor);
    await assertCategoryExists(orgId, categoryId);
    assertNoDuplicateSubQuestionKeys(input);

    if (input.paperId) {
      const paper = await prisma.questionPaper.findFirst({
        where: { id: input.paperId, organizerId: orgId, status: PaperStatus.PUBLISHED },
        select: { id: true },
      });
      if (!paper) throw new HttpError(404, 'Question paper not found');
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const question = await tx.question.create({
          data: {
            paperId: input.paperId ?? undefined,
            contentHtml: input.contentHtml,
            marks: input.marks,
            position: input.position,
            subQuestions: {
              create: input.subQuestions.map((subQuestion) => {
                const questionType = normalizeQuestionType(subQuestion.questionType as QuestionType | undefined);
                return {
                  label: subQuestion.label,
                  question: subQuestion.question,
                  marks: subQuestion.marks,
                  position: subQuestion.position,
                  questionType,
                  mcqOptions: subQuestion.mcqOptions ?? undefined,
                };
              }),
            },
          },
        });

        await tx.questionCategoryItem.create({ data: { organizerId: orgId, categoryId, questionId: question.id, position: input.position } });
        return question;
      });

      return prisma.question.findFirstOrThrow({ where: { id: created.id }, include: sourceQuestionInclude });
    } catch (error) {
      return mapKnownUniqueConflicts(error);
    }
  },

  removeQuestion: async (actor: AuthenticatedUser, categoryId: string, questionId: string) => {
    assertCategoryOwner(actor);
    const orgId = tenantId(actor);
    await assertCategoryExists(orgId, categoryId);
    const link = await prisma.questionCategoryItem.findFirst({ where: { organizerId: orgId, categoryId, questionId }, select: { id: true } });
    if (!link) throw new HttpError(404, 'Question category link not found');
    await prisma.questionCategoryItem.delete({ where: { id: link.id } });
    return { categoryId, questionId };
  },
};
