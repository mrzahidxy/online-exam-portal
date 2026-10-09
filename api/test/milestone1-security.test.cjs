process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/eassessment_test';
process.env.JWT_SECRET = 'milestone-one-test-secret-at-least-32-characters';
process.env.JWT_ISSUER = 'e-assessment-api';
process.env.CORS_ORIGIN = 'https://frontend.example.test';
process.env.COOKIE_SECURE = 'true';
process.env.COOKIE_SAME_SITE = 'none';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.MAX_UPLOAD_SIZE = '128';

const assert = require('node:assert/strict');
const http = require('node:http');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const { after, before, test } = require('node:test');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const testPrisma = {
  user: { findUnique: async () => null },
  $disconnect: async () => undefined,
};
const originalModuleLoad = Module._load;
Module._load = function loadDependency(request, parent, isMain) {
  if (request === '../utils/prisma') return { prisma: testPrisma };
  return originalModuleLoad.call(this, request, parent, isMain);
};

const { UserRole } = require('@prisma/client');
const { authService } = require('../src/services/auth.service');
const { authRoutes } = { authRoutes: require('../src/routes/auth.routes').default };
const uploadRoutes = require('../src/routes/upload.routes').default;
const { requireAuth } = require('../src/middleware/auth.middleware');
const { requireTrustedMutationOrigin } = require('../src/middleware/origin.middleware');
const { createAccessToken } = require('../src/utils/jwt');
const prisma = testPrisma;

let databaseRole = UserRole.STUDENT;
let server;
let baseUrl;
let originalLogin;
let originalFindUnique;
let originalFetch;

const app = express();
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || origin === process.env.CORS_ORIGIN),
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(requireTrustedMutationOrigin);
app.get('/admin', requireAuth([UserRole.ADMIN]), (_req, res) => res.status(200).json({ ok: true }));
app.get('/student', requireAuth([UserRole.STUDENT]), (_req, res) => res.status(200).json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/uploads', uploadRoutes);
app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));

