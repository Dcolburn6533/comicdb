// PM2 process manager config — run with: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'comicdb',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
