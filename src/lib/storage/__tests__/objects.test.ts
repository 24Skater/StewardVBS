import { describe, it, expect, beforeEach } from 'vitest'
import { isStorageConfigured, resetStorageClient, storageBucket, storageClient } from '../objects'

const FULL = {
  STORAGE_ENDPOINT: 'https://s3.example.test',
  STORAGE_ACCESS_KEY_ID: 'key',
  STORAGE_SECRET_ACCESS_KEY: 'secret',
  STORAGE_BUCKET: 'vbs',
} as unknown as NodeJS.ProcessEnv

beforeEach(() => {
  resetStorageClient()
})

describe('opting in', () => {
  it('is configured when every variable is present', () => {
    expect(isStorageConfigured(FULL)).toBe(true)
  })

  it('builds a client when configured', () => {
    expect(storageClient(FULL)).not.toBeNull()
  })

  it('reuses the client rather than building one per call', () => {
    // A per-request S3 client would rebuild credentials and connection pools on
    // every upload.
    expect(storageClient(FULL)).toBe(storageClient(FULL))
  })
})

describe('staying out of the way', () => {
  it('is not configured when nothing is set', () => {
    // The whole bargain: a church running its own copy should not be made to
    // stand up an object store to keep a feature it already had.
    expect(isStorageConfigured({} as NodeJS.ProcessEnv)).toBe(false)
  })

  it('returns no client when not configured', () => {
    expect(storageClient({} as NodeJS.ProcessEnv)).toBeNull()
  })

  it.each(['STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_BUCKET'])(
    'is not configured when %s alone is missing',
    (missing) => {
      // Half-configured is not configured. Reporting otherwise would mean
      // uploads failing at the S3 call rather than falling back cleanly.
      const partial = { ...FULL } as Record<string, string | undefined>
      delete partial[missing]
      expect(isStorageConfigured(partial as NodeJS.ProcessEnv)).toBe(false)
    }
  )

  it('names no bucket when not configured', () => {
    expect(storageBucket({} as NodeJS.ProcessEnv)).toBeNull()
  })
})
