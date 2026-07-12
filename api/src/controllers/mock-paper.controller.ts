import { NextFunction, Response } from 'express';

import type {
  GenerateMockPaperInput,
  GradeMockSubmissionInput,
  ListMockSubmissionsQuery,
  SubmitMockPaperInput,
} from '../schemas/mock-paper.schema';
import { mockPaperService } from '../services/mock-paper.service';
import type { AuthenticatedRequest } from '../types/http';
import { sendSuccess } from '../utils/response';

export const mockPaperController = {
  generate: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = req.body as GenerateMockPaperInput;
      const mockPaper = await mockPaperService.generate(req.user, payload);
      sendSuccess(res, 201, 'Mock paper generated', mockPaper);
    } catch (error) {
      next(error);
    }
  },

  listOwn: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const mockPapers = await mockPaperService.listOwn(req.user);
      sendSuccess(res, 200, 'Mock papers retrieved', mockPapers);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { mockPaperId } = req.params as unknown as { mockPaperId: string };
      const mockPaper = await mockPaperService.getById(req.user, mockPaperId);
      sendSuccess(res, 200, 'Mock paper retrieved', mockPaper);
    } catch (error) {
      next(error);
    }
  },

  submit: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { mockPaperId } = req.params as unknown as { mockPaperId: string };
      const payload = req.body as SubmitMockPaperInput;
      const submission = await mockPaperService.submit(req.user, mockPaperId, payload);
      sendSuccess(res, 201, 'Mock submission created', submission);
    } catch (error) {
      next(error);
    }
  },

  archiveOwn: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { mockPaperId } = req.params as unknown as { mockPaperId: string };
      const mockPaper = await mockPaperService.archiveOwn(req.user, mockPaperId);
      sendSuccess(res, 200, 'Mock paper archived', mockPaper);
    } catch (error) {
      next(error);
    }
  },

  listSubmissions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as ListMockSubmissionsQuery;
      const submissions = await mockPaperService.listSubmissions(req.user, query);
      sendSuccess(res, 200, 'Mock submissions retrieved', submissions);
    } catch (error) {
      next(error);
    }
  },

  getSubmissionById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { submissionId } = req.params as unknown as { submissionId: string };
      const submission = await mockPaperService.getSubmissionById(req.user, submissionId);
      sendSuccess(res, 200, 'Mock submission retrieved', submission);
    } catch (error) {
      next(error);
    }
  },

  gradeSubmission: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { submissionId } = req.params as unknown as { submissionId: string };
      const payload = req.body as GradeMockSubmissionInput;
      const submission = await mockPaperService.gradeSubmission(req.user, submissionId, payload);
      sendSuccess(res, 200, 'Mock submission graded', submission);
    } catch (error) {
      next(error);
    }
  },

  getFeedback: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { submissionId } = req.params as unknown as { submissionId: string };
      const feedback = await mockPaperService.getFeedback(req.user, submissionId);
      sendSuccess(res, 200, 'Mock feedback retrieved', feedback);
    } catch (error) {
      next(error);
    }
  },
};
