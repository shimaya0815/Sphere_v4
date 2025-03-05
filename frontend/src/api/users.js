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
      // 直接すべてのユーザーを取得する（ビジネスIDによるフィルタリングはバックエンドで自動的に行われる）
      const response = await apiClient.get('/api/users/profile/');
      console.log('Users from API:', response.data);
      
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`Error fetching users:`, error);
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
      // デモユーザーを返す（APIが正しく設定されるまでの一時的な対応）
      const demoUsers = [
        { id: 1, username: 'admin', email: 'admin@example.com', first_name: '管理者', last_name: 'ユーザー' },
        { id: 2, username: 'worker1', email: 'worker1@example.com', first_name: '担当者', last_name: '1' },
        { id: 3, username: 'worker2', email: 'worker2@example.com', first_name: '担当者', last_name: '2' },
        { id: 4, username: 'reviewer1', email: 'reviewer1@example.com', first_name: 'レビュアー', last_name: '1' },
      ];
      
      // APIを呼び出す（デモユーザーとの比較用）
      console.log('Fetching users for worker selection');
      try {
        // 正しいエンドポイント /api/users/profile/ を使用する
        const response = await apiClient.get('/api/users/profile/');
        console.log('Worker API response:', response.data);
        
        // レスポンスの形式によって適切に処理
        if (Array.isArray(response.data) && response.data.length > 0) {
          return response.data;
        } else if (response.data && Array.isArray(response.data.results) && response.data.results.length > 0) {
          return response.data.results;
        }
      } catch (apiError) {
        console.warn('API Error, using demo users:', apiError);
      }
      
      // APIからデータが取得できない場合はデモユーザーを返す
      console.log('Using demo users');
      return demoUsers;
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
      // デモユーザーを返す（APIが正しく設定されるまでの一時的な対応）
      const demoUsers = [
        { id: 1, username: 'admin', email: 'admin@example.com', first_name: '管理者', last_name: 'ユーザー' },
        { id: 4, username: 'reviewer1', email: 'reviewer1@example.com', first_name: 'レビュアー', last_name: '1' },
        { id: 5, username: 'reviewer2', email: 'reviewer2@example.com', first_name: 'レビュアー', last_name: '2' },
        { id: 6, username: 'manager', email: 'manager@example.com', first_name: 'マネージャー', last_name: '' },
      ];
      
      // APIを呼び出す（デモユーザーとの比較用）
      console.log('Fetching users for reviewer selection');
      try {
        // 正しいエンドポイント /api/users/profile/ を使用する
        const response = await apiClient.get('/api/users/profile/');
        console.log('Reviewer API response:', response.data);
        
        // レスポンスの形式によって適切に処理
        if (Array.isArray(response.data) && response.data.length > 0) {
          return response.data;
        } else if (response.data && Array.isArray(response.data.results) && response.data.results.length > 0) {
          return response.data.results;
        }
      } catch (apiError) {
        console.warn('API Error, using demo users:', apiError);
      }
      
      // APIからデータが取得できない場合はデモユーザーを返す
      console.log('Using demo users for reviewers');
      return demoUsers;
    } catch (error) {
      console.error('Error fetching available reviewers:', error);
      return [];
    }
  },
};

export default usersApi;