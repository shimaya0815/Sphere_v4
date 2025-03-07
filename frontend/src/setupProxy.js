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
const SOCKET_HOST = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8001';

module.exports = function(app) {
  // シンプルな起動メッセージ
  console.log(`Sphere Frontend Proxy: Backend -> ${BACKEND_HOST}, Socket.IO -> ${SOCKET_HOST}`);

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

  // Socket.IOプロキシ設定の改善
  app.use('/socket.io', createProxyMiddleware({
    target: SOCKET_HOST,
    changeOrigin: true,
    ws: true,
    secure: false,
    logLevel: 'debug',
    // Socket.IOが正しく動作するために必要なオプション
    // Pingのタイムアウトを延長
    socketTimeoutMs: 60000,
    // WebSocketの再試行を無効化
    wsReconnectDelay: -1,
    onProxyReq: (proxyReq, req, res) => {
      const isWebSocket = req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket';
      console.log(`🔌 Socket.IOプロキシ: ${req.method} ${req.url} → ${SOCKET_HOST}${proxyReq.path} ${isWebSocket ? '(WebSocket)' : '(HTTP)'}`);
      
      // 必要なヘッダーを追加してプロキシの信頼性を向上
      if (isWebSocket) {
        proxyReq.setHeader('Connection', 'Upgrade');
        proxyReq.setHeader('Upgrade', 'websocket');
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`🔍 Socket.IOプロキシレスポンス: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ Socket.IOプロキシエラー: ${req.method} ${req.url} - ${err.message}`);
      
      // エラーがあればブラウザに転送
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Socket.IOプロキシエラー', message: err.message }));
      }
    }
  }));
  
  // 従来のWebSocketエンドポイントも引き続きサポート（後方互換性のため）
  // これにより既存のコードは変更なしで動作する
  app.use('/ws', createProxyMiddleware({
    target: SOCKET_HOST,
    changeOrigin: true,
    ws: true, 
    secure: false,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      const isWebSocket = req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket';
      console.log(`🔌 レガシーWebSocketプロキシ: ${req.method} ${req.url} → ${SOCKET_HOST}${proxyReq.path} ${isWebSocket ? '(WebSocket)' : '(HTTP)'}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ レガシーWebSocketプロキシエラー: ${req.method} ${req.url} - ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'WebSocketプロキシエラー', message: err.message }));
      }
    }
  }));
  
  // チャットやタスクの直接パスも引き続きサポート（後方互換性のため）
  app.use('/chat', createProxyMiddleware({
    target: SOCKET_HOST,
    changeOrigin: true,
    ws: true,
    secure: false,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      const isWebSocket = req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket';
      console.log(`🔌 レガシーチャットプロキシ: ${req.method} ${req.url} → ${SOCKET_HOST}${proxyReq.path} ${isWebSocket ? '(WebSocket)' : '(HTTP)'}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ レガシーチャットプロキシエラー: ${req.method} ${req.url} - ${err.message}`);
    }
  }));
  
  app.use('/tasks', createProxyMiddleware({
    target: SOCKET_HOST,
    changeOrigin: true,
    ws: true,
    secure: false,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      const isWebSocket = req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket';
      console.log(`🔌 レガシータスクプロキシ: ${req.method} ${req.url} → ${SOCKET_HOST}${proxyReq.path} ${isWebSocket ? '(WebSocket)' : '(HTTP)'}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ レガシータスクプロキシエラー: ${req.method} ${req.url} - ${err.message}`);
    }
  }));
};