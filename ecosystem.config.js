module.exports = {
  apps: [
    {
      name: 'devops',
      script: 'server/index.js',
      cwd: '/home/arx-app/backends/devops',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      watch: false,
      max_memory_restart: '512M',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 4115
      }
    }
  ]
};