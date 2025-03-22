import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import apiClient from '../api/client';

// API URLは相対パスを使用
const API_URL = '';

// デバッグ情報
console.log('AuthContext initialized with apiClient:', {
  hasApiClient: !!apiClient,
  apiClientBaseURL: apiClient.defaults?.baseURL || 'undefined'
});

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true); // 明示的にローディング状態を設定
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('business_id');
      
      // トークン情報をログに出力（デバッグ用）
      console.log('Checking auth status. Token exists:', !!token, 'Business ID exists:', !!businessId);
      
      if (token && businessId) {
        try {
          // Set default headers for axios
          axios.defaults.headers.common['Authorization'] = `Token ${token}`;
          apiClient.defaults.headers.common['Authorization'] = `Token ${token}`;
          
          console.log('Checking auth status with token:', token);
          
          // 相対パスを使用
          const userEndpoint = '/api/auth/users/me/';
          console.log('Checking auth status at URL:', userEndpoint);
          
          // apiClientを使用してユーザーデータを取得
          const response = await apiClient.get(userEndpoint);
          console.log('Auth check response:', response);
          
          setCurrentUser({
            ...response.data,
            business_id: businessId
          });
          setLoading(false); // 認証成功時にローディング終了
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('business_id');
          delete axios.defaults.headers.common['Authorization'];
          delete apiClient.defaults.headers.common['Authorization'];
          setCurrentUser(null);
          setLoading(false); // 認証失敗時にもローディング終了
        }
      } else {
        // トークンがない場合は即座にローディング終了
        console.log('No token or business ID found. User is not logged in.');
        setCurrentUser(null);
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email, password, businessId = null) => {
    setError(null);
    try {
      // ビジネスIDがある場合は含める、ない場合は新規ユーザー
      const loginData = {
        email: email,     // BusinessAuthTokenViewが期待するパラメータ
        password: password
      };
      
      if (businessId) {
        loginData.business_id = businessId;
      }
      
      // デバッグ情報を追加
      console.log('Login data being sent:', JSON.stringify(loginData, null, 2));
      
      // 相対URLを使用（Docker環境では同一オリジン）
      const loginEndpoint = '/api/auth/token/login/';
      console.log('Sending login request to:', loginEndpoint);
      
      // apiClientを使用してリクエスト送信（明示的にContent-Typeを指定）
      const response = await apiClient.post(loginEndpoint, loginData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Login response:', response);
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid response from server. Token not found.');
      }
      
      // レスポンスからデータを取得
      const { token, business_id, user_id } = response.data;
      
      // トークンとビジネスIDを保存
      localStorage.setItem('token', token);
      localStorage.setItem('business_id', business_id);
      
      // グローバルヘッダーにトークンを設定
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
      apiClient.defaults.headers.common['Authorization'] = `Token ${token}`;
      
      // ユーザーデータを取得
      let userData = {};
      try {
        const userEndpoint = '/api/auth/users/me/';
        const userResponse = await apiClient.get(userEndpoint);
        console.log('User data response:', userResponse);
        userData = userResponse.data;
      } catch (userError) {
        console.error('Error fetching user data:', userError);
        // エラーが発生しても続行し、最低限のユーザー情報をセット
        userData = { id: user_id, email: email };
      }
      
      // ユーザー情報をステートに保存
      setCurrentUser({
        ...userData,
        business_id // ビジネスIDも含める
      });
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      
      // 詳細なエラーメッセージを表示
      if (err.response) {
        // サーバーからのレスポンスがあるエラー
        const errorData = err.response.data;
        console.error('Error response:', errorData);
        
        if (typeof errorData === 'object') {
          // オブジェクト形式のエラー (APIからのバリデーションエラーなど)
          const errorMessages = Object.entries(errorData)
            .map(([key, value]) => {
              const valueText = Array.isArray(value) ? value.join(', ') : value;
              return `${key}: ${valueText}`;
            })
            .join('\n');
          
          setError(errorMessages);
        } else {
          // 文字列形式のエラー
          setError(errorData || `Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        // レスポンスがないエラー（ネットワークエラーなど）
        setError('ネットワークエラー: サーバーに接続できません。インターネット接続を確認してください。');
        
        // オフライン時のエラーメッセージを追加
        if (!navigator.onLine) {
          setError('インターネット接続がオフラインです。ネットワーク接続を確認してください。');
        }
      } else {
        // リクエスト自体の作成に失敗
        setError(`エラー: ${err.message || 'ログインに失敗しました'}`);
      }
      
      return false;
    }
  };

  // Register function
  const register = async (userData) => {
    setError(null);
    try {
      // emailをusernameとしても設定
      const dataToSend = {
        ...userData,
        username: userData.email
      };

      // 相対パスでAPIを呼び出す
      const registerEndpoint = '/api/auth/users/';
      
      console.log('Sending registration request to:', registerEndpoint);
      console.log('Registration data:', dataToSend);

      const response = await apiClient.post(registerEndpoint, dataToSend);
      
      console.log('Registration response:', response);
      
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      
      // 詳細なエラーメッセージを表示
      if (err.response) {
        // サーバーからのレスポンスがあるエラー
        const errorData = err.response.data;
        console.error('Error response:', errorData);
        
        if (typeof errorData === 'object') {
          // オブジェクト形式のエラー (APIからのバリデーションエラーなど)
          const errorMessages = Object.entries(errorData)
            .map(([key, value]) => {
              const valueText = Array.isArray(value) ? value.join(', ') : value;
              return `${key}: ${valueText}`;
            })
            .join('\n');
          
          setError(errorMessages);
        } else {
          // 文字列形式のエラー
          setError(errorData || `Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        // リクエストは送信されたがレスポンスがないエラー (ネットワークエラーなど)
        setError('Network error. Please check your internet connection.');
      } else {
        // その他のエラー
        setError(err.message || 'Registration failed');
      }
      
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // 相対パスでAPI呼び出し
      const logoutEndpoint = '/api/auth/token/logout/';
      console.log('Sending logout request to:', logoutEndpoint);
      
      await apiClient.post(logoutEndpoint);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('business_id');
      delete axios.defaults.headers.common['Authorization'];
      delete apiClient.defaults.headers.common['Authorization'];
      setCurrentUser(null);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!currentUser;
  };

  const value = {
    currentUser,
    setCurrentUser,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};