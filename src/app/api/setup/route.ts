import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { needsSetup } from "@/lib/setup";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { BCRYPT_ROUNDS } from "@/lib/constants";

const setupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

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

    const { name, email, password } = validation.data;

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

    // Create admin user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        emailVerified: new Date(), // Auto-verify the first admin
      },
    });

    console.log(`[Setup] First admin account created: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
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

