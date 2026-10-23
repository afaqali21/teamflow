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
| task.create, task.assign, task.update | project member | project member | no |
| task.updateStatus | project member | project member | only when assigned to them |
| task.comment | project member | project member | project member |
| file.delete | project member | project member | only a file they uploaded |
| message.editOwn, message.deleteOwn | own messages, while a channel member | own messages, while a channel member | own messages, while a channel member |
| directMessage.start | with another active user | with another active user | with another active user |
| notification.read | their own | their own | their own |

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
- Re-running the seed refreshes roles, active status, and the shared password for `admin@teamflow.local` (ADMIN), `alex@teamflow.local` (MANAGER), and `jordan@teamflow.local` (EMPLOYEE). Existing display names are kept. If Product Launch already exists, the seed makes sure those three are members of the project and its general channel, and it clears `archivedAt` so the sample project is active. It does not delete other users or projects.

## Status
Day 1 is in place: Next.js app, shadcn/ui, Prisma schema, first migration, seed, GitHub, and the Vercel preview.

Day 2 is in place: credentials login, session id and role, deactivated-user rejection, `src/proxy.ts`, and `can()` with unit tests.

Day 3 is in place: `/admin/users` for admins only, invitation and forgot-password links that expire in 48 hours, and set-password. Password tokens are stored as SHA-256 hashes on `VerificationToken`. Without `RESEND_API_KEY` and `EMAIL_FROM`, development logs the link and the create-user form shows it. The Resend test sender can deliver only to the Resend account email until a domain is verified.

Day 4 is in place: the signed-in shell (sidebar, notification placeholder, user menu, mobile menu) and `/profile`. A user can change their own name. Avatars upload with a presigned PUT to a private R2 bucket (`avatars/{userId}/...`), limited to 2 MB and JPEG, PNG, WebP, or GIF. `User.image` stores the object key. Without the R2 env vars, name edits still work and the avatar control explains that storage is not configured.

Day 5 is in place: `/projects` lists the signed-in user's projects, and admins or managers can create one. Creating a project adds the creator as `OWNER` and a `general` project channel. `/projects/[id]` returns 404 for anyone who is not a member, including an admin. Owners and admin members can add or remove members and archive or restore the project. A project keeps at least one owner. Added members also join the project's channels. The Chat, Tasks, and Files tabs are empty until those features are built. The People tab manages members.

Day 6 is in place: the seed no longer demotes Alex or skips Product Launch memberships when the project already exists. The sidebar shows New project and Admin from `can()`, and New project opens `/projects#new`. Chat, Tasks, and Files are still placeholders.

Day 7 is in place: a channel member can send a message of 1–4000 characters. It is saved in Postgres, then published on the private Pusher channel `private-channel-{id}` when the Pusher env vars are set. `getMessages` returns the newest 30 messages first, with a cursor for the older page. `/api/pusher/auth` allows only a channel member. The project Chat tab is the Day 8 channel UI. The sidebar Chat page is still a placeholder.

Day 8 is in place: the project Chat tab shows each sender's avatar, name, and time. Scrolling to the top loads older messages. New messages scroll into view unless the reader has moved up. Enter sends and Shift+Enter adds a line. A send shows immediately, and a failed send can be retried. A member can edit or delete only their own messages. The browser subscribes to `private-channel-{id}` and keeps one copy of each message id. Without Pusher keys, sending and history still work.

Day 9 is in place: starting a direct message finds or creates one channel for exactly those two people. `/chat` lists direct messages and project channels, each with an unread count. A message from someone else counts as unread until `ChannelMember.lastReadAt` moves past it, which happens when you open the channel or scroll back to the latest messages. The sidebar Chat link shows the total. Typing indicators and presence are not built.

Day 10 is in place: a project member opens the Tasks tab for a list or a board. The list filters by status, assignee, and due date. An admin or manager who belongs to the project can create a task and assign it to an active member. An employee can change the status of a task assigned to them. Dragging a card to another column calls the same status action, which rejects the move when that person is not allowed to make it.

Day 11 is in place: a task has its own page with editable fields for a project admin or manager, a comment thread for members, an attachments placeholder, and an activity history. My Tasks groups the signed-in user's assignments into Overdue, Today, This week, and Later, with a status control on each row. A task with no due date sits in Later.

Day 12 is in place: assigning a task, changing the status of someone else's assignment, or @mentioning a channel member creates a notification for that person. The bell shows an unread count and a list, and each item or the whole list can be marked read. Only a task assignment sends email, through the same Resend settings as password mail. New notifications are published on `private-user-{id}`. You are not notified about your own action. A mention matches a member's full name or email, and editing a message notifies only people who were not already mentioned.

Day 13 is in place: project members upload files through `requestUpload` → presigned PUT to private R2 → `confirmUpload`. Ready files list on the project Files tab with drag-and-drop, progress, download (short-lived GET), and delete for the uploader or a project admin/manager. Max size is 25 MB with an allowlisted mime set. `/files` (library route) lists ready files across projects the user belongs to. Without R2 env vars, uploads explain that storage is not configured.

Day 14 is in place: project chat can attach up to 5 ready project files on send (DMs have no project files). Task detail can attach or remove project files. Messages and tasks show attachment cards with image/PDF inline preview (via short-lived inline URLs) and download. Folders were skipped. Preview/download still need R2 configured later.

Day 15 is in place: `/admin` shows users by role, active/archived projects, tasks by status, overdue count, ready-file storage total, and recent ActivityLog rows (admins only via `users.list`). `/admin/users` keeps user management with Overview/Users tabs. Global search at `/search` (header field + ⌘/Ctrl+K) returns people, projects, tasks, and files the signed-in user may see: project/task/file hits are membership-scoped; non-admins only see active people.

Day 16 (audit only, no code changes yet): security review listed rate limiting gaps (login, reset, sendMessage), unbounded R2 PUTs without ContentLength, invite tokens returned to the admin UI when email fails, MIME trust on confirm, archived projects still writable, session not invalidated on password change, and related medium/low items. Core server actions generally check session + `can()` / membership (IDOR mostly covered). Fixes should be one issue per prompt after review.

Set `AUTH_SECRET` in Vercel before the login page is used on the preview deploy. Local `.env` already has `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`.
