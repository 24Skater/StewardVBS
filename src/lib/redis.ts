import 'server-only'
import Redis from 'ioredis'
import { logger } from './logger'

let _client: Redis | null = null

function createClient(): Redis {
  const url = process.env.REDIS_URL

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[redis] REDIS_URL is required in production but is not set')
    }
    throw new Error('[redis] REDIS_URL not configured')
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  })

  client.on('error', (err) => {
    logger.error({ err: err.message }, '[redis] Connection error')
  })

  return client
}

export function getRedis(): Redis {
  if (!_client) {
    _client = createClient()
  }
  return _client
}

export function isRedisAvailable(): boolean {
  try {
    const r = getRedis()
    return r.status === 'ready'
  } catch {
    return false
  }
}
