const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // APIリクエスト用プロキシ設定
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://backend:8000',
      changeOrigin: true,
      secure: false,
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
        console.error(err.stack || err);
        
        // エラーがあった場合はそれをレスポンスとして返す
        if (res.writeHead && !res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
        }
      },
      logLevel: 'debug',
    })
  );
  
  // WebSocketサーバー用プロキシ設定
  app.use(
    '/ws',
    createProxyMiddleware({
      target: process.env.REACT_APP_WS_URL || 'http://websocket:8001',
      changeOrigin: true,
      secure: false,
      ws: true, // WebSocketをプロキシする
      pathRewrite: {
        '^/ws': '', // /ws プレフィックスを削除
      },
      onError: function(err, req, res) {
        console.error('WebSocket Proxy error:', err);
        console.error(err.stack || err);
      },
      logLevel: 'debug',
    })
  );

  // Static assets fallback
  app.use(
    ['/favicon.ico', '/logo192.png', '/manifest.json'],
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: path => path,
      router: {
        '/favicon.ico': '/public/favicon.ico',
        '/logo192.png': '/public/logo192.png',
        '/manifest.json': '/public/manifest.json',
      },
      onError: function(err, req, res) {
        console.error('Static assets proxy error:', err);
      },
    })
  );
};