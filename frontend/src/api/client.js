import axios from 'axios';

// Create axios instance with base URL
// ブラウザではlocalhostを使用する
const isServer = typeof window === 'undefined';
const API_URL = isServer ? 
                'http://backend:8000/api' : 
                'http://localhost:8000/api';

console.log('Using API URL:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // デフォルトタイムアウトを設定
  timeout: 15000, // 15秒
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // 最新のトークンで更新
    const demoToken = '23724bba110cc61ee5fd048570dac24e27948f32';
    const token = localStorage.getItem('token') || demoToken;
    if (token) {
      config.headers.Authorization = `Token ${token}`;
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
    return response;
  },
  (error) => {
    console.error("API Error:", error.response?.status, error.response?.data);
    
    const { response } = error;
    
    if (response && response.status === 401) {
      // If unauthorized, clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
