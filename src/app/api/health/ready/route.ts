import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isRedisAvailable } from '@/lib/redis'

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, boolean> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch {
    checks.database = false
  }

  checks.redis = isRedisAvailable()

  const allHealthy = Object.values(checks).every(Boolean)

  return NextResponse.json(
    { status: allHealthy ? 'ready' : 'degraded', checks },
    { status: allHealthy ? 200 : 503 }
  )
}
