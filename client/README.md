# eassessment

Frontend client for the eAssessment platform.

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

## Notes

- Auth uses backend cookies, so frontend requests must include credentials.
- Media uploads are handled by the frontend upload route and stored directly in Google Cloud Storage.
- Do not commit `.env.local` or other secret files.
