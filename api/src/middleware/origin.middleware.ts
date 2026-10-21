import { NextFunction, Request, Response } from 'express';

import { env } from '../utils/env';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export const isTrustedMutationOrigin = (
  method: string,
  origin: string | undefined,
  cookieHeader: string | undefined,
  trustedOrigins: string[],
) => {
  if (safeMethods.has(method.toUpperCase())) return true;
  if (origin) return trustedOrigins.includes(origin);

  // Browser cookie-authenticated mutations must carry an Origin header.
  // Header-authenticated machine clients may omit it.
  return !cookieHeader;
};

export const requireTrustedMutationOrigin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const trustedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  if (!isTrustedMutationOrigin(req.method, req.get('origin'), req.get('cookie'), trustedOrigins)) {
    return res.status(403).json({ message: 'Request origin is not allowed' });
  }
  return next();
};
