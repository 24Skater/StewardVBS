import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { toDateTimeLocal } from "@/lib/date-utils";
import Link from "next/link";
import CategorySelect from "@/components/CategorySelect";
import { createSession, deleteSession } from "./actions";
import { Button } from "@steward-apps/ui";

/* ───────────────── Page ───────────────── */

export default async function SchedulePage() {
  await requireRole("STAFF");

  let event;
  try {
    event = await getActiveEvent();
  } catch (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Schedule</h1>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {error instanceof Error
              ? error.message
              : "No active event found. Please activate an event in the admin panel."}
          </p>
        </div>
      </div>
    );
  }

  const sessions = await prisma.scheduleSession.findMany({
    where: { eventId: event.id },
    orderBy: { start: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--st-fg)]">Schedule</h1>
      <p className="text-sm text-[var(--st-muted)]">
        Event {event.year} {event.theme ? `• ${event.theme}` : ""}
      </p>

      {/* Add session form */}
      <form
        action={createSession}
        className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)] p-4 space-y-3"
      >
        <h2 className="text-lg font-semibold">Add Session</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            name="title"
            required
            placeholder="Session title"
            className="rounded-md border border-[var(--st-border)] px-3 py-2 bg-[var(--st-bg)] text-[var(--st-fg)]"
          />
          <input
            name="start"
            type="datetime-local"
            required
            className="rounded-md border border-[var(--st-border)] px-3 py-2 bg-[var(--st-bg)] text-[var(--st-fg)]"
          />
          <input
            name="end"
            type="datetime-local"
            required
            className="rounded-md border border-[var(--st-border)] px-3 py-2 bg-[var(--st-bg)] text-[var(--st-fg)]"
          />
          <input
            name="location"
            placeholder="Location"
            className="rounded-md border border-[var(--st-border)] px-3 py-2 bg-[var(--st-bg)] text-[var(--st-fg)]"
          />
          <CategorySelect />
          <textarea
            name="notes"
            rows={2}
            placeholder="Notes"
            className="sm:col-span-2 lg:col-span-3 rounded-md border border-[var(--st-border)] px-3 py-2 bg-[var(--st-bg)] text-[var(--st-fg)]"
          />
        </div>
        <Button type="submit" variant="primary">
          Add
        </Button>
      </form>

      {/* List existing sessions */}
      <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)] overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-[var(--st-bg)]">
            <tr className="text-left text-sm text-[var(--st-muted)]">
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Group</th>
              <th className="px-4 py-2">Notes</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t text-sm">
                <td className="px-4 py-2">{s.title}</td>
                <td className="px-4 py-2">
                  {new Date(s.start).toLocaleString()} –{" "}
                  {new Date(s.end).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2">{s.location ?? "—"}</td>
                <td className="px-4 py-2">{s.group ?? "All"}</td>
                <td className="px-4 py-2">{s.notes ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteSession}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Delete
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--st-muted)]" colSpan={6}>
                  No sessions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
