module.exports = {
  apps: [
    {
      name: 'feedback-backend',
      script: 'src/server.js',
      cwd: '/home/narxsultan/feedback-system/backend',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
