const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const history = require('connect-history-api-fallback');

/**
 * バックエンドのホスト設定 - Docker環境とローカル開発の両方をサポート
 */
const getBackendHost = () => {
  // REACT_APP_API_URL環境変数があればそれを使用（Docker環境向け）
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // Dockerコンテナ名を使用
  return 'http://backend:8000';
};

// バックエンドとSocket.IOサーバーのホスト設定
const BACKEND_HOST = getBackendHost();
const SOCKET_HOST = process.env.REACT_APP_WS_URL || process.env.REACT_APP_SOCKET_URL || 'http://websocket:8001';

module.exports = function(app) {
  // 起動メッセージ
  console.log(`Sphere Frontend Proxy: Backend -> ${BACKEND_HOST}, Socket.IO -> ${SOCKET_HOST}`);

  // SPAルーティングパターンの定義
  const SPA_ROUTES = [
    '/tasks/*',
    '/tasks/new',
    '/tasks/templates/*',
    '/clients/*',
    '/settings/*',
    '/profile/*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password/*'
  ];

  // SPAルーティングチェック関数
  const isSpaRoute = (url) => {
    // URLからクエリパラメータを除去
    const cleanUrl = url.split('?')[0];
    
    // 明示的なSPAルートをチェック
    for (const pattern of SPA_ROUTES) {
      if (pattern.endsWith('*')) {
        const base = pattern.slice(0, -1);
        if (cleanUrl.startsWith(base)) {
          return true;
        }
      } else if (cleanUrl === pattern) {
        return true;
      }
    }
    
    return false;
  };

  // デバッグ用ミドルウェア - すべてのリクエストをログ出力
  app.use((req, res, next) => {
    console.log(`[Debug] Incoming request: ${req.method} ${req.originalUrl}`);
    next();
  });

  // 静的アセットへのリクエストをチェックする関数
  const isStaticAsset = (url) => {
    return url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)(\?.*)?$/);
  };

  // 静的アセットの処理 - HistoryAPIFallbackをバイパス
  app.use((req, res, next) => {
    if (isStaticAsset(req.url)) {
      console.log(`[Static Asset] Bypassing history API fallback: ${req.url}`);
      return next();
    }
    next();
  });

  // API URLパターンのプロキシ設定（API関連のルートを先に処理）
  app.use('/api', createApiProxy('/api'));
  app.use('/auth', createApiProxy('/auth'));
  app.use('/chat', createApiProxy('/chat'));
  app.use('/time-management', createApiProxy('/time-management'));
  app.use('/api/tasks', createApiProxy('/api/tasks'));
  app.use('/api/users', createApiProxy('/api/users'));
  app.use('/api/clients', createApiProxy('/api/clients'));

  // WebSocketルートも先に処理
  app.use('/socket.io', createProxyMiddleware({
    target: SOCKET_HOST,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
    secure: false,
    timeout: 60000,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization"
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Socket.IO Proxy] → ${req.method} ${req.url} to ${SOCKET_HOST}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[Socket.IO Proxy] ← ${proxyRes.statusCode} ${req.method} ${req.url}`);
    },
    onError: (err, req, res) => {
      console.error(`[Socket.IO Proxy] Error: ${err.message}`);
    }
  }));
  
  app.use('/ws', createProxyMiddleware({
    target: SOCKET_HOST,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
    secure: false,
    timeout: 60000,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[WS Proxy] → ${req.method} ${req.url} to ${SOCKET_HOST}${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[WS Proxy] ← ${proxyRes.statusCode} ${req.method} ${req.url}`);
    },
    onError: (err, req, res) => {
      console.error(`[WS Proxy] Error: ${err.message}`);
    }
  }));

  // 特殊な/tasksエンドポイント処理
  app.use('/tasks', (req, res, next) => {
    const isWebSocketUpgrade = req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket';
    
    // 静的アセットの場合はそのまま通す
    if (isStaticAsset(req.url)) {
      return next();
    }
    
    // WebSocketの場合はプロキシ処理
    if (isWebSocketUpgrade) {
      const wsProxy = createProxyMiddleware({
        target: SOCKET_HOST,
        changeOrigin: true,
        ws: true,
        logLevel: 'debug',
        secure: false,
        timeout: 60000,
        pathRewrite: {
          '^/tasks': '/ws/tasks'
        }
      });
      return wsProxy(req, res, next);
    }
    
    // SPAルートの場合はhistoryAPIFallbackに任せる
    if (isSpaRoute(`/tasks${req.url}`)) {
      console.log(`[SPA Router] SPA route detected: "/tasks${req.url}", using history fallback`);
      return next();
    }
    
    // APIリクエストはバックエンドにプロキシ
    const apiProxy = createProxyMiddleware({
      target: BACKEND_HOST,
      changeOrigin: true,
      secure: false,
      timeout: 60000,
      pathRewrite: (path) => {
        const newPath = path.replace(/^\/tasks/, '/api/tasks');
        console.log(`[Tasks API Proxy] Path rewrite: ${path} → ${newPath}`);
        return newPath;
      }
    });
    
    return apiProxy(req, res, next);
  });
  
  // HistoryAPIフォールバック設定 (静的ファイルはリライトしない)
  const historyConfig = {
    disableDotRule: true, // ドット含むリクエストもリライト対象に
    verbose: true,
    htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
    rewrites: [
      // 静的アセットはリライトしない
      {
        from: /^.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)(\?.*)?$/,
        to: (context) => context.parsedUrl.pathname
      },
      // APIリクエストはリライトしない
      { 
        from: /^\/api\/.*$/, 
        to: (context) => context.parsedUrl.pathname 
      },
      { 
        from: /^\/auth\/.*$/, 
        to: (context) => context.parsedUrl.pathname 
      },
      { 
        from: /^\/socket\.io\/.*$/, 
        to: (context) => context.parsedUrl.pathname 
      },
      { 
        from: /^\/ws\/.*$/, 
        to: (context) => context.parsedUrl.pathname 
      },
      // その他のリクエストはindex.htmlにリライト
      {
        from: /^\/$/,
        to: '/index.html'
      },
      {
        from: /^\/tasks\/.*$/,
        to: '/index.html'
      },
      {
        from: /^\/login$/,
        to: '/index.html'
      },
      {
        from: /^\/register$/,
        to: '/index.html'
      },
      {
        from: /^\/clients\/.*$/,
        to: '/index.html'
      }
    ]
  };
  
  // HistoryAPIフォールバックミドルウェアを適用（SPAルーティング用）
  app.use(history(historyConfig));
};

// Djangoのバックエンドへのプロキシ設定（API, Auth）
const createApiProxy = (pathPrefix) => {
  return createProxyMiddleware({
    target: BACKEND_HOST,
    changeOrigin: true,
    secure: false,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
    timeout: 60000, // 60秒のタイムアウト
    pathRewrite: {
      // パスプレフィックスをそのまま転送
      [`^${pathPrefix}`]: pathPrefix
    },
    onProxyReq: (proxyReq, req, res) => {
      // 開発中は最小限のログを出力
      if (process.env.NODE_ENV === 'development') {
        console.log(`→ API: ${req.method} ${req.url} -> ${BACKEND_HOST}${proxyReq.path}`);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // 開発中はエラーレスポンスのみログを出力
      if (process.env.NODE_ENV === 'development' && proxyRes.statusCode >= 400) {
        console.log(`← API: ${proxyRes.statusCode} ${req.method} ${req.url}`);
      }
    },
    onError: (err, req, res) => {
      console.error(`❌ API Error: ${req.method} ${req.url} - ${err.message}`);
      
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'API Connection Error', 
          message: `Could not connect to backend at ${BACKEND_HOST}`
        }));
      }
    }
  });
};