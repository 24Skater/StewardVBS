import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDayRange,
  getTodayRange,
  toDateTimeLocal,
  isValidDate,
} from "../date-utils";

describe("getDayRange", () => {
  it("returns midnight-to-midnight for a Date object (July 4)", () => {
    // Use local Date constructor to avoid UTC-parsing timezone issues
    const date = new Date(2026, 6, 4); // July 4, local time
    const { start, end } = getDayRange(date);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6); // 0-indexed
    expect(start.getDate()).toBe(4);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(end.getDate()).toBe(5); // next day
    expect(end.getHours()).toBe(0);
  });

  it("accepts an ISO string and returns a valid range", () => {
    // ISO date strings parse as UTC; we just check the range is valid (start < end)
    const { start, end } = getDayRange("2026-07-04");
    expect(start.getTime()).toBeLessThan(end.getTime());
    // end should be exactly 24h after start
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("accepts a Date object", () => {
    const date = new Date(2026, 0, 15); // Jan 15 local
    const { start, end } = getDayRange(date);
    expect(start.getDate()).toBe(15);
    expect(end.getDate()).toBe(16);
  });

  it("start is strictly before end", () => {
    const { start, end } = getDayRange(new Date(2026, 2, 10)); // Mar 10
    expect(start.getTime()).toBeLessThan(end.getTime());
  });

  it("without argument returns today range", () => {
    const today = new Date();
    const { start, end } = getDayRange();
    expect(start.getDate()).toBe(today.getDate());
    expect(end.getDate()).toBe(today.getDate() + 1 > new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      ? 1
      : today.getDate() + 1);
  });
});

describe("getTodayRange", () => {
  it("returns a range where start < end", () => {
    const { start, end } = getTodayRange();
    expect(start.getTime()).toBeLessThan(end.getTime());
  });

  it("start is midnight of today", () => {
    const { start } = getTodayRange();
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });
});

describe("toDateTimeLocal", () => {
  it("formats a Date to datetime-local format (16 chars)", () => {
    const d = new Date("2026-07-04T10:30:00.000Z");
    const result = toDateTimeLocal(d);
    expect(result).toHaveLength(16);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("accepts an ISO string", () => {
    const result = toDateTimeLocal("2026-01-01T09:00:00.000Z");
    expect(result).toHaveLength(16);
  });
});

describe("isValidDate", () => {
  it("returns true for a valid Date", () => {
    expect(isValidDate(new Date())).toBe(true);
  });

  it("returns false for an invalid Date (NaN)", () => {
    expect(isValidDate(new Date("not-a-date"))).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isValidDate("2026-01-01")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isValidDate(null)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isValidDate(Date.now())).toBe(false);
  });
});
