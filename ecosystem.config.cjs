// PM2設定ファイル - タスクカレンダーアプリ

module.exports = {
  apps: [
    {
      name: 'task-calendar',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=task-calendar-db --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false, // ファイル監視は無効（wranglerが対応）
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 3,
      restart_delay: 1000
    }
  ]
}