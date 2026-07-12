import {
  AccessStatus,
  MockPaperStatus,
  MockSubmissionStatus,
  OrganizerRole,
  PaperStatus,
  PlatformRole,
  PrismaClient,
  SubscriptionStatus,
  SubmissionStatus,
} from '@prisma/client';

import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();
const GRAPH_QUESTION_TYPE = 'GRAPH';
const TABLE_QUESTION_TYPE = 'TABLE';
const DESCRIPTIVE_QUESTION_TYPE = 'DESCRIPTIVE';
const SAMPLE_GRAPH_ANSWER = JSON.stringify({
  version: 1,
  type: 'graph',
  points: [
    { x: 1, y: 2 },
    { x: 2, y: 4.5 },
    { x: 3, y: 6 },
  ],
  line: {
    start: { x: 0, y: 1 },
    end: { x: 4, y: 8 },
  },
});
const SAMPLE_TABLE_ANSWER = JSON.stringify({
  version: 1,
  type: 'table',
  rows: [
    ['Time', 'Frequency', 'Unit'],
    ['1', '180', 'Hz'],
    ['2', '280', 'Hz'],
    ['3', '460', 'Hz'],
  ],
});

type SubQuestionSeed = {
  label: string;
  question: string;
  marks: number;
  position: number;
  questionType?: 'DESCRIPTIVE' | 'MCQ' | 'GRAPH' | 'TABLE';
};

type QuestionSeed = {
  position: number;
  contentHtml: string;
  marks: number;
  subQuestions: SubQuestionSeed[];
};

type PaperSeed = {
  title: string;
  description: string;
  durationMinutes: number;
  startDate: Date;
  endDate: Date;
  earlySubmissionRestrictionMinutes: number;
  questions: QuestionSeed[];
};

async function upsertUser({
  email,
  name,
  role,
  password,
  schoolCode,
}: {
  email: string;
  name: string;
  role: OrganizerRole;
  password: string;
  schoolCode?: string;
}) {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      platformRole: PlatformRole.USER,
      schoolCode,
    },
    create: {
      email,
      name,
      platformRole: PlatformRole.USER,
      schoolCode,
      passwordHash,
    },
  });
}

async function upsertPaper(adminId: string, organizerId: string, seed: PaperSeed) {
  const existing = await prisma.questionPaper.findFirst({
    where: { title: seed.title, organizerId },
  });

  if (!existing) {
    return prisma.questionPaper.create({
      data: {
        organizerId,
        title: seed.title,
        description: seed.description,
        durationMinutes: seed.durationMinutes,
        startDate: seed.startDate,
        endDate: seed.endDate,
        status: PaperStatus.PUBLISHED,
        earlySubmissionRestrictionMinutes:
          seed.earlySubmissionRestrictionMinutes,
        createdBy: adminId,
      },
    });
  }

  return prisma.questionPaper.update({
    where: { id: existing.id },
    data: {
      description: seed.description,
      durationMinutes: seed.durationMinutes,
      startDate: seed.startDate,
      endDate: seed.endDate,
      status: PaperStatus.PUBLISHED,
      earlySubmissionRestrictionMinutes:
        seed.earlySubmissionRestrictionMinutes,
    },
  });
}

async function upsertQuestion(paperId: string, seed: QuestionSeed) {
  const existing = await prisma.question.findFirst({
    where: {
      paperId,
      position: seed.position,
    },
  });

  if (!existing) {
    return prisma.question.create({
      data: {
        paperId,
        contentHtml: seed.contentHtml,
        marks: seed.marks,
        position: seed.position,
      },
    });
  }

  return prisma.question.update({
    where: { id: existing.id },
    data: {
      contentHtml: seed.contentHtml,
      marks: seed.marks,
    },
  });
}

async function upsertSubQuestion(questionId: string, seed: SubQuestionSeed) {
  return prisma.subQuestion.upsert({
    where: {
      questionId_position_label: {
        questionId,
        position: seed.position,
        label: seed.label,
      },
    },
    update: {
      question: seed.question,
      marks: seed.marks,
      questionType: (seed.questionType ?? DESCRIPTIVE_QUESTION_TYPE) as any,
    },
    create: {
      questionId,
      label: seed.label,
      question: seed.question,
      marks: seed.marks,
      position: seed.position,
      questionType: (seed.questionType ?? DESCRIPTIVE_QUESTION_TYPE) as any,
    },
  });
}

