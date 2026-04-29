import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import express from 'express';
import pino from 'pino';
import type { TransportSingleOptions } from 'pino';
import pinoHttp from 'pino-http';

import { env } from './env';

type RequestContext = {
  requestId?: string;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

const logLevel = env.NODE_ENV === 'development' ? 'debug' : 'info';

let transport: TransportSingleOptions | undefined;

if (env.NODE_ENV === 'development') {
  try {
    require.resolve('pino-pretty');
    transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        singleLine: true,
        ignore: 'pid,hostname,service,context,req,res',
      },
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      '[logger] pino-pretty not installed, falling back to JSON logs.'
    );
  }
}

export const logger = pino({
  level: logLevel,
  base: { service: 'eassessment-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport,
  hooks: {
    logMethod(args, method) {
      const context = requestContext.getStore();
      if (context?.requestId) {
        if (args.length === 0) {
          args.push({ requestId: context.requestId });
        } else if (typeof args[0] === 'object' && args[0] !== null) {
          const firstArg = args[0] as Record<string, unknown>;
          if (!firstArg.requestId) {
            firstArg.requestId = context.requestId;
          }
        } else {
          args.unshift({ requestId: context.requestId });
        }
      }
      // eslint-disable-next-line prefer-spread
      return method.apply(this, args as unknown as Parameters<typeof method>);
    },
  },
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: env.NODE_ENV === 'test' ? false : true,
  quietReqLogger: true,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
  serializers: {
    req() {
      return undefined;
    },
    res() {
      return undefined;
    },
  },
  customProps(req, res) {
    const requestId = (req as express.Request).id;
    const props: Record<string, unknown> = {};
    if (requestId) {
      props.requestId = requestId;
    }
    if (res?.statusCode) {
      props.statusCode = res.statusCode;
    }
    const responseTime = (
      res as express.Response & { responseTime?: number }
    ).responseTime;
    if (typeof responseTime === 'number') {
      props.responseTime = Math.round(responseTime);
    }
    return props;
  },
  genReqId(req) {
    const expressReq = req as express.Request;
    if (expressReq.id) {
      return expressReq.id;
    }
    const generated = randomUUID();
    expressReq.id = generated;
    return generated;
  },
  customSuccessMessage(req, res, responseTime) {
    const elapsed = Math.round(responseTime);
    return `${req.method} ${req.url} -> ${res.statusCode} (${elapsed} ms)`;
  },
  customErrorMessage(req, res, error) {
    const status = res.statusCode;
    return `${req.method} ${req.url} -> ${status} (${error.message})`;
  },
});

// Middleware to add request ID to logger
export const loggerWithRequestContext = (
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) => {
  const context: RequestContext = { requestId: req.id };

  requestContext.run(context, () => {
    next();
  });
};
