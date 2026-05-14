import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/audit-log";
import ImageUpload from "@/components/ImageUpload";
import { ArrowLeft } from "lucide-react";

async function updateTeacher(teacherId: number, formData: FormData) {
  "use server";
  const session = await requireRole("ADMIN");

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim() || null;
  const bio = formData.get("bio")?.toString().trim() || null;
  const profileImageUrl = formData.get("profileImageUrl")?.toString() || null;

  if (!name) {
    throw new ValidationError("Name is required");
  }

  await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      name,
      email,
      phone,
      bio,
      profileImageUrl,
    },
  });

  await auditLog({
    userId: session.user.id,
    action: "SETTINGS_UPDATED",
    resourceType: "Teacher",
    resourceId: String(teacherId),
    details: { updated: name },
  });

  revalidatePath("/admin/teachers");
  redirect("/admin/teachers");
}

type Props = { params: Promise<{ id: string }> };

export default async function EditTeacherPage({ params }: Props) {
  await requireRole("ADMIN");

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) return notFound();

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      students: {
        include: { student: true },
        take: 10,
      },
    },
  });

  if (!teacher) return notFound();

  const updateAction = updateTeacher.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Teacher</h2>
          <p className="mt-1 text-sm text-gray-600">
            Update information for {teacher.name}
          </p>
        </div>
        <Link
          href="/admin/teachers"
          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form action={updateAction} className="space-y-6">
            {/* Profile Photo */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h3>
              <ImageUpload
                name="profileImageUrl"
                currentImage={teacher.profileImageUrl}
              />
            </div>

            {/* Teacher Info Form */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    defaultValue={teacher.name}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={teacher.email || ""}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    defaultValue={teacher.phone || ""}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    Bio / Notes
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={3}
                    defaultValue={teacher.bio || ""}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <Link
                  href="/admin/teachers"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </div>

        {/* Assigned Students */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 h-fit">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Students</h3>
          {teacher.students.length > 0 ? (
            <div className="space-y-2">
              {teacher.students.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/students/${assignment.student.id}`}
                  className="block p-2 hover:bg-gray-50 rounded-md"
                >
                  <div className="font-medium text-gray-900">{assignment.student.name}</div>
                  {assignment.role && (
                    <div className="text-sm text-gray-500">{assignment.role}</div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No students assigned yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
