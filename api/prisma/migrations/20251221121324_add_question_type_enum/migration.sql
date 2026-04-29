/*
  Warnings:

  - The `questionType` column on the `SubQuestion` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('DESCRIPTIVE', 'MCQ');

-- AlterTable
ALTER TABLE "SubQuestion" DROP COLUMN "questionType",
ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'DESCRIPTIVE';
