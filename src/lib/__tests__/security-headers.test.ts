import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { addSecurityHeaders } from "../security-headers";

describe("addSecurityHeaders", () => {
  it("sets X-Frame-Options to DENY", () => {
    const res = NextResponse.json({});
    const result = addSecurityHeaders(res);
    expect(result.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets X-Content-Type-Options to nosniff", () => {
    const res = NextResponse.json({});
    const result = addSecurityHeaders(res);
    expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets Referrer-Policy", () => {
    const res = NextResponse.json({});
    const result = addSecurityHeaders(res);
    expect(result.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
  });

  it("sets Permissions-Policy with camera/microphone/geolocation denied", () => {
    const res = NextResponse.json({});
    const result = addSecurityHeaders(res);
    const policy = result.headers.get("Permissions-Policy");
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
  });

  it("sets Content-Security-Policy header", () => {
    const res = NextResponse.json({});
    const result = addSecurityHeaders(res);
    expect(result.headers.get("Content-Security-Policy")).toBeTruthy();
  });

  it("script-src allows inline scripts (required for Next.js App Router prerendering)", () => {
    const res = NextResponse.json({});
    const result = addSecurityHeaders(res, "test-nonce-abc");
    const csp = result.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("script-src");
    expect(csp).toContain("'self'");
  });

  it("returns the same response object", () => {
    const res = NextResponse.json({});
    const result = addSecurityHeaders(res);
    expect(result).toBe(res);
  });

  it("CSP includes frame-ancestors none", () => {
    const res = NextResponse.json({});
    const result = addSecurityHeaders(res);
    const csp = result.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("CSP includes form-action self", () => {
    const res = NextResponse.json({});
    const result = addSecurityHeaders(res);
    const csp = result.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("form-action 'self'");
  });
});
