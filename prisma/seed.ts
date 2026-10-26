import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";
const PROJECT_NAME = "Product Launch";

const demoUsers = [
  { name: "Admin", email: "admin@teamflow.local", role: "ADMIN", projectRole: "OWNER" },
  { name: "afaq", email: "dev.gmf781@gmail.com", role: "EMPLOYEE", projectRole: "MEMBER" },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const users = [];
  for (const demo of demoUsers) {
    users.push(
      await prisma.user.upsert({
        where: { email: demo.email },
        update: {
          role: demo.role,
          isActive: true,
        },
        create: {
          name: demo.name,
          email: demo.email,
          role: demo.role,
          isActive: true,
          passwordHash,
        },
      }),
    );
  }

  const [admin, afaq] = users;
  if (!admin || !afaq) {
    throw new Error("Expected the admin and employee to be seeded.");
  }

  const dueSoon = daysFromNow(2);
  const dueLater = daysFromNow(5);

  const existingProject = await prisma.project.findFirst({
    where: { name: PROJECT_NAME },
    select: { id: true },
  });

  const project =
    existingProject ??
    (await prisma.project.create({
      data: {
        name: PROJECT_NAME,
        description: "Coordinate the launch: messaging, tasks, and shared files.",
        members: {
          create: [
            { userId: admin.id, role: "OWNER" },
            { userId: afaq.id, role: "MEMBER" },
          ],
        },
        channels: {
          create: {
            type: "PROJECT",
            name: "general",
            members: {
              create: [{ userId: admin.id }, { userId: afaq.id }],
            },
            messages: {
              create: [
                {
                  authorId: admin.id,
                  body: "Welcome to Product Launch. This channel is for the whole team.",
                },
                {
                  authorId: afaq.id,
                  body: "I'll own the launch checklist and keep tasks updated.",
                },
              ],
            },
          },
        },
        tasks: {
          create: [
            {
              title: "Draft launch announcement",
              description: "Write the internal announcement for the launch date.",
              status: "IN_PROGRESS",
              priority: "HIGH",
              assigneeId: afaq.id,
              createdById: admin.id,
              dueDate: dueSoon,
              comments: {
                create: {
                  authorId: afaq.id,
                  body: "I can review the draft tomorrow morning.",
                },
              },
            },
            {
              title: "Collect screenshots",
              status: "TODO",
              priority: "MEDIUM",
              assigneeId: afaq.id,
              createdById: admin.id,
              dueDate: dueLater,
            },
            {
              title: "Confirm stakeholder list",
              status: "DONE",
              priority: "LOW",
              assigneeId: afaq.id,
              createdById: admin.id,
            },
          ],
        },
      },
      select: { id: true },
    }));

  if (!existingProject) {
    await prisma.notification.create({
      data: {
        userId: afaq.id,
        type: "TASK_ASSIGNED",
        title: "You were assigned a task",
        body: "Draft launch announcement",
      },
    });
    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        action: "project.created",
        entityType: "Project",
        entityId: project.id,
        metadata: { name: PROJECT_NAME },
      },
    });
  }

  await ensureDemoMemberships(project.id, [
    { userId: admin.id, role: "OWNER" },
    { userId: afaq.id, role: "MEMBER" },
  ]);

  console.log("Seeded admin and afaq (employee) on Product Launch.");
  console.log("admin@teamflow.local is the admin.");
  console.log("dev.gmf781@gmail.com is afaq (employee) and a project member.");
  console.log(`Shared local password: ${SEED_PASSWORD}`);
}

async function ensureDemoMemberships(
  projectId: string,
  members: { userId: string; role: "OWNER" | "MEMBER" }[],
) {
  const channel = await prisma.channel.findFirst({
    where: { projectId, type: "PROJECT", name: "general" },
    select: { id: true },
  });
  const general =
    channel ??
    (await prisma.channel.create({
      data: { projectId, type: "PROJECT", name: "general" },
      select: { id: true },
    }));

  await prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: null },
  });

  for (const member of members) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: member.userId } },
      update: {},
      create: { projectId, userId: member.userId, role: member.role },
    });
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: general.id, userId: member.userId } },
      update: {},
      create: { channelId: general.id, userId: member.userId },
    });
  }
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
