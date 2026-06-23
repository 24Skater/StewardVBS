import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requireRole("STAFF");

    const event = await getActiveEvent();

    const sessions = await prisma.scheduleSession.findMany({
      where: { eventId: event.id },
      orderBy: { start: "asc" },
    });

    const ics = buildICS(sessions, event.theme ?? `VBS ${event.year}`);
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="vbs_${event.year}_schedule.ics"`,
      },
    });
  } catch (error) {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Failed to export schedule";
    
    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }
}

function dtstamp(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}${pad(x.getUTCSeconds())}Z`;
}

function escapeICS(s?: string | null) {
  if (!s) return "";
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildICS(
  sessions: { id: number; title: string; start: Date; end: Date; location: string | null; group: string | null; notes: string | null; }[],
  calendarName: string
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Steward VBS//Schedule//EN",
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
  ];

  for (const s of sessions) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:vbs-session-${s.id}@example`,
      `DTSTAMP:${dtstamp(new Date())}`,
      `DTSTART:${dtstamp(s.start)}`,
      `DTEND:${dtstamp(s.end)}`,
      `SUMMARY:${escapeICS(s.title)}`,
      s.location ? `LOCATION:${escapeICS(s.location)}` : "",
      `DESCRIPTION:${escapeICS([s.group ?? "All", s.notes ?? ""].filter(Boolean).join(" • "))}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}
