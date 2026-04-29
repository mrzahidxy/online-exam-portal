import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
  }
}

export const requestIdMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  req.id = uuidv4();
  next();
};