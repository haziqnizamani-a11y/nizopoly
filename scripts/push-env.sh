#!/usr/bin/env bash
#
# Copies the Supabase keys from .env.local into the linked Vercel project and
# redeploys. Values are piped straight through — never printed, never logged.
#
#   npm run deploy
#
set -uo pipefail   # deliberately NOT -e: see the env loop below

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "No .env.local found. Copy .env.local.example and fill it in first."
  exit 1
fi

VARS=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY)

read_var() {
  grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"'' | xargs
}

# Refuse to ship a half-configured deployment.
missing=()
for name in "${VARS[@]}"; do
  [ -z "$(read_var "$name")" ] && missing+=("$name")
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "These are still empty in .env.local:"
  printf '  - %s\n' "${missing[@]}"
  echo
  echo "Supabase dashboard -> Settings -> API. Then run: npm run check:supabase"
  exit 1
fi

echo "Checking Supabase before deploying..."
if ! npm run --silent check:supabase; then
  echo
  echo "Required checks failed — not deploying."
  exit 1
fi

# Production only. `vercel env add <name> preview` needs a branch argument in
# non-interactive mode, and a failure there used to abort before the deploy.
echo
failed=0
for name in "${VARS[@]}"; do
  value="$(read_var "$name")"
  vercel env rm "$name" production --yes >/dev/null 2>&1
  if printf '%s' "$value" | vercel env add "$name" production >/dev/null 2>&1; then
    echo "  set $name"
  else
    echo "  FAILED to set $name"
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo
  echo "Could not set every variable — not deploying, since a partial"
  echo "configuration would 503 for players. Set them in the Vercel dashboard."
  exit 1
fi

echo
echo "Deploying..."
if ! vercel deploy --prod --yes; then
  echo
  echo "Deploy failed — see the output above."
  exit 1
fi

echo
echo "Verifying the live site can create a game..."
sleep 5
body="$(curl -s --max-time 25 -X POST https://nizopoly.vercel.app/api/rooms \
  -H 'content-type: application/json' -d '{"name":"deploy-check"}')"

if printf '%s' "$body" | grep -q '"code"'; then
  echo "  ok — a room was created on the live site."
  echo
  echo "Done. Give https://nizopoly.vercel.app to everyone playing."
else
  echo "  the live site did not create a room:"
  echo "  $body"
  exit 1
fi
