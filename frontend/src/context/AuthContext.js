import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import apiClient from '../api/client';

// API URLを設定
const API_URL = 'http://localhost:8000/api';

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
          
          // Get user data
          const response = await axios.get(`${API_URL}/auth/users/me/`);
          setCurrentUser({
            ...response.data,
            business_id: businessId
          });
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('business_id');
          delete axios.defaults.headers.common['Authorization'];
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
      
      const response = await axios.post(`${API_URL}/auth/token/login/`, loginData);
      
      // From our custom login endpoint, we get token directly
      const { token, business_id } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('business_id', business_id);
      
      // Set token in axios headers
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
      
      // Get user data
      const userResponse = await axios.get(`${API_URL}/auth/users/me/`);
      setCurrentUser({
        ...userResponse.data,
        business_id  // Add business_id to user data
      });
      
      return true;
    } catch (err) {
      setError(err.response?.data || 'Login failed');
      return false;
    }
  };

  // Register function
  const register = async (userData) => {
    setError(null);
    try {
      await axios.post(`${API_URL}/auth/users/`, userData);
      return true;
    } catch (err) {
      setError(err.response?.data || 'Registration failed');
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