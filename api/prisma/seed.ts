import {
  AccessStatus,
  PaperStatus,
  PrismaClient,
  QuestionType,
  UserRole,
} from '@prisma/client';

import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();
const DRAWING_QUESTION_TYPE = QuestionType.DRAWING;
const MCQ_QUESTION_TYPE = QuestionType.MCQ;
const DESCRIPTIVE_QUESTION_TYPE = QuestionType.DESCRIPTIVE;
const SAMPLE_MCQ_OPTIONS = {
  options: [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
    { label: 'Option D', value: 'd' },
  ],
};
type SubQuestionSeed = {
  label: string;
  question: string;
  marks: number;
  position: number;
  questionType?: 'DESCRIPTIVE' | 'MCQ' | 'DRAWING';
  mcqOptions?: { options: Array<{ label: string; value: string }> };
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
              questionType:
                subQuestion.questionType ?? DESCRIPTIVE_QUESTION_TYPE,
              mcqOptions: subQuestion.mcqOptions,
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
      description: 'Live exam window covering the supported beta question types',
      durationMinutes: 120,
      startDate: new Date(now.getTime() - 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      earlySubmissionRestrictionMinutes: 10,
      questions: [
        {
          position: 1,
          contentHtml:
            '<p>Factorise the quadratic expression 2x^2 + 7x + 3.</p>',
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
      ],
    }),
    createPaper(admin.id, {
      title: 'Beta Question Type Examples Paper',
      description:
        'Sample exam containing descriptive, multiple-choice, and drawing questions',
      durationMinutes: 75,
      startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      earlySubmissionRestrictionMinutes: 10,
      questions: [
        {
          position: 1,
          contentHtml:
            '<p>Explain how you would solve the equation 2x + 5 = 13.</p>',
          marks: 10,
          subQuestions: [
            {
              label: 'a',
              question: 'Show your working and state the value of x.',
              marks: 10,
              position: 1,
              questionType: DESCRIPTIVE_QUESTION_TYPE,
            },
          ],
        },
        {
          position: 2,
          contentHtml: '<p>Which value of x satisfies 3x = 18?</p>',
          marks: 5,
          subQuestions: [
            {
              label: 'a',
              question: 'Select the correct value of x.',
              marks: 5,
              position: 1,
              questionType: MCQ_QUESTION_TYPE,
              mcqOptions: {
                options: [
                  { label: 'x = 3', value: '3' },
                  { label: 'x = 6', value: '6' },
                  { label: 'x = 9', value: '9' },
                ],
              },
            },
          ],
        },
        {
          position: 3,
          contentHtml:
            '<p>Sketch a number line from 0 to 10 and mark the value 7.</p>',
          marks: 10,
          subQuestions: [
            {
              label: 'a',
              question: 'Draw the number line and mark 7.',
              marks: 10,
              position: 1,
              questionType: DRAWING_QUESTION_TYPE,
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
