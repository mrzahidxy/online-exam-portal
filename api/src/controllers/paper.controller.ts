import { NextFunction, Response } from 'express';

import { paperService } from '../services/paper.service';
import type { AuthenticatedRequest } from '../types/http';
import type {
  CreatePaperInput,
  CreateQuestionsInput,
  ListPapersQuery,
  UpdatePaperInput,
  UpdateQuestionsInput,
} from '../schemas/paper.schema';
import { sendSuccess } from '../utils/response';

export const paperController = {
  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as ListPapersQuery;
      const papers = await paperService.list(req.user, query);
      sendSuccess(res, 200, 'Papers retrieved', papers);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { paperId } = req.params as unknown as { paperId: string };
      const paper = await paperService.getById(req.user, paperId);
      sendSuccess(res, 200, 'Paper retrieved', paper);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = req.body as CreatePaperInput;
      const paper = await paperService.create(req.user, payload);
      sendSuccess(res, 201, 'Paper created', paper);
    } catch (error) {
      next(error);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { paperId } = req.params as unknown as { paperId: string };
      const payload = req.body as UpdatePaperInput;
      const paper = await paperService.update(req.user, paperId, payload);
      sendSuccess(res, 200, 'Paper updated', paper);
    } catch (error) {
      next(error);
    }
  },

  addQuestions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { paperId } = req.params as unknown as { paperId: string };
      const payload = req.body as CreateQuestionsInput;
      const paper = await paperService.addQuestions(req.user, paperId, payload);
      sendSuccess(res, 200, 'Questions added', paper);
    } catch (error) {
      next(error);
    }
  },

  updateQuestions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { paperId } = req.params as unknown as { paperId: string };
      const payload = req.body as UpdateQuestionsInput;
      const paper = await paperService.updateQuestions(req.user, paperId, payload);
      sendSuccess(res, 200, 'Questions upserted', paper);
    } catch (error) {
      next(error);
    }
  },
};
