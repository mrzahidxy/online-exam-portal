import {
  AccessStatus,
  PaperStatus,
  PrismaClient,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';

import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();
const GRAPH_QUESTION_TYPE = 'GRAPH';
const TABLE_QUESTION_TYPE = 'TABLE';
const CIRCUIT_QUESTION_TYPE = 'CIRCUIT';
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
const SAMPLE_CIRCUIT_ANSWER = JSON.stringify({
  version: 1,
  type: 'circuit',
  switchOn: true,
  connections: [
    { from: 'battery.positive', to: 'switch.left' },
    { from: 'switch.right', to: 'bulb.left' },
    { from: 'battery.negative', to: 'bulb.right' },
  ],
  derived: {
    isClosedCircuit: true,
    litBulbs: 1,
  },
});
const SAMPLE_CIRCUIT_TEMPLATE = {
  version: 1,
  width: 720,
  height: 320,
  battery: { x: 40, y: 68 },
  switch: { x: 248, y: 104 },
  bulb: { x: 582, y: 160 },
};

type CircuitTemplateSeed = typeof SAMPLE_CIRCUIT_TEMPLATE;

type SubQuestionSeed = {
  label: string;
  question: string;
  marks: number;
  position: number;
  questionType?: 'DESCRIPTIVE' | 'MCQ' | 'GRAPH' | 'TABLE' | 'CIRCUIT';
  circuitTemplate?: CircuitTemplateSeed;
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
  role: UserRole;
  password: string;
  schoolCode?: string;
}) {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      schoolCode,
      passwordHash,
    },
    create: {
      email,
      name,
      role,
      schoolCode,
      passwordHash,
    },
  });
}

async function upsertPaper(adminId: string, seed: PaperSeed) {
  const existing = await prisma.questionPaper.findFirst({
    where: { title: seed.title },
  });

  if (!existing) {
    return prisma.questionPaper.create({
      data: {
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
      circuitTemplate: seed.circuitTemplate ?? undefined,
    },
    create: {
      questionId,
      label: seed.label,
      question: seed.question,
      marks: seed.marks,
      position: seed.position,
      questionType: (seed.questionType ?? DESCRIPTIVE_QUESTION_TYPE) as any,
      circuitTemplate: seed.circuitTemplate ?? undefined,
    },
  });
}

async function seedPaper(adminId: string, seed: PaperSeed) {
  const paper = await upsertPaper(adminId, seed);

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
}: {
  studentId: string;
  paperId: string;
  status: AccessStatus;
  decidedById?: string | null;
}) {
  return prisma.accessRequest.upsert({
    where: {
      studentId_paperId: {
        studentId,
        paperId,
      },
    },
    update: {
      status,
      decidedById: decidedById ?? null,
      decidedAt: decidedById ? new Date() : null,
    },
    create: {
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
}: {
  studentId: string;
  paperId: string;
  status: SubmissionStatus;
}) {
  return prisma.submission.upsert({
    where: {
      studentId_paperId: {
        studentId,
        paperId,
      },
    },
    update: {
      status,
      submittedAt: new Date(),
    },
    create: {
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
          : subQuestion.questionType === CIRCUIT_QUESTION_TYPE
            ? SAMPLE_CIRCUIT_ANSWER
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
  const admin = await upsertUser({
    email: 'admin@exam.io',
    name: 'Exam Admin',
    role: UserRole.ADMIN,
    password: 'changeMeAdmin1!',
  });

  const studentA = await upsertUser({
    email: 'student1@exam.io',
    name: 'Jane Student',
    schoolCode: 'SCHOOL-001',
    role: UserRole.STUDENT,
    password: 'changeMeStudent1!',
  });

  const studentB = await upsertUser({
    email: 'student2@exam.io',
    name: 'John Candidate',
    schoolCode: 'SCHOOL-002',
    role: UserRole.STUDENT,
    password: 'changeMeStudent2!',
  });

  const now = new Date();
  const runningPaper = await seedPaper(admin.id, {
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
      {
        position: 5,
        contentHtml:
          '<p>Build the simple circuit shown in the answer board and close the switch.</p>',
        marks: 10,
        subQuestions: [
          {
            label: 'a',
            question: 'Connect the terminals to complete the circuit',
            marks: 10,
            position: 1,
            questionType: CIRCUIT_QUESTION_TYPE,
            circuitTemplate: SAMPLE_CIRCUIT_TEMPLATE,
          },
        ],
      },
    ],
  });

  const upcomingPaper = await seedPaper(admin.id, {
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
  });

  await upsertAccessRequest({
    studentId: studentB.id,
    paperId: runningPaper.id,
    status: AccessStatus.APPROVED,
    decidedById: admin.id,
  });

  await upsertAccessRequest({
    studentId: studentA.id,
    paperId: upcomingPaper.id,
    status: AccessStatus.APPROVED,
    decidedById: admin.id,
  });

  await upsertAccessRequest({
    studentId: studentB.id,
    paperId: upcomingPaper.id,
    status: AccessStatus.PENDING,
  });

  const runningSubQuestions = await getPaperSubQuestions(runningPaper.id);

  const reviewedSubmission = await upsertSubmission({
    studentId: studentA.id,
    paperId: runningPaper.id,
    status: SubmissionStatus.REVIEWED,
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
