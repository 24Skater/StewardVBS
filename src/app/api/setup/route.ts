import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { needsSetup } from "@/lib/setup";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { BCRYPT_ROUNDS } from "@/lib/constants";
import { unscopedPrisma } from "@/lib/prisma-unscoped";
import { randomUUID } from "node:crypto";

const setupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  churchName: z.string().min(1).max(120).optional(),
});

/**
 * The church a self-hosted install belongs to.
 *
 * On the platform a church arrives already created, by the console, carrying
 * the UUID every other Steward app knows it by. Self-hosted there is nobody to
 * do that, so the first-run wizard creates it — one church, a slug nothing
 * routes on, and a name the admin can change in settings afterwards.
 */
const SELF_HOSTED_SLUG = "primary";

export async function POST(request: NextRequest) {
  try {
    // Check if setup is still needed
    const setupRequired = await needsSetup();
    if (!setupRequired) {
      return NextResponse.json(
        { error: "Setup has already been completed" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = setupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, password, churchName } = validation.data;
    const email = validation.data.email.toLowerCase();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Creating the church and its first admin is one operation: an install
    // with a church and no admin cannot be finished, and an admin with no
    // church has nothing to administer. Run outside any church scope, because
    // on a fresh install there is not yet a church to be inside.
    const { user, org } = await unscopedPrisma.$transaction(async (tx) => {
      const org =
        (await tx.org.findFirst()) ??
        (await tx.org.create({
          data: {
            id: randomUUID(),
            slug: SELF_HOSTED_SLUG,
            name: churchName ?? "Our Church",
          },
        }));

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          emailVerified: new Date(), // Auto-verify the first admin
        },
      });

      await tx.membership.create({
        data: { userId: user.id, orgId: org.id, role: "ADMIN" },
      });

      return { user, org };
    });

    console.log(`[Setup] First admin account created: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: "ADMIN",
      },
      organization: { id: org.id, name: org.name },
    });
  } catch (error) {
    console.error("[Setup] Error:", error);
    return NextResponse.json(
      { error: "Failed to create admin account" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const setupRequired = await needsSetup();
    return NextResponse.json({ setupRequired });
  } catch (error) {
    console.error("[Setup] Error checking status:", error);
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}

