#!/usr/bin/env node
// Mark one account's email as verified.
//
// Usage: node scripts/verify-admin-email.mjs <email>
// Local development only. Takes the account from argv so no personal address
// is written into the repository.

import { execSync } from "node:child_process";
import process from "node:process";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/verify-admin-email.mjs <email>");
  process.exit(1);
}

const container = process.env.DB_CONTAINER ?? "vbs-app-db-1";
const sql = `UPDATE "User" SET "emailVerified" = NOW() WHERE email = $$${email}$$;`;

console.log("Verifying", email);
execSync(`docker exec -i ${container} psql -U postgres -d vbsdb`, {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
});
console.log("Done. emailVerified set for", email);
