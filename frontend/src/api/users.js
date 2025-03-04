import apiClient from './client';

/**
 * ユーザーAPI関連の関数
 */
const usersApi = {
  /**
   * ユーザー一覧を取得
   * @param {Object} params - クエリパラメータ
   * @returns {Promise<Array>} - ユーザー一覧
   */
  getUsers: async (params = {}) => {
    try {
      const response = await apiClient.get('/users/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  /**
   * 特定のユーザーを取得
   * @param {number} userId - ユーザーID
   * @returns {Promise<Object>} - ユーザー情報
   */
  getUser: async (userId) => {
    try {
      const response = await apiClient.get(`/users/${userId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * ビジネスに所属するユーザーを取得
   * @param {string} businessId - ビジネスID
   * @param {Object} params - 追加のクエリパラメータ
   * @returns {Promise<Array>} - ユーザー一覧
   */
  getBusinessUsers: async (businessId, params = {}) => {
    try {
      const response = await apiClient.get(`/business/${businessId}/users/`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching users for business ${businessId}:`, error);
      throw error;
    }
  },
  
  /**
   * 現在のユーザー情報を取得
   * @returns {Promise<Object>} - 現在のユーザー情報
   */
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/users/me/');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },
};

export default usersApi;