-- Mock-only parent questions do not belong to an assessment paper.
ALTER TABLE "Question"
ALTER COLUMN "paperId" DROP NOT NULL;
