import { vi, describe, it, expect, beforeEach } from "vitest";

const { mockStudent, mockAttendance, mockSession, mockGetActiveEvent } = vi.hoisted(() => ({
  mockStudent: { findUnique: vi.fn() },
  mockAttendance: { findUnique: vi.fn() },
  mockSession: { findUnique: vi.fn() },
  mockGetActiveEvent: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: {
    student: mockStudent,
    attendance: mockAttendance,
    scheduleSession: mockSession,
  },
}));

vi.mock("../event", () => ({
  getActiveEvent: () => mockGetActiveEvent(),
}));

import { validateId, verifyStudentAccess, verifyAttendanceAccess, verifySessionAccess } from "../resource-access";
import { ValidationError } from "../errors";

describe("verifyStudentAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves when student exists", async () => {
    mockStudent.findUnique.mockResolvedValue({ id: 1 });
    await expect(verifyStudentAccess(1)).resolves.toBeUndefined();
  });

  it("throws ValidationError when student does not exist", async () => {
    mockStudent.findUnique.mockResolvedValue(null);
    await expect(verifyStudentAccess(999)).rejects.toThrow(ValidationError);
  });
});

describe("verifyAttendanceAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveEvent.mockResolvedValue({ id: 10 });
  });

  it("resolves when attendance belongs to active event", async () => {
    mockAttendance.findUnique.mockResolvedValue({ id: 1, eventId: 10 });
    await expect(verifyAttendanceAccess(1)).resolves.toBeUndefined();
  });

  it("throws when attendance does not exist", async () => {
    mockAttendance.findUnique.mockResolvedValue(null);
    await expect(verifyAttendanceAccess(1)).rejects.toThrow(ValidationError);
  });

  it("throws when attendance belongs to a different event", async () => {
    mockAttendance.findUnique.mockResolvedValue({ id: 1, eventId: 99 });
    await expect(verifyAttendanceAccess(1)).rejects.toThrow(ValidationError);
  });
});

describe("verifySessionAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveEvent.mockResolvedValue({ id: 10 });
  });

  it("resolves when session belongs to active event", async () => {
    mockSession.findUnique.mockResolvedValue({ id: 1, eventId: 10 });
    await expect(verifySessionAccess(1)).resolves.toBeUndefined();
  });

  it("throws when session does not exist", async () => {
    mockSession.findUnique.mockResolvedValue(null);
    await expect(verifySessionAccess(1)).rejects.toThrow(ValidationError);
  });

  it("throws when session belongs to a different event", async () => {
    mockSession.findUnique.mockResolvedValue({ id: 1, eventId: 99 });
    await expect(verifySessionAccess(1)).rejects.toThrow(ValidationError);
  });
});

describe("validateId", () => {
  it("accepts a positive integer string", () => {
    expect(validateId("42")).toBe(42);
  });

  it("accepts a positive integer number", () => {
    expect(validateId(7)).toBe(7);
  });

  it("accepts '1' as a string", () => {
    expect(validateId("1")).toBe(1);
  });

  it("throws ValidationError for '0'", () => {
    expect(() => validateId("0")).toThrowError(ValidationError);
  });

  it("throws ValidationError for negative string", () => {
    expect(() => validateId("-1")).toThrowError(ValidationError);
  });

  it("throws ValidationError for float string", () => {
    expect(() => validateId("1.5")).toThrowError(ValidationError);
  });

  it("throws ValidationError for non-numeric string", () => {
    expect(() => validateId("abc")).toThrowError(ValidationError);
  });

  it("throws ValidationError for 0 number", () => {
    expect(() => validateId(0)).toThrowError(ValidationError);
  });

  it("throws ValidationError for negative number", () => {
    expect(() => validateId(-5)).toThrowError(ValidationError);
  });

  it("throws ValidationError for null", () => {
    expect(() => validateId(null)).toThrowError(ValidationError);
  });

  it("throws ValidationError for undefined", () => {
    expect(() => validateId(undefined)).toThrowError(ValidationError);
  });

  it("includes the resource name in the error message", () => {
    expect(() => validateId("abc", "Student")).toThrow(/Student/);
  });
});
