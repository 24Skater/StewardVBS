import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only and prisma before importing route handlers
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

vi.mock("@/lib/redis", () => ({
  isRedisAvailable: vi.fn().mockReturnValue(true),
}));

import { GET as getLive } from "@/app/api/health/live/route";
import { GET as getReady } from "@/app/api/health/ready/route";
import { GET as getHealth } from "@/app/api/health/route";
import { prisma } from "@/lib/prisma";
import { isRedisAvailable } from "@/lib/redis";

describe("/api/health/live", () => {
  it("returns 200 with status ok", async () => {
    const res = await getLive();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});

describe("/api/health/ready", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    vi.mocked(isRedisAvailable).mockReturnValue(true);
  });

  it("returns 200 when DB and Redis are healthy", async () => {
    const res = await getReady();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ready");
    expect(body.checks.database).toBe(true);
    expect(body.checks.redis).toBe(true);
  });

  it("returns 503 when DB is down", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("DB down"));
    const res = await getReady();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.database).toBe(false);
  });

  it("returns 503 when Redis is unavailable", async () => {
    vi.mocked(isRedisAvailable).mockReturnValueOnce(false);
    const res = await getReady();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.checks.redis).toBe(false);
  });
});

describe("/api/health (main)", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
  });

  it("returns 200 when DB responds", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
  });

  it("returns 503 when DB query fails", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("conn refused"));
    const res = await getHealth();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("error");
  });
});
