# Project: Team Collaboration Platform (Basecamp-style)

## Purpose
Internal company tool: admin manages users and roles; employees chat in real time,
get assigned tasks, and share files inside projects.

## Stack
- Next.js (App Router) + TypeScript (strict)
- PostgreSQL on Neon, Prisma ORM (pooled DATABASE_URL, DIRECT_URL for migrations)
- Auth.js with Prisma adapter, credentials login, session includes user id and role
- Pusher Channels for real-time chat
- Cloudflare R2 (S3 API) with presigned URLs for files
- Resend for email
- Tailwind CSS + shadcn/ui
- Zod for validation
- Hosted on Vercel (serverless: NO WebSockets, NO local disk storage)

## Roles
ADMIN, MANAGER, EMPLOYEE. All permission checks go through `can(user, action, resource)`
in `src/lib/permissions.ts`. Never check roles inline in components.

## Conventions
- Mutations use server actions in `src/actions/<feature>.ts`
- Every server action: 1) get session 2) validate input with Zod 3) check `can()` 4) do the work
- Prisma client is a singleton in `src/lib/db.ts`
- Components in `src/components/<feature>/`, pages in `src/app/`
- No `any`. No secrets in client code. All env vars documented in `.env.example`
- Use shadcn/ui components before writing custom ones
- Loading, empty, and error states are required for every list and form

## Definition of done for any feature
- Works in the browser
- `npm run lint` and `npm run build` pass
- Permissions enforced on the server
- At least one test for the main path and one for a forbidden case

## Decisions
- App package name is `teamflow`. npm rejects the folder name `Teamflow`.
- Prisma 6, with `DATABASE_URL` (pooled) and `DIRECT_URL` (migrations) in `prisma/schema.prisma`.
- Password hashes use `bcryptjs` (pure JavaScript, no native build on Vercel). Stored on `User.passwordHash`.
- Global role (`ADMIN` / `MANAGER` / `EMPLOYEE`) is separate from project membership (`OWNER` / `MEMBER`).
- Deleting a user is blocked when they authored messages, tasks, comments, or files. Deactivate with `isActive` instead.
- An attachment may point at a message, a task, or both. The action that creates it must require at least one.
- Seeded local users share `SEED_PASSWORD` (default `Password123!`). That value is for local development only.

## Status
Day 1 is in place: Next.js app, shadcn/ui, Prisma schema, `src/lib/db.ts`, `.env.example`, and `prisma/seed.ts`.

Not built yet: Auth.js, permissions, admin UI, app shell, projects, chat, tasks, files.

No migration has been applied. After `DATABASE_URL` and `DIRECT_URL` are set, run `npx prisma migrate dev --name init`, then `npx prisma db seed`.
