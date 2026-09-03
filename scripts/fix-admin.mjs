#!/usr/bin/env node
// Reset every ADMIN account to a known password, mark it verified, and flush
// the Redis lockout database. Local development recovery only.
//
// Usage: node scripts/fix-admin.mjs [password]
//
// Reads REDIS_PASSWORD from the environment (see .env). No credential is ever
// written into this file.

import bcrypt from "bcryptjs";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const newPassword = process.argv[2] ?? "Admin1234!";
const dbContainer = process.env.DB_CONTAINER ?? "vbs-app-db-1";
const redisContainer = process.env.REDIS_CONTAINER ?? "vbs-app-redis-1";
const redisPassword = process.env.REDIS_PASSWORD;

const hash = await bcrypt.hash(newPassword, 10);
console.log("Hash generated:", `${hash.substring(0, 20)}...`);

const sql = `
SELECT email, LENGTH(TRIM(email)) as len, role, LEFT(password,20) as pw, "emailVerified" FROM "User" WHERE role = 'ADMIN';
UPDATE "User" SET password = '${hash}', "emailVerified" = NOW() WHERE role = 'ADMIN';
SELECT email, LEFT(password,20) as new_pw, "emailVerified" FROM "User" WHERE role = 'ADMIN';
`;

const tmpFile = join(tmpdir(), "fix-admin.sql");
writeFileSync(tmpFile, sql);
console.log("SQL written to", tmpFile);

execSync(`docker cp "${tmpFile}" ${dbContainer}:/tmp/fix-admin.sql`, { stdio: "inherit" });
execSync(`docker exec ${dbContainer} psql -U postgres -d vbsdb -f /tmp/fix-admin.sql`, {
  stdio: "inherit",
});

console.log("");
console.log("Clearing Redis lockouts...");
const auth = redisPassword ? ["-a", redisPassword] : [];
execSync(["docker", "exec", redisContainer, "redis-cli", ...auth, "FLUSHDB"].join(" "), {
  stdio: "inherit",
});

console.log("");
console.log("Done. Sign in with the password you passed to this script.");
