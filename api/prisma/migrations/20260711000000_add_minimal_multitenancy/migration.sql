-- Minimal multi-tenant conversion.
-- Backfills all existing assessment data into one default organizer and converts old
-- assessment ADMIN users into OWNER memberships. Platform ADMIN must be assigned
-- explicitly after migration, e.g.:
--   UPDATE "User" SET "platformRole" = 'ADMIN' WHERE email = 'admin@example.com';

CREATE TYPE "PlatformRole" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "OrganizerRole" AS ENUM ('OWNER', 'STUDENT');
CREATE TYPE "OrganizerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "Organizer" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OrganizerStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "subscriptionEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organizer_slug_key" ON "Organizer"("slug");

CREATE TABLE "OrganizerMembership" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "OrganizerRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizerMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizerMembership_userId_organizerId_key" ON "OrganizerMembership"("userId", "organizerId");
CREATE INDEX "OrganizerMembership_organizerId_idx" ON "OrganizerMembership"("organizerId");
CREATE INDEX "OrganizerMembership_userId_status_idx" ON "OrganizerMembership"("userId", "status");
CREATE INDEX "OrganizerMembership_organizerId_role_status_idx" ON "OrganizerMembership"("organizerId", "role", "status");

ALTER TABLE "OrganizerMembership" ADD CONSTRAINT "OrganizerMembership_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerMembership" ADD CONSTRAINT "OrganizerMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';

INSERT INTO "Organizer" ("id", "name", "slug", "status", "subscriptionStatus", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organizer', 'default', 'ACTIVE', 'TRIAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "QuestionPaper" ADD COLUMN "organizerId" UUID;
ALTER TABLE "AccessRequest" ADD COLUMN "organizerId" UUID;
ALTER TABLE "Submission" ADD COLUMN "organizerId" UUID;

UPDATE "QuestionPaper"
SET "organizerId" = '00000000-0000-0000-0000-000000000001'
WHERE "organizerId" IS NULL;

UPDATE "AccessRequest" ar
SET "organizerId" = qp."organizerId"
FROM "QuestionPaper" qp
WHERE ar."paperId" = qp."id" AND ar."organizerId" IS NULL;

UPDATE "Submission" s
SET "organizerId" = qp."organizerId"
FROM "QuestionPaper" qp
WHERE s."paperId" = qp."id" AND s."organizerId" IS NULL;

INSERT INTO "OrganizerMembership" ("id", "organizerId", "userId", "role", "status", "createdAt", "updatedAt")
SELECT (substr(md5('membership:' || u."id"::text), 1, 8) || '-' || substr(md5('membership:' || u."id"::text), 9, 4) || '-' || substr(md5('membership:' || u."id"::text), 13, 4) || '-' || substr(md5('membership:' || u."id"::text), 17, 4) || '-' || substr(md5('membership:' || u."id"::text), 21, 12))::uuid,
       '00000000-0000-0000-0000-000000000001', u."id",
       CASE WHEN u."role" = 'ADMIN' THEN 'OWNER'::"OrganizerRole" ELSE 'STUDENT'::"OrganizerRole" END,
       'ACTIVE'::"MembershipStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
ON CONFLICT ("userId", "organizerId") DO NOTHING;

ALTER TABLE "QuestionPaper" ALTER COLUMN "organizerId" SET NOT NULL;
ALTER TABLE "AccessRequest" ALTER COLUMN "organizerId" SET NOT NULL;
ALTER TABLE "Submission" ALTER COLUMN "organizerId" SET NOT NULL;

CREATE INDEX "QuestionPaper_organizerId_status_startDate_idx" ON "QuestionPaper"("organizerId", "status", "startDate");
CREATE INDEX "QuestionPaper_organizerId_createdAt_idx" ON "QuestionPaper"("organizerId", "createdAt");
CREATE INDEX "AccessRequest_organizerId_status_createdAt_idx" ON "AccessRequest"("organizerId", "status", "createdAt");
CREATE INDEX "AccessRequest_organizerId_paperId_status_idx" ON "AccessRequest"("organizerId", "paperId", "status");
CREATE INDEX "Submission_organizerId_status_submittedAt_idx" ON "Submission"("organizerId", "status", "submittedAt");
CREATE INDEX "Submission_organizerId_paperId_idx" ON "Submission"("organizerId", "paperId");

ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "UserRole";
