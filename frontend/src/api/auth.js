import apiClient from './client';

/**
 * ログイン処理
 * @param {object} credentials ログイン情報
 * @returns {Promise<object>} ログイン結果
 */
export const login = async (credentials) => {
  try {
    const response = await apiClient.post('/api/auth/login/', credentials);
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * ログアウト処理
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await apiClient.post('/api/auth/logout/');
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

/**
 * ユーザープロフィール取得
 * @returns {Promise<object>} ユーザープロフィール
 */
export const getProfile = async () => {
  try {
    const response = await apiClient.get('/api/auth/profile/');
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

/**
 * ユーザープロフィール更新
 * @param {object} profileData 更新するプロフィールデータ
 * @returns {Promise<object>} 更新されたプロフィール
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await apiClient.patch('/api/auth/profile/', profileData);
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

/**
 * パスワード変更
 * @param {object} passwordData パスワードデータ
 * @returns {Promise<object>} 処理結果
 */
export const changePassword = async (passwordData) => {
  try {
    const response = await apiClient.post('/api/auth/password/change/', passwordData);
    return response.data;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

/**
 * パスワードリセット要求
 * @param {string} email メールアドレス
 * @returns {Promise<object>} 処理結果
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await apiClient.post('/api/auth/password/reset/', { email });
    return response.data;
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
};

/**
 * パスワードリセット確認
 * @param {object} resetData リセットデータ
 * @returns {Promise<object>} 処理結果
 */
export const confirmPasswordReset = async (resetData) => {
  try {
    const response = await apiClient.post('/api/auth/password/reset/confirm/', resetData);
    return response.data;
  } catch (error) {
    console.error('Error confirming password reset:', error);
    throw error;
  }
};

// デフォルトエクスポート
export default {
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  confirmPasswordReset
};