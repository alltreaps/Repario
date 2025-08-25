module.exports = {
  apps: [
    {
      name: 'repario-backend-fork',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};
