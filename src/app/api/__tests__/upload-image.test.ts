import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: "user-1", role: "STAFF" } }),
}));

import { POST } from "@/app/api/upload/image/route";
import { getSession } from "@/lib/auth";

function makeJpegBuffer(): Buffer {
  const b = Buffer.alloc(16);
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff;
  return b;
}

function makePngBuffer(): Buffer {
  const b = Buffer.alloc(16);
  b[0] = 0x89; b[1] = 0x50; b[2] = 0x4e; b[3] = 0x47;
  return b;
}

function makeFormData(buffer: Buffer, mimeType: string, filename = "img.jpg"): FormData {
  const blob = new Blob([buffer], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });
  const fd = new FormData();
  fd.append("file", file);
  return fd;
}

function makeRequest(fd: FormData): Request {
  return new Request("http://localhost/api/upload/image", {
    method: "POST",
    body: fd,
  });
}

describe("POST /api/upload/image", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user-1", role: "STAFF" },
    } as any);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null);
    const fd = makeFormData(makeJpegBuffer(), "image/jpeg");
    const res = await POST(makeRequest(fd) as any);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    const fd = new FormData();
    const res = await POST(makeRequest(fd) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 for disallowed MIME type (PDF)", async () => {
    const fd = makeFormData(Buffer.from("%PDF-1.4"), "application/pdf", "doc.pdf");
    const res = await POST(makeRequest(fd) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when magic bytes don't match declared MIME type (spoofing)", async () => {
    // PNG buffer declared as JPEG
    const fd = makeFormData(makePngBuffer(), "image/jpeg");
    const res = await POST(makeRequest(fd) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/content|type/i);
  });

  it("returns 400 for a PHP file with image/jpeg MIME type", async () => {
    const php = Buffer.from("<?php echo 'evil'; ?>");
    const fd = makeFormData(php, "image/jpeg", "shell.php");
    const res = await POST(makeRequest(fd) as any);
    expect(res.status).toBe(400);
  });

  it("accepts a valid JPEG and returns dataUri", async () => {
    const fd = makeFormData(makeJpegBuffer(), "image/jpeg");
    const res = await POST(makeRequest(fd) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.dataUri).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("accepts a valid PNG and returns dataUri", async () => {
    const fd = makeFormData(makePngBuffer(), "image/png");
    const res = await POST(makeRequest(fd) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dataUri).toMatch(/^data:image\/png;base64,/);
  });

  it("returns 400 when file exceeds 2MB", async () => {
    // Create buffer slightly over 2MB with valid JPEG magic bytes
    const buf = Buffer.alloc(2 * 1024 * 1024 + 1);
    buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
    const fd = makeFormData(buf, "image/jpeg");
    const res = await POST(makeRequest(fd) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/large|size/i);
  });
});
