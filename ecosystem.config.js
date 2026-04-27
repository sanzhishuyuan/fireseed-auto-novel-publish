module.exports = {
  apps: [{
    name: 'ai-novel',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    cwd: '/root/ai-novel',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/ai-novel-error.log',
    out_file: '/var/log/ai-novel-out.log'
  }]
};
