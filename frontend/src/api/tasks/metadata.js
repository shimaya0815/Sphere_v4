import apiClient from '../client';

/**
 * タスクカテゴリー一覧を取得
 * @returns {Promise<Array>} カテゴリー一覧
 */
export const getCategories = async () => {
  try {
    console.log('API - Fetching task categories');
    const response = await apiClient.get('/api/tasks/categories/');
    console.log('API - Categories response:', response);
    
    // レスポンスの形式に応じて適切に処理
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * タスクステータス一覧を取得
 * @returns {Promise<Array>} ステータス一覧
 */
export const getStatuses = async () => {
  try {
    console.log('API - Fetching task statuses');
    const response = await apiClient.get('/api/tasks/statuses/');
    console.log('API - Statuses response:', response);
    
    // レスポンスの形式に応じて適切に処理
    if (response.data && Array.isArray(response.data)) {
      // キャッシュに保存
      try {
        window.__SPHERE_CACHED_STATUSES = response.data;
      } catch (e) {
        console.warn('Failed to cache statuses:', e);
      }
      return response.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      // キャッシュに保存
      try {
        window.__SPHERE_CACHED_STATUSES = response.data.results;
      } catch (e) {
        console.warn('Failed to cache statuses:', e);
      }
      return response.data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return [];
  }
};

/**
 * タスク優先度一覧を取得
 * @returns {Promise<Array>} 優先度一覧
 */
export const getPriorities = async () => {
  try {
    console.log('API - Fetching task priorities');
    const response = await apiClient.get('/api/tasks/priorities/');
    console.log('API - Priorities response:', response);
    
    // レスポンスの形式に応じて適切に処理
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching priorities:', error);
    return [];
  }
};

/**
 * カテゴリーを作成
 * @param {Object} categoryData - カテゴリーデータ
 * @returns {Promise<Object>} 作成されたカテゴリー
 */
export const createCategory = async (categoryData) => {
  try {
    const response = await apiClient.post('/api/tasks/categories/', categoryData);
    return response.data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * ステータスを作成
 * @param {Object} statusData - ステータスデータ
 * @returns {Promise<Object>} 作成されたステータス
 */
export const createStatus = async (statusData) => {
  try {
    const response = await apiClient.post('/api/tasks/statuses/', statusData);
    return response.data;
  } catch (error) {
    console.error('Error creating status:', error);
    throw error;
  }
};

/**
 * 優先度を作成
 * @param {Object} priorityData - 優先度データ
 * @returns {Promise<Object>} 作成された優先度
 */
export const createPriority = async (priorityData) => {
  try {
    const response = await apiClient.post('/api/tasks/priorities/', priorityData);
    return response.data;
  } catch (error) {
    console.error('Error creating priority:', error);
    throw error;
  }
};

export default {
  getCategories,
  getStatuses,
  getPriorities,
  createCategory,
  createStatus,
  createPriority
}; 