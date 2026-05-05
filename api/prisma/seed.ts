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
const DRAWING_QUESTION_TYPE = 'DRAWING';
const MCQ_QUESTION_TYPE = 'MCQ';
const IMAGE_COMPOSITION_QUESTION_TYPE = 'IMAGE_COMPOSITION';
const DESCRIPTIVE_QUESTION_TYPE = 'DESCRIPTIVE';
const SAMPLE_MCQ_OPTIONS = {
  options: [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
    { label: 'Option D', value: 'd' },
  ],
};
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
const SAMPLE_DRAWING_ANSWER = JSON.stringify({
  version: 1,
  type: 'drawing',
  canvas: {
    width: 720,
    height: 360,
  },
  elements: [
    {
      id: 'draw-1',
      kind: 'freehand',
      color: '#2563eb',
      strokeWidth: 3,
      points: [
        { x: 72, y: 248 },
        { x: 112, y: 208 },
        { x: 156, y: 224 },
        { x: 202, y: 180 },
      ],
    },
    {
      id: 'draw-2',
      kind: 'rectangle',
      color: '#dc2626',
      strokeWidth: 4,
      from: { x: 274, y: 72 },
      to: { x: 412, y: 168 },
    },
    {
      id: 'draw-3',
      kind: 'arrow',
      color: '#16a34a',
      strokeWidth: 3,
      from: { x: 472, y: 248 },
      to: { x: 612, y: 160 },
    },
  ],
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

const createSampleImageDataUri = (label: string, fill: string, accent: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" rx="20" fill="${fill}"/><circle cx="72" cy="72" r="24" fill="${accent}" opacity="0.35"/><rect x="126" y="40" width="72" height="72" rx="18" fill="${accent}" opacity="0.25"/><text x="120" y="94" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${accent}">${label}</text></svg>`
  )}`;

const SAMPLE_IMAGE_COMPOSITION_BACKGROUND = createSampleImageDataUri(
  'BG',
  '#f8fafc',
  '#0f172a'
);

const SAMPLE_IMAGE_COMPOSITION_TEMPLATE = {
  version: 1,
  canvas: {
    width: 960,
    height: 540,
    backgroundColor: '#ffffff',
  },
  backgroundImage: {
    src: SAMPLE_IMAGE_COMPOSITION_BACKGROUND,
    name: 'Reference background',
    width: 960,
    height: 540,
    fit: 'cover',
  },
  assets: [
    {
      id: 'asset-1',
      src: createSampleImageDataUri('A', '#dbeafe', '#1d4ed8'),
      name: 'Layer A',
      x: 120,
      y: 96,
      width: 220,
      height: 150,
      zIndex: 0,
    },
    {
      id: 'asset-2',
      src: createSampleImageDataUri('B', '#fef3c7', '#b45309'),
      name: 'Layer B',
      x: 320,
      y: 184,
      width: 220,
      height: 150,
      zIndex: 1,
    },
  ],
};

const SAMPLE_IMAGE_COMPOSITION_ANSWER = JSON.stringify({
  version: 1,
  type: 'image-composition',
  canvas: {
    width: 960,
    height: 540,
    backgroundColor: '#ffffff',
  },
  placements: [
    {
      assetId: 'asset-1',
      x: 128,
      y: 96,
      width: 220,
      height: 150,
      zIndex: 0,
    },
    {
      assetId: 'asset-2',
      x: 332,
      y: 182,
      width: 220,
      height: 150,
      zIndex: 1,
    },
  ],
});

type CircuitTemplateSeed = typeof SAMPLE_CIRCUIT_TEMPLATE;

type SubQuestionSeed = {
  label: string;
  question: string;
  marks: number;
  position: number;
  questionType?: 'DESCRIPTIVE' | 'MCQ' | 'GRAPH' | 'TABLE' | 'CIRCUIT' | 'DRAWING' | 'IMAGE_COMPOSITION';
  mcqOptions?: { options: Array<{ label: string; value: string }> };
  circuitTemplate?: CircuitTemplateSeed;
  imageCompositionTemplate?: typeof SAMPLE_IMAGE_COMPOSITION_TEMPLATE;
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
      mcqOptions: seed.mcqOptions ?? undefined,
      circuitTemplate: seed.circuitTemplate ?? undefined,
      imageCompositionTemplate: seed.imageCompositionTemplate ?? undefined,
    },
    create: {
      questionId,
      label: seed.label,
      question: seed.question,
      marks: seed.marks,
      position: seed.position,
      questionType: (seed.questionType ?? DESCRIPTIVE_QUESTION_TYPE) as any,
      mcqOptions: seed.mcqOptions ?? undefined,
      circuitTemplate: seed.circuitTemplate ?? undefined,
      imageCompositionTemplate: seed.imageCompositionTemplate ?? undefined,
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
          mcqOptions: true,
        },
      },
    },
  });

  return questions.flatMap((question) => question.subQuestions);
}

