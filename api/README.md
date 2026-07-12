# eAssessment API Starter

Backend API for the eAssessment platform.

This repository serves the API only. The frontend lives in the sibling `eassessment/` app and points to this API through `NEXT_PUBLIC_API_URL`.

A production-ready starter template for building PERN (Postgres, Express, React, Node) eAssessment applications. The backend is fully typed with TypeScript, exposes a modular Express API, integrates with Prisma for database access, and includes examples for authentication, question paper orchestration, submissions, grading, uploads, observability, and caching.

---

## Features

- **TypeScript-first Express server** with structured `routes -> controllers -> services`
- **Centralized environment management**, validation, and consistent error handling
- **Prisma ORM** with PostgreSQL migrations, UUID identifiers, and ready-to-use seed data (owner + students + sample paper)
- **JWT authentication** with organizer membership guards for owners and students
- **Question paper endpoints** for creating papers, scheduling windows, and managing nested questions/sub-questions
- **Access request workflow** so students can request entry and owners approve/reject
- **Submission + grading APIs** that enforce early-submission rules, answer validation, and per-sub-question marks
- **Subscription and mock-paper access controls** for organizer access, student mock-paper quota, usage reset, and expiry checks
- **Question categories + generated mock papers** with owner-managed category pools, student generation, submission, grading, and feedback
- **Request sanitization** with Zod + xss, rate limiting, CORS, Helmet, and compression defaults
- **Request-scoped logging** powered by Pino + AsyncLocalStorage with automatic request IDs (pretty-printed locally via `pino-pretty`)
- **OpenAPI documentation**, health endpoint, Docker Compose for PostgreSQL, and Google Cloud Storage uploads

---

## Tech Stack

- **Runtime:** Node.js 20+ (TypeScript)
- **Framework:** Express
- **Database:** PostgreSQL + Prisma Client (UUIDs)
- **Auth:** JSON Web Tokens (JWT) with role-based access control
- **Uploads:** Multer + Google Cloud Storage
- **Validation and Sanitization:** Zod + xss
- **Security and Performance:** express-rate-limit, Helmet, compression, CORS
- **Documentation:** swagger-jsdoc + swagger-ui-express
- **Logging & Observability:** Pino + pino-http with AsyncLocalStorage request context
- **Tooling:** Nodemon, ts-node, dotenv

---

## Project Structure

```text
.
|-- prisma/
|   |-- schema.prisma        # Database schema and Prisma configuration
|   |-- seed.ts              # Seed script for initial data
|-- src/
|   |-- app.ts               # Express app setup, middleware, health check, swagger
|   |-- server.ts            # HTTP server bootstrap and graceful shutdown
|   |-- controllers/         # Request handlers
|   |-- middleware/          # Auth, validation, request ID, swagger, error handling
|   |-- routes/              # Express routers grouped by domain
|   |-- schemas/             # Zod validation schemas
|   |-- services/            # Business logic, Prisma access, cache integration
|   |-- types/               # Shared TypeScript types and Express augmentation
|   |-- utils/               # Logger, Prisma client, cache, Google Cloud Storage, env helpers
|-- .env.example             # Environment variable template
|-- nodemon.json             # Development watcher configuration
|-- package.json             # Scripts and dependencies
|-- tsconfig.json            # TypeScript configuration
```

---

## Getting Started

### Prerequisites

- **Node.js 20 or newer**
- **Docker and Docker Compose** (for containerized database)
- Optional providers: Google Cloud Storage (uploads)

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd express-postgres-starter

