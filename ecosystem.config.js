module.exports = {
  apps: [
    {
      name: "base-portal",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/kevin-manjaro/Downloads/base_portal",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3777,
      },
      // Logs
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/error.log",
      out_file: "./logs/output.log",
      merge_logs: true,
      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "512M",
      // Watch (disabled for production, enable if needed in testing)
      watch: false,
      ignore_watch: ["node_modules", ".next", "logs"],
    },
  ],
};
