import 'server-only'
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'

/**
 * Object storage for the things that should never have been in Postgres.
 *
 * Profile photos are up to 2MB each and were stored as base64 data URIs in a
 * text column. On one church's own database that is merely wasteful; on a
 * database shared by a thousand churches it is hundreds of gigabytes of image
 * data in the row store, backed up and restored and vacuumed along with
 * everything else.
 *
 * **Entirely optional.** With no `STORAGE_*` variables set this module reports
 * itself unconfigured and the upload path keeps inlining data URIs exactly as
 * it did before. That is the same bargain the platform variables strike: a
 * church running its own copy should not be made to stand up an object store to
 * keep using a feature it already had. Hosted Steward configures it; a
 * self-hoster may, and need not.
 *
 * Any S3-compatible store works — MinIO, Cloudflare R2, Backblaze, AWS itself.
 */

export interface StorageEnv {
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
  bucket?: string
  region?: string
}

function readEnv(env: NodeJS.ProcessEnv = process.env): StorageEnv {
  return {
    endpoint: env.STORAGE_ENDPOINT,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    bucket: env.STORAGE_BUCKET,
    region: env.STORAGE_REGION ?? 'auto',
  }
}

export function isStorageConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const { endpoint, accessKeyId, secretAccessKey, bucket } = readEnv(env)
  return Boolean(endpoint && accessKeyId && secretAccessKey && bucket)
}

let client: S3Client | null = null

/** The shared client, or null when storage is not configured. */
export function storageClient(env: NodeJS.ProcessEnv = process.env): S3Client | null {
  if (!isStorageConfigured(env)) return null
  if (client) return client

  const { endpoint, accessKeyId, secretAccessKey, region } = readEnv(env)
  client = new S3Client({
    endpoint,
    region: region ?? 'auto',
    credentials: {
      accessKeyId: accessKeyId as string,
      secretAccessKey: secretAccessKey as string,
    },
    // MinIO and most self-hosted stores do not do virtual-host-style buckets.
    forcePathStyle: true,
  })
  return client
}

/** Test seam. Production never calls this. */
export function resetStorageClient(): void {
  client = null
}

export function storageBucket(env: NodeJS.ProcessEnv = process.env): string | null {
  return readEnv(env).bucket ?? null
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const s3 = storageClient(env)
  const bucket = storageBucket(env)
  if (!s3 || !bucket) throw new Error('[storage] not configured')

  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  )
}

export interface StoredObject {
  body: Uint8Array
  contentType: string
}

export async function getObject(
  key: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<StoredObject | null> {
  const s3 = storageClient(env)
  const bucket = storageBucket(env)
  if (!s3 || !bucket) return null

  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const body = await result.Body?.transformToByteArray()
    if (!body) return null
    return { body, contentType: result.ContentType ?? 'application/octet-stream' }
  } catch {
    // A missing object is not an error worth a stack trace; the caller turns
    // null into a 404.
    return null
  }
}

export async function deleteObject(
  key: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const s3 = storageClient(env)
  const bucket = storageBucket(env)
  if (!s3 || !bucket) return

  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}