# Install dependencies
npm install
```

### 2. Environment Configuration

1. **Copy the environment template:**

   ```bash
   cp .env.example .env
   ```

2. **Configure the environment variables in `.env`:**

   **Required Variables:**
   ```bash
   # Server Configuration
   PORT=8080
   HOST=localhost
   NODE_ENV=development
   TRUST_PROXY=false

   # Database (Docker Compose will override these)
   DATABASE_URL="postgresql://exam_user:exam_password@localhost:5433/eassessment_app?schema=public"
   DIRECT_URL="postgresql://exam_user:exam_password@localhost:5433/eassessment_app?schema=public"

   # JWT Authentication (REQUIRED)
   JWT_SECRET="your-super-secret-jwt-key-here-at-least-16-characters"
   JWT_EXPIRES_IN=15m

   # CORS (configure for your frontend)
   CORS_ORIGIN="http://localhost:3000,http://localhost:5173"
   ```

   **Optional Variables (for additional features):**
   ```bash
   # Google Cloud Storage uploads
   GCP_BUCKET_NAME="your_bucket_name"

   # Upload Configuration
   MAX_UPLOAD_SIZE=5242880

   # Client URL (for redirects)
   CLIENT_URL="http://localhost:5173"

   # Mock paper generation
   MOCK_PAPER_QUESTION_COUNT=10
   ```

### 3. Database Setup with Docker

1. **Start the database service:**

   ```bash
   # Start PostgreSQL container
   docker-compose up -d db
   ```

2. **Generate Prisma client and run migrations:**

   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run database migrations
   npm run prisma:migrate
   ```

3. **Seed the database with sample data:**

   ```bash
   # Run the seed script (admins, students, sample paper, requests, submissions)
   npm run seed
   ```

   **Seed Data Includes:**
   - **Owner User:** `admin@exam.io`
   - **Students:** `student1@exam.io`, `student2@exam.io` with school codes
   - **Organizer subscription:** trial access for the seeded organizer
   - **Student mock-paper access:** fixed mock-paper limits for seeded students
   - **Mathematics Mock Paper:** nested questions/sub-questions ready to serve
   - **Question categories:** active category pools used to generate mock papers
   - **Access Requests & Submission:** one approved, one pending request, plus a graded submission

### 4. Run the Application

#### Development Mode (with auto-reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

The API will be available at `http://localhost:8080` with routes under `/api` and `/api/v1`.

### 5. Alternative: Full Docker Setup

For a complete containerized environment:

1. **Ensure `.env` is configured** (Docker Compose will use it)

2. **Build and start all services:**

   ```bash
   # Build and start PostgreSQL and API
   docker-compose up --build
   ```

3. **Access the application:**
   - **API:** http://localhost:8080
   - **Swagger Documentation:** http://localhost:8080/api-docs
   - **Health Check:** http://localhost:8080/health

4. **Run migrations in containers:**

   ```bash
   # For new migrations
   docker-compose exec api npx prisma migrate dev --name your_migration_name

   # For seeding
   docker-compose exec api npx prisma db seed
   ```

5. **Stop the services:**

   ```bash
   # Stop containers
   docker-compose down

   # Stop and remove volumes (WARNING: deletes database data)
   docker-compose down -v
   ```

### 7. API Documentation

- Swagger UI is available at `GET /api-docs`.
- Use the built-in "Authorize" button or log in via the auth routes; successful auth responses are cached by Swagger to persist the JWT for subsequent calls.

---

## Available Scripts

### Development & Build
- `npm run dev` - Start the API with Nodemon + ts-node (auto-reload)
- `npm run build` - Compile TypeScript into the `dist/` directory
- `npm start` - Run the compiled JavaScript build (production)

