/**
 * Resource access control utilities
 * Provides IDOR (Insecure Direct Object Reference) protection
 */
import "server-only";
import { prisma } from "./prisma";
import { getActiveEvent } from "./event";
import { ValidationError } from "./errors";

// getActiveEvent is still used by verifyAttendanceAccess and verifySessionAccess below

/**
 * Verify a student exists (students are now global, not event-scoped)
 */
export async function verifyStudentAccess(studentId: number): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!student) {
    throw new ValidationError("Student not found");
  }
}

/**
 * Verify an attendance record belongs to the active event
 * Throws ValidationError if attendance doesn't exist or belongs to different event
 */
export async function verifyAttendanceAccess(attendanceId: number): Promise<void> {
  const event = await getActiveEvent();

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { id: true, eventId: true },
  });

  if (!attendance) {
    throw new ValidationError("Attendance record not found");
  }

  if (attendance.eventId !== event.id) {
    throw new ValidationError("Attendance record does not belong to the active event");
  }
}

/**
 * Verify a schedule session belongs to the active event
 * Throws ValidationError if session doesn't exist or belongs to different event
 */
export async function verifySessionAccess(sessionId: number): Promise<void> {
  const event = await getActiveEvent();

  const session = await prisma.scheduleSession.findUnique({
    where: { id: sessionId },
    select: { id: true, eventId: true },
  });

  if (!session) {
    throw new ValidationError("Session not found");
  }

  if (session.eventId !== event.id) {
    throw new ValidationError("Session does not belong to the active event");
  }
}

/**
 * Validate and parse a numeric ID from form data or params
 * Throws ValidationError if invalid
 */
export function validateId(id: unknown, resourceName: string = "Resource"): number {
  if (typeof id === "string") {
    const parsed = Number(id);
    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      throw new ValidationError(`Invalid ${resourceName} ID`);
    }
    return parsed;
  }

  if (typeof id === "number") {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(`Invalid ${resourceName} ID`);
    }
    return id;
  }

  throw new ValidationError(`Invalid ${resourceName} ID`);
}
