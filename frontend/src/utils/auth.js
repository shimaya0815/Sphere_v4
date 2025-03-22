/**
 * 認証関連のユーティリティ関数
 */

// トークンを保存するローカルストレージのキー
const TOKEN_KEY = 'sphere_auth_token';
const USER_KEY = 'user_data';

/**
 * 認証トークンを取得
 * @returns {string|null} 認証トークン
 */
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * 認証トークンを保存
 * @param {string} token 認証トークン
 */
export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * 認証トークンを削除
 */
export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * APIリクエスト用の認証ヘッダーを取得
 * @returns {object} 認証ヘッダー
 */
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * ユーザー情報を保存する
 * @param {Object} userData ユーザー情報
 */
export const setUserData = (userData) => {
  if (userData) {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  } else {
    localStorage.removeItem(USER_KEY);
  }
};

/**
 * ユーザー情報を取得する
 * @returns {Object|null} ユーザー情報
 */
export const getUserData = () => {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

/**
 * ユーザー情報を削除する
 */
export const clearUserData = () => {
  localStorage.removeItem(USER_KEY);
};

/**
 * ログアウト処理
 */
export const logout = () => {
  clearAuthToken();
  clearUserData();
};

/**
 * ユーザーが認証済みかどうかをチェック
 * @returns {boolean} 認証済みの場合はtrue
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

export default {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getAuthHeaders,
  setUserData,
  getUserData,
  clearUserData,
  logout,
  isAuthenticated
}; 