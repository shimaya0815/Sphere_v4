import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/auth';
import { authApi } from '../api';

// 認証コンテキスト
const AuthContext = createContext(null);

/**
 * 認証プロバイダーコンポーネント
 * @param {object} props props
 * @param {React.ReactNode} props.children 子要素
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ユーザープロフィールを取得
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return null;
      }
      
      const userData = await authApi.getProfile();
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'プロフィールの取得に失敗しました');
      setIsAuthenticated(false);
      clearAuthToken();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // ログイン
  const login = useCallback(async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.login(credentials);
      const { token, user: userData } = response;
      
      // トークンを保存
      setAuthToken(token);
      setUser(userData);
      setIsAuthenticated(true);
      
      return response;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'ログインに失敗しました');
      setIsAuthenticated(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // ログアウト
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      await authApi.logout();
      clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
      // エラーが発生してもトークンはクリア
      clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // アプリ起動時に認証状態をチェック
  useEffect(() => {
    const initAuth = async () => {
      await fetchProfile();
    };
    
    initAuth();
  }, [fetchProfile]);
  
  // コンテキスト値
  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    fetchProfile
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 認証フック
 * @returns {object} 認証コンテキスト
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth; 