// PM2 configuration for ARise EchoCards (Cloudflare Pages dev)
module.exports = {
  apps: [
    {
      name: 'arise-echocards',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 5
    }
  ]
}
