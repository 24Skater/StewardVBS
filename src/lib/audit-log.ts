import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { logger } from './logger'

export type AuditAction =
  | 'USER_ROLE_CHANGED'
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_DELETED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'SETTINGS_UPDATED'
  | 'STUDENT_CREATED'
  | 'STUDENT_UPDATED'
  | 'STUDENT_DELETED'
  | 'STUDENT_CHECKED_IN'
  | 'PAYMENT_TOGGLED'
  | 'ATTENDANCE_DELETED'
  | 'SESSION_CREATED'
  | 'SESSION_DELETED'
  | 'AUTH_FAILED'
  | 'AUTHORIZATION_FAILED'

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType ?? null,
        resourceId: entry.resourceId ?? null,
        details: entry.details != null ? (entry.details as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    })
  } catch (error) {
    // Audit failures must never break the app
    logger.error({ error }, '[audit] Failed to write audit log')
  }
}
