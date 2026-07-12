# eassessment

Frontend client for the eAssessment platform.

## Current Features

- Owner/admin dashboard for assessments, access requests, answer review, subscriptions, mock-paper submissions, and question categories.
- Student dashboard for assigned assessments, feedback, and mock papers.
- Mock-paper generation from active question categories with subscription/quota checks handled by the API.
- Assessment-style mock-paper attempt view with timer, calculator, question navigator, fullscreen lock, and partial/empty mock submission support.
- Owner-managed student mock-paper access from `/admin/subscriptions`.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local env file:

   ```bash
   copy .env.example .env.local
   ```

3. Set the backend URL:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8080/api
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - start the Next.js app
- `npm run build` - build for production
- `npm run start` - run the production build
- `npm run lint` - run ESLint

## Main Routes

### Owner/Admin

- `/admin/questions` - assessment/question builder, access requests, and review answers
- `/admin/mock-papers` - review mock-paper submissions
- `/admin/mock-papers/[submissionId]` - grade a mock-paper submission
- `/admin/question-categories` - manage category pools used for mock-paper generation
- `/admin/subscriptions` - view organizer subscription and manage student mock-paper access

### Student

- `/student/assessments` - assigned/available assessments
- `/student/assessments/[assessmentId]` - assessment attempt view
- `/student/feedback` - assessment feedback list
- `/student/mock-papers` - generate and list mock papers
- `/student/mock-papers/[mockPaperId]` - mock-paper attempt view
- `/student/mock-papers/feedback/[submissionId]` - mock-paper feedback

## Subscription Behavior

- The frontend displays mock-paper access status on `/student/mock-papers`.
- The API enforces organizer subscription status, student mock-paper status, expiry, and quota.
- Owners manage student mock-paper limits, access status, expiry date, and usage reset from `/admin/subscriptions`.
- The old `/student/subscription` page has been removed; student access is surfaced where mock papers are used.

## Notes

- Auth uses backend cookies, so frontend requests must include credentials.
- Media uploads are handled by the frontend upload route and stored directly in Google Cloud Storage.
- Do not commit `.env.local` or other secret files.
