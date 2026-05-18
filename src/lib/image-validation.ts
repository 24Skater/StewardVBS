import "server-only";

const MAGIC_BYTES = {
  "image/jpeg": (buf: Buffer) =>
    buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  "image/png": (buf: Buffer) =>
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47,
  "image/gif": (buf: Buffer) =>
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38,
  "image/webp": (buf: Buffer) =>
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50,
} as const;

export type AllowedMimeType = keyof typeof MAGIC_BYTES;

export const ALLOWED_IMAGE_TYPES = Object.keys(MAGIC_BYTES) as AllowedMimeType[];

export function validateImageMagicBytes(
  buffer: Buffer,
  mimeType: string
): boolean {
  const checker = MAGIC_BYTES[mimeType as AllowedMimeType];
  if (!checker) return false;
  return checker(buffer);
}
