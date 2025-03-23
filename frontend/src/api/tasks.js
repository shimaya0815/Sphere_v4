/**
 * タスクAPI
 * 
 * このファイルは後方互換性のために残されています。
 * 新しいコードでは `/api/tasks/index.js` からインポートすることを推奨します。
 * 
 * 例: import tasksApi from './tasks/index';
 * または特定の関数のみをインポート: import { getTask, createTask } from './tasks/index';
 */

import apiClient from './client';
import { cachedApiCall, dedupApiCall, clearCache, clearCacheByPrefix } from '../utils/cache';

// APIのベースパス
const API_BASE_PATH = '/api/tasks';

// キャッシュキーのプレフィックス
const CACHE_PREFIX = 'tasks';

// キャッシュの有効期間（ミリ秒）
const CACHE_TTL = 60000; // 60秒

/**
 * パラメータからキャッシュキーを生成
 * @param {string} endpoint エンドポイント名
 * @param {object} params パラメータ
 * @returns {string} キャッシュキー
 */
const generateCacheKey = (endpoint, params = {}) => {
  const paramsString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
    
  return `${CACHE_PREFIX}:${endpoint}${paramsString ? `:${paramsString}` : ''}`;
};

/**
 * タスク一覧を取得
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} タスク一覧
 */
export const getTasks = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/tasks/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

/**
 * タスク詳細を取得
 * @param {number|string} taskId タスクID
 * @returns {Promise<object>} タスク詳細
 */
export const getTask = async (taskId) => {
  // "new"の場合は特別処理
  if (taskId === 'new') {
    throw new Error('Task ID "new" is reserved for creating new tasks');
  }
  
  try {
    const response = await apiClient.get(`/api/tasks/${taskId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching task ${taskId}:`, error);
    throw error;
  }
};

/**
 * タスクを作成
 * @param {object} taskData タスクデータ
 * @returns {Promise<object>} 作成されたタスク
 */
