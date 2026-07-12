import { NextFunction, Response } from 'express';

import type {
  AddExistingQuestionToCategoryInput,
  CreateCategoryQuestionInput,
  CreateQuestionCategoryInput,
  SourceQuestionsQuery,
  UpdateQuestionCategoryInput,
} from '../schemas/question-category.schema';
import { questionCategoryService } from '../services/question-category.service';
import type { AuthenticatedRequest } from '../types/http';
import { sendSuccess } from '../utils/response';

export const questionCategoryController = {
  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const categories = await questionCategoryService.list(req.user);
      sendSuccess(res, 200, 'Question categories retrieved', categories);
    } catch (error) {
      next(error);
    }
  },

  listActive: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const categories = await questionCategoryService.listActive(req.user);
      sendSuccess(res, 200, 'Active question categories retrieved', categories);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { categoryId } = req.params as unknown as { categoryId: string };
      const category = await questionCategoryService.getById(req.user, categoryId);
      sendSuccess(res, 200, 'Question category retrieved', category);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = req.body as CreateQuestionCategoryInput;
      const category = await questionCategoryService.create(req.user, payload);
      sendSuccess(res, 201, 'Question category created', category);
    } catch (error) {
      next(error);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { categoryId } = req.params as unknown as { categoryId: string };
      const payload = req.body as UpdateQuestionCategoryInput;
      const category = await questionCategoryService.update(req.user, categoryId, payload);
      sendSuccess(res, 200, 'Question category updated', category);
    } catch (error) {
      next(error);
    }
  },

  delete: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { categoryId } = req.params as unknown as { categoryId: string };
      const result = await questionCategoryService.delete(req.user, categoryId);
      sendSuccess(res, 200, 'Question category deleted', result);
    } catch (error) {
      next(error);
    }
  },

  listSourceQuestions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as SourceQuestionsQuery;
      const questions = await questionCategoryService.listSourceQuestions(req.user, query);
      sendSuccess(res, 200, 'Source questions retrieved', questions);
    } catch (error) {
      next(error);
    }
  },

  addExistingQuestion: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { categoryId } = req.params as unknown as { categoryId: string };
      const payload = req.body as AddExistingQuestionToCategoryInput;
      const item = await questionCategoryService.addExistingQuestion(req.user, categoryId, payload);
      sendSuccess(res, 201, 'Question added to category', item);
    } catch (error) {
      next(error);
    }
  },

  createCategoryQuestion: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { categoryId } = req.params as unknown as { categoryId: string };
      const payload = req.body as CreateCategoryQuestionInput;
      const question = await questionCategoryService.createCategoryQuestion(req.user, categoryId, payload);
      sendSuccess(res, 201, 'Category question created', question);
    } catch (error) {
      next(error);
    }
  },

  removeQuestion: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { categoryId, questionId } = req.params as unknown as {
        categoryId: string;
        questionId: string;
      };
      const result = await questionCategoryService.removeQuestion(req.user, categoryId, questionId);
      sendSuccess(res, 200, 'Question removed from category', result);
    } catch (error) {
      next(error);
    }
  },
};
