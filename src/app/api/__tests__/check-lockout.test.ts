import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-lockout", () => ({
  isAccountLocked: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60_000 }),
  getClientIdentifier: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { GET } from "@/app/api/auth/check-lockout/route";
import { isAccountLocked } from "@/lib/auth-lockout";
import { checkRateLimit } from "@/lib/rate-limit";

function makeRequest(email?: string) {
  const url = email
    ? `http://localhost/api/auth/check-lockout?email=${encodeURIComponent(email)}`
    : "http://localhost/api/auth/check-lockout";
  return new Request(url);
}

describe("GET /api/auth/check-lockout", () => {
  beforeEach(() => {
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 19,
      resetAt: Date.now() + 60_000,
      retryAfter: undefined,
    });
  });

  it("returns 400 when email is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns locked: false when account is not locked", async () => {
    vi.mocked(isAccountLocked).mockResolvedValueOnce(false);
    const res = await GET(makeRequest("user@example.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locked).toBe(false);
  });

  it("returns locked: true when account is locked", async () => {
    vi.mocked(isAccountLocked).mockResolvedValueOnce(true);
    const res = await GET(makeRequest("locked@example.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locked).toBe(true);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfter: 30,
    });
    const res = await GET(makeRequest("user@example.com"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("does not expose timing info (only boolean locked field)", async () => {
    const res = await GET(makeRequest("user@example.com"));
    const body = await res.json();
    // Only 'locked' boolean — no attempt counts, no timestamps
    expect(Object.keys(body)).toEqual(["locked"]);
  });
});
