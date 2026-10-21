-- CreateTable
CREATE TABLE "ExamSecurityConfig" (
    "id" TEXT NOT NULL,
    "unlockCodeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSecurityConfig_pkey" PRIMARY KEY ("id")
);
