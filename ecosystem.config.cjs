// PM2 ecosystem config — GE Energy
// Usage : pm2 start ecosystem.config.cjs
//         pm2 reload ge-energy --update-env
module.exports = {
  apps: [
    {
      name: "ge-energy",
      script: "dist/index.cjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
