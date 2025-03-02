const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      onProxyReq: function(proxyReq, req, res) {
        // Add a token for development
        proxyReq.setHeader('Authorization', 'Token a2c83c36d098df231387436783b2690fff243c30');
      },
      onError: function(err, req, res) {
        console.error('Proxy error:', err);
      },
      logLevel: 'debug',
    })
  );
};