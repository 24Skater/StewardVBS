// prisma/seed.students.ts
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import { seedOrg } from "./seed-org";

const prisma = new PrismaClient();

type StudentInput = { name: string; size: string; category: string };

async function main() {
  const org = await seedOrg(prisma);

  const event2024 = await prisma.event.upsert({
    where: { orgId_year: { orgId: org.id, year: 2024 } },
    update: {},
    create: { orgId: org.id, year: 2024, theme: "VBS 2024", isActive: false },
  });

  const jsonPath = path.join(process.cwd(), "vbs2024_students.json");
  const data: StudentInput[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  for (const s of data) {
    await prisma.student.create({
      data: {
        orgId: org.id,
        name: s.name.trim(),
        size: s.size.trim(),
        category: s.category.trim(),
        events: { create: { orgId: org.id, eventId: event2024.id } },
      },
    });
  }

  console.log(`Imported ${data.length} students for event ${event2024.year}`);
}

main().finally(async () => prisma.$disconnect());
