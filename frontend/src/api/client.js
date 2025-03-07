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

// CancelTokenとisCancel関数をクライアントに直接追加
const apiClient = {};
apiClient.CancelToken = axios.CancelToken;
apiClient.isCancel = axios.isCancel;

// エラーレート制限を追加
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5;
const requestQueue = [];

// リクエストスロットリング関数
const executeQueuedRequests = () => {
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const { config, resolve, reject } = requestQueue.shift();
    activeRequests++;
    
    axios(config)
      .then(response => {
        activeRequests--;
        executeQueuedRequests();
        resolve(response);
      })
      .catch(error => {
        activeRequests--;
        executeQueuedRequests();
        reject(error);
      });
  }
};

// axiosインスタンスをapiClientに拡張
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // より長いタイムアウト：30秒
  withCredentials: false, // CORSのクッキー送信は無効化
  
  // リクエスト制限
  maxContentLength: 5000000, // 最大5MB
  maxRedirects: 5,
  maxBodyLength: 5000000,
});

// axiosインスタンスのメソッドをapiClientにコピー
Object.setPrototypeOf(apiClient, axiosInstance);
Object.assign(apiClient, axiosInstance);

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
