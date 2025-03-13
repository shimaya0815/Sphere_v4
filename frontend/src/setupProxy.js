const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * バックエンドのホスト設定 - Docker環境とローカル開発の両方をサポート
 */
const getBackendHost = () => {
  // REACT_APP_API_URL環境変数があればそれを使用（Docker環境向け）
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // デフォルトはlocalhost
  return 'http://localhost:8000';
};

// バックエンドとSocket.IOサーバーのホスト設定
const BACKEND_HOST = getBackendHost();
const SOCKET_HOST = process.env.REACT_APP_WS_URL || process.env.REACT_APP_SOCKET_URL || 'http://localhost:8001';

module.exports = function(app) {
  // 起動メッセージ
  console.log(`Sphere Frontend Proxy: Backend -> ${BACKEND_HOST}, Socket.IO -> ${SOCKET_HOST}`);

  // Djangoのバックエンドへのプロキシ設定（API, Auth）
  const createApiProxy = (pathPrefix) => {
    return createProxyMiddleware({
      target: BACKEND_HOST,
      changeOrigin: true,
      secure: false,
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
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

  // API URLパターンのプロキシ設定
  app.use('/api', createApiProxy('/api'));
  
  // チャット関連エンドポイント - API prefixなしのリクエストもサポート
  app.use('/chat', createApiProxy('/chat'));
  
  // タイム管理関連エンドポイント - API prefixなしのリクエストもサポート
  app.use('/time-management', createApiProxy('/time-management'));
  
  // 認証用URLパターンのプロキシ設定
  app.use('/auth', createApiProxy('/auth'));
  
  // Socket.IOプロキシ設定 - CORS問題に対応した設定
  app.use('/socket.io', createProxyMiddleware({
    target: SOCKET_HOST,
    changeOrigin: true,
    ws: true, // WebSocketをサポート
    logLevel: 'debug',
    secure: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization"
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Socket.IO Proxy] → ${req.method} ${req.url} to ${SOCKET_HOST}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      // CORSヘッダーを追加
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      console.log(`[Socket.IO Proxy] ← ${proxyRes.statusCode} ${req.method} ${req.url}`);
    },
    onError: (err, req, res) => {
      console.error(`[Socket.IO Proxy] Error: ${err.message}`);
      
      // エラー時にもCORSヘッダーを設定して応答
      if (!res.headersSent) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Proxy Error', message: err.message}));
      }
    }
  }));
  
  // WebSocket専用のプロキシ設定 - タスクコメント等のために追加
  app.use('/ws', createProxyMiddleware({
    target: SOCKET_HOST,
    changeOrigin: true,
    ws: true, // WebSocketをサポート
    logLevel: 'debug',
    secure: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[WS Proxy] → ${req.method} ${req.url} to ${SOCKET_HOST}`);
    },
    onError: (err, req, res) => {
      console.error(`[WS Proxy] Error: ${err.message}`);
    }
  }));
  
  // タスク関連のWebSocket用プロキシパス - 'tasks/ID/' パスへの直接アクセスをサポート
  app.use('/tasks', createProxyMiddleware({
    target: SOCKET_HOST,
    changeOrigin: true,
    ws: true, // WebSocketをサポート
    logLevel: 'debug',
    secure: false,
    pathRewrite: {
      '^/tasks': '/ws/tasks' // /tasks/X/ を /ws/tasks/X/ にリダイレクト
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Tasks WS Proxy] → ${req.method} ${req.url} to ${SOCKET_HOST}${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      console.error(`[Tasks WS Proxy] Error: ${err.message}`);
    }
  }));
};