function request(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(path, baseUrl);
    const req = http.request(target, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function tokenWithRole(role) {
  return createAccessToken({ userId: 'f0eaf705-45cd-47ea-b53b-17b43aca73b4', roles: [role] }).token;
}

function multipartFile({ filename = 'diagram.png', mimeType = 'image/png', contents } = {}) {
  const boundary = '----milestone-one-boundary';
  const bytes = contents ?? Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=', 'base64');
  const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    boundary,
    body: Buffer.concat([prefix, bytes, suffix]),
  };
}

before(async () => {
  originalLogin = authService.login;
  originalFindUnique = prisma.user.findUnique;
  originalFetch = global.fetch;
  prisma.user.findUnique = async () => ({
    id: 'f0eaf705-45cd-47ea-b53b-17b43aca73b4',
    email: 'student@example.test',
    name: 'Test User',
    role: databaseRole,
    schoolCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  authService.login = async () => ({
    accessToken: tokenWithRole(UserRole.STUDENT),
    accessTokenExpiresAt: new Date(Date.now() + 60_000),
    user: {
      id: 'f0eaf705-45cd-47ea-b53b-17b43aca73b4',
      email: 'student@example.test',
      name: 'Test User',
      role: UserRole.STUDENT,
      roles: [UserRole.STUDENT],
      schoolCode: null,
    },
  });

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  Module._load = originalModuleLoad;
  global.fetch = originalFetch;
  authService.login = originalLogin;
  prisma.user.findUnique = originalFindUnique;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

test('students and admins are authorized by their current database role', async () => {
  databaseRole = UserRole.STUDENT;
  const studentResponse = await request('GET', '/student', {
    headers: { authorization: `Bearer ${tokenWithRole(UserRole.STUDENT)}` },
  });
  assert.equal(studentResponse.status, 200);

  databaseRole = UserRole.ADMIN;
  const adminResponse = await request('GET', '/admin', {
    headers: { authorization: `Bearer ${tokenWithRole(UserRole.ADMIN)}` },
  });
  assert.equal(adminResponse.status, 200);
});

test('a token with an old admin claim loses admin access after database demotion', async () => {
  databaseRole = UserRole.STUDENT;
  const response = await request('GET', '/admin', {
    headers: { authorization: `Bearer ${tokenWithRole(UserRole.ADMIN)}` },
  });
  assert.equal(response.status, 403);
});

test('cross-origin login and logout return secure, HttpOnly cookies to the configured frontend', async () => {
  const origin = process.env.CORS_ORIGIN;
  const preflight = await request('OPTIONS', '/auth/login', {
    headers: {
      origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers['access-control-allow-origin'], origin);
  assert.equal(preflight.headers['access-control-allow-credentials'], 'true');

  const login = await request('POST', '/auth/login', {
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'student@example.test', password: 'password' }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=None/i);

  const logout = await request('POST', '/auth/logout', {
    headers: { origin, cookie: cookie.split(';')[0] },
  });
  assert.equal(logout.status, 204);
  assert.match(logout.headers['set-cookie'][0], /HttpOnly/i);
  assert.match(logout.headers['set-cookie'][0], /Secure/i);
  assert.match(logout.headers['set-cookie'][0], /SameSite=None/i);
});

test('untrusted origins and cookie mutations without an Origin header are rejected', async () => {
  const untrusted = await request('POST', '/auth/logout', {
    headers: { origin: 'https://attacker.example.test' },
  });
  assert.equal(untrusted.status, 403);

  const missingOrigin = await request('POST', '/auth/logout', {
    headers: { cookie: 'auth-token=some-token' },
  });
  assert.equal(missingOrigin.status, 403);
});

test('production configuration requires secure cookies and explicit exact origins', () => {
  const apiRoot = require('node:path').resolve(__dirname, '..');
  const baseEnv = {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/eassessment_test',
    JWT_SECRET: 'milestone-one-test-secret-at-least-32-characters',
    CORS_ORIGIN: 'https://frontend.example.test',
    COOKIE_SECURE: 'true',
    COOKIE_SAME_SITE: 'none',
  };
  const loadEnv = (overrides = {}) => spawnSync(process.execPath, [
    '-r', 'ts-node/register/transpile-only', '-e', "require('./src/utils/env')",
  ], {
    cwd: apiRoot,
    env: { ...baseEnv, ...overrides },
    encoding: 'utf8',
  });

  assert.equal(loadEnv().status, 0);
  assert.notEqual(loadEnv({ CORS_ORIGIN: '*' }).status, 0);
  assert.notEqual(loadEnv({ COOKIE_SECURE: 'false' }).status, 0);
  assert.notEqual(loadEnv({ COOKIE_SECURE: 'false', COOKIE_SAME_SITE: 'none' }).status, 0);
});

test('media uploads reject anonymous and non-admin callers before storage is reached', async () => {
  let providerCalls = 0;
  global.fetch = async () => {
    providerCalls += 1;
    return new Response(JSON.stringify({ secure_url: 'https://media.example.test/test.png', public_id: 'test/images/test' }), { status: 200 });
  };
  const { boundary, body } = multipartFile();
  const headers = { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': body.length };

  const anonymous = await request('POST', '/uploads/media', { headers, body });
  assert.equal(anonymous.status, 401);
  assert.equal(providerCalls, 0);

  databaseRole = UserRole.STUDENT;
  const student = await request('POST', '/uploads/media', {
    headers: { ...headers, authorization: `Bearer ${tokenWithRole(UserRole.STUDENT)}` },
    body,
  });
  assert.equal(student.status, 403);
  assert.equal(providerCalls, 0);
});

test('admins can upload valid media, while provider errors stay generic', async () => {
  databaseRole = UserRole.ADMIN;
  const { boundary, body } = multipartFile();
  const headers = {
    authorization: `Bearer ${tokenWithRole(UserRole.ADMIN)}`,
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': body.length,
  };

  global.fetch = async (_url, options) => {
    assert.equal(options.body.get('folder'), 'online-exam-portal/images');
    return new Response(JSON.stringify({ secure_url: 'https://media.example.test/test.png', public_id: 'test/images/test' }), { status: 200 });
  };
  const success = await request('POST', '/uploads/media', { headers, body });
  assert.equal(success.status, 201, success.body);
  assert.equal(JSON.parse(success.body).url, 'https://media.example.test/test.png');

  const image = await request('POST', '/uploads/image', { headers, body });
  assert.equal(image.status, 201, image.body);
  assert.equal(JSON.parse(image.body).url, 'https://media.example.test/test.png');
  assert.equal(JSON.parse(image.body).mediaType, 'image');

  const validPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=', 'base64');
  const oversized = multipartFile({ contents: Buffer.concat([validPng, Buffer.alloc(129 - validPng.length)]) });
  const tooLarge = await request('POST', '/uploads/media', {
    headers: {
      ...headers,
      'content-type': `multipart/form-data; boundary=${oversized.boundary}`,
      'content-length': oversized.body.length,
    },
    body: oversized.body,
  });
  assert.equal(tooLarge.status, 413);

  global.fetch = async () => new Response(JSON.stringify({ error: { message: 'private provider detail' } }), { status: 500 });
  const failed = await request('POST', '/uploads/media', { headers, body });
  assert.equal(failed.status, 502);
  assert.equal(failed.body.includes('private provider detail'), false);
});

test('media format validation rejects mismatched or unsupported file types', async () => {
  const { validateUploadedMedia } = require('../src/utils/media-validation');
  const invalid = {
    mimetype: 'image/png',
    buffer: Buffer.from('not a png'),
  };
  assert.throws(() => validateUploadedMedia(invalid), /does not match/);
  assert.throws(() => validateUploadedMedia({ mimetype: 'image/svg+xml', buffer: Buffer.from('<svg/>') }), /Unsupported media format/);
});
