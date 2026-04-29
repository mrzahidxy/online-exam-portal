import { serve, setup } from 'swagger-ui-express';
import swaggerJsdoc, { OAS3Definition } from 'swagger-jsdoc';

import { swaggerOptions } from '../config/swagger.config';

const swaggerSpec = swaggerJsdoc(swaggerOptions) as OAS3Definition;

const TOKEN_STORAGE_KEY = 'swagger_jwt_token';
const AUTH_ENDPOINT_REGEX = /\/auth\/(login|register)$/i;
const BEARER_PREFIX = /^Bearer\s+/i;

function getGlobalScope() {
  return (typeof globalThis !== 'undefined' ? (globalThis as Record<string, any>) : {}) as Record<string, any>;
}

function onComplete(): void {
  try {
    const scope = getGlobalScope();
    const storage =
      scope && scope.localStorage && typeof scope.localStorage.getItem === 'function'
        ? (scope.localStorage as Record<string, any>)
        : null;

    if (!storage) {
      return;
    }

    const storedToken = storage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      return;
    }

    const authActions =
      scope && scope.ui && scope.ui.authActions ? (scope.ui.authActions as Record<string, any>) : null;

    if (!authActions || typeof authActions.authorize !== 'function') {
      return;
    }

    authActions.authorize({
      bearerAuth: {
        value: storedToken.replace(BEARER_PREFIX, ''),
      },
    });
  } catch {
    // ignore client-side errors during Swagger bootstrap
  }
}

function requestInterceptor(req: Record<string, any>): Record<string, any> {
  try {
    if (!req || typeof req !== 'object') {
      return req;
    }

    if (typeof req.url === 'string' && AUTH_ENDPOINT_REGEX.test(req.url)) {
      return req;
    }

    const scope = getGlobalScope();
    const storage =
      scope && scope.localStorage && typeof scope.localStorage.getItem === 'function'
        ? (scope.localStorage as Record<string, any>)
        : null;

    if (!storage) {
      return req;
    }

    const storedToken = storage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      return req;
    }

    if (!req.headers || typeof req.headers !== 'object') {
      req.headers = {};
    }

    if (!req.headers.Authorization) {
      req.headers.Authorization = storedToken;
    }

    return req;
  } catch {
    return req;
  }
}

function responseInterceptor(res: Record<string, any>): Record<string, any> {
  try {
    const scope = getGlobalScope();
    const storage =
      scope && scope.localStorage && typeof scope.localStorage.setItem === 'function'
        ? (scope.localStorage as Record<string, any>)
        : null;

    if (!storage) {
      return res;
    }

    const authActions =
      scope && scope.ui && scope.ui.authActions ? (scope.ui.authActions as Record<string, any>) : null;

    const logout = () => {
      try {
        if (typeof storage.removeItem === 'function') {
          storage.removeItem(TOKEN_STORAGE_KEY);
        }
        if (authActions && typeof authActions.logout === 'function') {
          authActions.logout(['bearerAuth']);
        }
      } catch {
        // ignore storage/logout errors
      }
    };

    if (res && (res.status === 401 || res.status === 403)) {
      logout();
      return res;
    }

    if (!res || typeof res !== 'object' || typeof res.url !== 'string' || !AUTH_ENDPOINT_REGEX.test(res.url)) {
      return res;
    }

    const rawBody = res.data ?? res.text ?? res.body;
    if (!rawBody) {
      return res;
    }

    let payload = rawBody;
    if (typeof rawBody === 'string') {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return res;
      }
    }

    const token =
      (payload && typeof payload.token === 'string' && payload.token) ||
      (payload && typeof payload.accessToken === 'string' && payload.accessToken) ||
      (payload &&
        payload.data &&
        typeof payload.data === 'object' &&
        typeof payload.data.token === 'string' &&
        payload.data.token);

    if (!token) {
      return res;
    }

    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    storage.setItem(TOKEN_STORAGE_KEY, bearerToken);

    if (authActions && typeof authActions.authorize === 'function') {
      authActions.authorize({
        bearerAuth: {
          value: bearerToken.replace(BEARER_PREFIX, ''),
        },
      });
    }

    return res;
  } catch {
    return res;
  }
}

const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    onComplete,
    requestInterceptor,
    responseInterceptor,
  },
};

export { serve, setup, swaggerSpec, swaggerUiOptions };
