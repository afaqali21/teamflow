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

A deactivated user (`isActive` false) fails every `can()` check and cannot sign in.

| Action | ADMIN | MANAGER | EMPLOYEE |
|---|---|---|---|
| users.list, users.create | yes | no | no |
| users.update | yes, including their own name; cannot demote themselves | no | no |
| users.deactivate | yes, except themselves | no | no |
| profile.update | their own name and avatar | their own name and avatar | their own name and avatar |
| projects.create | yes | yes | no |
| project.view, file.upload, message.send | project or channel member | project or channel member | project or channel member |
| project.update, project.archive, project.manageMembers | any project member | project owner | project owner |
| task.create, task.assign | project member | project member | no |
| task.updateStatus | project member | project member | only when assigned to them |
| file.delete | project member | project member | only a file they uploaded |
| message.editOwn, message.deleteOwn | own messages, while a channel member | own messages, while a channel member | own messages, while a channel member |

Someone who is not a member of the project or channel gets no access to that resource, including an admin.

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
- Auth.js v5 (`next-auth@5.0.0-beta.32`) with the Prisma adapter. Credentials login uses JWT sessions because Auth.js does not persist credential sessions in the database. The JWT and session include `user.id` and `user.role`.
- Route protection lives in `src/proxy.ts` (Next.js 16 renamed middleware to proxy). `/login` and `/api/auth` stay public.
- Global role (`ADMIN` / `MANAGER` / `EMPLOYEE`) is separate from project membership (`OWNER` / `MEMBER`).
- Deleting a user is blocked when they authored messages, tasks, comments, or files. Deactivate with `isActive` instead.
- An attachment may point at a message, a task, or both. The action that creates it must require at least one.
- Seeded local users share `SEED_PASSWORD` (default `Password123!`). That value is for local development only.

## Status
Day 1 is in place: Next.js app, shadcn/ui, Prisma schema, first migration, seed, GitHub, and the Vercel preview.

Day 2 is in place: credentials login, session id and role, deactivated-user rejection, `src/proxy.ts`, and `can()` with unit tests.

Day 3 is in place: `/admin/users` for admins only, invitation and forgot-password links that expire in 48 hours, and set-password. Password tokens are stored as SHA-256 hashes on `VerificationToken`. Without `RESEND_API_KEY` and `EMAIL_FROM`, development logs the link and the create-user form shows it. The Resend test sender can deliver only to the Resend account email until a domain is verified.

Day 4 is in place: the signed-in shell (sidebar, notification placeholder, user menu, mobile menu) and `/profile`. A user can change their own name. Avatars upload with a presigned PUT to a private R2 bucket (`avatars/{userId}/...`), limited to 2 MB and JPEG, PNG, WebP, or GIF. `User.image` stores the object key. Without the R2 env vars, name edits still work and the avatar control explains that storage is not configured.

Not built yet: projects, chat, tasks, and file sharing. Those sidebar links open empty pages. The Files link is `/files`, which rewrites to the `library` route because a folder named `files` breaks ESLint on Windows.

Set `AUTH_SECRET` in Vercel before the login page is used on the preview deploy. Local `.env` already has `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`.
