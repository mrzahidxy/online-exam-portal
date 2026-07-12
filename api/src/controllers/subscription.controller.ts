import { OrganizerRole } from '@prisma/client';
import { NextFunction, Response } from 'express';

import { subscriptionService } from '../services/subscription.service';
import type { AuthenticatedRequest } from '../types/http';
import { getRequestOrganizerId } from '../utils/access-control';
import { HttpError } from '../utils/http-error';
import { sendSuccess } from '../utils/response';

export const subscriptionController = {
  getCurrent: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const summary = await subscriptionService.getSubscriptionSummary(getRequestOrganizerId(req));
      sendSuccess(res, 200, 'Organizer subscription retrieved', summary);
    } catch (error) {
      next(error);
    }
  },

  getOwnStudentSubscription: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.organizerRole !== OrganizerRole.STUDENT) throw new HttpError(403, 'Only students can view this subscription');
      const summary = await subscriptionService.getOwnStudentSubscription(getRequestOrganizerId(req), req.user.id);
      sendSuccess(res, 200, 'Student subscription retrieved', summary);
    } catch (error) {
      next(error);
    }
  },
};
