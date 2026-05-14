// prisma/seed.students.ts
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type StudentInput = { name: string; size: string; category: string };

async function main() {
  const event2024 = await prisma.event.upsert({
    where: { year: 2024 },
    update: {},
    create: { year: 2024, theme: "VBS 2024", isActive: false },
  });

  const jsonPath = path.join(process.cwd(), "vbs2024_students.json");
  const data: StudentInput[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  for (const s of data) {
    await prisma.student.create({
      data: {
        name: s.name.trim(),
        size: s.size.trim(),
        category: s.category.trim(),
        events: { create: { eventId: event2024.id } },
      },
    });
  }

  console.log(`Imported ${data.length} students for event ${event2024.year}`);
}

main().finally(async () => prisma.$disconnect());
