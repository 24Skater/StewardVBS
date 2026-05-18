import { describe, it, expect } from "vitest";
import { formatChurchAddress, generateWebhookSecret } from "../settings";
import type { AppSettings } from "../settings";

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    id: "singleton",
    siteName: "VBS App",
    primaryColor: "#2563eb",
    secondaryColor: "#1e40af",
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
