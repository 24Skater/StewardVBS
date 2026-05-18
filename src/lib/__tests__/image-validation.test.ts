import { describe, it, expect } from "vitest";
import {
  validateImageMagicBytes,
  ALLOWED_IMAGE_TYPES,
} from "../image-validation";

// Minimal valid headers for each format
function jpegBuf(): Buffer {
  const b = Buffer.alloc(16);
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff;
  return b;
}

function pngBuf(): Buffer {
  const b = Buffer.alloc(16);
  b[0] = 0x89; b[1] = 0x50; b[2] = 0x4e; b[3] = 0x47;
  return b;
}

function gifBuf(): Buffer {
  const b = Buffer.alloc(16);
  b[0] = 0x47; b[1] = 0x49; b[2] = 0x46; b[3] = 0x38;
  return b;
}

function webpBuf(): Buffer {
  const b = Buffer.alloc(16);
  // RIFF header
  b[0] = 0x52; b[1] = 0x49; b[2] = 0x46; b[3] = 0x46;
  // WEBP at offset 8
  b[8] = 0x57; b[9] = 0x45; b[10] = 0x42; b[11] = 0x50;
  return b;
}

describe("ALLOWED_IMAGE_TYPES", () => {
  it("includes the four expected MIME types", () => {
    expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/png");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/gif");
    expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
  });
});

describe("validateImageMagicBytes", () => {
  describe("JPEG", () => {
    it("accepts a valid JPEG buffer", () => {
      expect(validateImageMagicBytes(jpegBuf(), "image/jpeg")).toBe(true);
    });

    it("rejects a PNG buffer declared as JPEG", () => {
      expect(validateImageMagicBytes(pngBuf(), "image/jpeg")).toBe(false);
    });

    it("rejects an empty buffer", () => {
      expect(validateImageMagicBytes(Buffer.alloc(0), "image/jpeg")).toBe(false);
    });
  });

  describe("PNG", () => {
    it("accepts a valid PNG buffer", () => {
      expect(validateImageMagicBytes(pngBuf(), "image/png")).toBe(true);
    });

    it("rejects a JPEG buffer declared as PNG", () => {
      expect(validateImageMagicBytes(jpegBuf(), "image/png")).toBe(false);
    });
  });

  describe("GIF", () => {
    it("accepts a valid GIF buffer", () => {
      expect(validateImageMagicBytes(gifBuf(), "image/gif")).toBe(true);
    });

    it("rejects a JPEG buffer declared as GIF", () => {
      expect(validateImageMagicBytes(jpegBuf(), "image/gif")).toBe(false);
    });
  });

  describe("WebP", () => {
    it("accepts a valid WebP buffer", () => {
      expect(validateImageMagicBytes(webpBuf(), "image/webp")).toBe(true);
    });

    it("rejects a PNG buffer declared as WebP", () => {
      expect(validateImageMagicBytes(pngBuf(), "image/webp")).toBe(false);
    });

    it("rejects a buffer with RIFF but no WEBP marker", () => {
      const b = Buffer.alloc(16);
      b[0] = 0x52; b[1] = 0x49; b[2] = 0x46; b[3] = 0x46;
      // offset 8 is zeroed — not WEBP
      expect(validateImageMagicBytes(b, "image/webp")).toBe(false);
    });
  });

  describe("unknown MIME type", () => {
    it("returns false for an unsupported type", () => {
      expect(validateImageMagicBytes(jpegBuf(), "application/pdf")).toBe(false);
    });

    it("returns false for empty MIME type", () => {
      expect(validateImageMagicBytes(jpegBuf(), "")).toBe(false);
    });
  });

  describe("content-type spoofing", () => {
    it("rejects a PHP file with image/jpeg MIME type", () => {
      const php = Buffer.from("<?php echo 'pwned'; ?>");
      expect(validateImageMagicBytes(php, "image/jpeg")).toBe(false);
    });

    it("rejects an HTML file with image/png MIME type", () => {
      const html = Buffer.from("<html><body>xss</body></html>");
      expect(validateImageMagicBytes(html, "image/png")).toBe(false);
    });
  });
});