async function seedPaper(adminId: string, organizerId: string, seed: PaperSeed) {
  const paper = await upsertPaper(adminId, organizerId, seed);

  for (const questionSeed of seed.questions) {
    const question = await upsertQuestion(paper.id, questionSeed);

    for (const subQuestionSeed of questionSeed.subQuestions) {
      await upsertSubQuestion(question.id, subQuestionSeed);
    }
  }

  return paper;
}

async function getPaperSubQuestions(paperId: string) {
  const questions = await prisma.question.findMany({
    where: { paperId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      position: true,
      subQuestions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          label: true,
          marks: true,
          position: true,
          questionType: true,
        },
      },
    },
  });

  return questions.flatMap((question) => question.subQuestions);
}

async function upsertAccessRequest({
  studentId,
  paperId,
  status,
  decidedById,
  organizerId,
}: {
  studentId: string;
  paperId: string;
  status: AccessStatus;
  decidedById?: string | null;
  organizerId: string;
}) {
  return prisma.accessRequest.upsert({
    where: {
      studentId_paperId: {
        studentId,
        paperId,
      },
    },
    update: {
      organizerId,
      status,
      decidedById: decidedById ?? null,
      decidedAt: decidedById ? new Date() : null,
    },
    create: {
      organizerId,
      studentId,
      paperId,
      status,
      decidedById: decidedById ?? null,
      decidedAt: decidedById ? new Date() : null,
    },
  });
}

async function upsertSubmission({
  studentId,
  paperId,
  status,
  organizerId,
}: {
  studentId: string;
  paperId: string;
  status: SubmissionStatus;
  organizerId: string;
}) {
  return prisma.submission.upsert({
    where: {
      studentId_paperId: {
        studentId,
        paperId,
      },
    },
    update: {
      organizerId,
      status,
      submittedAt: new Date(),
    },
    create: {
      organizerId,
      studentId,
      paperId,
      status,
    },
  });
}

async function ensureMembership(userId: string, organizerId: string, role: OrganizerRole) {
  return prisma.organizerMembership.upsert({
    where: { userId_organizerId: { userId, organizerId } },
    update: { role },
    create: { organizerId, userId, role },
  });
}

async function upsertSubscription({
  organizerId,
  status = SubscriptionStatus.TRIAL,
  mockPaperLimit = 20,
  mockPaperUsed = 0,
  periodOffsetDays = 30,
}: {
  organizerId: string;
  status?: SubscriptionStatus;
  mockPaperLimit?: number;
  mockPaperUsed?: number;
  periodOffsetDays?: number;
}) {
  const now = new Date();
  return prisma.subscription.upsert({
    where: { organizerId },
    update: {
      status,
      planCode: status === SubscriptionStatus.ACTIVE ? 'ACTIVE' : 'TRIAL',
      mockPaperLimit,
      mockPaperUsed,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + periodOffsetDays * 24 * 60 * 60 * 1000),
    },
    create: {
      organizerId,
      status,
      planCode: status === SubscriptionStatus.ACTIVE ? 'ACTIVE' : 'TRIAL',
      mockPaperLimit,
      mockPaperUsed,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + periodOffsetDays * 24 * 60 * 60 * 1000),
    },
  });
}

async function upsertStudentSubscriptionPlan({
  organizerId,
  code = 'FIXED_MOCK_ACCESS',
  name = 'Fixed Mock Paper Access',
  mockPaperLimit = 20,
  periodDays = 30,
  isActive = true,
}: {
  organizerId: string;
  code?: string;
  name?: string;
  mockPaperLimit?: number;
  periodDays?: number;
  isActive?: boolean;
}) {
  return prisma.studentSubscriptionPlan.upsert({
    where: { organizerId_code: { organizerId, code } },
    update: { name, mockPaperLimit, periodDays, isActive },
    create: { organizerId, code, name, mockPaperLimit, periodDays, isActive },
  });
}

