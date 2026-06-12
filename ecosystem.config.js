module.exports = {
  apps: [{
    name: "ai-novel",
    cwd: "/root/ai-novel-lite",
    script: ".next/standalone/server.js",
    env: {
      NODE_ENV: "production",
      DATA_DIR: "/root/ai-novel-lite",
      DEEPSEEK_API_KEY: "d16abc69b23a6d4d2fc85d50984fd453.X60YYcqWhG8k6LXI",
      LLM_BASE_URL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      LLM_MODEL: "glm-4-long",
      SMTP_HOST: "smtp.qq.com",
      SMTP_PORT: "465",
      SMTP_USER: "50541358@qq.com",
      SMTP_PASS: "eyycpasuftkmcabj",
      ADMIN_EMAIL: "50541358@qq.com",
    }
  }]
};
