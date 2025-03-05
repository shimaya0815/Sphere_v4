import axios from 'axios';

// Create axios instance with base URL
// フロントエンドの開発サーバーからAPIリクエストを行う場合、
// setupProxy.js によってリクエストが転送されるので、
// baseURL は空文字列にする
const API_URL = '';

// デバッグ用にAPIのURLをログ出力
console.log('Using API URL for context:', API_URL);
console.log('Environment:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('Using demo token for auth:', '039542700dd3bcf213ff82e652f6b396d2775049');

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // デフォルトタイムアウトを設定
  timeout: 60000, // 60秒に延長
  // クロスドメインでCookieを送信する設定
  withCredentials: false, // CORS直接通信モードでは無効化
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // 最新のトークンで更新
    const demoToken = '039542700dd3bcf213ff82e652f6b396d2775049'; // 実際のトークンに更新
    // まずローカルストレージから取得、なければデモトークンを使用
    const token = localStorage.getItem('token') || demoToken;
    if (token) {
      config.headers.Authorization = `Token ${token}`;
      console.log('Using token for request:', token);
    } else {
      console.warn('No authentication token available');
    }
    // デバッグ用
    console.log("Sending request with headers:", JSON.stringify(config.headers));
    console.log("Request URL:", config.url);
    console.log("Request data:", typeof config.data === 'string' ? config.data : JSON.stringify(config.data));
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log("Response received:", response.status, response.data);
    console.log("Response headers:", response.headers);
    console.log("Response config:", response.config);
    return response;
  },
  (error) => {
    console.group("API Error Details:");
    console.error("API Error Status:", error.response?.status);
    console.error("API Error Data:", error.response?.data);
    console.error("API Error Config:", error.config);
    console.error("API Error Full:", error);
    if (error.response) {
      console.error("Response Headers:", error.response.headers);
    }
    console.groupEnd();
    
    const { response } = error;
    
    if (response && response.status === 401) {
      // If unauthorized, clear auth data and redirect to login
      console.warn("Unauthorized access detected - clearing credentials");
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
