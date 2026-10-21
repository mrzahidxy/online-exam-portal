# AGENT.md

This repo has two separate apps:

- `client/` for the Next.js frontend
- `api/` for the Express + Prisma backend

## Working Rules

- Keep changes narrow and match the existing code style.
- Inspect the current files before editing.
- Do not invent new env names or routes unless the repo already uses them.
- Preserve existing behavior unless the task explicitly asks for a change.

## Common Commands

Frontend:

- `cd client`
- `npm run dev`
- `npm run build`
- `npm run lint`

Backend:

- `cd api`
- `npm run dev`
- `npm run build`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run seed`

## Notes

- Keep frontend and backend env files aligned with what the code actually reads.
- If a task touches auth, payments, or Prisma, verify the current repo state first.