type SeededSubQuestion = Awaited<ReturnType<typeof getPaperSubQuestions>>[number];

const getSeedAnswerText = (subQuestion: SeededSubQuestion) => {
  if (subQuestion.questionType === GRAPH_QUESTION_TYPE) {
    return SAMPLE_GRAPH_ANSWER;
  }

  if (subQuestion.questionType === TABLE_QUESTION_TYPE) {
    return SAMPLE_TABLE_ANSWER;
  }

  if (subQuestion.questionType === CIRCUIT_QUESTION_TYPE) {
    return SAMPLE_CIRCUIT_ANSWER;
  }

  if (subQuestion.questionType === DRAWING_QUESTION_TYPE) {
    return SAMPLE_DRAWING_ANSWER;
  }

  if (subQuestion.questionType === IMAGE_COMPOSITION_QUESTION_TYPE) {
    return SAMPLE_IMAGE_COMPOSITION_ANSWER;
  }

  if (subQuestion.questionType === MCQ_QUESTION_TYPE) {
    const mcqOptions = subQuestion.mcqOptions as
      | { options?: Array<{ label?: string; value?: string }> }
      | null
      | undefined;

    const options =
      mcqOptions &&
      typeof mcqOptions === 'object' &&
      !Array.isArray(mcqOptions) &&
      'options' in mcqOptions &&
      Array.isArray((mcqOptions as { options?: unknown }).options)
        ? ((mcqOptions as { options?: Array<{ label?: string; value?: string }> }).options ?? [])
        : [];

    const selectedOption = options.find(
      (option) => typeof option?.value === 'string' && option.value
    ) ?? options[0];

    return selectedOption?.value ?? 'a';
  }

  return `Sample answer for ${subQuestion.label}`;
};

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
  subQuestions: SeededSubQuestion[];
  adminId: string;
  reviewed: boolean;
}) {
  if (!reviewed) {
    await prisma.grade.deleteMany({
      where: { submissionId },
    });
  }

  for (const subQuestion of subQuestions) {
    const answerText = getSeedAnswerText(subQuestion);

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

  const studentC = await upsertUser({
    email: 'student3@exam.io',
    name: 'Student 3',
    schoolCode: 'SCHOOL-003',
    role: UserRole.STUDENT,
    password: 'changeMeStudent3!',
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
          '<p>Choose the correct answer for the simplified form of 3x + 4x.</p>',
        marks: 10,
        subQuestions: [
          {
            label: 'a',
            question: 'Select the correct option',
            marks: 10,
            position: 1,
            questionType: MCQ_QUESTION_TYPE,
            mcqOptions: SAMPLE_MCQ_OPTIONS,
          },
        ],
      },
      {
        position: 4,
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
        position: 5,
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
        position: 6,
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
      {
        position: 7,
        contentHtml:
          '<p>Create a sketch that shows a square, a curved line, and an arrow.</p>',
        marks: 10,
        subQuestions: [
          {
            label: 'a',
            question: 'Draw the requested shapes on the canvas',
            marks: 10,
            position: 1,
            questionType: DRAWING_QUESTION_TYPE,
          },
        ],
      },
      {
        position: 8,
        contentHtml:
          '<p>Arrange the provided images into a layered composition on the canvas.</p>',
        marks: 10,
        subQuestions: [
          {
            label: 'a',
            question: 'Drag, resize, and layer the images to match the reference layout',
            marks: 10,
            position: 1,
            questionType: IMAGE_COMPOSITION_QUESTION_TYPE,
            imageCompositionTemplate: SAMPLE_IMAGE_COMPOSITION_TEMPLATE,
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
    studentId: studentC.id,
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

  const participatingSubmission = await upsertSubmission({
    studentId: studentC.id,
    paperId: runningPaper.id,
    status: SubmissionStatus.SUBMITTED,
  });
  await seedSubmissionAnswersAndGrades({
    submissionId: participatingSubmission.id,
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
    participatingSubmissionId: participatingSubmission.id,
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
