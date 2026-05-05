import {
  AccessStatus,
  PaperStatus,
  SubmissionStatus,
  UserRole,
  Prisma,
} from '@prisma/client';

import {
  CreateSubmissionInput,
  GradeSubmissionInput,
  ListSubmissionsQuery,
} from '../schemas/submission.schema';
import { AuthenticatedUser } from '../types/user';
import { prisma } from '../utils/prisma';
import { HttpError } from '../utils/http-error';

const submissionListInclude = {
  student: {
    select: { id: true, name: true, email: true, schoolCode: true },
  },
  paper: {
    select: { id: true, title: true },
  },
} as const;

const submissionPaperSelect = {
  id: true,
  title: true,
  description: true,
  questions: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      paperId: true,
      contentHtml: true,
      marks: true,
      position: true,
      subQuestions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          questionId: true,
          label: true,
          question: true,
          marks: true,
          questionType: true,
          mcqOptions: true,
          circuitTemplate: true,
          imageCompositionTemplate: true,
          position: true,
        },
      },
    },
  },
} as const;

const submissionInclude = {
  student: {
    select: { id: true, name: true, email: true, schoolCode: true },
  },
  paper: {
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
    },
  },
  answers: {
    include: {
      subQuestion: {
        select: {
          id: true,
          label: true,
          question: true,
          marks: true,
          questionId: true,
          questionType: true,
          mcqOptions: true,
          circuitTemplate: true,
          imageCompositionTemplate: true,
          position: true,
          questionRel: {
            select: {
              id: true,
              contentHtml: true,
              marks: true,
              position: true,
            },
          },
        },
      },
    },
  },
  grades: {
    include: {
      subQuestion: {
        select: {
          id: true,
          label: true,
          question: true,
          marks: true,
        },
      }
    },
  },
} as const;

const submissionDetailInclude = {
  student: {
    select: { id: true, name: true, email: true, schoolCode: true },
  },
  paper: {
    select: submissionPaperSelect,
  },
  answers: {
    select: {
      id: true,
      subQuestionId: true,
      answerText: true,
    },
  },
  grades: {
    select: {
      id: true,
      subQuestionId: true,
      assignedMarks: true,
      comment: true,
    },
  },
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

type SubmissionResponse = Prisma.SubmissionGetPayload<{
  include: typeof submissionInclude;
}>;

type SubmissionListItem = Prisma.SubmissionGetPayload<{
  include: typeof submissionListInclude;
}>;

type SubmissionPaper = Prisma.QuestionPaperGetPayload<{
  select: typeof submissionPaperSelect;
}>;

type SubmissionQuestion = SubmissionPaper['questions'][number];
type SubmissionSubQuestion = SubmissionQuestion['subQuestions'][number];

type SubmissionAnswer = {
  id: string;
  answerText: string;
  marks: {
    assigned: number | null;
    max: number;
  };
  comment: string | null;
};

type SubmissionDetailResponse = {
  id: string;
  status: SubmissionStatus;
  submittedAt: Date;
  student: {
    id: string;
    name: string;
    email: string;
    schoolCode: string | null;
  };
  paper: Omit<SubmissionPaper, 'questions'> & {
    questions: (Omit<SubmissionQuestion, 'subQuestions'> & {
      subQuestions: (SubmissionSubQuestion & {
        answer: SubmissionAnswer | null;
      })[];
    })[];
  };
};

const normalizePagination = (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? Math.floor(pageNumber) : DEFAULT_PAGE;
  const requestedLimit =
    Number.isFinite(limitNumber) && limitNumber > 0 ? Math.floor(limitNumber) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit };
};

const ensureStudentAccess = async (studentId: string, paperId: string) => {
  const request = await prisma.accessRequest.findUnique({
    where: {
      studentId_paperId: {
        studentId,
        paperId,
      },
    },
  });

  if (!request || request.status !== AccessStatus.APPROVED) {
    throw new HttpError(403, 'Access request must be approved before submitting');
  }
};

const validatePaperWindow = (paper: { startDate: Date; endDate: Date; earlySubmissionRestrictionMinutes: number | null }) => {
  const now = new Date();
  if (paper.startDate.getTime() > now.getTime()) {
    throw new HttpError(400, 'Exam has not started yet');
  }

  if (paper.endDate.getTime() < now.getTime()) {
    throw new HttpError(400, 'Exam has already ended');
  }

  if (paper.earlySubmissionRestrictionMinutes) {
    const earliestSubmission = new Date(
      paper.startDate.getTime() + paper.earlySubmissionRestrictionMinutes * 60 * 1000
    );
    if (now.getTime() < earliestSubmission.getTime()) {
      throw new HttpError(400, 'You cannot submit this early');
    }
  }
};

const filterForActor = (
  actor: AuthenticatedUser,
  query?: ListSubmissionsQuery
): Prisma.SubmissionWhereInput => {
  const where: Prisma.SubmissionWhereInput = {};

  if (actor.role === UserRole.STUDENT) {
    where.studentId = actor.id;
  } else if (query?.studentId) {
    where.studentId = query.studentId;
  }

  if (query?.paperId) {
    where.paperId = query.paperId;
  }

  if (query?.status) {
    where.status = query.status;
  }

  return where;
};

