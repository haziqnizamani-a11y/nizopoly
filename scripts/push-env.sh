#!/usr/bin/env bash
#
# Copies the Supabase keys from .env.local into the linked Vercel project and
# redeploys. Values are piped straight through — never printed, never logged.
#
#   npm run deploy
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "No .env.local found. Copy .env.local.example and fill it in first."
  exit 1
fi

VARS=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY)

# Refuse to ship a half-configured deployment.
missing=()
for name in "${VARS[@]}"; do
  value="$(grep -E "^${name}=" .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"'' | xargs || true)"
  if [ -z "$value" ]; then missing+=("$name"); fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "These are still empty in .env.local:"
  printf '  - %s\n' "${missing[@]}"
  echo
  echo "Supabase dashboard -> Settings -> API. Then run: npm run check:supabase"
  exit 1
fi

echo "Checking Supabase before deploying..."
npm run --silent check:supabase

for env in production preview development; do
  for name in "${VARS[@]}"; do
    value="$(grep -E "^${name}=" .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"'' | xargs)"
    # Replace any existing value; `env add` refuses to overwrite.
    vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env add "$name" "$env" >/dev/null 2>&1
    echo "  set $name ($env)"
  done
done

echo
echo "Deploying..."
vercel deploy --prod --yes

echo
echo "Done. Give https://nizopoly.vercel.app to everyone playing."
