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
  
  /**
   * 優先度の値からPriorityレコードを作成または取得
   * @param {number} value - 優先度の値(1-100)
   * @returns {Promise<Object>} 優先度オブジェクト
   */
  createPriorityForValue: async (value) => {
    try {
      console.log(`Creating/fetching priority with value: ${value}`);
      // 優先度テーブルは存在しないが、値はtasks APIで処理される
      // この関数は単に値を渡すためのラッパー
      return { id: null, priority_value: value };
    } catch (error) {
      console.error('Error with priority value:', error);
      return { id: null, priority_value: 50 }; // デフォルト値
    }
  },

  /**
   * カテゴリーの作成
   * @param {Object} data - カテゴリーデータ
   * @returns {Promise<Object>} 作成されたカテゴリー
   */
  createCategory: async (data) => {
    try {
      const response = await apiClient.post('/api/tasks/categories/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  /**
   * ステータスの作成
   * @param {Object} data - ステータスデータ
   * @returns {Promise<Object>} 作成されたステータス
   */
  createStatus: async (data) => {
    try {
      const response = await apiClient.post('/api/tasks/statuses/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating status:', error);
      throw error;
    }
  },

  /**
   * 優先度の作成
   * @param {Object} data - 優先度データ
   * @returns {Promise<Object>} 作成された優先度
   */
  createPriority: async (data) => {
    try {
      const response = await apiClient.post('/api/tasks/priorities/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating priority:', error);
      throw error;
    }
  },

  /**
   * タスクスケジュールを作成
   * @param {Object} data - スケジュールデータ
   * @returns {Promise<Object>} 作成されたスケジュール
   */
  createTaskSchedule: async (data) => {
    try {
      console.log('Creating task schedule with data:', data);
      const response = await apiClient.post('/api/tasks/schedules/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating task schedule:', error);
      throw error;
    }
  },
};

export default metadataApi; 