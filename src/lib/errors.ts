/**
 * Custom error classes
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    public errors?: Record<string, string[]>
  ) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/**
 * The church's subscription does not allow this.
 *
 * 402 rather than 403: this is not "you may not", it is "this church's
 * subscription does not currently cover it", and the two want different
 * remedies. 403 invites a support ticket about permissions; 402 points at
 * billing.
 *
 * `reason` distinguishes the two states an app can be refused in, because the
 * thing to say next differs: a read-only church can still read and export and
 * just needs to pay, while a revoked one has lost access entirely.
 */
export class EntitlementError extends AppError {
  constructor(
    public reason: "read_only" | "revoked" | "not_subscribed",
    message: string = "This church's subscription does not cover that."
  ) {
    super(message, 402, "ENTITLEMENT_REQUIRED");
    this.name = "EntitlementError";
  }
}