async function upsertStudentSubscription({
  organizerId,
  studentId,
  planId,
  status = SubscriptionStatus.EXPIRED,
  mockPaperLimit = 0,
  mockPaperUsed = 0,
  periodOffsetDays = 30,
}: {
  organizerId: string;
  studentId: string;
  planId?: string;
  status?: SubscriptionStatus;
  mockPaperLimit?: number;
  mockPaperUsed?: number;
  periodOffsetDays?: number;
}) {
  const now = new Date();
  return prisma.studentSubscription.upsert({
    where: { organizerId_studentId: { organizerId, studentId } },
    update: {
      planId,
      status,
      mockPaperLimit,
      mockPaperUsed,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + periodOffsetDays * 24 * 60 * 60 * 1000),
    },
    create: {
      organizerId,
      studentId,
      planId,
      status,
      mockPaperLimit,
      mockPaperUsed,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + periodOffsetDays * 24 * 60 * 60 * 1000),
    },
  });
}

async function upsertOrganizer(slug: string, name: string) {
  return prisma.organizer.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function upsertCategory({
  organizerId,
  createdById,
  title,
  description,
  isActive = true,
}: {
  organizerId: string;
  createdById: string;
  title: string;
  description?: string;
  isActive?: boolean;
}) {
  return prisma.questionCategory.upsert({
    where: { organizerId_title: { organizerId, title } },
    update: { description, isActive, createdById },
    create: { organizerId, title, description, isActive, createdById },
  });
}

async function setCategoryQuestions(categoryId: string, organizerId: string, questionIds: string[]) {
  await prisma.questionCategoryItem.deleteMany({ where: { categoryId } });
  if (questionIds.length === 0) return;
  await prisma.questionCategoryItem.createMany({
    data: questionIds.map((questionId, index) => ({
      categoryId,
      organizerId,
      questionId,
      position: index + 1,
    })),
    skipDuplicates: true,
  });
}

async function upsertGeneratedMockPaper({
  organizerId,
  studentId,
  title,
  questionIds,
}: {
  organizerId: string;
  studentId: string;
  title: string;
  questionIds: string[];
}) {
  const existing = await prisma.mockPaper.findFirst({
    where: { organizerId, studentId, title },
    select: { id: true },
  });

  const mockPaper = existing
    ? await prisma.mockPaper.update({
        where: { id: existing.id },
        data: { status: MockPaperStatus.GENERATED },
      })
    : await prisma.mockPaper.create({
        data: { organizerId, studentId, title, status: MockPaperStatus.GENERATED },
      });

  await prisma.mockPaperItem.deleteMany({ where: { mockPaperId: mockPaper.id } });
  await prisma.mockPaperItem.createMany({
    data: questionIds.map((questionId, index) => ({
      organizerId,
      mockPaperId: mockPaper.id,
      questionId,
      position: index + 1,
    })),
    skipDuplicates: true,
  });

  await prisma.mockSubmission.deleteMany({ where: { mockPaperId: mockPaper.id } });
  return mockPaper;
}

async function upsertReviewedMockSubmission({
  organizerId,
  studentId,
  adminId,
  title,
  questionIds,
}: {
  organizerId: string;
  studentId: string;
  adminId: string;
  title: string;
  questionIds: string[];
}) {
  const mockPaper = await upsertGeneratedMockPaper({ organizerId, studentId, title, questionIds });
  const submission = await prisma.mockSubmission.upsert({
    where: { organizerId_studentId_mockPaperId: { organizerId, studentId, mockPaperId: mockPaper.id } },
    update: { status: MockSubmissionStatus.REVIEWED, reviewedAt: new Date() },
    create: { organizerId, studentId, mockPaperId: mockPaper.id, status: MockSubmissionStatus.REVIEWED, reviewedAt: new Date() },
  });
  await prisma.mockPaper.update({ where: { id: mockPaper.id }, data: { status: MockPaperStatus.ATTEMPTED } });

  const subQuestions = await prisma.subQuestion.findMany({
    where: { questionId: { in: questionIds } },
    orderBy: { position: 'asc' },
  });

  for (const subQuestion of subQuestions) {
    await prisma.mockAnswer.upsert({
      where: { mockSubmissionId_subQuestionId: { mockSubmissionId: submission.id, subQuestionId: subQuestion.id } },
      update: { answerText: `Mock answer for ${subQuestion.label}` },
      create: { organizerId, mockSubmissionId: submission.id, subQuestionId: subQuestion.id, answerText: `Mock answer for ${subQuestion.label}` },
    });
    await prisma.mockGrade.upsert({
      where: { mockSubmissionId_subQuestionId: { mockSubmissionId: submission.id, subQuestionId: subQuestion.id } },
      update: { assignedMarks: Math.floor(subQuestion.marks / 2), comment: 'Seeded feedback', gradedById: adminId },
      create: { organizerId, mockSubmissionId: submission.id, subQuestionId: subQuestion.id, assignedMarks: Math.floor(subQuestion.marks / 2), comment: 'Seeded feedback', gradedById: adminId },
    });
  }

  return submission;
}

async function seedSubmissionAnswersAndGrades({
  submissionId,
  subQuestions,
  adminId,
  reviewed,
}: {
  submissionId: string;
  subQuestions: Awaited<ReturnType<typeof getPaperSubQuestions>>;
  adminId: string;
  reviewed: boolean;
}) {
  if (!reviewed) {
    await prisma.grade.deleteMany({
      where: { submissionId },
    });
  }

  for (const subQuestion of subQuestions) {
    const answerText =
      subQuestion.questionType === GRAPH_QUESTION_TYPE
        ? SAMPLE_GRAPH_ANSWER
        : subQuestion.questionType === TABLE_QUESTION_TYPE
          ? SAMPLE_TABLE_ANSWER
        : `Sample answer for ${subQuestion.label}`;

    await prisma.answer.upsert({
      where: {
        submissionId_subQuestionId: {
          submissionId,
          subQuestionId: subQuestion.id,
        },
      },
      update: {
        answerText,
      },
      create: {
        submissionId,
        subQuestionId: subQuestion.id,
        answerText,
      },
    });

    if (reviewed) {
      await prisma.grade.upsert({
        where: {
          submissionId_subQuestionId: {
            submissionId,
            subQuestionId: subQuestion.id,
          },
        },
        update: {
          assignedMarks: Math.floor(subQuestion.marks / 2),
          gradedById: adminId,
        },
        create: {
          submissionId,
          subQuestionId: subQuestion.id,
          assignedMarks: Math.floor(subQuestion.marks / 2),
          gradedById: adminId,
        },
      });
    }
  }
}

async function main() {
  const organizer = await prisma.organizer.upsert({
    where: { slug: 'default' },
    update: { name: 'Default Organizer' },
    create: { name: 'Default Organizer', slug: 'default' },
  });

  const now = new Date();
  await upsertSubscription({ organizerId: organizer.id, status: SubscriptionStatus.TRIAL, mockPaperLimit: 20, mockPaperUsed: 0 });
  const fixedMockPlan = await upsertStudentSubscriptionPlan({
    organizerId: organizer.id,
    code: 'FIXED_MOCK_ACCESS',
    name: 'Fixed Mock Paper Access',
    mockPaperLimit: 20,
    periodDays: 30,
  });

  const admin = await upsertUser({
    email: 'admin@exam.io',
    name: 'Exam Admin',
    role: OrganizerRole.OWNER,
    password: 'changeMeAdmin1!',
  });

  const studentA = await upsertUser({
    email: 'student1@exam.io',
    name: 'Jane Student',
    schoolCode: 'SCHOOL-001',
    role: OrganizerRole.STUDENT,
    password: 'changeMeStudent1!',
  });

  const studentB = await upsertUser({
    email: 'student2@exam.io',
    name: 'John Candidate',
    schoolCode: 'SCHOOL-002',
    role: OrganizerRole.STUDENT,
    password: 'changeMeStudent2!',
  });

  const additionalOwners = await Promise.all([
    upsertUser({
      email: 'owner2@exam.io',
      name: 'Assessment Owner Two',
      role: OrganizerRole.OWNER,
      password: 'changeMeOwner2!',
    }),
    upsertUser({
      email: 'owner3@exam.io',
      name: 'Assessment Owner Three',
      role: OrganizerRole.OWNER,
      password: 'changeMeOwner3!',
    }),
  ]);

  const additionalStudents = await Promise.all([
    upsertUser({
      email: 'student3@exam.io',
      name: 'Amina Learner',
      schoolCode: 'SCHOOL-003',
      role: OrganizerRole.STUDENT,
      password: 'changeMeStudent3!',
    }),
    upsertUser({
      email: 'student4@exam.io',
      name: 'Liam Candidate',
      schoolCode: 'SCHOOL-004',
      role: OrganizerRole.STUDENT,
      password: 'changeMeStudent4!',
    }),
    upsertUser({
      email: 'student5@exam.io',
      name: 'Maya Practice',
      schoolCode: 'SCHOOL-005',
      role: OrganizerRole.STUDENT,
      password: 'changeMeStudent5!',
    }),
    upsertUser({
      email: 'student6@exam.io',
      name: 'Noah Reviewer',
      schoolCode: 'SCHOOL-006',
      role: OrganizerRole.STUDENT,
      password: 'changeMeStudent6!',
    }),
  ]);

  await ensureMembership(admin.id, organizer.id, OrganizerRole.OWNER);
  for (const owner of additionalOwners) {
    await ensureMembership(owner.id, organizer.id, OrganizerRole.OWNER);
  }
  const defaultStudents = [studentA, studentB, ...additionalStudents];
  for (const [index, student] of defaultStudents.entries()) {
    await ensureMembership(student.id, organizer.id, OrganizerRole.STUDENT);
    await upsertStudentSubscription({
      organizerId: organizer.id,
      studentId: student.id,
      planId: fixedMockPlan.id,
      status: index === 4 ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
      mockPaperLimit: fixedMockPlan.mockPaperLimit,
      mockPaperUsed: index === 0 ? 3 : index === 1 ? 7 : index === 2 ? 19 : 0,
      periodOffsetDays: index === 3 ? 7 : fixedMockPlan.periodDays,
    });
  }

  const runningPaper = await seedPaper(admin.id, organizer.id, {
    title: 'Mathematics Running Paper',
    description: 'Live exam window for testing active submissions',
    durationMinutes: 90,
    startDate: new Date(now.getTime() - 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    earlySubmissionRestrictionMinutes: 10,
    questions: [
      {
        position: 1,
        contentHtml: '<p>Factorise the quadratic expression 2x^2 + 7x + 3.</p>',
        marks: 10,
        subQuestions: [
          { label: 'a', question: 'Show your working', marks: 6, position: 1 },
          { label: 'b', question: 'Provide the factors', marks: 4, position: 2 },
        ],
      },
      {
        position: 2,
        contentHtml:
          '<p>Given a triangle with sides 5cm, 6cm, and 7cm, calculate its area.</p>',
        marks: 15,
        subQuestions: [
          {
            label: 'a',
            question: 'Identify the appropriate formula',
            marks: 5,
            position: 1,
          },
          { label: 'b', question: 'Compute the area', marks: 10, position: 2 },
        ],
      },
      {
        position: 3,
        contentHtml:
          '<p>Plot the data points and draw a line of best fit on the graph.</p>',
        marks: 20,
        subQuestions: [
          {
            label: 'a',
            question: 'Plot the experimental points',
            marks: 10,
            position: 1,
            questionType: GRAPH_QUESTION_TYPE,
          },
          {
            label: 'b',
            question: 'Draw the best fit line',
            marks: 10,
            position: 2,
            questionType: GRAPH_QUESTION_TYPE,
          },
        ],
      },
      {
        position: 4,
        contentHtml:
          '<p>Organize the measured values into a neat data table.</p>',
        marks: 10,
        subQuestions: [
          {
            label: 'a',
            question: 'Create a table with the readings',
            marks: 10,
            position: 1,
            questionType: TABLE_QUESTION_TYPE,
          },
        ],
      },
    ],
  });

  const upcomingPaper = await seedPaper(admin.id, organizer.id, {
    title: 'Physics Upcoming Paper',
    description: 'Future exam window for testing upcoming assessment states',
    durationMinutes: 60,
    startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 26 * 60 * 60 * 1000),
    earlySubmissionRestrictionMinutes: 15,
    questions: [
      {
        position: 1,
        contentHtml:
          '<p>Explain Newton&apos;s second law and give one practical example.</p>',
        marks: 10,
        subQuestions: [
          {
            label: 'a',
            question: 'State the law',
            marks: 4,
            position: 1,
          },
          {
            label: 'b',
            question: 'Give a real-world example',
            marks: 6,
            position: 2,
          },
        ],
      },
      {
        position: 2,
        contentHtml:
          '<p>Describe the difference between scalar and vector quantities.</p>',
        marks: 10,
        subQuestions: [
          {
            label: 'a',
            question: 'Define scalar quantity',
            marks: 5,
            position: 1,
          },
          {
            label: 'b',
            question: 'Define vector quantity',
            marks: 5,
            position: 2,
          },
        ],
      },
    ],
  });

  const mockBankPaper = await seedPaper(admin.id, organizer.id, {
    title: 'Mock Paper Question Bank',
    description: 'Seeded question bank for mock-paper generation test cases',
    durationMinutes: 45,
    startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    earlySubmissionRestrictionMinutes: 0,
    questions: Array.from({ length: 12 }, (_, index) => ({
      position: index + 1,
      contentHtml: `<p>Mock bank question ${index + 1}</p>`,
      marks: 10,
      subQuestions: [
        {
          label: 'a',
          question: `Answer mock bank question ${index + 1}`,
          marks: 10,
          position: 1,
          questionType: DESCRIPTIVE_QUESTION_TYPE as 'DESCRIPTIVE',
        },
      ],
    })),
  });

  const emptyQuestion = await upsertQuestion(mockBankPaper.id, {
    position: 99,
    contentHtml: '<p>Question intentionally seeded without sub-questions.</p>',
    marks: 0,
    subQuestions: [],
  });

  const mockQuestions = await prisma.question.findMany({
    where: { paperId: mockBankPaper.id, position: { lt: 99 } },
    orderBy: { position: 'asc' },
    select: { id: true, position: true },
  });
  const mockQuestionIds = mockQuestions.map((question) => question.id);

  const activeCategory = await upsertCategory({
    organizerId: organizer.id,
    createdById: admin.id,
    title: 'Seed Active Mock Category',
    description: 'Contains enough eligible questions for successful generation',
    isActive: true,
  });
  await setCategoryQuestions(activeCategory.id, organizer.id, mockQuestionIds.slice(0, 10));

  const overlappingCategory = await upsertCategory({
    organizerId: organizer.id,
    createdById: admin.id,
    title: 'Seed Overlap Mock Category',
    description: 'Overlaps with the active category to test question de-duplication',
    isActive: true,
  });
  await setCategoryQuestions(overlappingCategory.id, organizer.id, mockQuestionIds.slice(5, 12));

  const inactiveCategory = await upsertCategory({
    organizerId: organizer.id,
    createdById: admin.id,
    title: 'Seed Inactive Mock Category',
    description: 'Inactive category should be rejected for generation',
    isActive: false,
  });
  await setCategoryQuestions(inactiveCategory.id, organizer.id, mockQuestionIds.slice(0, 3));

  const insufficientCategory = await upsertCategory({
    organizerId: organizer.id,
    createdById: admin.id,
    title: 'Seed Insufficient Mock Category',
    description: 'Not enough eligible questions for generation',
    isActive: true,
  });
  await setCategoryQuestions(insufficientCategory.id, organizer.id, mockQuestionIds.slice(0, 2));

  const noSubQuestionsCategory = await upsertCategory({
    organizerId: organizer.id,
    createdById: admin.id,
    title: 'Seed No Sub-Questions Category',
    description: 'Contains a question without sub-questions and should not count as eligible',
    isActive: true,
  });
  await setCategoryQuestions(noSubQuestionsCategory.id, organizer.id, [emptyQuestion.id]);

  await upsertGeneratedMockPaper({
    organizerId: organizer.id,
    studentId: studentB.id,
    title: 'Seed Unattempted Generated Mock Paper',
    questionIds: mockQuestionIds.slice(0, 10),
  });

  const reviewedMockSubmission = await upsertReviewedMockSubmission({
    organizerId: organizer.id,
    studentId: studentA.id,
    adminId: admin.id,
    title: 'Seed Reviewed Mock Paper',
    questionIds: mockQuestionIds.slice(0, 10),
  });

  const foreignOrganizer = await upsertOrganizer('seed-foreign-tenant', 'Seed Foreign Tenant');
  const foreignAdmin = await upsertUser({
    email: 'foreign-owner@exam.io',
    name: 'Foreign Owner',
    role: OrganizerRole.OWNER,
    password: 'changeMeOwner1!',
    schoolCode: 'seed-foreign-tenant',
  });
  const foreignStudent = await upsertUser({
    email: 'foreign-student@exam.io',
    name: 'Foreign Student',
    role: OrganizerRole.STUDENT,
    password: 'changeMeStudent1!',
    schoolCode: 'seed-foreign-tenant',
  });
  await ensureMembership(foreignAdmin.id, foreignOrganizer.id, OrganizerRole.OWNER);
  await ensureMembership(foreignStudent.id, foreignOrganizer.id, OrganizerRole.STUDENT);
  await upsertSubscription({ organizerId: foreignOrganizer.id, status: SubscriptionStatus.ACTIVE, mockPaperLimit: 20, mockPaperUsed: 0 });
  const foreignFixedMockPlan = await upsertStudentSubscriptionPlan({ organizerId: foreignOrganizer.id });
  await upsertStudentSubscription({ organizerId: foreignOrganizer.id, studentId: foreignStudent.id, planId: foreignFixedMockPlan.id, status: SubscriptionStatus.ACTIVE, mockPaperLimit: foreignFixedMockPlan.mockPaperLimit, mockPaperUsed: 0 });
  const foreignPaper = await seedPaper(foreignAdmin.id, foreignOrganizer.id, {
    title: 'Foreign Tenant Mock Bank',
    description: 'Cross-tenant mock category isolation seed data',
    durationMinutes: 45,
    startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    earlySubmissionRestrictionMinutes: 0,
    questions: Array.from({ length: 10 }, (_, index) => ({
      position: index + 1,
      contentHtml: `<p>Foreign tenant question ${index + 1}</p>`,
      marks: 10,
      subQuestions: [{ label: 'a', question: `Foreign answer ${index + 1}`, marks: 10, position: 1 }],
    })),
  });
  const foreignQuestionIds = (
    await prisma.question.findMany({
      where: { paperId: foreignPaper.id },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
  ).map((question) => question.id);
  const foreignCategory = await upsertCategory({
    organizerId: foreignOrganizer.id,
    createdById: foreignAdmin.id,
    title: 'Seed Foreign Active Mock Category',
    description: 'Should not be visible or usable by the default tenant',
    isActive: true,
  });
  await setCategoryQuestions(foreignCategory.id, foreignOrganizer.id, foreignQuestionIds);

  const expiredOrganizer = await upsertOrganizer('seed-expired-subscription', 'Seed Expired Subscription Tenant');
  const expiredStudent = await upsertUser({ email: 'expired-student@exam.io', name: 'Expired Student', role: OrganizerRole.STUDENT, password: 'changeMeStudent1!', schoolCode: 'seed-expired-subscription' });
  await ensureMembership(expiredStudent.id, expiredOrganizer.id, OrganizerRole.STUDENT);
  await upsertSubscription({ organizerId: expiredOrganizer.id, status: SubscriptionStatus.EXPIRED, mockPaperLimit: 20, mockPaperUsed: 0, periodOffsetDays: -1 });
  const expiredFixedMockPlan = await upsertStudentSubscriptionPlan({ organizerId: expiredOrganizer.id });
  await upsertStudentSubscription({ organizerId: expiredOrganizer.id, studentId: expiredStudent.id, planId: expiredFixedMockPlan.id, status: SubscriptionStatus.ACTIVE, mockPaperLimit: expiredFixedMockPlan.mockPaperLimit, mockPaperUsed: 0 });

  const cancelledOrganizer = await upsertOrganizer('seed-cancelled-subscription', 'Seed Cancelled Subscription Tenant');
  const cancelledStudent = await upsertUser({ email: 'cancelled-student@exam.io', name: 'Cancelled Student', role: OrganizerRole.STUDENT, password: 'changeMeStudent1!', schoolCode: 'seed-cancelled-subscription' });
  await ensureMembership(cancelledStudent.id, cancelledOrganizer.id, OrganizerRole.STUDENT);
  await upsertSubscription({ organizerId: cancelledOrganizer.id, status: SubscriptionStatus.CANCELLED, mockPaperLimit: 20, mockPaperUsed: 0 });
  const cancelledFixedMockPlan = await upsertStudentSubscriptionPlan({ organizerId: cancelledOrganizer.id });
  await upsertStudentSubscription({ organizerId: cancelledOrganizer.id, studentId: cancelledStudent.id, planId: cancelledFixedMockPlan.id, status: SubscriptionStatus.ACTIVE, mockPaperLimit: cancelledFixedMockPlan.mockPaperLimit, mockPaperUsed: 0 });

  const exhaustedOrganizer = await upsertOrganizer('seed-exhausted-quota', 'Seed Exhausted Quota Tenant');
  const exhaustedStudent = await upsertUser({ email: 'exhausted-student@exam.io', name: 'Exhausted Student', role: OrganizerRole.STUDENT, password: 'changeMeStudent1!', schoolCode: 'seed-exhausted-quota' });
  await ensureMembership(exhaustedStudent.id, exhaustedOrganizer.id, OrganizerRole.STUDENT);
  await upsertSubscription({ organizerId: exhaustedOrganizer.id, status: SubscriptionStatus.TRIAL, mockPaperLimit: 1, mockPaperUsed: 0 });
  const exhaustedFixedMockPlan = await upsertStudentSubscriptionPlan({ organizerId: exhaustedOrganizer.id, mockPaperLimit: 1 });
  await upsertStudentSubscription({ organizerId: exhaustedOrganizer.id, studentId: exhaustedStudent.id, planId: exhaustedFixedMockPlan.id, status: SubscriptionStatus.ACTIVE, mockPaperLimit: exhaustedFixedMockPlan.mockPaperLimit, mockPaperUsed: 1 });

  await upsertAccessRequest({
    studentId: studentA.id,
    paperId: runningPaper.id,
    status: AccessStatus.APPROVED,
    decidedById: admin.id,
    organizerId: organizer.id,
  });

  await upsertAccessRequest({
    studentId: studentB.id,
    paperId: runningPaper.id,
    status: AccessStatus.APPROVED,
    decidedById: admin.id,
    organizerId: organizer.id,
  });

  await upsertAccessRequest({
    studentId: studentA.id,
    paperId: upcomingPaper.id,
    status: AccessStatus.APPROVED,
    decidedById: admin.id,
    organizerId: organizer.id,
  });

  await upsertAccessRequest({
    studentId: studentB.id,
    paperId: upcomingPaper.id,
    status: AccessStatus.PENDING,
    organizerId: organizer.id,
  });

  for (const [index, student] of additionalStudents.entries()) {
    await upsertAccessRequest({
      studentId: student.id,
      paperId: runningPaper.id,
      status: index % 2 === 0 ? AccessStatus.APPROVED : AccessStatus.PENDING,
      decidedById: index % 2 === 0 ? additionalOwners[0].id : undefined,
      organizerId: organizer.id,
    });

    await upsertAccessRequest({
      studentId: student.id,
      paperId: upcomingPaper.id,
      status: index < 2 ? AccessStatus.APPROVED : AccessStatus.PENDING,
      decidedById: index < 2 ? admin.id : undefined,
      organizerId: organizer.id,
    });
  }

  const runningSubQuestions = await getPaperSubQuestions(runningPaper.id);

  const reviewedSubmission = await upsertSubmission({
    studentId: studentA.id,
    paperId: runningPaper.id,
    status: SubmissionStatus.REVIEWED,
    organizerId: organizer.id,
  });
  await seedSubmissionAnswersAndGrades({
    submissionId: reviewedSubmission.id,
    subQuestions: runningSubQuestions,
    adminId: admin.id,
    reviewed: true,
  });

  const pendingSubmission = await upsertSubmission({
    studentId: studentB.id,
    paperId: runningPaper.id,
    status: SubmissionStatus.SUBMITTED,
    organizerId: organizer.id,
  });
  await seedSubmissionAnswersAndGrades({
    submissionId: pendingSubmission.id,
    subQuestions: runningSubQuestions,
    adminId: admin.id,
    reviewed: false,
  });

  console.info('Seed completed', {
    adminEmail: admin.email,
    runningPaperId: runningPaper.id,
    upcomingPaperId: upcomingPaper.id,
    reviewedSubmissionId: reviewedSubmission.id,
    pendingSubmissionId: pendingSubmission.id,
    activeMockCategoryId: activeCategory.id,
    overlapMockCategoryId: overlappingCategory.id,
    inactiveMockCategoryId: inactiveCategory.id,
    insufficientMockCategoryId: insufficientCategory.id,
    noSubQuestionsCategoryId: noSubQuestionsCategory.id,
    foreignMockCategoryId: foreignCategory.id,
    reviewedMockSubmissionId: reviewedMockSubmission.id,
  });
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
