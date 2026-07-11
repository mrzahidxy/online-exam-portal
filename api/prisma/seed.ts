import {
  AccessStatus,
  OrganizerRole,
  PaperStatus,
  PlatformRole,
  PrismaClient,
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

  await prisma.organizerMembership.upsert({
    where: { userId_organizerId: { userId: admin.id, organizerId: organizer.id } },
    update: { role: OrganizerRole.OWNER },
    create: { organizerId: organizer.id, userId: admin.id, role: OrganizerRole.OWNER },
  });
  for (const student of [studentA, studentB]) {
    await prisma.organizerMembership.upsert({
      where: { userId_organizerId: { userId: student.id, organizerId: organizer.id } },
      update: { role: OrganizerRole.STUDENT },
      create: { organizerId: organizer.id, userId: student.id, role: OrganizerRole.STUDENT },
    });
  }

  const now = new Date();
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
