module.exports = {
  apps: [{
    name: 'ai-novel',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    cwd: '/root/ai-novel-lite',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/ai-novel-error.log',
    out_file: '/var/log/ai-novel-out.log'
  }, {
    name: 'chat-bot',
    script: 'scripts/chat-bot.js',
    cwd: '/root/ai-novel-lite',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/chat-bot-error.log',
    out_file: '/var/log/chat-bot-out.log'
  }]
};
