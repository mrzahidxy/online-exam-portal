import { NextFunction, Response } from 'express';

import { accessRequestService } from '../services/access-request.service';
import type { AuthenticatedRequest } from '../types/http';
import type {
  CreateAccessRequestInput,
  ListAccessRequestQuery,
  UpdateAccessRequestInput,
} from '../schemas/access-request.schema';
import { sendSuccess } from '../utils/response';

export const accessRequestController = {
  list: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as ListAccessRequestQuery;
      const requests = await accessRequestService.list(req.user, query);
      sendSuccess(res, 200, 'Access requests retrieved', requests);
    } catch (error) {
      next(error);
    }
  },

  create: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payload = req.body as CreateAccessRequestInput;
      const request = await accessRequestService.create(req.user.id, payload);
      sendSuccess(res, 201, 'Access request created', request);
    } catch (error) {
      next(error);
    }
  },

  updateStatus: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { id } = req.params as unknown as { id: string };
      const payload = req.body as UpdateAccessRequestInput;
      const request = await accessRequestService.updateStatus(
        req.user,
        id,
        payload
      );
      sendSuccess(res, 200, 'Access request updated', request);
    } catch (error) {
      next(error);
    }
  },
};
