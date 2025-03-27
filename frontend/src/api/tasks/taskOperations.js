import apiClient from '../client';
import { cleanData, formatDateFields, processRecurrenceFields } from './utils';

/**
 * タスク一覧を取得
 * @param {Object} filters - フィルター条件
 * @returns {Promise<Array>} タスク一覧
 */
export const getTasks = async (filters = {}) => {
  try {
    // API URLは /api プレフィックスを付ける
    const response = await apiClient.get('/api/tasks/', { 
      params: filters,
      timeout: 10000 // 10秒のタイムアウト
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    throw error;
  }
};

/**
 * タスクの詳細を取得
 * @param {number} taskId - タスクID
 * @returns {Promise<Object>} タスク詳細
 */
export const getTask = async (taskId) => {
  try {
    console.log('Fetching task details for ID:', taskId);
    const response = await apiClient.get(`/api/tasks/${taskId}/`);
    console.log('Task details response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in getTask:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * 新規タスク作成
 * @param {Object} taskData - タスクデータ
 * @returns {Promise<Object>} 作成されたタスク
 */
export const createTask = async (taskData) => {
  try {
    console.log('Create task データ変換前 (元のデータ):', JSON.stringify(taskData, null, 2));
    
    // データのクリーンアップ
    let cleanedData = cleanData(taskData);
    console.log('データクリーン後:', JSON.stringify(cleanedData, null, 2));
    
    // 重要なフィールドの存在確認
    const requiredFields = ['title', 'status', 'business', 'workspace'];
    const missingFields = requiredFields.filter(field => !cleanedData[field]);
    
    if (missingFields.length > 0) {
      console.warn('以下の重要なフィールドが欠けています:', missingFields.join(', '));
      
      // フィールド別の詳細チェック
      if (!cleanedData.title) {
        console.warn('タイトルが設定されていません。デフォルト値を使用します。');
        cleanedData.title = '新規タスク';
      }
      
      if (!cleanedData.status) {
        console.warn('ステータスが未設定です。デフォルト値を検索します。');
        try {
          const cachedStatuses = window.__SPHERE_CACHED_STATUSES;
          if (cachedStatuses && cachedStatuses.length > 0) {
            // 未着手ステータスの検索
            const notStartedStatus = cachedStatuses.find(s => s.name === '未着手') || 
                                   cachedStatuses.find(s => s.order === 1) || 
                                   cachedStatuses[0];
            if (notStartedStatus) {
              cleanedData.status = notStartedStatus.id;
              console.log('デフォルトステータスを設定:', notStartedStatus.id, notStartedStatus.name);
            }
          } else {
            // バックエンドの既知のステータスIDを使用（フォールバック）
            const businessId = cleanedData.business ? Number(cleanedData.business) : null;
            
            // ビジネスIDに基づいて適切なステータスIDを選択
            if (businessId === 3) {
              // Admin Businessの「未着手」ステータスID
              cleanedData.status = 9;
              console.log('Admin Business用の既知のデフォルトステータスID=9を使用');
            } else if (businessId === 4) {
              // 島谷さんのBusinessの「未着手」ステータスID
              cleanedData.status = 17;
              console.log('島谷さんのBusiness用の既知のデフォルトステータスID=17を使用');
            } else {
              // フォールバック（どのビジネスにも対応する可能性が高いID）
              cleanedData.status = 9;
              console.log('ビジネスIDが不明なため、既知のデフォルトステータスID=9を使用');
            }
          }
        } catch (e) {
          console.error('デフォルトステータス設定エラー:', e);
          // エラー時のフォールバック - ビジネスIDに基づいて選択
          const businessId = cleanedData.business ? Number(cleanedData.business) : null;
          
          if (businessId === 3) {
            cleanedData.status = 9; // Admin Businessの「未着手」ステータスID
          } else if (businessId === 4) {
            cleanedData.status = 17; // 島谷さんのBusinessの「未着手」ステータスID
          } else {
            cleanedData.status = 9; // デフォルト
          }
          console.log(`エラー時のフォールバック - ビジネスID=${businessId}のデフォルトステータスを使用:`, cleanedData.status);
        }
      }
      
      if (!cleanedData.business) {
        console.error('business IDが未設定です。必須フィールドです。');
        // ローカルストレージまたはユーザープロファイルからビジネスIDを取得
        const businessId = localStorage.getItem('businessId') || window.__SPHERE_USER_PROFILE?.businessId;
        if (businessId) {
          cleanedData.business = businessId;
          console.log('ビジネスIDをローカルストレージ/ユーザープロファイルから設定:', businessId);
        }
      }
      
      if (!cleanedData.workspace) {
        console.error('workspace IDが未設定です。必須フィールドです。');
        // ローカルストレージからワークスペースIDを取得
        const workspaceId = localStorage.getItem('workspaceId');
        if (workspaceId) {
          cleanedData.workspace = workspaceId;
          console.log('ワークスペースIDをローカルストレージから設定:', workspaceId);
        }
      }
    }
    
    // 日付フィールドのフォーマット
    cleanedData = formatDateFields(cleanedData);
    console.log('日付フォーマット後:', JSON.stringify(cleanedData, null, 2));
    
    // 繰り返しパターンのフィールド処理
    cleanedData = processRecurrenceFields(cleanedData);
    console.log('繰り返しフィールド処理後:', JSON.stringify(cleanedData, null, 2));
    
    // リクエスト送信
    console.log('最終的な送信データ:', JSON.stringify(cleanedData, null, 2));
    
    try {
      // ヘッダー情報のログ出力
      const token = localStorage.getItem('token');
      console.log('認証トークンの存在:', !!token);
      console.log('送信先URL:', '/api/tasks/');
      
      const response = await apiClient.post('/api/tasks/', cleanedData);
      console.log('タスク作成成功レスポンス:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (apiError) {
      console.error('API呼び出しエラー:', apiError);
      if (apiError.response) {
        console.error('エラーステータス:', apiError.response.status);
        console.error('エラーレスポンスデータ:', JSON.stringify(apiError.response.data, null, 2));
        
        // 詳細なエラー内容の抽出
        if (apiError.response.data) {
          const errorData = apiError.response.data;
          if (typeof errorData === 'object') {
            console.error('フィールド別エラー:');
            Object.entries(errorData).forEach(([field, errors]) => {
              console.error(`- ${field}: ${Array.isArray(errors) ? errors.join(', ') : JSON.stringify(errors)}`);
            });
          }
        }
      } else {
        console.error('ネットワークエラーまたはリクエスト中断:', apiError.message);
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Error creating task:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * タスク更新
 * @param {number} taskId - タスクID
 * @param {Object} taskData - 更新データ
 * @returns {Promise<Object>} 更新されたタスク
 */
export const updateTask = async (taskId, taskData) => {
  try {
    console.log('Updating task data:', taskData);
    console.log('Task ID for update:', taskId);
    
    // データをクリーンアップ
    let cleanedData = cleanData(taskData);
    
    // 優先度の特別処理
    if ('priority_value' in cleanedData && (cleanedData.priority_value === null || cleanedData.priority_value === '')) {
      cleanedData.priority_value = null;
      console.log('優先度値がnullまたは空文字列のため、明示的にnullに設定します');
    }
    
    // 日付フィールドのフォーマット
    cleanedData = formatDateFields(cleanedData);
    
    // 繰り返しパターンのフィールド処理
    cleanedData = processRecurrenceFields(cleanedData);
    
    // ブール値フィールドの処理
    const booleanFields = ['is_fiscal_task', 'is_recurring', 'is_template', 'consider_holidays'];
    booleanFields.forEach(field => {
      if (field in cleanedData && typeof cleanedData[field] === 'string') {
        cleanedData[field] = cleanedData[field] === 'true';
        console.log(`Converted ${field} to boolean:`, cleanedData[field]);
      }
    });
    
    console.log('Update task data after cleaning:', cleanedData);
    
    const response = await apiClient.patch(`/api/tasks/${taskId}/`, cleanedData);
    return response.data;
  } catch (error) {
    console.error('Error updating task:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * タスク削除
 * @param {number} taskId - タスクID
 * @returns {Promise<Object>} 削除結果
 */
export const deleteTask = async (taskId) => {
  try {
    const response = await apiClient.delete(`/api/tasks/${taskId}/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * タスクステータス変更
 * @param {number} taskId - タスクID
 * @param {Object} statusData - ステータスデータ
 * @returns {Promise<Object>} 更新されたタスク
 */
export const changeStatus = async (taskId, statusData) => {
  try {
    const response = await apiClient.post(`/api/tasks/${taskId}/change-status/`, statusData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * タスク完了マーク
 * @param {number} taskId - タスクID
 * @returns {Promise<Object>} 更新されたタスク
 */
export const markComplete = async (taskId) => {
  try {
    const response = await apiClient.post(`/api/tasks/${taskId}/mark_complete/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  changeStatus,
  markComplete
}; 