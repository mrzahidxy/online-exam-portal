import { CookieOptions, Response } from 'express';

import { env } from './env';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN || undefined,
};

// Access Token Cookie
export const setAccessTokenCookie = (res: Response, token: string, expiresAt: Date) => {
  res.cookie(env.ACCESS_TOKEN_COOKIE_NAME, token, {
    ...baseCookieOptions,
    path: '/',
    expires: expiresAt,
    maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
  });
};

export const clearAccessTokenCookie = (res: Response) => {
  res.clearCookie(env.ACCESS_TOKEN_COOKIE_NAME, {
    ...baseCookieOptions,
    path: '/',
    expires: new Date(0),
  });
};

