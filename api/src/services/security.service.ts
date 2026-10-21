import { randomInt, randomUUID } from 'node:crypto';

import { compare, hash } from 'bcrypt';

import { HttpError } from '../utils/http-error';
import { logger } from '../utils/logger';
import type {
  ExamIncidentInput,
  ExamUnlockInput,
  RotateExamUnlockCodeInput,
} from '../schemas/security.schema';
import { prisma } from '../utils/prisma';

const normalize = (value: string) => value.trim();
const BCRYPT_ROUNDS = 10;
const SECURITY_CONFIG_ID = 'default';

const generateUnlockCode = () => {
  // Eight digits keeps the code easy to read and still non-obvious.
  return randomInt(10_000_000, 100_000_000).toString();
};

type SecurityConfigRow = {
  unlockCodeHash: string;
};

const getSecurityConfig = async (): Promise<SecurityConfigRow | null> => {
  const existing = await prisma.$queryRaw<SecurityConfigRow[]>`
    SELECT "unlockCodeHash"
    FROM "ExamSecurityConfig"
    WHERE "id" = ${SECURITY_CONFIG_ID}
    LIMIT 1
  `;

  if (existing[0]) {
    return existing[0];
  }

  return null;
};

export const securityService = {
  logIncident: async (actorId: string, input: ExamIncidentInput) => {
    logger.warn(
      {
        actorId,
        paperId: input.paperId,
        violationType: input.violationType,
        details: input.details,
      },
      'Exam security incident'
    );

    return {
      logged: true,
    };
  },

  verifyUnlockCode: async (actorId: string, input: ExamUnlockInput) => {
    const config = await getSecurityConfig();
    if (!config) {
      throw new HttpError(409, 'No admin unlock code has been generated yet');
    }
    const isValid = await compare(normalize(input.code), config.unlockCodeHash);

    if (!isValid) {
      logger.warn(
        {
          actorId,
          paperId: input.paperId,
          violationType: 'UNLOCK_ATTEMPT',
        },
        'Invalid exam unlock code'
      );

      throw new HttpError(403, 'Invalid admin unlock code');
    }

    logger.warn(
      {
        actorId,
        paperId: input.paperId,
      },
      'Exam unlocked by admin code'
    );

    return {
      unlocked: true,
    };
  },

  rotateUnlockCode: async (_actorId: string, _input: RotateExamUnlockCodeInput) => {
    const code = generateUnlockCode();
    const codeHash = await hash(code, BCRYPT_ROUNDS);

    await prisma.$executeRaw`
      INSERT INTO "ExamSecurityConfig" ("id", "unlockCodeHash", "createdAt", "updatedAt")
      VALUES (${SECURITY_CONFIG_ID}, ${codeHash}, NOW(), NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "unlockCodeHash" = EXCLUDED."unlockCodeHash",
        "updatedAt" = NOW()
    `;

    logger.warn(
      {
        rotationId: randomUUID(),
      },
      'Exam unlock code rotated'
    );

    return {
      code,
    };
  },
};
