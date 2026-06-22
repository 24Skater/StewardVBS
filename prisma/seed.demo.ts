// prisma/seed.demo.ts — loads ~25 sample students into the active event
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SIZES = ["XS", "S", "M", "L", "XL"];
const GRADES = ["Pre-K", "K", "1st", "2nd", "3rd", "4th", "5th", "6th"];

const STUDENTS: Array<{
  name: string;
  size: string;
  category: string;
  grade?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  allergies?: string;
}> = [
  { name: "Sofia Martinez", size: "S", category: "Youth", grade: "3rd", parentName: "Maria Martinez", parentPhone: "555-0101", parentEmail: "maria.martinez@example.com" },
  { name: "Lucas Hernandez", size: "M", category: "Youth", grade: "5th", parentName: "Jose Hernandez", parentPhone: "555-0102", parentEmail: "jose.hernandez@example.com" },
  { name: "Isabella Garcia", size: "XS", category: "Youth", grade: "1st", parentName: "Ana Garcia", parentPhone: "555-0103", allergies: "Peanuts" },
  { name: "Mateo Lopez", size: "M", category: "Youth", grade: "4th", parentName: "Carlos Lopez", parentPhone: "555-0104", parentEmail: "carlos.lopez@example.com" },
  { name: "Valeria Rodriguez", size: "S", category: "Youth", grade: "2nd", parentName: "Rosa Rodriguez", parentPhone: "555-0105" },
  { name: "Sebastian Gonzalez", size: "L", category: "Youth", grade: "6th", parentName: "Pedro Gonzalez", parentPhone: "555-0106", parentEmail: "pedro.gonzalez@example.com" },
  { name: "Camila Torres", size: "XS", category: "Youth", grade: "K", parentName: "Elena Torres", parentPhone: "555-0107" },
  { name: "Daniel Ramirez", size: "M", category: "Youth", grade: "5th", parentName: "Luis Ramirez", parentPhone: "555-0108", parentEmail: "luis.ramirez@example.com", allergies: "Gluten" },
  { name: "Emma Flores", size: "S", category: "Youth", grade: "3rd", parentName: "Carmen Flores", parentPhone: "555-0109" },
  { name: "Noah Reyes", size: "L", category: "Youth", grade: "6th", parentName: "Miguel Reyes", parentPhone: "555-0110", parentEmail: "miguel.reyes@example.com" },
  { name: "Mia Jimenez", size: "XS", category: "Youth", grade: "Pre-K", parentName: "Sandra Jimenez", parentPhone: "555-0111" },
  { name: "Liam Morales", size: "M", category: "Youth", grade: "4th", parentName: "Roberto Morales", parentPhone: "555-0112", parentEmail: "roberto.morales@example.com" },
  { name: "Olivia Castillo", size: "S", category: "Youth", grade: "2nd", parentName: "Diana Castillo", parentPhone: "555-0113" },
  { name: "Ethan Ortiz", size: "L", category: "Youth", grade: "5th", parentName: "Fernando Ortiz", parentPhone: "555-0114", parentEmail: "fernando.ortiz@example.com", allergies: "Dairy" },
  { name: "Ava Ruiz", size: "S", category: "Youth", grade: "1st", parentName: "Patricia Ruiz", parentPhone: "555-0115" },
  { name: "Carlos Mendoza", size: "XL", category: "Jovenes", parentName: "Jorge Mendoza", parentPhone: "555-0201", parentEmail: "jorge.mendoza@example.com" },
  { name: "Andrea Vega", size: "S", category: "Jovenes", parentName: "Gloria Vega", parentPhone: "555-0202" },
  { name: "Ricardo Suarez", size: "L", category: "Jovenes", parentName: "Hector Suarez", parentPhone: "555-0203", parentEmail: "hector.suarez@example.com" },
  { name: "Gabriela Nunez", size: "M", category: "Jovenes", parentName: "Alicia Nunez", parentPhone: "555-0204" },
  { name: "David Vargas", size: "XL", category: "Jovenes", parentName: "Eduardo Vargas", parentPhone: "555-0205", parentEmail: "eduardo.vargas@example.com" },
  { name: "Laura Aguilar", size: "S", category: "Teacher/Assistant" },
  { name: "Marco Perez", size: "L", category: "Teacher/Assistant" },
  { name: "Patricia Salinas", size: "M", category: "Teacher/Assistant" },
  { name: "Roberto Cruz", size: "XL", category: "Teacher/Assistant" },
  { name: "Diana Medina", size: "S", category: "Teacher/Assistant" },
];

async function main() {
  const event = await prisma.event.findFirst({ where: { isActive: true } });
  if (!event) {
    console.error("No active event found. Run `npx prisma db seed` first to create one.");
    process.exit(1);
  }

  console.log(`Loading demo students into event: ${event.year} — ${event.theme ?? ""}`);

  let created = 0;
  let skipped = 0;

  for (const s of STUDENTS) {
    const exists = await prisma.student.findFirst({
      where: {
        name: s.name,
        events: { some: { eventId: event.id } },
      },
    });

    if (exists) {
      skipped++;
      continue;
    }

    await prisma.student.create({
      data: {
        name: s.name,
        size: s.size,
        category: s.category,
        grade: s.grade,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        parentEmail: s.parentEmail,
        allergies: s.allergies,
        events: { create: { eventId: event.id } },
      },
    });
    created++;
  }

  console.log(`Done: ${created} created, ${skipped} already existed.`);
}

main().finally(() => prisma.$disconnect());
