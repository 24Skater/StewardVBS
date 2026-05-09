/**
 * Application constants
 */

// User roles
export const USER_ROLES = ["ADMIN", "STAFF", "VIEWER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

// Time constants (in milliseconds)
export const ONE_MINUTE_MS = 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

// Time constants (in seconds)
export const ONE_MINUTE_SEC = 60;
export const ONE_HOUR_SEC = 60 * 60;
export const ONE_DAY_SEC = 24 * 60 * 60;
export const THIRTY_DAYS_SEC = 30 * ONE_DAY_SEC;

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 15 * ONE_MINUTE_MS; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 5;

// Account lockout
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * ONE_MINUTE_MS; // 15 minutes
export const LOCKOUT_WINDOW_MS = ONE_HOUR_MS; // 1 hour

// Session
export const SESSION_MAX_AGE_SEC = THIRTY_DAYS_SEC; // 30 days
export const SESSION_UPDATE_AGE_SEC = ONE_DAY_SEC; // 24 hours

// Validation limits
export const MAX_YEAR = 2100;
export const MIN_YEAR = 2000;
export const MAX_FUTURE_YEARS = 10;

// String length limits
export const MAX_NAME_LENGTH = 200;
export const MAX_CATEGORY_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_THEME_LENGTH = 200;
export const MAX_TITLE_LENGTH = 200;
export const MAX_LOCATION_LENGTH = 200;
export const MAX_NOTES_LENGTH = 1000;
export const MAX_SIZE_LENGTH = 50;
export const MAX_SITE_NAME_LENGTH = 100;
export const MAX_URL_LENGTH = 500;

// Crypto
export const BCRYPT_ROUNDS = 12