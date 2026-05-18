import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  ALLOWED_IMAGE_TYPES,
  validateImageMagicBytes,
} from "@/lib/image-validation";

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!(ALLOWED_IMAGE_TYPES as string[]).includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    // Convert to buffer and validate magic bytes before trusting the declared MIME type
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateImageMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match the declared type." },
        { status: 400 }
      );
    }

    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ 
      success: true, 
      dataUri,
      size: file.size,
      type: file.type 
    });
  } catch (error) {
    logger.error({ err: error }, "Upload error");
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
