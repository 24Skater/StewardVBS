import { vi, describe, it, expect, beforeEach } from "vitest";

const { mockUpsert } = vi.hoisted(() => ({ mockUpsert: vi.fn() }));

vi.mock("../prisma", () => ({
  prisma: {
    appSettings: { upsert: mockUpsert },
  },
}));

import { formatChurchAddress, generateWebhookSecret, getSettings, updateSettings } from "../settings";
import type { AppSettings } from "../settings";

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    id: "singleton",
    siteName: "Steward VBS",
    primaryColor: "#E8B847",
    secondaryColor: "#C49A2E",
    logoUrl: null,
    churchName: null,
    churchAddress: null,
    churchCity: null,
    churchState: null,
    churchZip: null,
    churchPhone: null,
    churchEmail: null,
    churchWebsite: null,
    tagline: null,
    welcomeMessage: null,
    footerText: null,
    facebookUrl: null,
    instagramUrl: null,
    youtubeUrl: null,
    googleFormsEnabled: false,
    googleFormsWebhookSecret: null,
    googleFormsUrl: null,
    googleFormsAutoApprove: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("formatChurchAddress", () => {
  it("returns null when no address fields are set", () => {
    expect(formatChurchAddress(makeSettings())).toBeNull();
  });

  it("returns just the address when only address is set", () => {
    const result = formatChurchAddress(
      makeSettings({ churchAddress: "123 Main St" })
    );
    expect(result).toBe("123 Main St");
  });

  it("joins address, city, and state+zip", () => {
    const result = formatChurchAddress(
      makeSettings({
        churchAddress: "123 Main St",
        churchCity: "Springfield",
        churchState: "IL",
        churchZip: "62701",
      })
    );
    expect(result).toBe("123 Main St, Springfield, IL 62701");
  });

  it("omits null parts", () => {
    const result = formatChurchAddress(
      makeSettings({ churchCity: "Shelbyville", churchState: "TN" })
    );
    expect(result).toBe("Shelbyville, TN");
  });

  it("handles zip without state", () => {
    const result = formatChurchAddress(makeSettings({ churchZip: "90210" }));
    expect(result).toBe("90210");
  });

  it("handles state without zip", () => {
    const result = formatChurchAddress(makeSettings({ churchState: "CA" }));
    expect(result).toBe("CA");
  });
});

describe("generateWebhookSecret", () => {
  it("returns a 32-character string", () => {
    expect(generateWebhookSecret()).toHaveLength(32);
  });

  it("only contains alphanumeric characters", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it("generates different values on each call", () => {
    const a = generateWebhookSecret();
    const b = generateWebhookSecret();
    expect(a).not.toBe(b);
  });
});

describe("getSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns settings from Prisma on success", async () => {
    const fake = makeSettings();
    mockUpsert.mockResolvedValue(fake);
    const result = await getSettings();
    expect(result.siteName).toBe("Steward VBS");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "singleton" } })
    );
  });

  it("throws a friendly error when Prisma returns P1001", async () => {
    const err = Object.assign(new Error("connection refused"), { code: "P1001" });
    mockUpsert.mockRejectedValue(err);
    await expect(getSettings()).rejects.toThrow("Database connection failed");
  });

  it("throws a friendly error when message includes cant-reach-database", async () => {
    const err = new Error("Can't reach database server at `localhost:5432`");
    mockUpsert.mockRejectedValue(err);
    await expect(getSettings()).rejects.toThrow("Database connection failed");
  });

  it("rethrows other Prisma errors unchanged", async () => {
    const err = new Error("unique constraint violated");
    mockUpsert.mockRejectedValue(err);
    await expect(getSettings()).rejects.toThrow("unique constraint violated");
  });
});

describe("updateSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls prisma upsert and returns the result", async () => {
    const fake = makeSettings({ siteName: "My VBS" });
    mockUpsert.mockResolvedValue(fake);
    const result = await updateSettings({ siteName: "My VBS" });
    expect(result.siteName).toBe("My VBS");
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("uses defaults in the create block when fields are omitted", async () => {
    const fake = makeSettings();
    mockUpsert.mockResolvedValue(fake);
    await updateSettings({});
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.siteName).toBe("Steward VBS");
    expect(call.create.primaryColor).toBe("#E8B847");
    expect(call.create.googleFormsEnabled).toBe(false);
  });

  it("passes provided values through in the create block", async () => {
    const fake = makeSettings({ siteName: "Override VBS" });
    mockUpsert.mockResolvedValue(fake);
    await updateSettings({ siteName: "Override VBS", primaryColor: "#123456" });
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.siteName).toBe("Override VBS");
    expect(call.create.primaryColor).toBe("#123456");
  });
});
