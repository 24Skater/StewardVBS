#!/usr/bin/env node
// Reset one account's password.
//
// Usage: node scripts/reset-admin-password.mjs <email> [password]
// Local development only. Takes the account from argv so no personal address
// is written into the repository.

import bcrypt from "bcryptjs";
import { execSync } from "node:child_process";
import process from "node:process";

const email = process.argv[2];
const newPassword = process.argv[3] ?? "Admin1234!";
if (!email) {
  console.error("Usage: node scripts/reset-admin-password.mjs <email> [password]");
  process.exit(1);
}

const container = process.env.DB_CONTAINER ?? "vbs-app-db-1";
const hash = await bcrypt.hash(newPassword, 10);
const sql = `UPDATE "User" SET "password" = $$${hash}$$ WHERE email = $$${email}$$;`;

console.log("Resetting password for", email);
execSync(`docker exec -i ${container} psql -U postgres -d vbsdb`, {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
});
console.log("Done. Sign in with the password you passed to this script.");
