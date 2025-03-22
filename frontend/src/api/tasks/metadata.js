import apiClient from '../client';

/**
 * タスクのメタデータ API
 */
const metadataApi = {
  /**
   * タスクカテゴリーの取得
   * @param {Object} params - クエリパラメータ
   * @returns {Promise<Array>} カテゴリー一覧
   */
  getCategories: async (params = {}) => {
    try {
      console.log('API - Fetching task categories with params:', params);
      const response = await apiClient.get('/api/tasks/categories/', { params });
      console.log('API - Categories response status:', response.status);
      
      // レスポンスの形式に応じて適切に処理
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      console.error('Error details:', error.response?.status, error.response?.data);
      return [];
    }
  },

  /**
   * タスクステータスの取得
   * @param {Object} params - クエリパラメータ
   * @returns {Promise<Array>} ステータス一覧
   */
  getStatuses: async (params = {}) => {
    try {
      console.log('API - Fetching task statuses with params:', params);
      const response = await apiClient.get('/api/tasks/statuses/', { params });
      console.log('API - Statuses response status:', response.status);
      
      // レスポンスの形式に応じて適切に処理
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching statuses:', error);
      console.error('Error details:', error.response?.status, error.response?.data);
      return [];
    }
  },

  /**
   * タスク優先度の取得
   * @param {Object} params - クエリパラメータ
   * @returns {Promise<Array>} 優先度一覧
   */
  getPriorities: async (params = {}) => {
    try {
      console.log('API - Fetching task priorities with params:', params);
      const response = await apiClient.get('/api/tasks/priorities/', { params });
      console.log('API - Priorities response status:', response.status);
      
      // レスポンスの形式に応じて適切に処理
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching priorities:', error);
      console.error('Error details:', error.response?.status, error.response?.data);
      return [];
    }
  },

  /**
   * タスク単位の取得
   * @param {Object} params - クエリパラメータ
   * @returns {Promise<Array>} 単位一覧
   */
  getUnits: async (params = {}) => {
    try {
      console.log('API - Fetching task units with params:', params);
      const response = await apiClient.get('/api/tasks/units/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching units:', error);
      return [];
    }
  },
  
  // 他のメタデータ関連メソッド

};

export default metadataApi; 