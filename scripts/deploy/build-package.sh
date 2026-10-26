#!/usr/bin/env bash
# Builds the Next.js standalone output on this machine and packs it into
# deploy/base-portal-<env>-<release_id>.tar.gz, ready to upload to the server.
#
# Usage: scripts/deploy/build-package.sh <testing|staging|production>
#   SKIP_INSTALL=1     skip "pnpm install --frozen-lockfile"
#   ALLOW_LOCAL_API=1  allow a localhost NEXT_PUBLIC_API_BASE_URL (testing the flow only)
#
# NEXT_PUBLIC_* values are baked into the build. They are read from .env.production
# (and .env.production.local if it exists) and exported to the build process,
# because "next build" would otherwise let .env.local override .env.production.
set -euo pipefail

target_env="${1:-}"
case "$target_env" in
  testing|staging|production) ;;
  *)
    echo "Usage: $0 <testing|staging|production>" >&2
    exit 1
    ;;
esac

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$project_root"

release_id="$(date +%Y%m%d-%H%M%S)"
deploy_dir="$project_root/deploy"
stage_dir="$deploy_dir/stage"
package_file="$deploy_dir/base-portal-$target_env-$release_id.tar.gz"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# 1. Load build env (process env has priority over every .env file in Next.js)
[ -f .env.production ] || fail ".env.production not found. Create it with the NEXT_PUBLIC_* values for '$target_env'."

set -a
# shellcheck disable=SC1091
source .env.production
if [ -f .env.production.local ]; then
  # shellcheck disable=SC1091
  source .env.production.local
fi
set +a

api_base_url="${NEXT_PUBLIC_API_BASE_URL:-}"
if [[ -z "$api_base_url" || "$api_base_url" == *localhost* || "$api_base_url" == *127.0.0.1* ]]; then
  [ "${ALLOW_LOCAL_API:-0}" = "1" ] || fail "NEXT_PUBLIC_API_BASE_URL is '$api_base_url'. Set the server URL in .env.production (or run with ALLOW_LOCAL_API=1)."
fi

echo "==> Building '$target_env' release $release_id"
echo "    NEXT_PUBLIC_API_BASE_URL=$api_base_url"

# 2. Build (SKIP_INSTALL=1 reuses the current node_modules)
if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  pnpm install --frozen-lockfile
fi
pnpm build

[ -f .next/standalone/server.js ] || fail ".next/standalone/server.js not found. Is output: \"standalone\" set in next.config.ts?"

# 3. Assemble package contents
rm -rf "$stage_dir"
mkdir -p "$stage_dir/.next"

cp -a .next/standalone/. "$stage_dir/"
cp -a .next/static "$stage_dir/.next/static"
if [ -d public ]; then
  cp -a public "$stage_dir/public"
fi

# Next copies local .env files into standalone; never ship them.
# The server uses shared/.env.production instead.
find "$stage_dir" -maxdepth 1 -name '.env*' -exec rm -f {} +

cp ecosystem/ecosystem.standalone.config.js "$stage_dir/"
cp scripts/deploy/activate-release.sh "$stage_dir/"
chmod +x "$stage_dir/activate-release.sh"

cat > "$stage_dir/RELEASE_INFO" <<EOF
release_id=$release_id
target_env=$target_env
git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
build_arch=$(uname -m)
build_node=$(node -v)
api_base_url=$api_base_url
EOF

# 4. Compress
tar -czf "$package_file" -C "$stage_dir" .
rm -rf "$stage_dir"

echo
echo "==> Package ready: $package_file ($(du -h "$package_file" | cut -f1))"
echo "    Next step: scripts/deploy/upload-package.sh $target_env"
