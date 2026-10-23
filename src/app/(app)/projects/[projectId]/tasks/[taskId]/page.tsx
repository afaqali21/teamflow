import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TaskAttachments } from "@/components/files/task-attachments";
import { DeleteTaskForm } from "@/components/tasks/delete-task-form";
import { TaskCommentForm } from "@/components/tasks/task-comment-form";
import { TaskFieldsForm } from "@/components/tasks/task-fields-form";
import { TaskStatusControl } from "@/components/tasks/task-status-control";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { ProjectMemberRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import {
  isTaskPriority,
  isTaskStatus,
  taskPriorityLabel,
  taskStatusLabel,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task-filters";

type TaskDetails = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assigneeId: string | null;
  project: { id: string; name: string };
  assignee: { id: string; name: string | null; email: string } | null;
  createdBy: { name: string | null; email: string };
  comments: {
    id: string;
    body: string;
    createdAt: Date;
    author: { name: string | null; email: string };
  }[];
  attachments: {
    id: string;
    fileId: string;
    file: { name: string; mimeType: string; size: number; uploaderId: string; status: string };
  }[];
};

export default function TaskPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-6 py-10">
          <p className="text-sm text-muted-foreground">Loading task...</p>
        </main>
      }
    >
      <TaskPanel params={params} />
    </Suspense>
  );
}

async function TaskPanel({ params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  const actor = await requireUser();
  const { projectId, taskId } = await params;
  const [task, membership, activity, projectFiles]: [
    TaskDetails | null,
    { role: string } | null,
    { id: string; action: string; createdAt: Date; actor: { name: string | null; email: string } | null }[],
    { id: string; name: string }[],
  ] = await Promise.all([
    db.task.findFirst({
      where: { id: taskId, projectId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { name: true, email: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { name: true, email: true } },
          },
        },
        attachments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fileId: true,
            file: {
              select: {
                name: true,
                mimeType: true,
                size: true,
                uploaderId: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actor.id } },
      select: { role: true },
    }),
    db.activityLog.findMany({
      where: { entityType: "task", entityId: taskId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    db.file.findMany({
      where: { projectId, status: "READY" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);
  const role: ProjectMemberRole | null =
    membership?.role === "OWNER" || membership?.role === "MEMBER" ? membership.role : null;
  const resource = { type: "task" as const, memberRole: role, assigneeId: task?.assigneeId ?? null };
  if (!task || !can(actor, "task.comment", resource)) {
    notFound();
  }

  const status: TaskStatus = isTaskStatus(task.status) ? task.status : "TODO";
  const priority: TaskPriority = isTaskPriority(task.priority) ? task.priority : "MEDIUM";
  const canEdit = can(actor, "task.update", resource);
  const canStatus = can(actor, "task.updateStatus", resource);
  const canDelete = can(actor, "task.delete", resource);
  const people: { id: string; name: string | null; email: string; isActive: boolean }[] = canEdit
    ? await db.user.findMany({
        where: { isActive: true, memberships: { some: { projectId } } },
        select: { id: true, name: true, email: true, isActive: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      })
    : [];

  return (
    <PageFrame
      crumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Projects", href: "/projects" },
        { label: task.project.name, href: `/projects/${projectId}?tab=tasks` },
        { label: "Tasks", href: `/projects/${projectId}?tab=tasks` },
        { label: task.title },
      ]}
    >
      <div>
        <PageHeader
          title={task.title}
          description={`Created by ${personLabel(task.createdBy)}`}
        />
      </div>
      <SurfaceCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Status</h2>
        {canStatus ? (
          <TaskStatusControl key={`${task.id}-${status}`} taskId={task.id} status={status} />
        ) : (
          <p className="text-sm">{taskStatusLabel[status]}</p>
        )}
      </SurfaceCard>
      <SurfaceCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Details</h2>
        {canEdit ? (
          <TaskFieldsForm
            taskId={task.id}
            title={task.title}
            description={task.description ?? ""}
            priority={priority}
            assigneeId={task.assigneeId ?? ""}
            dueDate={task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""}
            people={people.map((person) => ({
              id: person.id,
              label: person.name?.trim() || person.email,
            }))}
          />
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Priority</dt>
              <dd>{taskPriorityLabel[priority]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Assignee</dt>
              <dd>{personLabel(task.assignee)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Due date</dt>
              <dd>{task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "No due date"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="whitespace-pre-wrap">{task.description || "No description"}</dd>
            </div>
          </dl>
        )}
      </SurfaceCard>
      <SurfaceCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Comments</h2>
        {task.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {task.comments.map((comment) => (
              <li key={comment.id} className="rounded-xl bg-surface-low p-3">
                <p className="text-sm font-medium">
                  {personLabel(comment.author)}{" "}
                  <time dateTime={comment.createdAt.toISOString()} className="font-normal text-xs text-muted-foreground">
                    {formatWhen(comment.createdAt)}
                  </time>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
        <TaskCommentForm taskId={task.id} />
      </SurfaceCard>
      <SurfaceCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Attachments</h2>
        <TaskAttachments
          taskId={task.id}
          canAttach={can(actor, "task.comment", resource)}
          projectFiles={projectFiles.map((file) => ({ id: file.id, label: file.name }))}
          attachments={task.attachments
            .filter((item) => item.file.status === "READY")
            .map((item) => ({
              id: item.id,
              fileId: item.fileId,
              name: item.file.name,
              mimeType: item.file.mimeType,
              size: item.file.size,
              canRemove:
                can(actor, "file.delete", {
                  type: "file",
                  memberRole: role,
                  uploaderId: item.file.uploaderId,
                }) || canEdit,
            }))}
        />
      </SurfaceCard>
      {canDelete ? (
        <SurfaceCard className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Permanently remove this task and its comments. Only admins can do this.
          </p>
          <DeleteTaskForm taskId={task.id} title={task.title} />
        </SurfaceCard>
      ) : null}
      <SurfaceCard className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((entry) => (
              <li key={entry.id} className="text-sm">
                <span className="font-medium">{entry.actor ? personLabel(entry.actor) : "Someone"}</span>{" "}
                {entry.action}{" "}
                <time dateTime={entry.createdAt.toISOString()} className="text-xs text-muted-foreground">
                  {formatWhen(entry.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>
    </PageFrame>
  );
}

function personLabel(person: { name: string | null; email: string } | null) {
  if (!person) {
    return "Unassigned";
  }
  return person.name?.trim() || person.email;
}

function formatWhen(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
