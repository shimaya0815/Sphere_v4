const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // デバッグ用のエンドポイント
  app.use('/api-debug', (req, res) => {
    res.send({
      message: 'API proxy debug endpoint',
      url: req.url,
      headers: req.headers,
      method: req.method
    });
  });

  console.log('Setting up API proxy configuration: backend host = http://backend:8000');
  // ログ出力を追加して設定を確認
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  
  // APIリクエスト用プロキシ設定 (/api/ プレフィックス付き)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
      secure: false,
      // Djangoのルートパスには '/api' が含まれているのでそのまま使用
      logLevel: 'debug',
      onProxyReq: function(proxyReq, req, res) {
        console.log(`Proxying request from: ${req.originalUrl}`);
        console.log(`Proxying request to: ${this.target}${proxyReq.path}`);
        
        // Add token for development
        const token = '039542700dd3bcf213ff82e652f6b396d2775049';
        proxyReq.setHeader('Authorization', `Token ${token}`);
      },
      onError: function(err, req, res) {
        console.error('API Proxy error:', err);
        console.error('Request URL:', req.url);
        
        if (res.writeHead && !res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
        }
      }
    })
  );
  
  // APIエンドポイントのデバッグ用に、受信したリクエストを表示するミドルウェアを追加
  app.use('/api', (req, res, next) => {
    console.log('[API Proxy Debug] Received request:', {
      originalUrl: req.originalUrl,
      url: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '****REDACTED****' : undefined
      }
    });
    next();
  });

  // 以下のエンドポイントは /api プレフィックスなしでもアクセス可能にするためのプロキシ
  const additionalEndpoints = [
    '/tasks',
    '/business',
    '/clients',
    '/chat',
    '/wiki',
    '/time-management'
  ];
  
  // 各エンドポイントをプロキシ設定
  additionalEndpoints.forEach(endpoint => {
    app.use(
      endpoint,
      createProxyMiddleware({
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
        pathRewrite: {
          [`^${endpoint}`]: `/api${endpoint}`,  // /tasks -> /api/tasks のように書き換え
        },
        logLevel: 'debug',
        onProxyReq: function(proxyReq, req, res) {
          const originalPath = req.url;
          console.log(`Rewriting path from: ${endpoint}${originalPath}`);
          console.log(`New path after rewrite: ${proxyReq.path}`);
          console.log(`Proxying to: ${this.target}${proxyReq.path}`);
          
          // Add token for development
          const token = '039542700dd3bcf213ff82e652f6b396d2775049';
          proxyReq.setHeader('Authorization', `Token ${token}`);
        },
        onError: function(err, req, res) {
          console.error(`API Proxy error (${endpoint}):`, err);
          console.error('Request URL:', req.url);
          
          if (res.writeHead && !res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
          }
        }
      })
    );
  });
  
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