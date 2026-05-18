import { describe, it, expect } from "vitest";
import { validateId } from "../resource-access";
import { ValidationError } from "../errors";

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
