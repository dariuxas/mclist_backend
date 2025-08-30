module.exports = {
  apps: [{
    name: 'api-pax-lt',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '5G',
    env: {
      NODE_ENV: 'production',
      PORT: 8000,
      HOST: '127.0.0.1'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};