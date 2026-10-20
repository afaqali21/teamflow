import { PrismaClient, Role, TaskPriority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";
const PROJECT_NAME = "Product Launch";

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@teamflow.local" },
    update: {
      name: "Avery Admin",
      role: Role.ADMIN,
      isActive: true,
      passwordHash,
    },
    create: {
      name: "Avery Admin",
      email: "admin@teamflow.local",
      role: Role.ADMIN,
      isActive: true,
      passwordHash,
    },
  });

  const employeeSeeds = [
    { name: "Alex Rivera", email: "alex@teamflow.local" },
    { name: "Jordan Lee", email: "jordan@teamflow.local" },
    { name: "Sam Patel", email: "sam@teamflow.local" },
  ];

  const employees = [];
  for (const employee of employeeSeeds) {
    employees.push(
      await prisma.user.upsert({
        where: { email: employee.email },
        update: {
          name: employee.name,
          role: Role.EMPLOYEE,
          isActive: true,
          passwordHash,
        },
        create: {
          name: employee.name,
          email: employee.email,
          role: Role.EMPLOYEE,
          isActive: true,
          passwordHash,
        },
      }),
    );
  }

  const [alex, jordan, sam] = employees;
  if (!alex || !jordan || !sam) {
    throw new Error("Expected three employees to be seeded.");
  }

  const existingProject = await prisma.project.findFirst({
    where: { name: PROJECT_NAME },
    select: { id: true },
  });

  if (existingProject) {
    console.log("Sample project already exists. User passwords were refreshed.");
    return;
  }

  const dueSoon = daysFromNow(2);
  const dueLater = daysFromNow(5);

  const project = await prisma.project.create({
    data: {
      name: PROJECT_NAME,
      description: "Coordinate the launch: messaging, tasks, and shared files.",
      members: {
        create: [
          { userId: admin.id, role: "OWNER" },
          { userId: alex.id, role: "MEMBER" },
          { userId: jordan.id, role: "MEMBER" },
          { userId: sam.id, role: "MEMBER" },
        ],
      },
      channels: {
        create: {
          type: "PROJECT",
          name: "general",
          members: {
            create: [
              { userId: admin.id },
              { userId: alex.id },
              { userId: jordan.id },
              { userId: sam.id },
            ],
          },
          messages: {
            create: [
              {
                authorId: admin.id,
                body: "Welcome to Product Launch. This channel is for the whole team.",
              },
              {
                authorId: alex.id,
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
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.HIGH,
            assigneeId: alex.id,
            createdById: admin.id,
            dueDate: dueSoon,
            comments: {
              create: {
                authorId: jordan.id,
                body: "I can review the draft tomorrow morning.",
              },
            },
          },
          {
            title: "Collect screenshots",
            status: TaskStatus.TODO,
            priority: TaskPriority.MEDIUM,
            assigneeId: sam.id,
            createdById: admin.id,
            dueDate: dueLater,
          },
          {
            title: "Confirm stakeholder list",
            status: TaskStatus.DONE,
            priority: TaskPriority.LOW,
            assigneeId: jordan.id,
            createdById: admin.id,
          },
        ],
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: alex.id,
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
      metadata: { name: project.name },
    },
  });

  console.log("Seeded 1 admin, 3 employees, and the Product Launch project.");
  console.log(`Local dev password for every seeded user: ${SEED_PASSWORD}`);
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
