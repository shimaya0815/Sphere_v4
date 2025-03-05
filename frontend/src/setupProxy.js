const { createProxyMiddleware } = require('http-proxy-middleware');

// バックエンドのホスト - ブラウザが実際にアクセスできるアドレスを使用
// Docker内では 'backend' はコンテナ名を解決できるが、
// ブラウザ（クライアント）からは localhost にアクセスする必要がある
const BACKEND_HOST = 'http://localhost:8000';

module.exports = function(app) {
  // デバッグ用のエンドポイント
  app.use('/api-debug', (req, res) => {
    res.send({
      message: 'API proxy debug endpoint',
      url: req.url,
      headers: req.headers,
      method: req.method,
      backendHost: BACKEND_HOST
    });
  });

  console.log('*** Setting up API proxy configuration ***');
  console.log('Backend host:', BACKEND_HOST);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  
  // 全てのAPIリクエスト用のプロキシ設定 - 単一のハンドラー
  const apiProxyOptions = {
    target: BACKEND_HOST, 
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    onProxyReq: function(proxyReq, req, res) {
      console.log(`[PROXY] Request: ${req.method} ${req.originalUrl}`);
      console.log(`[PROXY] Forwarding to: ${BACKEND_HOST}${proxyReq.path}`);
      
      // Add token for development
      const token = '039542700dd3bcf213ff82e652f6b396d2775049';
      proxyReq.setHeader('Authorization', `Token ${token}`);
    },
    onError: function(err, req, res) {
      console.error(`[PROXY ERROR] ${req.method} ${req.originalUrl}:`, err.message);
      
      if (res.writeHead && !res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Proxy error', 
          message: err.message,
          url: req.originalUrl,
          target: BACKEND_HOST
        }));
      }
    }
  };

  // /api プレフィックスのリクエスト
  app.use('/api', createProxyMiddleware({...apiProxyOptions}));
  
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
        ...apiProxyOptions,  // 共通設定を使用
        pathRewrite: {
          [`^${endpoint}`]: `/api${endpoint}`,  // /tasks -> /api/tasks のように書き換え
        },
        onProxyReq: function(proxyReq, req, res) {
          const originalPath = req.url;
          console.log(`[PATH REWRITE] ${endpoint}${originalPath} -> ${proxyReq.path}`);
          console.log(`[PROXY] Forwarding to: ${BACKEND_HOST}${proxyReq.path}`);
          
          // Add token for development
          const token = '039542700dd3bcf213ff82e652f6b396d2775049';
          proxyReq.setHeader('Authorization', `Token ${token}`);
        }
      })
    );
  });
  
  // WebSocketサーバー用プロキシ設定
  const wsTarget = 'http://localhost:8001';
  console.log('WebSocket target:', wsTarget);
  app.use(
    '/ws',
    createProxyMiddleware({
      target: wsTarget,
      changeOrigin: true,
      secure: false,
      ws: true, // WebSocketをプロキシする
      pathRewrite: {
        '^/ws': '', // /ws プレフィックスを削除
      },
      onError: function(err, req, res) {
        console.error('[WS PROXY ERROR]:', err.message);
        console.error(err.stack || err);
      },
      logLevel: 'debug',
    })
  );

  // 特別なコンテンツ用プロキシ - Hot Module Replacement (HMR)用
  app.use(
    ['*.hot-update.json', '*.hot-update.js'],
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      logLevel: 'debug',
      onError: function(err, req, res) {
        console.error('[HMR PROXY ERROR]:', err.message);
      },
    })
  );

  // Static assets fallback
  app.use(
    ['/favicon.ico', '/logo192.png', '/manifest.json', '/static/*'],
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
        console.error('[STATIC PROXY ERROR]:', err.message);
      },
    })
  );
};