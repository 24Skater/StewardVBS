import { describe, it, expect } from "vitest";
import {
  parsePagination,
  calculatePagination,
  getSkip,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../pagination";

describe("parsePagination", () => {
  it("returns defaults when no params given", () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("parses valid page and pageSize", () => {
    const result = parsePagination({ page: "3", pageSize: "25" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(25);
  });

  it("clamps page to minimum 1", () => {
    const result = parsePagination({ page: "0" });
    expect(result.page).toBe(1);
  });

  it("clamps negative page to 1", () => {
    const result = parsePagination({ page: "-5" });
    expect(result.page).toBe(1);
  });

  it("clamps pageSize to MAX_PAGE_SIZE", () => {
    const result = parsePagination({ pageSize: "999" });
    expect(result.pageSize).toBe(MAX_PAGE_SIZE);
  });

  it("clamps pageSize minimum to 1", () => {
    const result = parsePagination({ pageSize: "0" });
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE); // falls back to default on invalid
  });

  it("handles non-numeric strings gracefully", () => {
    const result = parsePagination({ page: "abc", pageSize: "xyz" });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("calculatePagination", () => {
  it("calculates totalPages correctly", () => {
    const result = calculatePagination(100, 1, 10);
    expect(result.totalPages).toBe(10);
  });

  it("rounds up for partial last page", () => {
    const result = calculatePagination(101, 1, 10);
    expect(result.totalPages).toBe(11);
  });

  it("hasNext is true when not on last page", () => {
    const result = calculatePagination(100, 1, 10);
    expect(result.hasNext).toBe(true);
  });

  it("hasNext is false on last page", () => {
    const result = calculatePagination(100, 10, 10);
    expect(result.hasNext).toBe(false);
  });

  it("hasPrev is false on first page", () => {
    const result = calculatePagination(100, 1, 10);
    expect(result.hasPrev).toBe(false);
  });

  it("hasPrev is true on page 2", () => {
    const result = calculatePagination(100, 2, 10);
    expect(result.hasPrev).toBe(true);
  });

  it("handles zero total", () => {
    const result = calculatePagination(0, 1, 10);
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it("returns correct total", () => {
    const result = calculatePagination(55, 1, 10);
    expect(result.total).toBe(55);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });
});

describe("getSkip", () => {
  it("returns 0 for page 1", () => {
    expect(getSkip(1, 10)).toBe(0);
  });

  it("returns pageSize for page 2", () => {
    expect(getSkip(2, 10)).toBe(10);
  });

  it("returns correct skip for arbitrary page", () => {
    expect(getSkip(5, 20)).toBe(80);
  });
});
