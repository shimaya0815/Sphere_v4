import axios from 'axios';

// Create axios instance with base URL
// プロキシ経由で接続するか、環境変数のURLを使用
const API_URL = process.env.NODE_ENV === 'development' ? 
                (process.env.REACT_APP_API_URL || 'http://backend:8000/api') : 
                '/api';

console.log('Using API URL:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // 開発環境用のデモトークン（本番環境では実際の認証を使用）
    const demoToken = 'a2c83c36d098df231387436783b2690fff243c30';
    const token = localStorage.getItem('token') || demoToken;
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
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