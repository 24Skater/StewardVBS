#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[start] Running database migrations..."
  npx prisma migrate deploy
  echo "[start] Migrations complete."
fi

echo "[start] Starting application..."
exec node server.js
