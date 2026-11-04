# Deploy scripts

Scripts to build, upload and activate releases of `base_portal` (Next.js standalone, run with PM2).

The flow has three steps:

| Step | Script | Runs on |
| --- | --- | --- |
| 1. Build the package | `build-package.sh` | Your machine |
| 2. Upload the package | `upload-package.sh` | Your machine |
| 3. Activate the release | `activate-release.sh` | The server (via SSH) |

All commands below are run from the project root (`base_portal/`).

## Environments

| Environment | Env file (local) | SSH host | App folder on the server |
| --- | --- | --- | --- |
| `testing` | `.env.testing` | `base-clients-testing` | `/var/www/base-portal.97dev.com` |
| `staging` | `.env.staging` | `base-clients-prod` | `/var/www/clients.basesearchmarketing.com` |
| `production` | `.env.production` | `base-clients-prod` | `/var/www/portal.basesearchmarketing.com` |

The SSH hosts are aliases from `~/.ssh/config`.

---

# Testing

- SSH host: `base-clients-testing`
- App folder: `/var/www/base-portal.97dev.com`
- Local env file: `.env.testing`

### Deploy

```bash
# 1. Build
scripts/deploy/build-package.sh testing

# 2. Upload
scripts/deploy/upload-package.sh testing

# 3. Activate the newest package
ssh base-clients-testing 'bash /var/www/base-portal.97dev.com/deploy/activate-release.sh testing'
```

### Build options

```bash
# Build without reinstalling dependencies
SKIP_INSTALL=1 scripts/deploy/build-package.sh testing

# Build pointing to a local API (deploy flow test only)
ALLOW_LOCAL_API=1 scripts/deploy/build-package.sh testing
```

### Upload options

```bash
# Upload a specific package
scripts/deploy/upload-package.sh testing deploy/base-portal-testing-20261104-101500.tar.gz

# Upload and overwrite the runtime env on the server (shared/.env.testing)
UPLOAD_ENV=1 scripts/deploy/upload-package.sh testing

# Upload without touching the runtime env on the server
UPLOAD_ENV=0 scripts/deploy/upload-package.sh testing
```

### Release management

```bash
# Activate a specific package
ssh base-clients-testing 'bash /var/www/base-portal.97dev.com/deploy/activate-release.sh testing /var/www/base-portal.97dev.com/deploy/base-portal-testing-20261104-101500.tar.gz'

# List releases (the active one is marked with *)
ssh base-clients-testing 'bash /var/www/base-portal.97dev.com/deploy/activate-release.sh testing --list'

# Roll back to the previous release
ssh base-clients-testing 'bash /var/www/base-portal.97dev.com/deploy/activate-release.sh testing --rollback'
```

---

# Production

- SSH host: `base-clients-prod`
- App folder: `/var/www/portal.basesearchmarketing.com`
- Local env file: `.env.production`

### Deploy

```bash
# 1. Build
scripts/deploy/build-package.sh production

# 2. Upload
scripts/deploy/upload-package.sh production

# 3. Activate the newest package
ssh base-clients-prod 'bash /var/www/portal.basesearchmarketing.com/deploy/activate-release.sh production'
```

### Build options

```bash
# Build without reinstalling dependencies
SKIP_INSTALL=1 scripts/deploy/build-package.sh production
```

Do not use `ALLOW_LOCAL_API=1` for production. `NEXT_PUBLIC_API_BASE_URL` in `.env.production` must point to the real API.

### Upload options

```bash
# Upload a specific package
scripts/deploy/upload-package.sh production deploy/base-portal-production-20261104-101500.tar.gz

# Upload and overwrite the runtime env on the server (shared/.env.production)
UPLOAD_ENV=1 scripts/deploy/upload-package.sh production

# Upload without touching the runtime env on the server
UPLOAD_ENV=0 scripts/deploy/upload-package.sh production
```

### Release management

```bash
# Activate a specific package
ssh base-clients-prod 'bash /var/www/portal.basesearchmarketing.com/deploy/activate-release.sh production /var/www/portal.basesearchmarketing.com/deploy/base-portal-production-20261104-101500.tar.gz'

# List releases (the active one is marked with *)
ssh base-clients-prod 'bash /var/www/portal.basesearchmarketing.com/deploy/activate-release.sh production --list'

# Roll back to the previous release
ssh base-clients-prod 'bash /var/www/portal.basesearchmarketing.com/deploy/activate-release.sh production --rollback'

# Keep 10 releases instead of 5
ssh base-clients-prod 'KEEP_RELEASES=10 bash /var/www/portal.basesearchmarketing.com/deploy/activate-release.sh production'
```

---

# Script reference

Parameters and options of each script. They are the same for every environment.

## 1. `build-package.sh`

Builds the Next.js standalone output on your machine and packs it into `deploy/base-portal-<env>-<release_id>.tar.gz`. The `release_id` is the build timestamp (`YYYYMMDD-HHMMSS`).

### Usage

```bash
scripts/deploy/build-package.sh <testing|staging|production>
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<env>` | Yes | Target environment: `testing`, `staging` or `production`. |

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `SKIP_INSTALL=1` | `0` | Skips `pnpm install` and reuses the current `node_modules`. |
| `ALLOW_LOCAL_API=1` | `0` | Allows an empty or `localhost` / `127.0.0.1` `NEXT_PUBLIC_API_BASE_URL`. Only for testing the deploy flow. |

