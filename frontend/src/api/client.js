import axios from 'axios';
import { getAuthToken, clearAuthToken } from '../utils/auth';

// 設定の詳細ログ出力
console.log('API Configuration:', {
  environment: process.env.NODE_ENV,
  hostname: window.location.hostname
});

// Docker環境でのURLを設定
const getBaseUrl = () => {
  // 環境変数またはwindow.ENVから設定を取得
  const envApiUrl = process.env.REACT_APP_API_URL || (window.ENV && window.ENV.REACT_APP_API_URL);
  if (envApiUrl) {
    console.log('Using environment API URL:', envApiUrl);
    return envApiUrl;
  }
  
  // ホスト名に基づいてベースURLを決定
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Detected localhost environment, using localhost:8000');
    return 'http://localhost:8000';
  }
  
  // 相対URLを使用（同一オリジンに対するリクエスト）
  console.log('Using relative URL for API requests');
  return '';
};

// ベースURLを取得
const baseURL = getBaseUrl();
console.log('Creating API client with baseURL:', baseURL);

// リクエスト、レスポンスのインターセプター設定済みの axios インスタンス
const apiClient = axios.create({
  baseURL: baseURL,
  timeout: 30000, // 30秒
  headers: {
    'Content-Type': 'application/json',
  },
});

// デバッグモード（開発環境のみ）
const DEBUG = process.env.NODE_ENV === 'development';

// リクエストインターセプター
apiClient.interceptors.request.use(
  (config) => {
    // リクエストのデバッグログ
    if (DEBUG) {
      console.log('API Request:', config.method?.toUpperCase(), config.url, config.params || {});
      console.log('Full URL:', `${config.baseURL || ''}${config.url}`);
    }
    
    // 認証トークンをヘッダーに追加
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('API Request error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => {
    // レスポンスのデバッグログ
    if (DEBUG) {
      console.log('API Response:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    // エラーのデバッグログ
    if (DEBUG) {
      console.error('API Response error:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        console.error('Headers:', error.response.headers);
      } else if (error.request) {
        console.error('Request made but no response received');
        console.error(error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
    }
    
    // 認証エラー（401）の場合はログアウト
    if (error.response && error.response.status === 401) {
      // ログイン・ログアウトページへのリクエストでない場合のみログアウト処理を行う
      const isAuthRequest = error.config.url?.includes('auth') || false;
      if (!isAuthRequest) {
        console.warn('Authentication error detected, logging out...');
        clearAuthToken();
        
        // 現在のURLを保存してからログインページへリダイレクト
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
          window.location.href = '/login';
        }
      }
    }
    
    // 400 Bad Request エラーの適切な処理
    if (error.response && error.response.status === 400) {
      // エラーメッセージの整形
      let errorMessage = 'リクエストが不正です';
      const data = error.response.data;
      
      if (data) {
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object') {
          // フィールドエラーをまとめる
          const messages = [];
          
          Object.entries(data).forEach(([field, errors]) => {
            if (Array.isArray(errors)) {
              messages.push(`${field}: ${errors.join(', ')}`);
            } else if (typeof errors === 'string') {
              messages.push(`${field}: ${errors}`);
            }
          });
          
          if (messages.length > 0) {
            errorMessage = messages.join('\n');
          }
        }
      }
      
      // 構造化されたエラー情報を含めて返す
      error.formattedMessage = errorMessage;
      error.fieldErrors = data && typeof data === 'object' ? data : null;
    }
    
    // レート制限エラー（429）の処理
    if (error.response && error.response.status === 429) {
      console.warn('Rate limit exceeded. Please try again later.');
      
      // リトライ情報があれば取得
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        console.info(`Retry after ${retryAfter} seconds`);
      }
    }
    
    // ネットワークエラーの特別処理
    if (error.message === 'Network Error') {
      console.error('Network error detected. Please check your internet connection.');
      
      // オフラインモードの検知
      if (!navigator.onLine) {
        console.warn('Browser is offline. Please reconnect to the internet.');
        
        // オンラインに戻ったら通知するイベントリスナー
        window.addEventListener('online', () => {
          console.info('Browser is back online. Refreshing data...');
          // 必要に応じてデータをリフレッシュするイベントを発行
          window.dispatchEvent(new CustomEvent('app:online'));
        }, { once: true });
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
