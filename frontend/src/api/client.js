import axios from 'axios';

// フロントエンドの開発環境を検出して適切なベースURLを設定
// Docker環境では絶対URLを使用し、その他の環境では相対パスを使用
const getBaseUrl = () => {
  // Docker環境の場合（ホスト名が'localhost'または'127.0.0.1'の場合）
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // 同一オリジンでリクエストするため、ホストのURLをそのまま使用
    return `${window.location.protocol}//${window.location.host}`;
  }
  // 本番環境などその他の場合
  return window.location.origin;
};

const API_URL = getBaseUrl();

// 設定の詳細ログ出力
console.log('API Configuration:', {
  baseUrl: API_URL,
  fullUrl: `${API_URL}/api/`,
  environment: process.env.NODE_ENV,
  hostname: window.location.hostname
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
  timeout: 180000, // 3分のタイムアウト（大幅に延長）
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
      
      // 認証関連リクエストのボディデータをログ出力（機密情報は除く）
      if (config.url && (config.url.includes('/auth/token/login/') || config.url.includes('/auth/users/'))) {
        try {
          const requestData = JSON.parse(config.data || '{}');
          // パスワードを隠してログ出力
          const sanitizedData = { ...requestData };
          if (sanitizedData.password) {
            sanitizedData.password = '********';
          }
          console.log('Auth request data:', sanitizedData);
          console.log('Request headers:', config.headers);
        } catch (e) {
          console.log('Could not parse request data:', config.data);
        }
      }
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
