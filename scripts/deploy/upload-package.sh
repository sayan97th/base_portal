#!/usr/bin/env bash
# Uploads a package built by build-package.sh (plus the activation script) to /tmp on the server.
#
# Usage: scripts/deploy/upload-package.sh <testing|staging|production> [package.tar.gz]
#   Without a package path, the newest deploy/base-portal-<env>-*.tar.gz is used.
#   DEPLOY_SSH_HOST overrides the SSH alias from ~/.ssh/config (default: base-clients-prod).
set -euo pipefail

target_env="${1:-}"
package_file="${2:-}"

case "$target_env" in
  testing|staging|production) default_ssh_host="base-clients-prod" ;;
  *)
    echo "Usage: $0 <testing|staging|production> [package.tar.gz]" >&2
    exit 1
    ;;
esac
ssh_host="${DEPLOY_SSH_HOST:-$default_ssh_host}"

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -z "$package_file" ]; then
  package_file="$(ls -1t "$project_root"/deploy/base-portal-"$target_env"-*.tar.gz 2>/dev/null | head -n 1 || true)"
fi
[ -n "$package_file" ] && [ -f "$package_file" ] || {
  echo "ERROR: no package found for '$target_env'. Run scripts/deploy/build-package.sh $target_env first." >&2
  exit 1
}

package_name="$(basename "$package_file")"

echo "==> Uploading $package_name to $ssh_host:/tmp/"
scp "$package_file" "$project_root/scripts/deploy/activate-release.sh" "$ssh_host:/tmp/"

echo
echo "==> Uploaded. To activate it, run:"
echo "    ssh $ssh_host 'bash /tmp/activate-release.sh $target_env /tmp/$package_name'"
