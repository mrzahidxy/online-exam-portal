import { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../types/http';
import { sendSuccess } from '../utils/response';
import { securityService } from '../services/security.service';
import type {
  ExamIncidentInput,
  ExamUnlockInput,
  RotateExamUnlockCodeInput,
} from '../schemas/security.schema';

export const securityController = {
  logIncident: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = req.body as ExamIncidentInput;
      const result = await securityService.logIncident(req.user.id, payload);
      sendSuccess(res, 201, 'Security incident logged', result);
    } catch (error) {
      next(error);
    }
  },

  verifyUnlockCode: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = req.body as ExamUnlockInput;
      const result = await securityService.verifyUnlockCode(req.user.id, payload);
      sendSuccess(res, 200, 'Exam unlocked', result);
    } catch (error) {
      next(error);
    }
  },

  rotateUnlockCode: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = (req.body ?? {}) as RotateExamUnlockCodeInput;
      const result = await securityService.rotateUnlockCode(req.user.id, payload);
      sendSuccess(res, 200, 'Exam unlock code rotated', result);
    } catch (error) {
      next(error);
    }
  },
};
