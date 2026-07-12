-- CreateEnum
CREATE TYPE "MockPaperStatus" AS ENUM ('GENERATED', 'ATTEMPTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MockSubmissionStatus" AS ENUM ('SUBMITTED', 'REVIEWED');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "planCode" TEXT NOT NULL DEFAULT 'TRIAL',
    "mockPaperLimit" INTEGER NOT NULL DEFAULT 20,
    "mockPaperUsed" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "provider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "providerPriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubscriptionPlan" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mockPaperLimit" INTEGER NOT NULL DEFAULT 0,
    "periodDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT,
    "providerPriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubscription" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "planId" UUID,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'EXPIRED',
    "mockPaperLimit" INTEGER NOT NULL DEFAULT 0,
    "mockPaperUsed" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "provider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "providerPriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCategory" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCategoryItem" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "QuestionCategoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockPaper" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "MockPaperStatus" NOT NULL DEFAULT 'GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockPaperItem" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "mockPaperId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "MockPaperItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockSubmission" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "mockPaperId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "MockSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockAnswer" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "mockSubmissionId" UUID NOT NULL,
    "subQuestionId" UUID NOT NULL,
    "answerText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockGrade" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "mockSubmissionId" UUID NOT NULL,
    "subQuestionId" UUID NOT NULL,
    "assignedMarks" INTEGER NOT NULL,
    "comment" TEXT,
    "gradedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizerId_key" ON "Subscription"("organizerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "StudentSubscriptionPlan_organizerId_isActive_idx" ON "StudentSubscriptionPlan"("organizerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSubscriptionPlan_organizerId_code_key" ON "StudentSubscriptionPlan"("organizerId", "code");

-- CreateIndex
CREATE INDEX "StudentSubscription_organizerId_idx" ON "StudentSubscription"("organizerId");

-- CreateIndex
CREATE INDEX "StudentSubscription_studentId_idx" ON "StudentSubscription"("studentId");

-- CreateIndex
CREATE INDEX "StudentSubscription_status_idx" ON "StudentSubscription"("status");

-- CreateIndex
CREATE INDEX "StudentSubscription_currentPeriodEnd_idx" ON "StudentSubscription"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSubscription_organizerId_studentId_key" ON "StudentSubscription"("organizerId", "studentId");

-- CreateIndex
CREATE INDEX "QuestionCategory_organizerId_isActive_title_idx" ON "QuestionCategory"("organizerId", "isActive", "title");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategory_organizerId_title_key" ON "QuestionCategory"("organizerId", "title");

-- CreateIndex
CREATE INDEX "QuestionCategoryItem_organizerId_questionId_idx" ON "QuestionCategoryItem"("organizerId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategoryItem_categoryId_questionId_key" ON "QuestionCategoryItem"("categoryId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategoryItem_categoryId_position_key" ON "QuestionCategoryItem"("categoryId", "position");

-- CreateIndex
CREATE INDEX "MockPaper_organizerId_studentId_status_idx" ON "MockPaper"("organizerId", "studentId", "status");

-- CreateIndex
CREATE INDEX "MockPaper_organizerId_status_createdAt_idx" ON "MockPaper"("organizerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MockPaperItem_organizerId_questionId_idx" ON "MockPaperItem"("organizerId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockPaperItem_mockPaperId_questionId_key" ON "MockPaperItem"("mockPaperId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockPaperItem_mockPaperId_position_key" ON "MockPaperItem"("mockPaperId", "position");

-- CreateIndex
CREATE INDEX "MockSubmission_organizerId_mockPaperId_idx" ON "MockSubmission"("organizerId", "mockPaperId");

-- CreateIndex
CREATE INDEX "MockSubmission_organizerId_status_submittedAt_idx" ON "MockSubmission"("organizerId", "status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MockSubmission_organizerId_studentId_mockPaperId_key" ON "MockSubmission"("organizerId", "studentId", "mockPaperId");

-- CreateIndex
CREATE INDEX "MockAnswer_organizerId_subQuestionId_idx" ON "MockAnswer"("organizerId", "subQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockAnswer_mockSubmissionId_subQuestionId_key" ON "MockAnswer"("mockSubmissionId", "subQuestionId");

-- CreateIndex
CREATE INDEX "MockGrade_organizerId_subQuestionId_idx" ON "MockGrade"("organizerId", "subQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockGrade_mockSubmissionId_subQuestionId_key" ON "MockGrade"("mockSubmissionId", "subQuestionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubscriptionPlan" ADD CONSTRAINT "StudentSubscriptionPlan_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubscription" ADD CONSTRAINT "StudentSubscription_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubscription" ADD CONSTRAINT "StudentSubscription_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubscription" ADD CONSTRAINT "StudentSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudentSubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategoryItem" ADD CONSTRAINT "QuestionCategoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuestionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategoryItem" ADD CONSTRAINT "QuestionCategoryItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockPaper" ADD CONSTRAINT "MockPaper_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockPaper" ADD CONSTRAINT "MockPaper_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockPaperItem" ADD CONSTRAINT "MockPaperItem_mockPaperId_fkey" FOREIGN KEY ("mockPaperId") REFERENCES "MockPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockPaperItem" ADD CONSTRAINT "MockPaperItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockSubmission" ADD CONSTRAINT "MockSubmission_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockSubmission" ADD CONSTRAINT "MockSubmission_mockPaperId_fkey" FOREIGN KEY ("mockPaperId") REFERENCES "MockPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockSubmission" ADD CONSTRAINT "MockSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAnswer" ADD CONSTRAINT "MockAnswer_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAnswer" ADD CONSTRAINT "MockAnswer_mockSubmissionId_fkey" FOREIGN KEY ("mockSubmissionId") REFERENCES "MockSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAnswer" ADD CONSTRAINT "MockAnswer_subQuestionId_fkey" FOREIGN KEY ("subQuestionId") REFERENCES "SubQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockGrade" ADD CONSTRAINT "MockGrade_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockGrade" ADD CONSTRAINT "MockGrade_mockSubmissionId_fkey" FOREIGN KEY ("mockSubmissionId") REFERENCES "MockSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockGrade" ADD CONSTRAINT "MockGrade_subQuestionId_fkey" FOREIGN KEY ("subQuestionId") REFERENCES "SubQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockGrade" ADD CONSTRAINT "MockGrade_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
