import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({ auditLog: vi.fn() }));
vi.mock("@/lib/invitations", () => ({
  validateInvitation: vi.fn().mockResolvedValue(null),
  markInvitationUsed: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 60_000 }),
  getClientIdentifier: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      role: "VIEWER",
    } as any);
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 9,
      resetAt: Date.now() + 60_000,
      retryAfter: undefined,
    });
  });

  it("returns 200 for a valid registration", async () => {
    const res = await POST(makeRequest({
      email: "alice@example.com",
      password: "StrongPass1",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ email: "not-an-email", password: "StrongPass1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for weak password (too short)", async () => {
    const res = await POST(makeRequest({ email: "a@b.com", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for password missing uppercase", async () => {
    const res = await POST(makeRequest({ email: "a@b.com", password: "weakpassword1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for password missing number", async () => {
    const res = await POST(makeRequest({ email: "a@b.com", password: "WeakPassword" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 (generic) when email already exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "existing" } as any);
    const res = await POST(makeRequest({ email: "existing@example.com", password: "StrongPass1" }));
    expect(res.status).toBe(400);
    // Should NOT reveal whether user exists
    const body = await res.json();
    expect(body.error).not.toMatch(/already exist|found/i);
  });

  it("returns 429 when rate limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfter: 60,
    });
    const res = await POST(makeRequest({ email: "a@b.com", password: "StrongPass1" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("normalizes email to lowercase", async () => {
    const res = await POST(makeRequest({ email: "ALICE@EXAMPLE.COM", password: "StrongPass1" }));
    expect(res.status).toBe(200);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "alice@example.com" }),
      })
    );
  });
});
