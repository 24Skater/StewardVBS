import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from "../errors";

describe("AppError", () => {
  it("has correct name", () => {
    const err = new AppError("test");
    expect(err.name).toBe("AppError");
  });

  it("defaults statusCode to 500", () => {
    const err = new AppError("oops");
    expect(err.statusCode).toBe(500);
  });

  it("accepts custom statusCode and code", () => {
    const err = new AppError("bad", 422, "CUSTOM");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("CUSTOM");
  });

  it("is an instance of Error", () => {
    expect(new AppError("x")).toBeInstanceOf(Error);
  });

  it("carries the message", () => {
    const err = new AppError("something went wrong");
    expect(err.message).toBe("something went wrong");
  });
});

describe("NotFoundError", () => {
  it("has statusCode 404", () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });

  it("has code NOT_FOUND", () => {
    expect(new NotFoundError().code).toBe("NOT_FOUND");
  });

  it("uses custom message", () => {
    expect(new NotFoundError("Student missing").message).toBe("Student missing");
  });

  it("is an instance of AppError", () => {
    expect(new NotFoundError()).toBeInstanceOf(AppError);
  });
});

describe("UnauthorizedError", () => {
  it("has statusCode 401", () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });

  it("has code UNAUTHORIZED", () => {
    expect(new UnauthorizedError().code).toBe("UNAUTHORIZED");
  });
});

describe("ForbiddenError", () => {
  it("has statusCode 403", () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it("has code FORBIDDEN", () => {
    expect(new ForbiddenError().code).toBe("FORBIDDEN");
  });
});

describe("ValidationError", () => {
  it("has statusCode 400", () => {
    expect(new ValidationError().statusCode).toBe(400);
  });

  it("has code VALIDATION_ERROR", () => {
    expect(new ValidationError().code).toBe("VALIDATION_ERROR");
  });

  it("stores structured errors", () => {
    const errors = { email: ["Invalid email"] };
    const err = new ValidationError("Invalid", errors);
    expect(err.errors).toEqual(errors);
  });

  it("errors is undefined when not provided", () => {
    expect(new ValidationError().errors).toBeUndefined();
  });
});
