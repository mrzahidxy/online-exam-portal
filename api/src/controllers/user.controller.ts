import { NextFunction, Response } from 'express';

import { userService } from '../services/user.service';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types/http';
import type {
  ListUsersQuery,
  UpdateUserInput,
} from '../schemas/user.schema';

export const userController = {
  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as ListUsersQuery;
      const users = await userService.list(req.user, query);
      res.status(200).json(users);
    } catch (error) {
      logger.error({ err: error }, 'Failed to handle user list request');
      next(error);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { id } = req.params as unknown as { id: string };
      const user = await userService.getById(id, req.user);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = req.body as UpdateUserInput;
      const { id } = req.params as unknown as { id: string };
      const user = await userService.update(id, payload, req.user);

      res.status(200).json({
        message: 'User updated successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  },

  remove: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { id } = req.params as unknown as { id: string };
      await userService.remove(id, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
