import { NextFunction, Response } from 'express';

import type {
  CreateStudentSubscriptionPlanInput,
  UpdateAdminSubscriptionInput,
  UpdateStudentSubscriptionPlanInput,
  UpsertStudentSubscriptionInput,
} from '../schemas/admin-subscription.schema';
import { subscriptionService } from '../services/subscription.service';
import type { AuthenticatedRequest } from '../types/http';
import { getOwnerRequestOrganizerId } from '../utils/access-control';
import { sendSuccess } from '../utils/response';

const ownerOrganizerId = (req: AuthenticatedRequest) => getOwnerRequestOrganizerId(req, 'Only owners can manage subscriptions');

export const adminSubscriptionController = {
  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const subscriptions = await subscriptionService.listAdminSubscriptions(ownerOrganizerId(req));
      sendSuccess(res, 200, 'Organizer subscriptions retrieved', subscriptions);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { subscriptionId } = req.params as unknown as { subscriptionId: string };
      const subscription = await subscriptionService.getAdminSubscription(ownerOrganizerId(req), subscriptionId);
      sendSuccess(res, 200, 'Organizer subscription retrieved', subscription);
    } catch (error) {
      next(error);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { subscriptionId } = req.params as unknown as { subscriptionId: string };
      const payload = req.body as UpdateAdminSubscriptionInput;
      const subscription = await subscriptionService.updateAdminSubscription(ownerOrganizerId(req), subscriptionId, payload);
      sendSuccess(res, 200, 'Organizer subscription updated', subscription);
    } catch (error) {
      next(error);
    }
  },

  listStudentSubscriptions: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const subscriptions = await subscriptionService.listStudentSubscriptions(ownerOrganizerId(req));
      sendSuccess(res, 200, 'Student subscriptions retrieved', subscriptions);
    } catch (error) {
      next(error);
    }
  },

  getStudentSubscription: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params as unknown as { studentId: string };
      const subscription = await subscriptionService.getStudentSubscription(ownerOrganizerId(req), studentId);
      sendSuccess(res, 200, 'Student subscription retrieved', subscription);
    } catch (error) {
      next(error);
    }
  },

  upsertStudentSubscription: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params as unknown as { studentId: string };
      const payload = req.body as UpsertStudentSubscriptionInput;
      const subscription = await subscriptionService.upsertStudentSubscription(ownerOrganizerId(req), studentId, payload);
      sendSuccess(res, 200, 'Student subscription saved', subscription);
    } catch (error) {
      next(error);
    }
  },

  resetStudentUsage: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params as unknown as { studentId: string };
      const subscription = await subscriptionService.resetStudentMockPaperUsage(ownerOrganizerId(req), studentId);
      sendSuccess(res, 200, 'Student mock-paper usage reset', subscription);
    } catch (error) {
      next(error);
    }
  },

  listPlans: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const plans = await subscriptionService.listStudentSubscriptionPlans(ownerOrganizerId(req));
      sendSuccess(res, 200, 'Student subscription plans retrieved', plans);
    } catch (error) {
      next(error);
    }
  },

  getPlan: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { planId } = req.params as unknown as { planId: string };
      const plan = await subscriptionService.getStudentSubscriptionPlan(ownerOrganizerId(req), planId);
      sendSuccess(res, 200, 'Student subscription plan retrieved', plan);
    } catch (error) {
      next(error);
    }
  },

  createPlan: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payload = req.body as CreateStudentSubscriptionPlanInput;
      const plan = await subscriptionService.createStudentSubscriptionPlan(ownerOrganizerId(req), payload);
      sendSuccess(res, 201, 'Student subscription plan created', plan);
    } catch (error) {
      next(error);
    }
  },

  updatePlan: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { planId } = req.params as unknown as { planId: string };
      const payload = req.body as UpdateStudentSubscriptionPlanInput;
      const plan = await subscriptionService.updateStudentSubscriptionPlan(ownerOrganizerId(req), planId, payload);
      sendSuccess(res, 200, 'Student subscription plan updated', plan);
    } catch (error) {
      next(error);
    }
  },

  deletePlan: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { planId } = req.params as unknown as { planId: string };
      const result = await subscriptionService.deleteStudentSubscriptionPlan(ownerOrganizerId(req), planId);
      sendSuccess(res, 200, 'Student subscription plan deleted', result);
    } catch (error) {
      next(error);
    }
  },
};
