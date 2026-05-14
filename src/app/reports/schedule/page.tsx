import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";
import { Download, ArrowLeft } from "lucide-react";

export default async function ScheduleReportPage() {
  await requireRole("STAFF");

  let event;
  let sessions: {
    id: number;
    title: string;
    start: Date;
    end: Date;
    location: string | null;
    group: string | null;
  }[] = [];
  let categories: string[] = [];

  try {
    event = await getActiveEvent();
    sessions = await prisma.scheduleSession.findMany({
      where: { eventId: event.id },
      orderBy: [{ start: "asc" }],
    });
    
    // Get unique groups/categories
    const uniqueGroups = [...new Set(sessions.map((s) => s.group).filter(Boolean))];
    categories = uniqueGroups as string[];
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Schedule Report</h1>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            No active event found. Please activate an event first.
          </p>
        </div>
      </div>
    );
  }

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const dateKey = session.start.toISOString().split("T")[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, typeof sessions>);

  const exportCSV = () => {
    const headers = ["Date", "Time", "Title", "Location", "Group"];
    const rows = sessions.map((session) => [
      session.start.toLocaleDateString(),
      `${session.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${session.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      session.title,
      session.location || "",
      session.group || "All",
    ]);

    return [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  };

  const csvData = exportCSV();
  const csvDataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Report</h1>
          <p className="mt-1 text-sm text-gray-600">
            Event schedule for {event.year} {event.theme && `- ${event.theme}`}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <a
            href={csvDataUri}
            download={`schedule_${event.year}.csv`}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
          <PrintButton />
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-6 text-center">
          <p className="text-yellow-800">
            No schedule sessions found for this event.
          </p>
          <Link
            href="/schedule"
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            Go to Schedule Manager →
          </Link>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3 print:hidden">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{sessions.length}</div>
              <div className="text-sm text-gray-500">Total Sessions</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{Object.keys(sessionsByDate).length}</div>
              <div className="text-sm text-gray-500">Days</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{categories.length || 1}</div>
              <div className="text-sm text-gray-500">Groups</div>
            </div>
          </div>

          {/* Print Header */}
          <div className="hidden print:block text-center mb-4">
            <h1 className="text-xl font-bold">
              Schedule - {event.year} {event.theme && `- ${event.theme}`}
            </h1>
            <p className="text-sm text-gray-600">
              {sessions.length} sessions | Generated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Schedule by Date */}
          <div className="space-y-6">
            {Object.entries(sessionsByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateKey, daySessions]) => (
                <div key={dateKey} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="bg-purple-50 px-6 py-3 border-b border-purple-100">
                    <h2 className="text-lg font-semibold text-purple-900">
                      {new Date(dateKey).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </h2>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Session
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Group
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {daySessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {session.start.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {session.end.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {session.title}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {session.location || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {session.group ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                {session.group}
                              </span>
                            ) : (
                              <span className="text-gray-400">All Groups</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </>
      )}

    </div>
  );
}

