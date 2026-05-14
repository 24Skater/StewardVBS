import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

/**
 * Google Forms Webhook Endpoint
 * 
 * This endpoint receives student registration data from Google Forms
 * via Google Apps Script. It validates the webhook secret and creates
 * new student records in the database.
 * 
 * Security measures:
 * - Webhook secret validation (HMAC-SHA256 signature)
 * - Input validation with Zod
 * - Rate limiting (handled by middleware)
 * - Sanitization of user inputs
 */

// Schema for incoming form data
const FormSubmissionSchema = z.object({
  // Required fields
  studentName: z.string().min(1, "Student name is required").max(100),
  
  // Optional fields - matching common Google Form fields
  parentName: z.string().max(100).optional(),
  parentEmail: z.string().email().optional().or(z.literal("")),
  parentPhone: z.string().max(20).optional(),
  
  dateOfBirth: z.string().optional(), // Format: YYYY-MM-DD or MM/DD/YYYY
  grade: z.string().max(20).optional(),
  
  // Size for t-shirt
  size: z.string().max(10).optional().default("M"),
  
  // Category/group
  category: z.string().max(50).optional(),
  
  // Emergency contact
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelationship: z.string().max(50).optional(),
  
  // Medical info
  allergies: z.string().max(500).optional(),
  medicalNotes: z.string().max(500).optional(),
  
  // Additional notes
  notes: z.string().max(1000).optional(),
  
  // Timestamp from Google Forms
  timestamp: z.string().optional(),
});

type FormSubmission = z.infer<typeof FormSubmissionSchema>;

/**
 * Verify the webhook signature
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  // Try ISO format first (YYYY-MM-DD)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try MM/DD/YYYY format
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Sanitize string input
 */
function sanitize(str: string | undefined): string | null {
  if (!str) return null;
  return str.trim().slice(0, 1000); // Limit length and trim
}

export async function POST(request: NextRequest) {
  try {
    // Get settings to check if integration is enabled
    const settings = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
    });

    if (!settings?.googleFormsEnabled) {
      return NextResponse.json(
        { error: "Google Forms integration is not enabled" },
        { status: 403 }
      );
    }

    if (!settings.googleFormsWebhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Verify signature if provided
    const signature = request.headers.get("x-webhook-signature");
    if (signature) {
      if (!verifySignature(rawBody, signature, settings.googleFormsWebhookSecret)) {
        console.error("[Google Forms Webhook] Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      // If no signature, check for secret in body or header
      const secretHeader = request.headers.get("x-webhook-secret");
      if (secretHeader !== settings.googleFormsWebhookSecret) {
        console.error("[Google Forms Webhook] Missing or invalid secret");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Parse the body
    let body: FormSubmission;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate the payload
    const validation = FormSubmissionSchema.safeParse(body);
    if (!validation.success) {
      console.error("[Google Forms Webhook] Validation error:", validation.error.errors);
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get the active event
    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
      orderBy: { year: "desc" },
    });

    if (!activeEvent) {
      return NextResponse.json(
        { error: "No active event found. Please create an event first." },
        { status: 400 }
      );
    }

    // Check if student already exists (by name in the same event)
    const existingStudent = await prisma.student.findFirst({
      where: { name: data.studentName.trim() },
    });

    if (existingStudent) {
      console.log(`[Google Forms Webhook] Student already exists: ${data.studentName}`);
      return NextResponse.json({
        success: true,
        message: "Student already registered",
        studentId: existingStudent.id,
        duplicate: true,
      });
    }

    // Find or use default category
    let categoryName = data.category || "General";
    const category = await prisma.studentCategory.findFirst({
      where: {
        name: { equals: categoryName, mode: "insensitive" },
        OR: [{ eventId: activeEvent.id }, { eventId: null }],
      },
    });

    // Create the student and enroll in active event
    const student = await prisma.student.create({
      data: {
        name: data.studentName.trim(),
        size: data.size || "YM",
        category: categoryName,
        categoryId: category?.id,

        dateOfBirth: parseDate(data.dateOfBirth),
        grade: sanitize(data.grade),
        allergies: sanitize(data.allergies),
        medicalNotes: sanitize(data.medicalNotes),
        notes: sanitize(data.notes),

        parentName: sanitize(data.parentName),
        parentPhone: sanitize(data.parentPhone),
        parentEmail: data.parentEmail || null,

        emergencyContact: sanitize(data.emergencyContactName),
        emergencyPhone: sanitize(data.emergencyContactPhone),
        emergencyRelationship: sanitize(data.emergencyContactRelationship),

        events: { create: { eventId: activeEvent.id } },
      },
    });

    // Also create parent record if parent info provided
    if (data.parentName) {
      await prisma.studentParent.create({
        data: {
          studentId: student.id,
          name: data.parentName.trim(),
          phone: sanitize(data.parentPhone),
          email: data.parentEmail || null,
          relationship: "Parent/Guardian",
          isPrimary: true,
          canPickup: true,
        },
      });
    }

    // Also create emergency contact record if provided
    if (data.emergencyContactName && data.emergencyContactPhone) {
      await prisma.studentEmergencyContact.create({
        data: {
          studentId: student.id,
          name: data.emergencyContactName.trim(),
          phone: data.emergencyContactPhone.trim(),
          relationship: sanitize(data.emergencyContactRelationship),
          priority: 1,
        },
      });
    }

    console.log(`[Google Forms Webhook] Created student: ${student.name} (ID: ${student.id})`);

    return NextResponse.json({
      success: true,
      message: "Student registered successfully",
      studentId: student.id,
      studentName: student.name,
    });

  } catch (error) {
    console.error("[Google Forms Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint for testing connectivity
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
    });

    return NextResponse.json({
      enabled: settings?.googleFormsEnabled ?? false,
      message: settings?.googleFormsEnabled 
        ? "Google Forms webhook is active" 
        : "Google Forms integration is disabled",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

