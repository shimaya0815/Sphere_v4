import axios from 'axios';

// フロントエンドの開発環境を検出して適切なベースURLを設定
// 開発モード: setupProxy.js が転送するので空でOK
// Docker環境: REACT_APP_API_URL を使用（コンテナ名）
// その他: ローカルホストへのフォールバック
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return ''; // 開発モードでは空のURLを使用（プロキシが処理）
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:8000';
};

const API_URL = getBaseUrl();

// 最小限のログ出力
console.log('API Configuration:', {
  baseUrl: API_URL,
  environment: process.env.NODE_ENV
});

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60秒タイムアウト
  withCredentials: false, // CORSのクッキー送信は無効化
});

// リクエストインターセプター: 認証トークン追加
apiClient.interceptors.request.use(
  (config) => {
    // デモトークンを削除し、実際のトークンのみを使用
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    // 開発モードのみ詳細なログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// レスポンスインターセプター: エラー処理
apiClient.interceptors.response.use(
  (response) => {
    // 開発モードのみ詳細なログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} for ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // エラー情報のログ出力（簡潔に）
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ API Error: ${error.response?.status || 'Network Error'} for ${error.config?.url}`, 
        error.response?.data || error.message);
    }
    
    // 認証エラー処理
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