### What it does

1. Loads `.env.<env>` (required, must not be empty) and `.env.<env>.local` if it exists. `NEXT_PUBLIC_*` values are baked into the build.
2. Exports as empty any key that only exists in `.env`, `.env.local`, `.env.production` or `.env.production.local`, so values from another environment never leak into the package.
3. Warns about keys from `.env.example` that are empty or missing.
4. Fails if `NEXT_PUBLIC_API_BASE_URL` is empty or points to localhost (unless `ALLOW_LOCAL_API=1`).
5. Runs `pnpm install` (unless `SKIP_INSTALL=1`) and `pnpm build`.
6. Packs `.next/standalone`, `.next/static`, `public/`, `ecosystem.standalone.config.js`, `activate-release.sh` and a `RELEASE_INFO` file. Local `.env*` files are removed from the package.

### Requirements

- `.env.<env>` exists with the values for that environment (see `.env.example`).
- `output: "standalone"` is set in `next.config.ts`.
- The build machine has the same CPU architecture as the server (checked later by `activate-release.sh`).

---

## 2. `upload-package.sh`

Uploads a package and `activate-release.sh` to `<APP_ROOT>/deploy/` on the server. It also uploads `.env.<env>` as the runtime env file (`<APP_ROOT>/shared/.env.<env>`) when the server does not have it yet.

### Usage

```bash
scripts/deploy/upload-package.sh <testing|staging|production> [package.tar.gz]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<env>` | Yes | Target environment: `testing`, `staging` or `production`. |
| `[package.tar.gz]` | No | Path to a specific package. If omitted, the newest `deploy/base-portal-<env>-*.tar.gz` is used. |

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `DEPLOY_SSH_HOST` | `base-clients-testing` (testing), `base-clients-prod` (staging, production) | SSH alias to connect to. |
| `APP_ROOT` | See the environments table | Remote app folder. |
| `UPLOAD_ENV` | Empty (auto) | Empty: uploads `.env.<env>` only if it is missing on the server. `1`: always uploads it (overwrites the server copy). `0`: never uploads it. |

When it finishes, it prints the exact `ssh` command to activate the release.

---

## 3. `activate-release.sh`

Runs **on the server**. Extracts a package into `<APP_ROOT>/releases/<release_id>`, points the `current` symlink to it and restarts the PM2 app `base-portal`. If the app does not answer within 30 seconds (no response or HTTP 5xx), it switches back to the previous release automatically.

### Usage

```bash
activate-release.sh <testing|staging|production> [--latest | <package.tar.gz> | --rollback | --list]
```

It is usually called through SSH from your machine:

```bash
ssh <ssh_host> 'bash <APP_ROOT>/deploy/activate-release.sh <env> [action]'
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<env>` | Yes | Target environment: `testing`, `staging` or `production`. |
| `--latest` | No (default) | Activates the newest `base-portal-<env>-*.tar.gz` in `<APP_ROOT>/deploy/`. |
| `<package.tar.gz>` | No | Activates a specific package (full path on the server). |
| `--rollback` | No | Goes back to the release before the active one. |
| `--list` | No | Lists the releases. The active one is marked with `*`. |

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `APP_ROOT` | See the environments table | App folder on the server. |
| `APP_PORT` | `3777` | Port used for the health check. |
| `KEEP_RELEASES` | `5` | Number of releases to keep. Older ones are deleted (never the active one). |

### Checks before activating

The script stops with an error if:

- `pm2`, `node` or `curl` is not installed.
- The runtime env file `<APP_ROOT>/shared/.env.<env>` is missing (an older `shared/.env.production` is used as a fallback, with a warning).
- The package was built for a different environment.
- The package was built on a different CPU architecture than the server.
- Node.js is older than version 20.
- A release with the same `release_id` already exists.

After a successful activation, the uploaded package is deleted from `<APP_ROOT>/deploy/`.

### Server layout

```
<APP_ROOT>/
├── current -> releases/<release_id>   # active release (symlink)
├── releases/
│   └── <release_id>/
│       ├── .env.production -> ../../shared/.env.<env>
│       └── logs -> ../../shared/logs
├── shared/
│   ├── .env.<env>                     # runtime env (e.g. STRIPE_SECRET_KEY)
│   └── logs/
└── deploy/                            # uploaded packages waiting to be activated
```

---

## Troubleshooting

| Error | Fix |
| --- | --- |
| `.env.<env> not found or empty` | Create `.env.<env>` in the project root with the values for that environment. |
| `NEXT_PUBLIC_API_BASE_URL is ''` or points to localhost | Set the real API URL in `.env.<env>`. |
| `no package found for '<env>'` | Run `build-package.sh <env>` first. |
| `missing <APP_ROOT>/shared/.env.<env>` | Run `upload-package.sh <env>` (or with `UPLOAD_ENV=1`). |
| `package was built on <arch> but this server is <arch>` | Build on a machine with the same architecture as the server. |
| `release <id> already exists` | That package was already activated. Build a new one. |
| App did not start correctly | Check the PM2 logs printed by the script. The previous release is restored automatically. |
