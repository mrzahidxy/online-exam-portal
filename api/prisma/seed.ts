import {
  AccessStatus,
  PaperStatus,
  PrismaClient,
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
const INTERACTIVE_TABLE_QUESTION_TYPE = 'INTERACTIVE_TABLE';
const DESCRIPTIVE_QUESTION_TYPE = 'DESCRIPTIVE';
const SAMPLE_MCQ_OPTIONS = {
  options: [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
    { label: 'Option D', value: 'd' },
  ],
};
const INTERACTIVE_TABLE_TEMPLATES = {
  inequalities: {
    version: 1,
    columns: [
      { id: 'draggable_inequalities', label: 'Draggable inequalities' },
      { id: 'inequality', label: 'Inequalities' },
      { id: 'description', label: 'Description of region in words' },
    ],
    rows: [
      {
        id: 'single_lessons',
        cells: [
          { type: 'drag_item', value: '<' },
          { type: 'text', value: 'S >= 10' },
          {
            type: 'text_input',
            id: 'single_lessons_words',
            before: 'The number of single lessons is',
            placeholder: '',
            required: true,
          },
        ],
      },
      {
        id: 'double_lessons',
        cells: [
          { type: 'drag_item', value: '>=' },
          {
            type: 'drop_zone',
            id: 'double_lessons_sign',
            before: 'D',
            after: '5',
            options: ['<', '>=', '>', '<='],
            placeholder: '',
            required: true,
          },
          {
            type: 'text_input',
            id: 'double_lessons_words',
            before: 'The number of double lessons is',
            placeholder: '',
            required: true,
          },
        ],
      },
      {
        id: 'total_lessons',
        cells: [
          { type: 'drag_item', value: '>' },
          {
            type: 'drop_zone',
            id: 'total_lessons_sign',
            before: 'S + D',
            after: '16',
            options: ['<', '>=', '>', '<='],
            placeholder: '',
            required: true,
          },
          {
            type: 'text_input',
            id: 'total_lessons_words',
            before: 'The total number of single and double lessons is',
            placeholder: '',
            required: true,
          },
        ],
      },
      {
        id: 'cost_limit',
        cells: [
          { type: 'drag_item', value: '<=' },
          {
            type: 'drop_zone',
            id: 'cost_limit_sign',
            before: '5S + 8D',
            after: '92',
            options: ['<', '>=', '>', '<='],
            placeholder: '',
            required: true,
          },
          { type: 'empty' },
        ],
      },
    ],
    modelAnswer: {
      single_lessons_words: 'at least 10',
      double_lessons_sign: '>=',
      double_lessons_words: 'at least 5',
      total_lessons_sign: '<=',
      total_lessons_words: 'at most 16',
      cost_limit_sign: '<=',
    },
  },
  metricTimes: {
    version: 1,
    columns: [
      { id: 'school_event', label: 'School event' },
      { id: 'metric_time', label: 'Metric time' },
      { id: 'standard_form', label: 'Metric seconds in standard form' },
    ],
    rows: [
      {
        id: 'examination',
        cells: [
          { type: 'text', value: 'Examination' },
          { type: 'text', value: '90 minutes' },
          {
            type: 'text_input',
            id: 'examination_standard_form',
            format: 'standard_form',
            before: '',
            placeholder: '',
            required: true,
          },
        ],
      },
      {
        id: 'school_day',
        cells: [
          { type: 'text', value: 'School day' },
          { type: 'text', value: '2 hours and 40 minutes' },
          {
            type: 'text_input',
            id: 'school_day_standard_form',
            format: 'standard_form',
            before: '',
            placeholder: '',
            required: true,
          },
        ],
      },
      {
        id: 'run_10_kilometres',
        cells: [
          { type: 'text', value: 'Time to run 10 kilometres' },
          {
            type: 'text_input',
            id: 'run_metric_time',
            before: '',
            placeholder: '',
            required: true,
          },
          { type: 'text', value: '5.3 x 10^3' },
        ],
      },
      {
        id: 'kilimanjaro',
        cells: [
          { type: 'text', value: 'Climbing mount Kilimanjaro' },
          { type: 'text', value: '4 days, 2 hours and 5 minutes' },
          {
            type: 'text_input',
            id: 'kilimanjaro_standard_form',
            format: 'standard_form',
            before: '',
            placeholder: '',
            required: true,
          },
        ],
      },
    ],
    modelAnswer: {
      examination_standard_form:
        '{"coefficient":"5.4","base":"10","power":"3"}',
      school_day_standard_form:
        '{"coefficient":"9.6","base":"10","power":"3"}',
      run_metric_time: '88 minutes 20 seconds',
      kilimanjaro_standard_form:
        '{"coefficient":"3.531","base":"10","power":"5"}',
    },
  },
};
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

type CircuitTemplateSeed = typeof SAMPLE_CIRCUIT_TEMPLATE;
type InteractiveTableTemplateSeed =
  (typeof INTERACTIVE_TABLE_TEMPLATES)[keyof typeof INTERACTIVE_TABLE_TEMPLATES];

type SubQuestionSeed = {
  label: string;
  question: string;
  marks: number;
  position: number;
  questionType?:
    | 'DESCRIPTIVE'
    | 'MCQ'
    | 'GRAPH'
    | 'TABLE'
    | 'INTERACTIVE_TABLE'
    | 'CIRCUIT'
    | 'DRAWING'
    | 'IMAGE_COMPOSITION';
  mcqOptions?: { options: Array<{ label: string; value: string }> };
  template?: InteractiveTableTemplateSeed;
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

async function createUser({
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

async function createPaper(adminId: string, seed: PaperSeed) {
  const existingPaper = await prisma.questionPaper.findFirst({
    where: { title: seed.title },
    select: { id: true },
  });

  if (existingPaper) {
    await prisma.questionPaper.delete({
      where: { id: existingPaper.id },
    });
  }

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
      questions: {
        create: seed.questions.map((question) => ({
          contentHtml: question.contentHtml,
          marks: question.marks,
          position: question.position,
          subQuestions: {
            create: question.subQuestions.map((subQuestion) => ({
              label: subQuestion.label,
              question: subQuestion.question,
              marks: subQuestion.marks,
              position: subQuestion.position,
              questionType: (subQuestion.questionType ??
                DESCRIPTIVE_QUESTION_TYPE) as any,
              mcqOptions: subQuestion.mcqOptions,
              template: subQuestion.template,
              circuitTemplate: subQuestion.circuitTemplate,
              imageCompositionTemplate: subQuestion.imageCompositionTemplate,
            })),
          },
        })),
      },
    },
  });
}

async function main() {
  const admin = await createUser({
    email: 'admin@exam.io',
    name: 'Exam Admin',
    role: UserRole.ADMIN,
    password: 'changeMeAdmin1!',
  });

  const studentA = await createUser({
    email: 'student1@exam.io',
    name: 'Jane Student',
    schoolCode: 'SCHOOL-001',
    role: UserRole.STUDENT,
    password: 'changeMeStudent1!',
  });

  const studentB = await createUser({
    email: 'student2@exam.io',
    name: 'John Candidate',
    schoolCode: 'SCHOOL-002',
    role: UserRole.STUDENT,
    password: 'changeMeStudent2!',
  });

  const studentC = await createUser({
    email: 'student3@exam.io',
    name: 'Student 3',
    schoolCode: 'SCHOOL-003',
    role: UserRole.STUDENT,
    password: 'changeMeStudent3!',
  });

  const now = new Date();
  const papers = await Promise.all([
    createPaper(admin.id, {
      title: 'All Question Types Paper',
      description: 'Live exam window that covers every supported question type',
      durationMinutes: 120,
      startDate: new Date(now.getTime() - 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 3 * 60 * 60 * 1000),
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
            '<p>Complete the inequalities table by dragging the correct symbols and typing the missing descriptions.</p>',
          marks: 15,
          subQuestions: [
            {
              label: 'a',
              question: 'Drag the inequality symbols into the blanks and write the missing statements',
              marks: 15,
              position: 1,
              questionType: INTERACTIVE_TABLE_QUESTION_TYPE,
              template: INTERACTIVE_TABLE_TEMPLATES.inequalities,
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
    }),
    createPaper(admin.id, {
      title: 'Interactive Table Examples Paper',
      description: 'Focused exam window with the two trimmed interactive-table layouts',
      durationMinutes: 75,
      startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      earlySubmissionRestrictionMinutes: 10,
      questions: [
        {
          position: 1,
          contentHtml:
            '<p>Complete the inequalities table.</p>',
          marks: 15,
          subQuestions: [
            {
              label: 'a',
              question: 'Use drag and drop for the inequality signs and type the missing words',
              marks: 15,
              position: 1,
              questionType: INTERACTIVE_TABLE_QUESTION_TYPE,
              template: INTERACTIVE_TABLE_TEMPLATES.inequalities,
            },
          ],
        },
        {
          position: 2,
          contentHtml:
            '<p>Write down the missing times in the following table.</p>',
          marks: 12,
          subQuestions: [
            {
              label: 'a',
              question: 'Type the missing metric times and standard-form seconds',
              marks: 12,
              position: 1,
              questionType: INTERACTIVE_TABLE_QUESTION_TYPE,
              template: INTERACTIVE_TABLE_TEMPLATES.metricTimes,
            },
          ],
        },
      ],
    }),
  ]);

  await prisma.accessRequest.createMany({
    data: papers.map((paper) => ({
      studentId: studentA.id,
      paperId: paper.id,
      status: AccessStatus.APPROVED,
      decidedById: admin.id,
      decidedAt: new Date(),
    })),
  });

  console.info('Seed completed', {
    adminEmail: admin.email,
    studentEmails: [studentA.email, studentB.email, studentC.email],
    approvedStudentEmail: studentA.email,
    paperIds: papers.map((paper) => paper.id),
    accessApprovalsCreated: papers.length,
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
