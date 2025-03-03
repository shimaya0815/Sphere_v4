const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // APIリクエスト用プロキシ設定
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
      onProxyReq: function(proxyReq, req, res) {
        // Add a token for development
        proxyReq.setHeader('Authorization', 'Token 23724bba110cc61ee5fd048570dac24e27948f32');
      },
      onError: function(err, req, res) {
        console.error('API Proxy error:', err);
      },
      logLevel: 'warn',
    })
  );
  
  // WebSocketサーバー用プロキシ設定
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://websocket:8001',
      changeOrigin: true,
      ws: true, // WebSocketをプロキシする
      pathRewrite: {
        '^/ws': '/ws', // パスのリライト（必要に応じて）
      },
      onError: function(err, req, res) {
        console.error('WebSocket Proxy error:', err);
      },
      logLevel: 'warn',
    })
  );
};