import { Request, Response, NextFunction } from 'express';

import { authService } from '../services/auth.service';
import type { AuthenticatedRequest } from '../types/http';
import { setAccessTokenCookie, clearAccessTokenCookie } from '../utils/auth-cookies';

export const authController = {
  register: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      
      // Set access token as httpOnly cookie
      setAccessTokenCookie(res, result.accessToken, result.accessTokenExpiresAt);
      
      // Return user data (without token in body)
      res.status(201).json({
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      
      // Set access token as httpOnly cookie
      setAccessTokenCookie(res, result.accessToken, result.accessTokenExpiresAt);
      
      // Return user data (without token in body)
      res.status(200).json({
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },

  logout: async (_req: Request, res: Response) => {
    // Clear the access token cookie
    clearAccessTokenCookie(res);
    res.status(204).send();
  },

  me: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await authService.getProfile(req.user.id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },
};
