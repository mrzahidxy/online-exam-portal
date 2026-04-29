import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { isHttpError } from '../utils/http-error';
import { logger } from '../utils/logger';

const formatValidationDetails = (details: unknown): string | undefined => {
  if (!details || typeof details !== 'object') {
    return undefined;
  }

  const typedDetails = details as {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };

  const formError = typedDetails.formErrors?.find(Boolean);
  if (formError) {
    return formError;
  }

  const fieldEntry = Object.entries(typedDetails.fieldErrors ?? {}).find(([, errors]) => errors?.length);
  if (!fieldEntry) {
    return undefined;
  }

  const [field, errors] = fieldEntry;
  const message = errors?.find(Boolean);

  if (!message) {
    return field;
  }

  return `${field}: ${message}`;
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isHttpError(error)) {
    const validationMessage =
      error.statusCode === 400 ? formatValidationDetails(error.details) : undefined;

    logger.warn(
      {
        statusCode: error.statusCode,
        message: error.message,
        details: error.details,
      },
      'Handled http error'
    );

    return res.status(error.statusCode).json({
      message: validationMessage ? `Validation failed: ${validationMessage}` : error.message,
    });
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const validationMessage = firstIssue
      ? `${firstIssue.path.join('.') || 'body'}: ${firstIssue.message}`
      : 'Validation failed';

    logger.warn({ issues: error.issues }, 'Validation error');
    return res.status(400).json({
      message: `Validation failed: ${validationMessage}`,
    });
  }

  if (error instanceof Error) {
    logger.error({ err: error, stack: error.stack }, 'Unhandled error');
  } else {
    logger.error({ error }, 'Unhandled error');
  }
  return res.status(500).json({
    message: 'Internal server error',
  });
};
