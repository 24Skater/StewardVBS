import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import ConfirmButton from "@/components/ConfirmButton";
import { GraduationCap, ArrowLeft } from "lucide-react";

async function assignTeacher(studentId: number, formData: FormData) {
  "use server";
  await requireRole("STAFF");

  const teacherIdInput = formData.get("teacherId")?.toString();
  const teacherId = teacherIdInput ? Number(teacherIdInput) : null;
  const role = formData.get("role")?.toString().trim() || null;

  if (!teacherId) {
    throw new ValidationError("Please select a teacher");
  }

  // Check if already assigned
  const existing = await prisma.studentTeacher.findUnique({
    where: {
      studentId_teacherId: { studentId, teacherId },
    },
  });

  if (existing) {
    throw new ValidationError("This teacher is already assigned to this student");
  }

  await prisma.studentTeacher.create({
    data: {
      studentId,
      teacherId,
      role,
    },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/teachers`);
}

async function unassignTeacher(assignmentId: number, studentId: number) {
  "use server";
  await requireRole("STAFF");

  await prisma.studentTeacher.delete({
    where: { id: assignmentId },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/teachers`);
}

type Props = { params: Promise<{ id: string }> };

export default async function TeachersPage({ params }: Props) {
  await requireRole("STAFF");

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) return notFound();

  const [student, allTeachers] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        teachers: {
          include: { teacher: true },
          orderBy: { assignedAt: "desc" },
        },
      },
    }),
    prisma.teacher.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!student) return notFound();

  // Get list of already assigned teacher IDs
  const assignedTeacherIds = new Set(student.teachers.map((t) => t.teacherId));
  const availableTeachers = allTeachers.filter((t) => !assignedTeacherIds.has(t.id));

  const assignAction = assignTeacher.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><GraduationCap className="h-4 w-4" /> Assigned Teachers</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage teacher assignments for {student.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/teachers"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
          >
            Manage Teachers
          </Link>
          <Link
            href={`/students/${id}`}
            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Link>
        </div>
      </div>

      {/* Current Assignments */}
      {student.teachers.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Teachers</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {student.teachers.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                    {(assignment.teacher.profileImage || assignment.teacher.profileImageUrl) ? (
                      <img
                        src={assignment.teacher.profileImage || assignment.teacher.profileImageUrl || ""}
                        alt={assignment.teacher.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600 font-medium text-lg">
                        {assignment.teacher.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{assignment.teacher.name}</div>
                    {assignment.role && (
                      <div className="text-sm text-blue-600">{assignment.role}</div>
                    )}
                    {assignment.teacher.email && (
                      <div className="text-xs text-gray-500">{assignment.teacher.email}</div>
                    )}
                  </div>
                </div>
                <ConfirmButton
                  action={unassignTeacher.bind(null, assignment.id, id)}
                  confirmMessage={`Remove ${assignment.teacher.name} from ${student.name}?`}
                >
                  Remove
                </ConfirmButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Teacher Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assign Teacher</h2>
        {availableTeachers.length > 0 ? (
          <form action={assignAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700">
                  Select Teacher <span className="text-red-500">*</span>
                </label>
                <select
                  id="teacherId"
                  name="teacherId"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Choose a teacher...</option>
                  {availableTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role/Responsibility
                </label>
                <select
                  id="role"
                  name="role"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="Primary Teacher">Primary Teacher</option>
                  <option value="Assistant">Assistant</option>
                  <option value="Small Group Leader">Small Group Leader</option>
                  <option value="Buddy">Buddy</option>
                  <option value="Special Needs Support">Special Needs Support</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Assign Teacher
            </button>
          </form>
        ) : allTeachers.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">No teachers available.</p>
            <Link
              href="/admin/teachers/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add First Teacher
            </Link>
          </div>
        ) : (
          <p className="text-gray-500">All available teachers are already assigned to this student.</p>
        )}
      </div>
    </div>
  );
}
