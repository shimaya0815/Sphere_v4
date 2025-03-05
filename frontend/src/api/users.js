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
      const response = await apiClient.get('/api/users/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  /**
   * 特定のユーザーを取得
   * @param {number} userId - ユーザーID
   * @returns {Promise<Object>} - ユーザー情報
   */
  getUser: async (userId) => {
    try {
      const response = await apiClient.get(`/api/users/${userId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return null;
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
      const queryParams = { business_id: businessId, ...params };
      const response = await apiClient.get('/api/business/users/', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error(`Error fetching users for business ${businessId}:`, error);
      return [];
    }
  },
  
  /**
   * 現在のユーザー情報を取得
   * @returns {Promise<Object>} - 現在のユーザー情報
   */
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/api/auth/users/me/');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  },
  
  /**
   * 利用可能な担当者（ワーカー）一覧を取得
   * @returns {Promise<Array>} - 担当者一覧
   */
  getAvailableWorkers: async () => {
    try {
      // 現在のユーザーが所属するビジネスのユーザーを取得
      const currentUser = await usersApi.getCurrentUser();
      if (!currentUser || !currentUser.business) {
        throw new Error('現在のユーザーまたはビジネス情報が取得できません');
      }
      
      // ビジネスに所属するユーザー一覧を取得
      const users = await usersApi.getBusinessUsers(currentUser.business);
      return users;
    } catch (error) {
      console.error('Error fetching available workers:', error);
      return [];
    }
  },
  
  /**
   * 利用可能なレビュアー一覧を取得
   * @returns {Promise<Array>} - レビュアー一覧
   */
  getAvailableReviewers: async () => {
    try {
      // 現在のユーザーが所属するビジネスのユーザーを取得
      const currentUser = await usersApi.getCurrentUser();
      if (!currentUser || !currentUser.business) {
        throw new Error('現在のユーザーまたはビジネス情報が取得できません');
      }
      
      // ビジネスに所属するユーザー一覧を取得（レビュアーは通常、同じユーザープールから選択）
      const users = await usersApi.getBusinessUsers(currentUser.business);
      return users;
    } catch (error) {
      console.error('Error fetching available reviewers:', error);
      return [];
    }
  },
};

export default usersApi;