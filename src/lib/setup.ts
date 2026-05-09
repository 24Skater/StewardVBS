/**
 * First-launch setup utilities
 */
import "server-only";
import { prisma } from "./prisma";
import { logger } from "./logger";

/**
 * Check if this is a fresh install (no users in database)
 */
export async function isFirstLaunch(): Promise<boolean> {
  try {
    const userCount = await prisma.user.count();
    return userCount === 0;
  } catch (error) {
    // If database isn't ready, treat as first launch
    logger.error({ error }, "Error checking first launch status");
    return true;
  }
}

/**
 * Check if setup is required (no admin users)
 */
export async function needsSetup(): Promise<boolean> {
  try {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });
    logger.info({ adminCount, needsSetup: adminCount === 0 }, '[Setup] Admin count checked');
    return adminCount === 0;
  } catch (error) {
    logger.error({ error }, "[Setup] Error checking setup status");
    // Don't assume setup is needed on error - this causes redirect loops
    // Instead, return false so users can at least access the site
    return false;
  }
}

