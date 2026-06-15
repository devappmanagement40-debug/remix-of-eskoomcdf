// PM2 ecosystem config — GE Energy
// Usage :
//   pm2 start ecosystem.config.cjs          ← premier démarrage
//   pm2 reload ge-energy --update-env       ← après mise à jour
//   pm2 logs ge-energy                      ← voir les logs
//   pm2 monit                               ← monitoring

const path = require("path");
const fs   = require("fs");

const ROOT    = __dirname;
const envFile = path.join(ROOT, ".env");

// Node 20+ : on charge le .env via --env-file si le fichier existe
const nodeArgs = ["--enable-source-maps"];
if (fs.existsSync(envFile)) {
  nodeArgs.push(`--env-file=${envFile}`);
}

module.exports = {
  apps: [
    {
      name        : "ge-energy",
      script      : path.join(ROOT, "dist/index.cjs"),
      cwd         : ROOT,
      node_args   : nodeArgs.join(" "),
      instances   : 1,
      exec_mode   : "fork",
      autorestart : true,
      watch       : false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV : "production",
        PORT     : process.env.PORT || "3000",
      },
      error_file      : path.join(ROOT, "logs/pm2-error.log"),
      out_file        : path.join(ROOT, "logs/pm2-out.log"),
      log_date_format : "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
