module.exports = {
  apps: [
    {
      name: 'rrrbazar-api',
      cwd: './rrrbazar-api',
      script: 'node',
      args: 'build/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      }
    },
    {
      name: 'rrrbazar-admin',
      cwd: './rrrbazar-admin',
      script: 'npx',
      args: 'serve -s build -l 3001',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'rrrbazar-client',
      cwd: './rrrbazar-client',
      script: 'npm',
      args: 'start -- -p 3003',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
