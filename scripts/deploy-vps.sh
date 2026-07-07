#!/usr/bin/env bash
# Deploy Testictour_V2 on VPS — run on server or via GitHub Actions SSH
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/data/projects/Testictour_V2}"
COMPOSE="docker compose"
SERVICES="${DEPLOY_SERVICES:-backend frontend worker}"
SKIP_BUILD="${SKIP_BUILD:-0}"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"

log() { echo "[deploy $(date +%H:%M:%S)] $*"; }
die() { echo "[deploy ERROR] $*" >&2; exit 1; }

cd "$PROJECT_DIR" || die "Project dir not found: $PROJECT_DIR"

# Load .env for compose variable substitution (NEXT_PUBLIC_* build args)
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ "${NEXT_PUBLIC_API_URL:-}" == *"localhost"* ]]; then
  log "WARNING: NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
  log "Browser will call localhost — set https://api.testictour.com in .env and rebuild frontend!"
fi

# ── 1. Pull latest code ─────────────────────────────────────────────────────
if [[ "$SKIP_GIT_PULL" != "1" ]]; then
  log "git pull..."
  git fetch origin main
  git reset --hard origin/main
fi

# ── 2. Apply pending SQL migrations (safe IF NOT EXISTS) ────────────────────
if [[ -d Testictour_be/prisma/migrations ]]; then
  log "Applying SQL migrations..."
  for sql in Testictour_be/prisma/migrations/*/migration.sql; do
    [[ -f "$sql" ]] || continue
    log "  → $sql"
    docker exec -i testictour-postgres psql -U testictour_user -d testictour_db -v ON_ERROR_STOP=0 < "$sql" || true
  done
fi

# ── 3. Prisma sync (fallback if SQL missed something) ─────────────────────────
if docker ps --format '{{.Names}}' | grep -q '^testictour-backend$'; then
  log "prisma db push (schema sync)..."
  docker exec testictour-backend npx prisma db push --accept-data-loss=false 2>/dev/null || \
    log "db push skipped (rebuild backend first if schema out of date)"
fi

# ── 4. Build & restart app containers ───────────────────────────────────────
if [[ "$SKIP_BUILD" != "1" ]]; then
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1
  log "Building: $SERVICES ..."
  # Frontend bakes NEXT_PUBLIC_* at build time — no-cache when public URL changed
  if [[ "${FORCE_FRONTEND_REBUILD:-0}" == "1" ]]; then
    $COMPOSE build --no-cache frontend
    $COMPOSE build $SERVICES
  else
    $COMPOSE build $SERVICES
  fi
fi

log "Starting containers..."
$COMPOSE up -d backend frontend worker

# ── 5. Post-deploy prisma (container now has latest schema) ─────────────────
sleep 3
if docker ps --format '{{.Names}}' | grep -q '^testictour-backend$'; then
  log "prisma db push after rebuild..."
  docker exec testictour-backend npx prisma db push --accept-data-loss=false || true
  docker exec testictour-backend npx prisma migrate deploy 2>/dev/null || true
fi

$COMPOSE restart backend worker 2>/dev/null || true

# ── 6. Health check ─────────────────────────────────────────────────────────
log "Health check..."
sleep 2
BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/ || echo "000")
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/ || echo "000")
log "Backend HTTP $BACKEND_CODE | Frontend HTTP $FRONTEND_CODE"

if [[ "$BACKEND_CODE" != "200" && "$BACKEND_CODE" != "404" && "$BACKEND_CODE" != "301" ]]; then
  log "WARNING: backend may be unhealthy — check: docker logs --tail 50 testictour-backend"
fi

log "Deploy done."
$COMPOSE ps backend frontend worker

log "Run ./scripts/diagnose-vps.sh to verify production URLs"
