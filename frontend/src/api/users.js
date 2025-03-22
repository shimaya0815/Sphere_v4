import apiClient from './client';

/**
 * ユーザー一覧を取得
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} ユーザー一覧
 */
export const getUsers = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/users/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * ユーザー詳細を取得
 * @param {number} userId ユーザーID
 * @returns {Promise<object>} ユーザー詳細
 */
export const getUser = async (userId) => {
  try {
    const response = await apiClient.get(`/api/users/${userId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

/**
 * 自分のプロフィール情報を取得
 * @returns {Promise<object>} プロフィール情報
 */
export const getProfile = async () => {
  try {
    const response = await apiClient.get('/api/users/profile/');
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

/**
 * 作業可能なユーザー一覧を取得
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} 作業者一覧
 */
export const getAvailableWorkers = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/users/workers/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching available workers:', error);
    throw error;
  }
};

/**
 * レビュー可能なユーザー一覧を取得
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} レビュアー一覧
 */
export const getAvailableReviewers = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/users/reviewers/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching available reviewers:', error);
    throw error;
  }
};

/**
 * 事業所のユーザー一覧を取得
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} 事業所ユーザー一覧
 */
export const getBusinessUsers = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/users/business/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching business users:', error);
    throw error;
  }
};

/**
 * ユーザーを作成
 * @param {object} userData ユーザーデータ
 * @returns {Promise<object>} 作成されたユーザー
 */
export const createUser = async (userData) => {
  try {
    const response = await apiClient.post('/api/users/', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * ユーザーを更新
 * @param {number} userId ユーザーID
 * @param {object} userData 更新データ
 * @returns {Promise<object>} 更新されたユーザー
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await apiClient.patch(`/api/users/${userId}/`, userData);
    return response.data;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
};

/**
 * ユーザーを削除
 * @param {number} userId ユーザーID
 * @returns {Promise<void>}
 */
export const deleteUser = async (userId) => {
  try {
    await apiClient.delete(`/api/users/${userId}/`);
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

// デフォルトエクスポート
export default {
  getUsers,
  getUser,
  getProfile,
  getAvailableWorkers,
  getAvailableReviewers,
  getBusinessUsers,
  createUser,
  updateUser,
  deleteUser
};