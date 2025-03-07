const { createProxyMiddleware } = require('http-proxy-middleware');

// バックエンドのホスト設定 - Docker環境とローカル開発の両方をサポート
const getBackendHost = () => {
  // REACT_APP_API_URL環境変数があればそれを使用（Docker環境向け）
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // デフォルトはlocalhost
  return 'http://localhost:8000';
};

const BACKEND_HOST = getBackendHost();
const WS_HOST = process.env.REACT_APP_WS_URL || 'http://localhost:8001';

module.exports = function(app) {
  // シンプルな起動メッセージ
  console.log(`Sphere Frontend Proxy: Backend -> ${BACKEND_HOST}, WebSocket -> ${WS_HOST}`);

  // APIプロキシの共通設定
  const createApiProxy = (pathPrefix) => {
    return createProxyMiddleware({
      target: BACKEND_HOST,
      changeOrigin: true,
      secure: false,
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
      pathRewrite: {
        // /authプレフィックスの場合はそのまま、/apiプレフィックスの場合もそのまま転送
        [`^${pathPrefix}`]: pathPrefix
      },
      onProxyReq: (proxyReq, req, res) => {
        // 開発中は最小限のログを出力
        if (process.env.NODE_ENV === 'development') {
          console.log(`→ ${req.method} ${req.url} → ${BACKEND_HOST}${proxyReq.path}`);
        }
        
        // フロントエンドのlocalStorageからトークンを取得
        // 注意: プロキシではlocalStorageにアクセスできないため、
        // フロントエンドのRequest Interceptorでトークンを設定します
      },
      onProxyRes: (proxyRes, req, res) => {
        // 開発中は最小限のログを出力
        if (process.env.NODE_ENV === 'development' && proxyRes.statusCode >= 400) {
          console.log(`← ${proxyRes.statusCode} ${req.method} ${req.url}`);
        }
      },
      onError: (err, req, res) => {
        console.error(`Error: ${req.method} ${req.url} - ${err.message}`);
        
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
  
  // 認証用URLパターンのプロキシ設定
  app.use('/auth', createApiProxy('/auth'));

  // WebSocketプロキシ設定 - 強化版
  app.use('/ws', createProxyMiddleware({
    target: WS_HOST,
    changeOrigin: true,
    ws: true, 
    secure: false, // 開発環境ではSSL検証をスキップ
    pathRewrite: { '^/ws': '/ws' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🔌 WebSocketプロキシ: ${req.method} ${req.url} → ${WS_HOST}${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`🔍 WebSocketレスポンス: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ WebSocketプロキシエラー: ${req.method} ${req.url} - ${err.message}`);
      // エラーがあればブラウザに転送
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'WebSocketプロキシエラー', message: err.message }));
      }
    }
  }));
  
  // チャットやタスクのWebSocketアクセスを直接プロキシにも対応（/wsプレフィックスなし）
  app.use('/chat', createProxyMiddleware({
    target: WS_HOST,
    changeOrigin: true,
    ws: true,
    secure: false,
    pathRewrite: { '^/chat': '/ws/chat' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🔌 チャットプロキシ: ${req.method} ${req.url} → ${WS_HOST}/ws${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ チャットプロキシエラー: ${err.message}`);
    }
  }));
  
  app.use('/tasks', createProxyMiddleware({
    target: WS_HOST,
    changeOrigin: true,
    ws: true,
    secure: false,
    pathRewrite: { '^/tasks': '/ws/tasks' },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🔌 タスクプロキシ: ${req.method} ${req.url} → ${WS_HOST}/ws${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ タスクプロキシエラー: ${err.message}`);
    }
  }));
};