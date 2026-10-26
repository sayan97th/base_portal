#!/usr/bin/env bash
# Runs ON THE SERVER. Extracts a package into a new release folder, points
# "current" at it and restarts PM2. If the app does not answer, it switches back
# to the previous release automatically.
#
# Usage:
#   activate-release.sh <env> <package.tar.gz>   activate a new package
#   activate-release.sh <env> --rollback         go back to the previous release
#   activate-release.sh <env> --list             list releases
#
# Overrides: APP_ROOT, APP_PORT (default 3777), KEEP_RELEASES (default 5).
set -euo pipefail

target_env="${1:-}"
action="${2:-}"

case "$target_env" in
  testing)    default_app_root="/var/www/base-portal.97dev.com" ;;
  staging)    default_app_root="/var/www/clients.basesearchmarketing.com" ;;
  production) default_app_root="/var/www/portal.basesearchmarketing.com" ;;
  *)
    echo "Usage: $0 <testing|staging|production> <package.tar.gz | --rollback | --list>" >&2
    exit 1
    ;;
esac
[ -n "$action" ] || { echo "Usage: $0 $target_env <package.tar.gz | --rollback | --list>" >&2; exit 1; }

export APP_ROOT="${APP_ROOT:-$default_app_root}"
export APP_PORT="${APP_PORT:-3777}"
keep_releases="${KEEP_RELEASES:-5}"

releases_dir="$APP_ROOT/releases"
shared_dir="$APP_ROOT/shared"
current_link="$APP_ROOT/current"
pm2_app_name="base-portal"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

switchCurrent() {
  # Atomic symlink swap
  ln -sfn "$1" "$current_link.tmp"
  mv -Tf "$current_link.tmp" "$current_link"
  echo "==> current -> $1"
}

restartApp() {
  pm2 delete "$pm2_app_name" >/dev/null 2>&1 || true
  pm2 start "$current_link/ecosystem.standalone.config.js" --update-env
}

waitForApp() {
  local attempt status_code
  for attempt in $(seq 1 30); do
    status_code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$APP_PORT/" || true)"
    if [ "$status_code" != "000" ] && [ "${status_code:0:1}" != "5" ]; then
      echo "==> App answered with HTTP $status_code"
      return 0
    fi
    sleep 1
  done
  return 1
}

listReleases() {
  ls -1 "$releases_dir" 2>/dev/null | sort
}

currentRelease() {
  [ -L "$current_link" ] && basename "$(readlink -f "$current_link")" || true
}

activateWithFallback() {
  local new_release_dir="$1" previous_release_dir="$2"

  switchCurrent "$new_release_dir"
  restartApp

  if waitForApp; then
    pm2 save >/dev/null
    return 0
  fi

  echo "ERROR: app did not start correctly. Last log lines:" >&2
  pm2 logs "$pm2_app_name" --lines 30 --nostream >&2 || true

  if [ -n "$previous_release_dir" ] && [ -d "$previous_release_dir" ]; then
    echo "==> Restoring previous release" >&2
    switchCurrent "$previous_release_dir"
    restartApp
    waitForApp && pm2 save >/dev/null || true
  fi
  exit 1
}

command -v pm2 >/dev/null || fail "pm2 is not installed"
command -v node >/dev/null || fail "node is not installed"
command -v curl >/dev/null || fail "curl is not installed"

mkdir -p "$releases_dir" "$shared_dir/logs"

case "$action" in
  --list)
    active_release="$(currentRelease)"
    for release in $(listReleases); do
      if [ "$release" = "$active_release" ]; then echo "* $release"; else echo "  $release"; fi
    done
    exit 0
    ;;

  --rollback)
    active_release="$(currentRelease)"
    [ -n "$active_release" ] || fail "no active release"
    previous_release="$(listReleases | grep -B1 -x "$active_release" | head -n 1)"
    [ -n "$previous_release" ] && [ "$previous_release" != "$active_release" ] || fail "no release older than $active_release"

    echo "==> Rolling back $active_release -> $previous_release"
    activateWithFallback "$releases_dir/$previous_release" "$releases_dir/$active_release"
    echo "==> Rollback done"
    exit 0
    ;;
esac

# Activate a new package
package_file="$action"
[ -f "$package_file" ] || fail "package not found: $package_file"
[ -f "$shared_dir/.env.production" ] || fail "missing $shared_dir/.env.production (runtime env, e.g. STRIPE_SECRET_KEY). Create it first."

release_info="$(tar -xOzf "$package_file" ./RELEASE_INFO)" || fail "RELEASE_INFO not found in package"
release_id="$(echo "$release_info" | grep '^release_id=' | cut -d= -f2-)"
package_env="$(echo "$release_info" | grep '^target_env=' | cut -d= -f2-)"
build_arch="$(echo "$release_info" | grep '^build_arch=' | cut -d= -f2-)"

[ "$package_env" = "$target_env" ] || fail "package was built for '$package_env', not '$target_env'"
[ "$build_arch" = "$(uname -m)" ] || fail "package was built on $build_arch but this server is $(uname -m); native modules would break"

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge 20 ] || fail "Node $node_major found, Next.js 16 needs Node 20.9+"

new_release_dir="$releases_dir/$release_id"
[ ! -e "$new_release_dir" ] || fail "release $release_id already exists"

echo "==> Extracting release $release_id"
echo "$release_info" | sed 's/^/    /'
mkdir -p "$new_release_dir"
tar -xzf "$package_file" -C "$new_release_dir"

ln -sfn "$shared_dir/.env.production" "$new_release_dir/.env.production"
ln -sfn "$shared_dir/logs" "$new_release_dir/logs"

previous_release_dir=""
[ -L "$current_link" ] && previous_release_dir="$(readlink -f "$current_link")"

activateWithFallback "$new_release_dir" "$previous_release_dir"

# Keep only the newest releases (never the active one)
active_release="$(currentRelease)"
listReleases | head -n -"$keep_releases" | while read -r old_release; do
  [ "$old_release" = "$active_release" ] && continue
  rm -rf "${releases_dir:?}/$old_release"
  echo "==> Removed old release $old_release"
done

rm -f "$package_file"
echo "==> Release $release_id is live on port $APP_PORT"
