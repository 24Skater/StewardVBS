import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auditLog } from "@/lib/audit-log";
import { validateInvitation, markInvitationUsed } from "@/lib/invitations";
import { BCRYPT_ROUNDS } from "@/lib/constants";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const REGISTER_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_MAX_REQUESTS = 10;

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: "Password must contain uppercase, lowercase, and a number",
    }),
  name: z.string().min(1).max(100).optional(),
  inviteToken: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const identifier = `register:${getClientIdentifier(req)}`;
    const rateLimit = await checkRateLimit(identifier, {
      windowMs: REGISTER_WINDOW_MS,
      maxRequests: REGISTER_MAX_REQUESTS,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfter ?? 60) },
        }
      );
    }

    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email, password, name, inviteToken } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Don't reveal if user exists - return generic error
      return NextResponse.json(
        { error: "Registration failed. Please try again or sign in." },
        { status: 400 }
      );
    }

    // Check for valid invitation token
    let assignedRole: "ADMIN" | "STAFF" | "VIEWER" = "VIEWER";
    let invitation = null;

    if (inviteToken) {
      invitation = await validateInvitation(inviteToken);
      if (invitation) {
        // Verify the invitation email matches
        if (invitation.email !== normalizedEmail) {
          return NextResponse.json(
            { error: "This invitation is for a different email address." },
            { status: 400 }
          );
        }
        assignedRole = invitation.role;
      }
    }

    // Hash password with bcrypt (12 rounds as specified in requirements)
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user with assigned role (from invitation or default VIEWER)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name || null,
        role: assignedRole,
        emailVerified: new Date(), // Consider email verified for credentials users
      },
    });

    // Mark invitation as used if applicable
    if (invitation) {
      await markInvitationUsed(invitation.token);
    }

    // Audit log the registration
    await auditLog({
      userId: user.id,
      action: "SESSION_CREATED",
      resourceType: "User",
      resourceId: user.id,
      details: {
        method: "credentials_register",
        email: normalizedEmail,
        role: assignedRole,
        invitedBy: invitation?.invitedBy || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully. You can now sign in.",
    });
  } catch (error) {
    logger.error({ err: error }, "Registration error");
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