### Database & Prisma
- `npm run prisma:generate` - Regenerate Prisma Client from schema
- `npm run prisma:migrate` - Run interactive migrations (`prisma migrate dev`)
- `npm run prisma:studio` - Launch Prisma Studio (database GUI at http://localhost:5555)
- `npm run seed` - Execute the Prisma seed script (populates admin, students, sample paper, requests, and submissions)

### Docker
- `docker-compose up -d db` - Start database container
- `docker-compose up --build` - Build and start full stack (Postgres + API)
- `docker-compose down` - Stop all services
- `docker-compose down -v` - Stop services and remove volumes (deletes data)

### Database Management (with Docker)
- `docker-compose exec api npx prisma migrate dev --name migration_name` - Create new migration
- `docker-compose exec api npx prisma db seed` - Run seed script in container
- `docker-compose exec api npx prisma studio` - Access Prisma Studio in container

---

## API Endpoints

### Authentication Endpoints

| Method | Path                 | Description                                      | Auth |
| ------ | -------------------- | ------------------------------------------------ | ---- |
| POST   | `/api/auth/register` | Register a new student account                   | No   |
| POST   | `/api/auth/login`    | Login and receive a JWT                          | No   |
| GET    | `/api/auth/me`       | Retrieve the authenticated user's profile        | Yes  |

### Question Paper Management

| Method | Path                               | Description                                                        | Auth          |
| ------ | ---------------------------------- | ------------------------------------------------------------------ | ------------- |
| GET    | `/api/papers`                      | List papers (admins see all, students see approved published ones) | Yes           |
| GET    | `/api/papers/:paperId`             | Fetch a paper with nested questions + sub-questions                | Yes           |
| POST   | `/api/papers`                      | Create a paper with schedule, status, and optional questions       | Admin         |
| PATCH  | `/api/papers/:paperId`             | Update paper metadata and schedule                                | Admin         |
| POST   | `/api/papers/:paperId/questions`   | Append a new question (with sub-questions) to a paper              | Admin         |

### Access Requests

| Method | Path                        | Description                                         | Auth                 |
| ------ | --------------------------- | --------------------------------------------------- | -------------------- |
| GET    | `/api/access-requests`      | List access requests (admins all, students see own) | Yes                  |
| POST   | `/api/access-requests`      | Students request access to a published paper        | Student              |
| PATCH  | `/api/access-requests/:id`  | Approve or reject a request                         | Admin                |

### Submissions & Grading

| Method | Path                               | Description                                                | Auth    |
| ------ | ---------------------------------- | ---------------------------------------------------------- | ------- |
| GET    | `/api/submissions`                 | List submissions (owners all, students see their own)      | Yes     |
| GET    | `/api/submissions/:id`             | Retrieve a submission with answers and grades              | Yes     |
| POST   | `/api/submissions`                 | Submit answers for a paper (enforces early-submission rule)| Student |
| POST   | `/api/submissions/:id/grades`      | Upsert grades per sub-question and mark submission reviewed| Owner   |

### Subscriptions

| Method | Path                                             | Description                                           | Auth    |
| ------ | ------------------------------------------------ | ----------------------------------------------------- | ------- |
| GET    | `/api/subscription`                              | Current organizer subscription summary                | Yes     |
| GET    | `/api/subscription/mock-paper`                   | Current student's mock-paper access and quota         | Student |
| GET    | `/api/admin/subscriptions`                       | List organizer subscription records                   | Owner   |
| PATCH  | `/api/admin/subscriptions/:subscriptionId`       | Update organizer subscription metadata/status         | Owner   |
| GET    | `/api/admin/subscriptions/students`              | List student mock-paper subscriptions                 | Owner   |
| PUT    | `/api/admin/subscriptions/students/:studentId`   | Create/update a student's mock-paper access           | Owner   |
| POST   | `/api/admin/subscriptions/students/:studentId/reset-usage` | Reset a student's mock-paper usage counter | Owner   |
| GET    | `/api/admin/subscriptions/plans`                 | List student subscription plans                       | Owner   |
| POST   | `/api/admin/subscriptions/plans`                 | Create a student subscription plan                    | Owner   |
| PATCH  | `/api/admin/subscriptions/plans/:planId`         | Update a student subscription plan                    | Owner   |
| DELETE | `/api/admin/subscriptions/plans/:planId`         | Delete a student subscription plan                    | Owner   |

### Question Categories and Mock Papers

| Method | Path                                           | Description                                      | Auth    |
| ------ | ---------------------------------------------- | ------------------------------------------------ | ------- |
| GET    | `/api/question-categories`                     | List owner-managed categories                    | Owner   |
| GET    | `/api/question-categories/active`              | List active categories available for mock papers | Yes     |
| POST   | `/api/question-categories`                     | Create a category                                | Owner   |
| PATCH  | `/api/question-categories/:categoryId`         | Update a category                                | Owner   |
| DELETE | `/api/question-categories/:categoryId`         | Delete a category                                | Owner   |
| POST   | `/api/question-categories/:categoryId/questions/existing` | Add an existing question to a category | Owner   |
| POST   | `/api/question-categories/:categoryId/questions` | Create a mock-only question in a category      | Owner   |
| DELETE | `/api/question-categories/:categoryId/questions/:questionId` | Remove a question from a category    | Owner   |
| GET    | `/api/mock-papers`                             | List student's generated mock papers             | Student |
| POST   | `/api/mock-papers`                             | Generate a mock paper from selected categories   | Student |
| GET    | `/api/mock-papers/:mockPaperId`                | Fetch a mock paper                               | Yes     |
| POST   | `/api/mock-papers/:mockPaperId/submissions`    | Submit mock-paper answers; partial/empty allowed | Student |
| POST   | `/api/mock-papers/:mockPaperId/archive`        | Archive own generated mock paper                 | Student |
| GET    | `/api/mock-papers/submissions`                 | List mock-paper submissions                      | Owner   |
| POST   | `/api/mock-papers/submissions/:submissionId/grades` | Grade a mock-paper submission                | Owner   |
| GET    | `/api/mock-papers/submissions/:submissionId/feedback` | Student feedback for reviewed mock paper    | Student |

### User Management

| Method | Path                    | Description                    | Auth             |
| ------ | ----------------------- | ------------------------------ | ---------------- |
| GET    | `/api/users`            | List users (paginated)         | Admin            |
| POST   | `/api/users`            | Create a user (admin creates)  | Admin            |
| GET    | `/api/users/:id`        | Get user details               | Admin/Self       |
| PATCH  | `/api/users/:id`        | Update profile (admin or self) | Admin/Self       |
| DELETE | `/api/users/:id`        | Delete a user                  | Admin            |
| PATCH  | `/api/users/:id/role`   | Update role                    | Admin            |

### Utility Endpoints

| Method | Path        | Description                                        | Auth |
| ------ | ----------- | -------------------------------------------------- | ---- |
| GET    | `/health`   | Service health check (API, database, cache status) | No   |
| GET    | `/api-docs` | Interactive Swagger UI documentation              | No   |

**Notes:**
- All request bodies are validated with Zod schemas and sanitized
- Validation failures return `400` with detailed error messages
- Authentication uses JWT tokens in `Authorization: Bearer <token>` header
- Role-based access control: organizer `OWNER` + `STUDENT`

---

## Authentication and Authorization

### JWT Authentication
- **JWT Tokens**: Signed with `JWT_SECRET` and validated in `requireAuth` middleware
- **Token Format**: `Authorization: Bearer <your-jwt-token>`
- **Token Expiration**: Configurable via `JWT_EXPIRES_IN` (default: 15 minutes)

### Role-Based Access Control
- **OWNER**: Manage papers, access requests, grading, subscriptions, question categories, and mock-paper submissions for their organizer
- **STUDENT**: Request paper access, view approved papers, submit answers, generate mock papers within assigned quota, and view feedback
- Organizer membership, organizer status, and subscription status are checked before organizer-scoped resources are served.

### User Roles in Seed Data
- **Owner User**: `admin@exam.io` - Full organizer access
- **Students**: `student1@exam.io`, `student2@exam.io` with example school codes
- **Sample Paper**: Mathematics mock exam with pre-seeded questions/sub-questions
- **Sample Categories/Subscriptions**: mock-paper categories and fixed student mock-paper access
- **Sample Data**: Approved/pending access requests and one submission with grades

### Authentication Flow
1. **Register/Login** via `/api/auth/register` or `/api/auth/login`
2. **Receive JWT token** in response
3. **Include token** in `Authorization` header for protected requests
4. **Swagger UI** automatically persists tokens for testing

---

## Performance Defaults

- Rate limiting (100 requests per 15 minutes per IP) and compression are enabled by default.
- Request IDs are attached to each request and injected into log entries for traceability.

---

## Access Request, Subscription, and Mock-Paper Workflow

- `src/services/access-request.service.ts` handles student requests, owner approvals/rejections, and pagination helpers.
- `src/services/submission.service.ts` enforces exam windows, early submission restrictions, and per-question answer validation.
- `src/services/paper.service.ts` exposes helpers for listing papers, including nested questions/sub-questions in a single call.
- `src/services/subscription.service.ts` checks organizer subscription status, manages student mock-paper access, and increments/resets usage.
- `src/services/mock-paper.service.ts` generates mock papers from active categories, stores submissions, and supports owner grading plus student feedback.

---

## Google Cloud Storage Uploads

- `src/middleware/upload.middleware.ts` configures Multer for in-memory uploads with configurable size limits.
- `src/services/upload.service.ts` streams files to your configured Google Cloud Storage bucket. Set `GCP_BUCKET_NAME` in `.env` and provide credentials via `GOOGLE_APPLICATION_CREDENTIALS` (or other ADC-supported methods) before using this endpoint.

---

## Database Schema & Seed Data

### Prisma Models
- **User/Organizer/OrganizerMembership**: Owners and students scoped to an organizer, with UUID ids, hashed passwords, and optional school codes
- **Subscription**: Organizer-level platform access status and period
- **StudentSubscription/StudentSubscriptionPlan**: Student mock-paper access limits, usage, and expiry
- **QuestionPaper**: Exam metadata (schedule, duration, early submission rule, status) and creator relation
- **Question/SubQuestion**: Ordered content definition with per-sub-question marks; questions can also be mock-only category questions
- **QuestionCategory/QuestionCategoryItem**: Owner-managed pools used for mock-paper generation
- **MockPaper/MockPaperItem/MockSubmission/MockAnswer/MockGrade**: Generated mock papers, answers, grading, and feedback
- **AccessRequest**: Tracks student requests plus reviewer + timestamps
- **Submission/Answer/Grade**: One submission per student per paper, with per sub-question responses and assigned marks

### Seed Data Overview
The `prisma/seed.ts` script creates:
- 1 owner (`admin@exam.io`) with full organizer access
- 2 students, one with an approved access request and graded submission
- 1 published paper (“Mathematics Mock Paper”) with nested questions/sub-questions
- Active question categories for mock-paper generation
- Organizer subscription and student mock-paper subscription records
- Pending and approved access requests plus example answers/grades for easy testing

### Database Management
```bash
# View database in browser
npm run prisma:studio

# Reset and reseed (development)
npx prisma migrate reset

# Push schema changes (development only)
npx prisma db push
```

## Development Workflow

### Local Development
1. **Start Services**: `docker-compose up -d db`
2. **Install Dependencies**: `npm install`
3. **Configure Environment**: `cp .env.example .env`
4. **Setup Database**: `npm run prisma:migrate && npm run seed`
5. **Start Development**: `npm run dev`

### Testing API
- **Swagger UI**: http://localhost:8080/api-docs
- **Health Check**: http://localhost:8080/health
- **Prisma Studio**: `npm run prisma:studio`

### Production Deployment
1. **Build Application**: `npm run build`
2. **Use Docker Compose**: `docker-compose up --build`
3. **Database Migrations**: Run automatically on container start
4. **Environment Variables**: Configure in production environment

## Next Steps

- **Extend Models**: Add domain-specific fields to Prisma schema
- **Add Tests**: Implement Jest + Supertest for API testing
- **Monitoring**: Configure production logging and alerting
- **Deployment**: Deploy to Render, Fly.io, AWS, or preferred platform
- **Frontend**: Build React/Vue frontend to consume the API

## Support

- **Documentation**: Comprehensive Swagger UI at `/api-docs`
- **Health Checks**: Monitor service status at `/health`
- **Logs**: Pino-powered logging with request tracing
- **Database**: Prisma Studio for data inspection

Happy building! 🚀
