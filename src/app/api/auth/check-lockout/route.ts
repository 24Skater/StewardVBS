import { NextResponse } from "next/server";
import { isAccountLocked } from "@/lib/auth-lockout";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

// Tight rate limit: 20 checks per minute per IP to prevent enumeration
const LOCKOUT_CHECK_WINDOW_MS = 60_000;
const LOCKOUT_CHECK_MAX_REQUESTS = 20;

export async function GET(req: Request) {
  // Rate-limit by IP to prevent lockout-status enumeration
  const identifier = `check-lockout:${getClientIdentifier(req)}`;
  const rateLimit = await checkRateLimit(identifier, {
    windowMs: LOCKOUT_CHECK_WINDOW_MS,
    maxRequests: LOCKOUT_CHECK_MAX_REQUESTS,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      }
    );
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Return only a boolean — never expose timing info to unauthenticated callers
  const locked = await isAccountLocked(email);

  return NextResponse.json({ locked });
}
