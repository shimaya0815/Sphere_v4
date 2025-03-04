const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // APIリクエスト用プロキシ設定
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:8000',
      changeOrigin: true,
      onProxyReq: function(proxyReq, req, res) {
        // Add a token for development
        // Note: localStorage is not available in Node.js environment
        // The real token will be sent from the browser in the request
        if (req.headers.authorization) {
          // Pass through existing authorization header
          proxyReq.setHeader('Authorization', req.headers.authorization);
        } else {
          // Set default token for development
          proxyReq.setHeader('Authorization', 'Token 23724bba110cc61ee5fd048570dac24e27948f32');
        }
      },
      onError: function(err, req, res) {
        console.error('API Proxy error:', err);
      },
      logLevel: 'debug',
    })
  );
  
  // WebSocketサーバー用プロキシ設定
  app.use(
    '/ws',
    createProxyMiddleware({
      target: process.env.REACT_APP_WS_URL || 'http://localhost:8001',
      changeOrigin: true,
      ws: true, // WebSocketをプロキシする
      pathRewrite: {
        '^/ws': '', // /ws プレフィックスを削除
      },
      onError: function(err, req, res) {
        console.error('WebSocket Proxy error:', err);
      },
      logLevel: 'debug',
    })
  );

  // Static assets fallback
  app.use(
    '/',
    createProxyMiddleware(
      ['/favicon.ico', '/logo192.png', '/manifest.json', '/static/**'],
      {
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: path => path,
        router: {
          '/favicon.ico': `${__dirname}/../public/favicon.ico`,
          '/logo192.png': `${__dirname}/../public/logo192.png`,
          '/manifest.json': `${__dirname}/../public/manifest.json`,
        },
        onError: function(err, req, res) {
          console.error('Static assets proxy error:', err);
        },
      }
    )
  );
};