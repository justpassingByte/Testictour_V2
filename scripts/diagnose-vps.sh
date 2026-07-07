#!/usr/bin/env bash
# Quick VPS diagnostics — run on server: ./scripts/diagnose-vps.sh
set -uo pipefail

echo "=== Docker containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "testictour|NAMES" || true

echo ""
echo "=== .env public URLs ==="
if [[ -f .env ]]; then
  grep -E "^(NEXT_PUBLIC_|FRONTEND_URL|DATABASE_URL)=" .env | sed 's/JWT_SECRET=.*/JWT_SECRET=***/'
else
  echo "MISSING .env file!"
fi

echo ""
echo "=== Local HTTP ==="
curl -s -o /dev/null -w "backend :4000 → %{http_code}\n" http://127.0.0.1:4000/ || echo "backend unreachable"
curl -s -o /dev/null -w "frontend:3002 → %{http_code}\n" http://127.0.0.1:3002/ || echo "frontend unreachable"

echo ""
echo "=== Public API ==="
curl -s -o /dev/null -w "api.testictour.com/tournaments → %{http_code}\n" https://api.testictour.com/api/tournaments || true

echo ""
echo "=== Frontend baked API URL (CRITICAL) ==="
# Next.js embeds NEXT_PUBLIC_* in JS bundles at build time
BUNDLE=$(docker exec testictour-frontend sh -c "ls .next/static/chunks/*.js 2>/dev/null | head -1" 2>/dev/null || true)
if [[ -n "$BUNDLE" ]]; then
  if docker exec testictour-frontend sh -c "grep -l 'localhost:4000' .next/static/chunks/*.js 2>/dev/null | head -1" | grep -q .; then
    echo "❌ PROBLEM: Frontend JS still contains localhost:4000"
    echo "   Fix: set NEXT_PUBLIC_API_URL in .env then rebuild frontend:"
    echo "   docker compose build --no-cache frontend && docker compose up -d frontend"
  else
    echo "✓ No localhost:4000 found in frontend JS chunks"
  fi
else
  echo "(could not inspect frontend bundle — container running?)"
fi

echo ""
echo "=== DB column platformFeePercent ==="
docker exec testictour-postgres psql -U testictour_user -d testictour_db -tAc \
  "SELECT column_name FROM information_schema.columns WHERE table_name='Tournament' AND column_name='platformFeePercent';" \
  2>/dev/null | grep -q platformFeePercent && echo "✓ column exists" || echo "❌ column MISSING — run SQL migration"

echo ""
echo "=== Recent backend errors ==="
docker logs testictour-backend --tail 30 2>&1 | grep -iE "error|prisma|P2022" || echo "(no recent errors in last 30 lines)"
