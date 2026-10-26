#!/usr/bin/env bash
# Uploads a package built by build-package.sh (plus the activation script) to the
# deploy/ folder inside the app folder on the server
# (production: /var/www/portal.basesearchmarketing.com/deploy).
#
# Usage: scripts/deploy/upload-package.sh <testing|staging|production> [package.tar.gz]
#   Without a package path (default), the newest deploy/base-portal-<env>-*.tar.gz is used.
#   DEPLOY_SSH_HOST overrides the SSH alias from ~/.ssh/config
#   (default: base-clients-testing for testing, base-clients-prod for staging and production).
#   APP_ROOT overrides the remote app folder (same defaults as activate-release.sh).
#   .env.<env> is uploaded to $APP_ROOT/shared/.env.<env> (the runtime env that
#   activate-release.sh links into every release) when the server does not have it yet.
#   UPLOAD_ENV=1 always uploads it (overwrites the server copy), UPLOAD_ENV=0 never does.
set -euo pipefail

target_env="${1:-}"
package_file="${2:-}"

case "$target_env" in
  testing)    default_app_root="/var/www/base-portal.97dev.com";          default_ssh_host="base-clients-testing" ;;
  staging)    default_app_root="/var/www/clients.basesearchmarketing.com"; default_ssh_host="base-clients-prod" ;;
  production) default_app_root="/var/www/portal.basesearchmarketing.com";  default_ssh_host="base-clients-prod" ;;
  *)
    echo "Usage: $0 <testing|staging|production> [package.tar.gz]" >&2
    exit 1
    ;;
esac
ssh_host="${DEPLOY_SSH_HOST:-$default_ssh_host}"
app_root="${APP_ROOT:-$default_app_root}"
remote_deploy_dir="$app_root/deploy"

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -z "$package_file" ]; then
  # Newest by release_id in the file name
  package_file="$(ls -1 "$project_root"/deploy/base-portal-"$target_env"-*.tar.gz 2>/dev/null | sort | tail -n 1 || true)"
fi
[ -n "$package_file" ] && [ -f "$package_file" ] || {
  echo "ERROR: no package found for '$target_env'. Run scripts/deploy/build-package.sh $target_env first." >&2
  exit 1
}

package_name="$(basename "$package_file")"

echo "==> Uploading $package_name to $ssh_host:$remote_deploy_dir/"
ssh "$ssh_host" "mkdir -p '$remote_deploy_dir'"
scp "$package_file" "$project_root/scripts/deploy/activate-release.sh" "$ssh_host:$remote_deploy_dir/"

env_file="$project_root/.env.$target_env"
remote_env_file="$app_root/shared/.env.$target_env"
upload_env="${UPLOAD_ENV:-}"
if [ -z "$upload_env" ]; then
  if ssh "$ssh_host" "test -f '$remote_env_file'"; then
    upload_env=0
    echo "==> $remote_env_file already on the server (UPLOAD_ENV=1 to overwrite it)"
  else
    upload_env=1
  fi
fi

if [ "$upload_env" = "1" ]; then
  [ -s "$env_file" ] || {
    echo "ERROR: $env_file not found or empty." >&2
    exit 1
  }
  echo "==> Uploading .env.$target_env to $ssh_host:$remote_env_file"
  ssh "$ssh_host" "mkdir -p '$app_root/shared'"
  scp "$env_file" "$ssh_host:$remote_env_file"
  ssh "$ssh_host" "chmod 600 '$remote_env_file'"
fi

echo
echo "==> Uploaded. To activate the newest package in $remote_deploy_dir, run:"
echo "    ssh $ssh_host 'bash $remote_deploy_dir/activate-release.sh $target_env'"
echo "  or, to activate exactly this package:"
echo "    ssh $ssh_host 'bash $remote_deploy_dir/activate-release.sh $target_env $remote_deploy_dir/$package_name'"
