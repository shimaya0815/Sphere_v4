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
  console.log('getAvailableWorkers: Fetching workers');
  try {
    const response = await apiClient.get('/api/users/workers/', { params });
    console.log('getAvailableWorkers response:', response);
    
    // 応答形式を確認して適切な形式でデータを返す
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      } else {
        // データが予想と異なる形式の場合は一般的なユーザーAPIを試行
        console.log('getAvailableWorkers: Unexpected format, falling back to general users API');
        const usersResponse = await apiClient.get('/api/users/', { params });
        if (usersResponse && usersResponse.data) {
          if (Array.isArray(usersResponse.data)) {
            return usersResponse.data;
          } else if (usersResponse.data.results && Array.isArray(usersResponse.data.results)) {
            return usersResponse.data.results;
          }
        }
        console.warn('getAvailableWorkers: Could not get users data in expected format');
        return [];
      }
    }
    console.warn('getAvailableWorkers: No data received');
    return [];
  } catch (error) {
    console.error('Error fetching available workers:', error);
    
    // エラー発生時も一般的なユーザーAPIをフォールバックとして試行
    try {
      console.log('getAvailableWorkers: Error with specific API, falling back to general users API');
      const usersResponse = await apiClient.get('/api/users/');
      if (usersResponse && usersResponse.data) {
        if (Array.isArray(usersResponse.data)) {
          return usersResponse.data;
        } else if (usersResponse.data.results && Array.isArray(usersResponse.data.results)) {
          return usersResponse.data.results;
        }
      }
    } catch (fallbackError) {
      console.error('Error with fallback API request:', fallbackError);
    }
    
    throw error;
  }
};

/**
 * レビュー可能なユーザー一覧を取得
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} レビュアー一覧
 */
export const getAvailableReviewers = async (params = {}) => {
  console.log('getAvailableReviewers: Fetching reviewers');
  try {
    const response = await apiClient.get('/api/users/reviewers/', { params });
    console.log('getAvailableReviewers response:', response);
    
    // 応答形式を確認して適切な形式でデータを返す
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      } else {
        // データが予想と異なる形式の場合は一般的なユーザーAPIを試行
        console.log('getAvailableReviewers: Unexpected format, falling back to general users API');
        const usersResponse = await apiClient.get('/api/users/', { params });
        if (usersResponse && usersResponse.data) {
          if (Array.isArray(usersResponse.data)) {
            return usersResponse.data;
          } else if (usersResponse.data.results && Array.isArray(usersResponse.data.results)) {
            return usersResponse.data.results;
          }
        }
        console.warn('getAvailableReviewers: Could not get users data in expected format');
        return [];
      }
    }
    console.warn('getAvailableReviewers: No data received');
    return [];
  } catch (error) {
    console.error('Error fetching available reviewers:', error);
    
    // エラー発生時も一般的なユーザーAPIをフォールバックとして試行
    try {
      console.log('getAvailableReviewers: Error with specific API, falling back to general users API');
      const usersResponse = await apiClient.get('/api/users/');
      if (usersResponse && usersResponse.data) {
        if (Array.isArray(usersResponse.data)) {
          return usersResponse.data;
        } else if (usersResponse.data.results && Array.isArray(usersResponse.data.results)) {
          return usersResponse.data.results;
        }
      }
    } catch (fallbackError) {
      console.error('Error with fallback API request:', fallbackError);
    }
    
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

/**
 * ユーザー設定を取得
 * @returns {Promise<object>} ユーザー設定
 */
export const getUserPreferences = async () => {
  try {
    const response = await apiClient.get('/api/users/preferences/me/');
    return response.data;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    throw error;
  }
};

/**
 * ユーザー設定を更新
 * @param {object} preferences 更新する設定データ
 * @returns {Promise<object>} 更新された設定
 */
export const updateUserPreferences = async (preferences) => {
  try {
    const response = await apiClient.patch('/api/users/preferences/me/', preferences);
    return response.data;
  } catch (error) {
    console.error('Error updating user preferences:', error);
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
  deleteUser,
  getUserPreferences,
  updateUserPreferences
};