import { PrismaClient } from '@prisma/client';
import { seedOrg } from './seed-org';

const prisma = new PrismaClient();

async function main() {
  // The church everything below belongs to. Created first, because every table
  // this seed touches is NOT NULL on orgId.
  const org = await seedOrg(prisma);

  // Initialize default categories if none exist
  const categoryCount = await prisma.studentCategory.count({ where: { orgId: org.id } });
  if (categoryCount === 0) {
    await prisma.studentCategory.createMany({
      data: [
        { orgId: org.id, name: "Youth", order: 1, eventId: null },
        { orgId: org.id, name: "Jovenes", order: 2, eventId: null },
        { orgId: org.id, name: "Teacher/Assistant", order: 3, eventId: null },
      ],
    });
    console.log("Created default categories");
  }

  // Create demo event
  const event = await prisma.event.upsert({
    where: { orgId_year: { orgId: org.id, year: 2026 } },
    update: {},
    create: { orgId: org.id, year: 2026, theme: "True North", isActive: true }
  });

  console.log("Seeded event:", event);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
