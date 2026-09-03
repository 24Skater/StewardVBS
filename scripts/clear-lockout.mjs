#!/usr/bin/env node
// Clear a login lockout for one account.
//
// Usage: node scripts/clear-lockout.mjs <email>
//
// Reads REDIS_PASSWORD from the environment (see .env). No credential is
// ever written into this file.

import { execSync } from "node:child_process";
import process from "node:process";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/clear-lockout.mjs <email>");
  process.exit(1);
}

const container = process.env.REDIS_CONTAINER ?? "vbs-app-redis-1";
const password = process.env.REDIS_PASSWORD;
const auth = password ? ["-a", password] : [];

const args = ["redis-cli", ...auth, "DEL", `lockout:${email}`];
console.log(`Clearing lockout for ${email} in ${container}`);
execSync(["docker", "exec", container, ...args].join(" "), { stdio: "inherit" });
console.log("Lockout cleared for", email);