export const createTask = async (taskData) => {
  try {
    // データの前処理
    const processedData = { ...taskData };
    
    // descriptionがnullの場合は空文字列に変換
    if (processedData.description === null || processedData.description === undefined) {
      processedData.description = '';
      console.log('Description was null, converted to empty string');
    }
    
    // 数値形式の文字列フィールドを整数に変換
    ['status', 'category', 'client', 'fiscal_year', 'worker', 'reviewer', 'approver'].forEach(field => {
      if (processedData[field] && typeof processedData[field] === 'string' && /^\d+$/.test(processedData[field])) {
        processedData[field] = parseInt(processedData[field], 10);
        console.log(`Converting ${field} from string to integer: ${processedData[field]}`);
      }
    });
    
    // priority_valueが文字列で数値を含む場合は整数に変換
    if (processedData.priority_value && typeof processedData.priority_value === 'string') {
      if (processedData.priority_value.trim() === '') {
        // 空の文字列の場合はデフォルト値を使用
        processedData.priority_value = 50;
      } else if (/^\d+$/.test(processedData.priority_value)) {
        // 数値のみの文字列の場合は整数に変換
        processedData.priority_value = parseInt(processedData.priority_value, 10);
      }
      console.log(`Priority value processed: ${processedData.priority_value}`);
    }
    
    console.log('Processing task data before sending:', processedData);
    
    const response = await apiClient.post('/api/tasks/', processedData);
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

/**
 * タスクを更新
 * @param {number} taskId タスクID
 * @param {object} taskData 更新データ
 * @returns {Promise<object>} 更新されたタスク
 */
export const updateTask = async (taskId, taskData) => {
  try {
    // template_nameフィールドを削除（バックエンドでの検証エラーを回避）
    const updatedData = { ...taskData };
    if ('template_name' in updatedData) {
      delete updatedData.template_name;
    }
    // assigneeフィールドを削除（バックエンドでの検証エラーを回避）
    if ('assignee' in updatedData) {
      delete updatedData.assignee;
    }
    
    const response = await apiClient.patch(`/api/tasks/${taskId}/`, updatedData);
    return response.data;
  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    throw error;
  }
};

/**
 * タスクを削除
 * @param {number} taskId タスクID
 * @returns {Promise<void>}
 */
export const deleteTask = async (taskId) => {
  try {
    await apiClient.delete(`/api/tasks/${taskId}/`);
  } catch (error) {
    console.error(`Error deleting task ${taskId}:`, error);
    throw error;
  }
};

/**
 * タスクのコメント一覧を取得
 * @param {number} taskId タスクID
 * @returns {Promise<Array>} コメント一覧
 */
export const getTaskComments = async (taskId) => {
  try {
    const response = await apiClient.get(`/api/tasks/${taskId}/comments/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching comments for task ${taskId}:`, error);
    throw error;
  }
};

/**
 * タスクにコメントを追加
 * @param {number} taskId タスクID
 * @param {object} commentData コメントデータ
 * @returns {Promise<object>} 作成されたコメント
 */
export const createTaskComment = async (taskId, commentData) => {
  try {
    const response = await apiClient.post(`/api/tasks/${taskId}/comments/`, commentData);
    return response.data;
  } catch (error) {
    console.error(`Error creating comment for task ${taskId}:`, error);
    throw error;
  }
};

/**
 * タスクのコメントを削除
 * @param {number} commentId コメントID
 * @returns {Promise<void>}
 */
export const deleteTaskComment = async (commentId) => {
  try {
    await apiClient.delete(`/api/comments/${commentId}/`);
  } catch (error) {
    console.error(`Error deleting comment ${commentId}:`, error);
    throw error;
  }
};

/**
 * タスクの添付ファイル一覧を取得
 * @param {number} taskId タスクID
 * @returns {Promise<Array>} 添付ファイル一覧
 */
export const getAttachments = async (taskId) => {
  try {
    const response = await apiClient.get(`/api/tasks/${taskId}/attachments/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching attachments for task ${taskId}:`, error);
    throw error;
  }
};

/**
 * タスクに添付ファイルをアップロード
 * @param {number} taskId タスクID
 * @param {FormData} formData ファイルデータ
 * @returns {Promise<Array>} アップロードされた添付ファイル
 */
export const uploadAttachments = async (taskId, formData) => {
  try {
    const response = await apiClient.post(`/api/tasks/${taskId}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error uploading attachments for task ${taskId}:`, error);
    throw error;
  }
};

/**
 * 添付ファイルを削除
 * @param {number} attachmentId 添付ファイルID
 * @returns {Promise<void>}
 */
export const deleteAttachment = async (attachmentId) => {
  try {
    await apiClient.delete(`/api/attachments/${attachmentId}/`);
  } catch (error) {
    console.error(`Error deleting attachment ${attachmentId}:`, error);
    throw error;
  }
};

/**
 * タスクの優先度を更新
 * @param {number|string} taskId タスクID
 * @param {string} priority 優先度
 * @returns {Promise<object>} 更新されたタスク
 */
export const updateTaskPriority = async (taskId, priority) => {
  return updateTask(taskId, { priority });
};

/**
 * タスクのステータスを更新
 * @param {number|string} taskId タスクID
 * @param {string} status ステータス
 * @returns {Promise<object>} 更新されたタスク
 */
export const updateTaskStatus = async (taskId, status) => {
  return updateTask(taskId, { status });
};

/**
 * タスクの担当者を更新
 * @param {number|string} taskId タスクID
 * @param {number|null} assigneeId 担当者ID
 * @returns {Promise<object>} 更新されたタスク
 */
export const updateTaskAssignee = async (taskId, assigneeId) => {
  return updateTask(taskId, { assignee: assigneeId });
};

/**
 * タスクカテゴリー一覧を取得
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} カテゴリー一覧
 */
export const getCategories = async (params = {}) => {
  try {
    console.log('カテゴリー取得を試みます...');
    const response = await apiClient.get('/api/tasks/categories/', { params });
    console.log('取得したカテゴリー:', response.data);
    
    // ページネーション形式（results配列）かどうかをチェック
    if (response.data && response.data.results && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    
    // 通常の配列の場合
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // その他の形式の場合は空配列を返す
    console.warn('Unexpected category data format:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    // バックアップとしてデフォルト値を返す
    console.log('APIエラーが発生したため、デフォルト値を使用します');
    return [
      { id: 1, name: '一般', color: '#3b82f6' },
      { id: 2, name: '開発', color: '#10b981' },
      { id: 3, name: 'デザイン', color: '#8b5cf6' },
      { id: 4, name: 'マーケティング', color: '#f59e0b' },
      { id: 5, name: '営業', color: '#ef4444' }
    ];
  }
};

/**
 * タスクステータス一覧を取得
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} ステータス一覧
 */
export const getStatuses = async (params = {}) => {
  try {
    // エンドポイントのパスを修正
    console.log('ステータス取得を試みます...');
    const response = await apiClient.get('/api/tasks/statuses/', { params });
    console.log('取得したステータス:', response.data);
    
    // ページネーション形式（results配列）かどうかをチェック
    if (response.data && response.data.results && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    
    // 通常の配列の場合
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // その他の形式の場合は空配列を返す
    console.warn('Unexpected status data format:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching statuses:', error);
    // バックアップとしてデフォルト値を返す
    console.log('APIエラーが発生したため、デフォルト値を使用します');
    return [
      { id: 1, name: '未着手', color: '#9ca3af' },
      { id: 2, name: '進行中', color: '#3b82f6' },
      { id: 3, name: 'レビュー中', color: '#8b5cf6' },
      { id: 4, name: '完了', color: '#10b981' }
    ];
  }
};

/**
 * タスク優先度一覧を取得
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} 優先度一覧
 */
export const getPriorities = async (params = {}) => {
  try {
    console.log('優先度取得を試みます...');
    const response = await apiClient.get('/api/tasks/priorities/', { params });
    console.log('取得した優先度:', response.data);
    
    // ページネーション形式（results配列）かどうかをチェック
    if (response.data && response.data.results && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    
    // 通常の配列の場合
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // 数値範囲形式のレスポンス（min_value, max_valueを含む）に対応
    if (response.data && response.data.min_value && response.data.max_value) {
      console.log('数値範囲形式の優先度データを検出しました');
      // 数値範囲から3つの優先度レベルを生成
      const min = response.data.min_value;
      const max = response.data.max_value;
      const range = max - min;
      
      return [
        { id: 1, color: '#ef4444', priority_value: min + Math.floor(range * 0.1) },
        { id: 2, color: '#f59e0b', priority_value: min + Math.floor(range * 0.5) },
        { id: 3, color: '#9ca3af', priority_value: min + Math.floor(range * 0.9) }
      ];
    }
    
    // その他の形式の場合はデフォルト値を返す
    console.warn('未対応の優先度データ形式:', response.data);
    return [
      { id: 1, color: '#9ca3af', priority_value: 75 },
      { id: 2, color: '#f59e0b', priority_value: 50 },
      { id: 3, color: '#ef4444', priority_value: 25 }
    ];
  } catch (error) {
    console.error('Error fetching priorities:', error);
    // バックアップとしてデフォルト値を返す
    console.log('APIエラーが発生したため、デフォルト値を使用します');
    return [
      { id: 1, color: '#9ca3af', priority_value: 75 },
      { id: 2, color: '#f59e0b', priority_value: 50 },
      { id: 3, color: '#ef4444', priority_value: 25 }
    ];
  }
};

/**
 * タスクのテンプレートを取得
 * @param {number} templateId テンプレートID
 * @returns {Promise<object>} テンプレート
 */
export const getTemplate = async (templateId) => {
  try {
    // スタブ実装
    return Promise.resolve({
      id: templateId,
      name: 'テンプレート',
      description: 'テンプレートの説明'
    });
  } catch (error) {
    console.error(`Error fetching template ${templateId}:`, error);
    throw error;
  }
};

/**
 * テンプレートタスクを取得
 * @param {number} templateTaskId テンプレートタスクID
 * @returns {Promise<object>} テンプレートタスク
 */
export const getTemplateTask = async (templateTaskId) => {
  try {
    // スタブ実装
    return Promise.resolve({
      id: templateTaskId,
      title: 'テンプレートタスク',
      description: 'テンプレートタスクの説明',
      status: 'todo',
      priority: 'medium'
    });
  } catch (error) {
    console.error(`Error fetching template task ${templateTaskId}:`, error);
    throw error;
  }
};

/**
 * 優先度の値からオブジェクトを作成
 * @param {string} value 優先度の値
 * @returns {Promise<object>} 優先度オブジェクト
 */
export const createPriorityForValue = async (value) => {
  try {
    const priorities = await getPriorities();
    const priority = priorities.find(p => p.id === value) || {
      id: value,
      color: '#9ca3af'
    };
    return priority;
  } catch (error) {
    console.error(`Error creating priority for value ${value}:`, error);
    throw error;
  }
};

/**
 * タスクスケジュールを作成
 * @param {object} scheduleData スケジュールデータ
 * @returns {Promise<object>} 作成されたスケジュール
 */
export const createTaskSchedule = async (scheduleData) => {
  try {
    // スタブ実装
    return Promise.resolve({
      id: Math.floor(Math.random() * 1000),
      ...scheduleData,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating task schedule:', error);
    throw error;
  }
};

/**
 * テンプレートタスクを更新
 * @param {number} templateTaskId テンプレートタスクID
 * @param {object} taskData 更新データ
 * @returns {Promise<object>} 更新されたテンプレートタスク
 */
export const updateTemplateTask = async (templateTaskId, taskData) => {
  try {
    // スタブ実装
    return Promise.resolve({
      id: templateTaskId,
      ...taskData,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error updating template task ${templateTaskId}:`, error);
    throw error;
  }
};

/**
 * テンプレートタスクを作成
 * @param {object} taskData タスクデータ
 * @returns {Promise<object>} 作成されたテンプレートタスク
 */
export const createTemplateTask = async (taskData) => {
  try {
    // スタブ実装
    return Promise.resolve({
      id: Math.floor(Math.random() * 1000),
      ...taskData,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating template task:', error);
    throw error;
  }
};

/**
 * タスクを完了済みとしてマークする
 * @param {number} taskId タスクID
 * @returns {Promise<object>} 更新されたタスク
 */
export const markTaskComplete = async (taskId) => {
  try {
    const response = await apiClient.post(`/api/tasks/${taskId}/mark_complete/`);
    return response.data;
  } catch (error) {
    console.error(`Error marking task ${taskId} as complete:`, error);
    throw error;
  }
};

/**
 * 繰り返しタスクの次のインスタンスを生成する
 * @param {number} taskId タスクID
 * @returns {Promise<object>} 生成された次のタスクインスタンス
 */
export const createNextRecurringTask = async (taskId) => {
  try {
    const response = await apiClient.post(`/api/tasks/${taskId}/create-next-recurring/`);
    return response.data;
  } catch (error) {
    console.error(`Error creating next recurring task for ${taskId}:`, error);
    throw error;
  }
};

export default {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskPriority,
  updateTaskStatus,
  updateTaskAssignee,
  getTaskComments,
  createTaskComment,
  deleteTaskComment,
  getAttachments,
  uploadAttachments,
  deleteAttachment,
  getCategories,
  getStatuses,
  getPriorities,
  getTemplate,
  getTemplateTask,
  createPriorityForValue,
  createTaskSchedule,
  updateTemplateTask,
  createTemplateTask,
  markTaskComplete,
  createNextRecurringTask
};