import { type NextFunction, type Request, type Response } from 'express';
import { ZodTypeAny } from 'zod';
import xss, { whiteList as defaultWhiteList } from 'xss';

import { HttpError } from '../utils/http-error';

type RequestProperty = 'body' | 'query' | 'params';

const htmlWhiteList = {
  ...defaultWhiteList,
  table: ['border', 'cellpadding', 'cellspacing', 'summary', 'width', 'height', 'align'],
  thead: [],
  tbody: [],
  tfoot: [],
  tr: [],
  td: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign'],
  th: ['colspan', 'rowspan', 'scope', 'width', 'height', 'align', 'valign'],
  caption: [],
  colgroup: [],
  col: ['span', 'width'],
};

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return xss(value, { whiteList: htmlWhiteList });
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = sanitizeValue(val);
      return acc;
    }, {});
  }

  return value;
};

const replaceObjectContents = (target: Record<string, unknown>, value: unknown) => {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  if (value && typeof value === 'object') {
    Object.assign(target, value as Record<string, unknown>);
  }
};

export const validateRequest =
  <T extends ZodTypeAny>(schema: T, property: RequestProperty = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const sanitized = sanitizeValue(req[property]);
      const result = schema.safeParse(sanitized);

      if (!result.success) {
        const formatted = result.error.flatten();
        next(new HttpError(400, 'Validation failed', formatted));
        return;
      }

      const requestWithProperty = req as Request & Record<RequestProperty, unknown>;

      if (property === 'body') {
        requestWithProperty.body = result.data;
      } else {
        const current = requestWithProperty[property];
        if (current && typeof current === 'object') {
          replaceObjectContents(current as Record<string, unknown>, result.data);
        } else {
          Object.defineProperty(req, property, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: result.data && typeof result.data === 'object' ? result.data : {},
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
