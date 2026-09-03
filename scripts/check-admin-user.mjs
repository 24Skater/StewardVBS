#!/usr/bin/env node
// Show the stored row for one account: role, password hash, verification state.
//
// Usage: node scripts/check-admin-user.mjs <email>
// Local development only. Takes the account from argv so no personal address
// is written into the repository.

import { execSync } from "node:child_process";
import process from "node:process";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/check-admin-user.mjs <email>");
  process.exit(1);
}

const container = process.env.DB_CONTAINER ?? "vbs-app-db-1";
const sql = `SELECT email, role, password, "emailVerified" FROM "User" WHERE email = $$${email}$$;`;

execSync(`docker exec -i ${container} psql -U postgres -d vbsdb`, {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
});
