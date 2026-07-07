#!/usr/bin/env bash
# Fix login CORS: frontend was built with localhost:4000 baked into JS.
# Run on VPS: ./scripts/fix-frontend-api-url.sh
set -euo pipefail

cd "${PROJECT_DIR:-/data/projects/Testictour_V2}"

API_URL="${NEXT_PUBLIC_API_URL:-https://api.testictour.com}"
BACKEND_URL="${NEXT_PUBLIC_BACKEND_URL:-https://api.testictour.com}"
FRONTEND="${FRONTEND_URL:-https://testictour.com}"

echo "→ Setting production URLs in .env..."
touch .env

set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

set_env NEXT_PUBLIC_API_URL "$API_URL"
set_env NEXT_PUBLIC_BACKEND_URL "$BACKEND_URL"
set_env FRONTEND_URL "$FRONTEND"

echo "   NEXT_PUBLIC_API_URL=$API_URL"
echo "   NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL"
echo "   FRONTEND_URL=$FRONTEND"

set -a
source .env
set +a

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "→ Rebuilding frontend (no cache — NEXT_PUBLIC is baked at build time)..."
docker compose build --no-cache frontend

echo "→ Restarting frontend + backend..."
docker compose up -d frontend backend
docker compose restart backend worker 2>/dev/null || true

echo ""
echo "→ Verify (should NOT show localhost:4000):"
if docker exec testictour-frontend sh -c "grep -rl 'localhost:4000' .next/static/chunks/*.js 2>/dev/null | head -1" | grep -q .; then
  echo "❌ Still has localhost in bundle — check .env and rebuild again"
  exit 1
fi
echo "✓ Frontend bundle OK"
echo "✓ Try login at https://testictour.com"
