# Base Portal — PM2 Deployment Guide

This project uses [PM2](https://pm2.keymetrics.io/) as the process manager for running the Next.js application across multiple environments.

---

## Ecosystem Config Files

Each environment has its own dedicated ecosystem configuration file located in the `ecosystem/` directory at the project root.

| File | Environment | Server Path |
|---|---|---|
| `ecosystem/ecosystem.testing.config.js` | Testing | `/var/www/base-portal.97dev.com` |
| `ecosystem/ecosystem.staging.config.js` | Staging | `/var/www/clients.basesearchmarketing.com` |
| `ecosystem/ecosystem.production.config.js` | Production | `/var/www/portal.basesearchmarketing.com` |

> The root `ecosystem.config.js` file is the default entry point and re-exports the **testing** config.

---

## Prerequisites

PM2 must be installed globally on the server:

```bash
npm install -g pm2
```

---

## Starting the Application

Use the appropriate script depending on the target environment.

```bash
# Testing
yarn run pm2:testing

# Staging
yarn run pm2:staging

# Production
yarn run pm2:production
```

Or use PM2 directly:

```bash
pm2 start ecosystem/ecosystem.testing.config.js
pm2 start ecosystem/ecosystem.staging.config.js
pm2 start ecosystem/ecosystem.production.config.js
```

---

## Restarting the Application

```bash
# Testing
yarn run pm2:restart:testing

# Staging
yarn run pm2:restart:staging

# Production
yarn run pm2:restart:production
```

---

## Stopping & Deleting the Process

```bash
# Stop the process (keeps it in PM2 list)
yarn run pm2:stop

# Remove the process from PM2 entirely
yarn run pm2:delete
```

---

## Monitoring

```bash
# View live logs
yarn run pm2:logs

# View all PM2 process statuses
yarn run pm2:status
```

---

## Saving PM2 Process List (Auto-restart on reboot)

After starting the app, run the following on the server to persist the process list across reboots:

```bash
pm2 startup
pm2 save
```

Follow the instructions printed by `pm2 startup` to register the systemd/init script.

---

## Logs

Log files are written to the `logs/` directory relative to the application `cwd` on each server:

| File | Description |
|---|---|
| `logs/output.log` | Standard output |
| `logs/error.log` | Error output |

Log entries include a timestamp in `YYYY-MM-DD HH:mm:ss` format.

---

## Configuration Summary

All environments share the following PM2 settings:

| Setting | Value |
|---|---|
| `instances` | `1` |
| `exec_mode` | `fork` |
| `PORT` | `3777` |
| `NODE_ENV` | `production` |
| `max_restarts` | `10` |
| `min_uptime` | `10s` |
| `max_memory_restart` | `512M` |
| `watch` | `false` |


# Test Cases

## Backend (Laravel)

### Run all tests
```bash
php artisan test
```

### Run payment-related tests only
```bash
php artisan test tests/Feature/Payment/ tests/Unit/
```

### Run a specific test file
```bash
php artisan test tests/Feature/Payment/CartCheckoutTest.php
```

### Run tests with code coverage
```bash
php artisan test --coverage
```

---

## Frontend (Next.js)

```bash
cd /mnt/linux-storage/projects/97thfloor/base_clients/base_portal
```

### Run all tests
```bash
npx jest
```

### Or use the package.json script
```bash
npm test
```

### Watch mode (automatically reruns tests when files change)
```bash
npm run test:watch
```

### Generate a code coverage report
```bash
npm run test:coverage
```

---

## Run Backend and Frontend Tests

Execute them in separate terminals or sequentially.

### Backend
```bash
cd /mnt/linux-storage/projects/97thfloor/base_clients/base_clients_api

php artisan test tests/Feature/Payment/ tests/Unit/ --no-coverage
```

### Frontend
```bash
cd /mnt/linux-storage/projects/97thfloor/base_clients/base_portal

npx jest --no-coverage
```