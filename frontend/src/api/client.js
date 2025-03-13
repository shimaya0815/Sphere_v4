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
  timeout: 45000, // より長いタイムアウト：45秒（Socket.IOと一致）
  withCredentials: false, // CORSのクッキー送信は無効化
  
  // リクエスト制限を緩和
  maxContentLength: 10000000, // 最大10MB
  maxRedirects: 5,
  maxBodyLength: 10000000,
  retryConfig: { retries: 2 },  // 失敗時に自動リトライ
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
    // エラー情報の詳細なログ出力
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ API Error: ${error.response?.status || 'Network Error'} for ${error.config?.url}`);
      
      // レスポンスデータの詳細なデバッグ情報
      if (error.response && error.response.data) {
        console.error('Error response data (raw):', JSON.stringify(error.response.data));
        console.error('Error response type:', typeof error.response.data);
        
        try {
          // エラーデータの詳細な分析
          const errorData = error.response.data;
          console.error('Error data keys:', Object.keys(errorData));
          
          // DRFがフィールドごとのエラーを返す場合
          if (typeof errorData === 'object' && !Array.isArray(errorData)) {
            console.log('Detailed field errors:');
            Object.entries(errorData).forEach(([field, errors]) => {
              console.log(`  ${field}: ${Array.isArray(errors) ? errors.join(', ') : JSON.stringify(errors)}`);
            });
          }
        } catch (e) {
          console.error('Error parsing error data:', e);
        }
      }
      
      // リクエストデータを表示（デバッグに役立つ）
      if (error.config && error.config.data) {
        try {
          const requestData = JSON.parse(error.config.data);
          console.log('Request data that caused the error:', requestData);
        } catch (e) {
          console.log('Request data (non-JSON):', error.config.data);
        }
      }
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