export const submissionService = {
  list: async (
    actor: AuthenticatedUser,
    query?: ListSubmissionsQuery
  ): Promise<PaginatedResponse<SubmissionListItem>> => {
    const { page, limit } = normalizePagination(query?.page, query?.limit);
    const skip = (page - 1) * limit;
    const where = filterForActor(actor, query);

    const [submissions, totalItems] = await prisma.$transaction([
      prisma.submission.findMany({
        where,
        include: submissionListInclude,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.submission.count({ where }),
    ]);

    return {
      data: submissions,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  },

  getById: async (
    actor: AuthenticatedUser,
    submissionId: string
  ): Promise<SubmissionDetailResponse> => {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: submissionDetailInclude,
    });

    if (!submission) {
      throw new HttpError(404, 'Submission not found');
    }

    if (actor.role !== UserRole.ADMIN && submission.studentId !== actor.id) {
      throw new HttpError(403, 'You do not have access to this submission');
    }

    const answersBySubQuestionId = new Map<
      string,
      { id: string; answerText: string }
    >(
      submission.answers.map((answer) => [
        answer.subQuestionId,
        {
          id: answer.id,
          answerText: answer.answerText,
        },
      ])
    );

    const gradesBySubQuestionId = new Map<
      string,
      {
        assignedMarks: number;
        comment: string | null;
      }
    >(
      submission.grades.map((grade) => [
        grade.subQuestionId,
        {
          assignedMarks: grade.assignedMarks,
          comment: grade.comment,
        },
      ])
    );

    const questionsWithResponses = submission.paper.questions.map((question) => ({
      ...question,
      subQuestions: question.subQuestions.map((subQuestion) => {
        const answer = answersBySubQuestionId.get(subQuestion.id);
        const grade = gradesBySubQuestionId.get(subQuestion.id);

        return {
          ...subQuestion,
          answer:
            answer !== undefined
              ? {
                ...answer,
                marks: {
                  assigned: grade?.assignedMarks ?? null,
                  max: subQuestion.marks,
                },
                comment: grade?.comment ?? null,
              }
              : null,
        };
      }),
    }));

    return {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      student: submission.student,
      paper: {
        ...submission.paper,
        questions: questionsWithResponses,
      },
    };
  },

  create: async (
    actor: AuthenticatedUser,
    input: CreateSubmissionInput
  ): Promise<SubmissionResponse> => {
    if (actor.role !== UserRole.STUDENT) {
      throw new HttpError(403, 'Only students can submit answers');
    }

    const paper = await prisma.questionPaper.findUnique({
      where: { id: input.paperId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        earlySubmissionRestrictionMinutes: true,
      },
    });

    if (!paper || paper.status !== PaperStatus.PUBLISHED) {
      throw new HttpError(400, 'Paper is not available for submissions');
    }

    await ensureStudentAccess(actor.id, paper.id);
    validatePaperWindow(paper);

    const existingSubmission = await prisma.submission.findUnique({
      where: {
        studentId_paperId: {
          studentId: actor.id,
          paperId: paper.id,
        },
      },
    });

    if (existingSubmission) {
      throw new HttpError(409, 'You have already submitted answers for this paper');
    }

    const subQuestions = await prisma.subQuestion.findMany({
      where: { questionRel: { paperId: paper.id } },
      select: { id: true },
    });
    const allowedIds = new Set(subQuestions.map((sub) => sub.id));

    const seenSubQuestions = new Set<string>();
    for (const answer of input.answers) {
      if (seenSubQuestions.has(answer.subQuestionId)) {
        throw new HttpError(400, 'Duplicate sub-question answers are not allowed');
      }
      seenSubQuestions.add(answer.subQuestionId);

      if (!allowedIds.has(answer.subQuestionId)) {
        throw new HttpError(400, 'One or more answers reference invalid sub-questions');
      }
    }

    const submission = await prisma.$transaction(async (tx) => {
      const created = await tx.submission.create({
        data: {
          studentId: actor.id,
          paperId: paper.id,
        },
      });

      await tx.answer.createMany({
        data: input.answers.map((answer) => ({
          submissionId: created.id,
          subQuestionId: answer.subQuestionId,
          answerText: answer.answerText,
        })),
      });

      return created;
    });

    return prisma.submission.findUniqueOrThrow({
      where: { id: submission.id },
      include: submissionInclude,
    });
  },

  grade: async (
    actor: AuthenticatedUser,
    submissionId: string,
    input: GradeSubmissionInput
  ): Promise<SubmissionResponse> => {
    if (actor.role !== UserRole.ADMIN) {
      throw new HttpError(403, 'Only admins can grade submissions');
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        paperId: true,
      },
    });

    if (!submission) {
      throw new HttpError(404, 'Submission not found');
    }

    const subQuestions = await prisma.subQuestion.findMany({
      where: { questionRel: { paperId: submission.paperId } },
      select: { id: true, marks: true },
    });

    const marksById = new Map(subQuestions.map((sub) => [sub.id, sub.marks]));

    for (const grade of input.grades) {
      if (!marksById.has(grade.subQuestionId)) {
        throw new HttpError(400, 'Invalid sub-question for grading');
      }

      if (grade.assignedMarks > (marksById.get(grade.subQuestionId) ?? 0)) {
        throw new HttpError(400, 'Assigned marks exceed the maximum for a sub-question');
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const grade of input.grades) {
        const updateData: Prisma.GradeUpdateInput = {
          assignedMarks: grade.assignedMarks,
          gradedBy: {
            connect: {
              id: actor.id,
            },
          },
        };

        if (grade.comment !== undefined) {
          updateData.comment = grade.comment;
        }

        await tx.grade.upsert({
          where: {
            submissionId_subQuestionId: {
              submissionId,
              subQuestionId: grade.subQuestionId,
            },
          },
          update: updateData,
          create: {
            submission: {
              connect: {
                id: submissionId,
              },
            },
            subQuestion: {
              connect: {
                id: grade.subQuestionId,
              },
            },
            assignedMarks: grade.assignedMarks,
            gradedBy: {
              connect: {
                id: actor.id,
              },
            },
            comment: grade.comment ?? null,
          },
        });
      }

      await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.REVIEWED,
        },
      });
    });

    return prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: submissionInclude,
    });
  },
};
