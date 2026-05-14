import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { escapeHtml } from "@/lib/xss-protection";
import { checkInAction, togglePaidAction } from "./actions";
import { ArrowLeft, AlertTriangle, ShieldAlert, Phone, Smartphone, Mail, GraduationCap, Check, X, Tag, MapPin } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export default async function StudentProfile({ params }: Props) {
  await requireRole("STAFF");

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) return notFound();

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      parents: { orderBy: { isPrimary: "desc" } },
      emergencyContacts: { orderBy: { priority: "asc" } },
      teachers: {
        include: { teacher: true },
        orderBy: { assignedAt: "desc" },
      },
      events: {
        include: { event: true },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });
  if (!student) return notFound();

  // Get active event for check-in context (optional — may not exist)
  let activeEvent: { id: number; year: number; theme: string | null } | null = null;
  try {
    activeEvent = await prisma.event.findFirst({ where: { isActive: true }, select: { id: true, year: true, theme: true } });
  } catch { /* no active event */ }

  const activeEventId = activeEvent?.id;

  const [attendanceRecords, payment, schedule, allAttendance] = await Promise.all([
    activeEventId
      ? prisma.attendance.findMany({
          where: { studentId: id, eventId: activeEventId },
          orderBy: { date: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
    activeEventId
      ? prisma.payment.findFirst({ where: { studentId: id, eventId: activeEventId } })
      : Promise.resolve(null),
    activeEventId
      ? prisma.scheduleSession.findMany({
          where: {
            eventId: activeEventId,
            OR: [{ group: student.category }, { group: null }, { group: "" }],
          },
          orderBy: { start: "asc" },
        })
      : Promise.resolve([]),
    prisma.attendance.findMany({
      where: { studentId: id },
      include: { event: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const paid = Boolean(payment);
  const attendanceCount = attendanceRecords.length;

  // Bind server actions
  const checkInBound = checkInAction.bind(null, id);
  const togglePaidBound = togglePaidAction.bind(null, id);

  // Calculate age if DOB is available
  const age = student.dateOfBirth
    ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Group attendance by event for history
  type AttendanceRecord = (typeof allAttendance)[number];
  const attendanceByEvent = allAttendance.reduce((acc, record) => {
    const eventKey = record.event.year.toString();
    if (!acc[eventKey]) {
      acc[eventKey] = { event: record.event, records: [] };
    }
    acc[eventKey].records.push(record);
    return acc;
  }, {} as Record<string, { event: AttendanceRecord["event"]; records: AttendanceRecord[] }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Profile Image */}
          <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {(student.profileImage || student.profileImageUrl) ? (
              <img
                src={student.profileImage || student.profileImageUrl || ""}
                alt={student.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl text-gray-400">
                {student.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{escapeHtml(student.name)}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {student.category}
              {activeEvent && ` • Active event: ${activeEvent.year}${activeEvent.theme ? ` – ${activeEvent.theme}` : ""}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/students/${id}/badge`}
            className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700"
          >
            <Tag className="h-4 w-4" /> Print Badge
          </Link>
          <Link
            href={`/students/${id}/edit`}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
          >
            Edit
          </Link>
          <Link
            href="/students"
            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <form action={checkInBound}>
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            type="submit"
          >
            Check In Today
          </button>
        </form>
        <form action={togglePaidBound}>
          <button
            className={
              paid
                ? "rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
                : "rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            }
            type="submit"
          >
            {paid ? "Mark Unpaid" : "Mark Paid"}
          </button>
        </form>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
          paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {paid ? <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Paid</span> : "Not Paid"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{escapeHtml(student.name)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">{escapeHtml(student.category)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Shirt Size</dt>
                <dd className="mt-1 text-sm text-gray-900">{escapeHtml(student.size)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Grade</dt>
                <dd className="mt-1 text-sm text-gray-900">{student.grade || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {student.dateOfBirth
                    ? `${new Date(student.dateOfBirth).toLocaleDateString()} (Age: ${age})`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Registered</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(student.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Parents/Guardians */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Parents/Guardians</h2>
              <Link
                href={`/students/${id}/parents`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Manage
              </Link>
            </div>
            {student.parents.length > 0 ? (
              <div className="space-y-4">
                {student.parents.map((parent) => (
                  <div key={parent.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{parent.name}</span>
                        {parent.isPrimary && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                        {parent.relationship && (
                          <span className="text-xs text-gray-500">({parent.relationship})</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 space-y-1">
                        {parent.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" /> <a href={`tel:${parent.phone}`} className="text-blue-600 hover:underline">{parent.phone}</a>
                          </div>
                        )}
                        {parent.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" /> <a href={`mailto:${parent.email}`} className="text-blue-600 hover:underline">{parent.email}</a>
                          </div>
                        )}
                      </div>
                      {parent.canPickup && (
                        <span className="flex items-center gap-1 text-xs text-green-600"><Check className="h-4 w-4" /> Authorized for pickup</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No parents/guardians added yet.</p>
            )}
          </div>

          {/* Emergency Contacts */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-red-900"><ShieldAlert className="h-4 w-4" /> Emergency Contacts</h2>
              <Link
                href={`/students/${id}/emergency`}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Manage
              </Link>
            </div>
            {student.emergencyContacts.length > 0 ? (
              <div className="space-y-3">
                {student.emergencyContacts.map((contact, index) => (
                  <div key={contact.id} className="flex items-start gap-4 p-3 bg-white rounded-lg border border-red-100">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{contact.name}</span>
                        {contact.relationship && (
                          <span className="text-xs text-gray-500">({contact.relationship})</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm space-y-1">
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" /> <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline font-medium">{contact.phone}</a>
                        </div>
                        {contact.altPhone && (
                          <div className="flex items-center gap-1">
                            <Smartphone className="h-4 w-4" /> <a href={`tel:${contact.altPhone}`} className="text-blue-600 hover:underline">{contact.altPhone}</a> (alt)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-1 text-sm text-red-700"><AlertTriangle className="h-4 w-4" /> No emergency contacts added. Please add at least one.</p>
            )}
          </div>

          {/* Assigned Teachers */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><GraduationCap className="h-4 w-4" /> Assigned Teachers</h2>
              <Link
                href={`/students/${id}/teachers`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Manage
              </Link>
            </div>
            {student.teachers.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {student.teachers.map((assignment) => (
                  <div key={assignment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      {(assignment.teacher.profileImage || assignment.teacher.profileImageUrl) ? (
                        <img
                          src={assignment.teacher.profileImage || assignment.teacher.profileImageUrl || ""}
                          alt={assignment.teacher.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-blue-600 font-medium">
                          {assignment.teacher.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{assignment.teacher.name}</div>
                      {assignment.role && (
                        <div className="text-xs text-gray-500">{assignment.role}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No teachers assigned yet.</p>
            )}
          </div>

          {/* Medical Information */}
          {(student.allergies || student.medicalNotes) && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-yellow-900 mb-4"><AlertTriangle className="h-4 w-4" /> Medical Information</h2>
              <dl className="space-y-4">
                {student.allergies && (
                  <div>
                    <dt className="text-sm font-medium text-gray-700">Allergies</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{student.allergies}</dd>
                  </div>
                )}
                {student.medicalNotes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-700">Medical Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{student.medicalNotes}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Notes */}
          {student.notes && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.notes}</p>
            </div>
          )}

          {/* Event Enrollment */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Event Enrollment</h2>
              <Link
                href={`/students/${id}/events`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Manage
              </Link>
            </div>
            {student.events.length > 0 ? (
              <div className="space-y-3">
                {student.events.map(({ event, enrolledAt }) => {
                  const daysAttended = allAttendance.filter((a) => a.eventId === event.id).length;
                  return (
                    <div key={event.id} className="flex items-center justify-between border-l-4 border-blue-400 pl-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {event.year}{event.theme && ` – ${event.theme}`}
                          {event.isActive && (
                            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Active</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Enrolled {new Date(enrolledAt).toLocaleDateString()} • {daysAttended} day{daysAttended !== 1 ? "s" : ""} attended
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">Not enrolled in any events yet.</p>
                <Link
                  href={`/students/${id}/events`}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Assign to Events
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Schedule & Attendance */}
        <div className="space-y-6">
          {/* Attendance Summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance</h2>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-blue-600">{attendanceCount}</div>
              <div className="text-sm text-gray-500">days attended this event</div>
            </div>
            {attendanceRecords.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Recent Check-ins</h3>
                <ul className="space-y-1">
                  {attendanceRecords.slice(0, 5).map((record) => (
                    <li key={record.id} className="text-sm text-gray-600">
                      {new Date(record.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(record.date).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">No attendance records yet</p>
            )}
          </div>

          {/* Student Schedule */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
            {schedule.length > 0 ? (
              <div className="space-y-3">
                {schedule.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="font-medium text-gray-900">{session.title}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(session.start).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(session.start).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(session.end).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="h-4 w-4" /> {session.location}</div>
                    )}
                  </div>
                ))}
                {schedule.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    + {schedule.length - 5} more sessions
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">No scheduled sessions</p>
            )}
          </div>

          {/* Payment Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
            <div className={`text-center p-4 rounded-md ${
              paid ? "bg-green-50" : "bg-red-50"
            }`}>
              <div className={`text-2xl font-bold ${
                paid ? "text-green-600" : "text-red-600"
              }`}>
                {paid ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> PAID</span> : "UNPAID"}
              </div>
              {payment && (
                <div className="text-sm text-gray-500 mt-1">
                  Paid on {new Date(payment.paidAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
