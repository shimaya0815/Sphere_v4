import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import apiClient from '../api/client';

// API URLを設定（APIリクエスト用）
const API_URL = '/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('business_id');
      
      if (token && businessId) {
        try {
          // Set default headers for axios
          axios.defaults.headers.common['Authorization'] = `Token ${token}`;
          apiClient.defaults.headers.common['Authorization'] = `Token ${token}`;
          
          console.log('Checking auth status with token:', token);
          
          // デバッグと同じパターンでユーザーデータを取得
          const response = await axios.get(`${API_URL}/auth/users/me/`);
          console.log('Auth check response:', response);
          
          setCurrentUser({
            ...response.data,
            business_id: businessId
          });
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('business_id');
          delete axios.defaults.headers.common['Authorization'];
          delete apiClient.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email, password, businessId = null) => {
    setError(null);
    try {
      // ビジネスIDがある場合は含める、ない場合は新規ユーザー
      const loginData = {
        email,
        password
      };
      
      if (businessId) {
        loginData.business_id = businessId;
      }
      
      console.log('Sending login request to:', `${API_URL}/auth/token/login/`);
      console.log('Login data:', loginData);
      
      // デバッグで成功したエンドポイントと同じURLを使用
      console.log('デバッグで成功したURLにリクエスト送信');
      const response = await axios.post(`${API_URL}/auth/token/login/`, loginData);
      
      console.log('Login response:', response);
      
      // axios responseはresponse.dataにデータを持つ
      const responseData = response.data;
      
      // From our custom login endpoint, we get token directly
      const { token, business_id } = responseData;
      localStorage.setItem('token', token);
      localStorage.setItem('business_id', business_id);
      
      // Get user data using axios client
      let userData = {};
      try {
        // Set the token for this request
        const userResponse = await apiClient.get(`${API_URL}/auth/users/me/`, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        
        console.log('User data response:', userResponse);
        userData = userResponse.data;
      } catch (userError) {
        console.error('Error fetching user data:', userError);
        // エラーが発生しても続行し、フォールバックとして部分的なユーザー情報を使用
        userData = { email: email };
      }
      
      setCurrentUser({
        ...userData,
        business_id  // Add business_id to user data
      });
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
      return false;
    }
  };

  // Register function
  const register = async (userData) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Registration failed: ${response.status}`);
      }
      
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/token/logout/`);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('business_id');
      delete axios.defaults.headers.common['Authorization'];
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

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;