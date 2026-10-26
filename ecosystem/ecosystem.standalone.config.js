// PM2 config for releases deployed with scripts/deploy (Next.js standalone output).
// Layout on the server:
//   $APP_ROOT/releases/<release_id>/   one folder per uploaded package
//   $APP_ROOT/current -> releases/<release_id>
//   $APP_ROOT/shared/.env.<env>        runtime secrets, linked into every release as .env.production
//   $APP_ROOT/shared/logs/
// APP_ROOT and APP_PORT are exported by scripts/deploy/activate-release.sh.
const path = require("path");

const app_root = process.env.APP_ROOT || "/var/www/base-portal.97dev.com";
const app_port = process.env.APP_PORT || 3777;

module.exports = {
  apps: [
    {
      name: "base-portal",
      script: "server.js",
      cwd: path.join(app_root, "current"),
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: app_port,
        HOSTNAME: "0.0.0.0",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: path.join(app_root, "shared/logs/error.log"),
      out_file: path.join(app_root, "shared/logs/output.log"),
      merge_logs: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "512M",
      watch: false,
    },
  ],
};
