import apiClient from '../client';
import { createTask } from './taskOperations';

/**
 * テンプレート一覧を取得
 * @param {number} limit - 取得する最大件数（デフォルト100）
 * @param {boolean} getAllPages - ページネーションされている場合に全ページを取得するか
 * @returns {Promise<Array>} テンプレート一覧
 */
export const getTemplates = async (limit = 100, getAllPages = false) => {
  try {
    console.log(`Fetching templates from API with limit=${limit}...`);
    const response = await apiClient.get(`/api/tasks/templates/?limit=${limit}`);
    console.log('Templates response:', response.data);
    
    // ページネーションがあり、全ページ取得フラグがある場合
    if (getAllPages && response.data && response.data.results && response.data.count > response.data.results.length) {
      console.log(`Detected pagination - fetching all ${response.data.count} templates...`);
      
      // 取得した最初のページの結果
      let allResults = [...response.data.results];
      
      // 残りのページを取得
      let nextPageUrl = response.data.next;
      
      while (nextPageUrl) {
        try {
          // 相対URLから絶対URLに変換
          const absoluteUrl = nextPageUrl.replace(/^.*\/api\//, '/api/');
          console.log(`Fetching next page: ${absoluteUrl}`);
          
          const nextPageResponse = await apiClient.get(absoluteUrl);
          
          if (nextPageResponse.data && Array.isArray(nextPageResponse.data.results)) {
            // 結果を追加
            allResults = [...allResults, ...nextPageResponse.data.results];
            console.log(`Fetched ${nextPageResponse.data.results.length} more templates, total: ${allResults.length}`);
            
            // 次のページがあれば更新
            nextPageUrl = nextPageResponse.data.next;
          } else {
            nextPageUrl = null;
          }
        } catch (err) {
          console.error('Error fetching additional pages:', err);
          nextPageUrl = null;
        }
      }
      
      // 全ページのデータを返す
      console.log(`All pages fetched. Total templates: ${allResults.length}`);
      return allResults;
    }
    
    // ページネーション情報を含む全体を返す
    if (response.data && response.data.results) {
      console.log('Found results array in response:', response.data.results);
      // 単一ページのみ要求された場合は結果配列のみを返す
      return response.data.results;
    }
    
    // 直接配列の場合
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // モックテンプレートを返す（API接続問題のバックアップ）
    console.warn('API response is not in expected format, using mock data');
    return [
      {
        id: 1,
        title: '月次処理チェック',
        description: '毎月の処理状況を確認し、必要な対応を行います。',
        template_name: 'デフォルト月次チェック',
        category: { id: 1, name: '一般', color: '#3B82F6' },
        estimated_hours: 2,
        child_tasks_count: 0
      },
      {
        id: 2,
        title: '記帳代行業務',
        description: '請求書・領収書などに基づき会計データを作成します。',
        template_name: 'デフォルト記帳代行',
        category: { id: 2, name: '記帳代行', color: '#F59E0B' },
        estimated_hours: 3,
        child_tasks_count: 0
      },
      {
        id: 3,
        title: '決算・法人税申告業務',
        description: '決算期の法人税申告書を作成・提出します。',
        template_name: 'デフォルト決算・申告',
        category: { id: 3, name: '決算・申告', color: '#8B5CF6' },
        estimated_hours: 8,
        child_tasks_count: 0
      }
    ];
  } catch (error) {
    console.error('Error fetching templates:', error);
    console.error('Error details:', error.response?.data || error.message);
    
    // エラー時はモックデータを返す（開発用）
    console.warn('Returning mock templates due to API error');
    return [
      {
        id: 1,
        title: '月次処理チェック',
        description: '毎月の処理状況を確認し、必要な対応を行います。',
        template_name: 'デフォルト月次チェック',
        category: { id: 1, name: '一般', color: '#3B82F6' },
        estimated_hours: 2,
        child_tasks_count: 0
      },
      {
        id: 2,
        title: '記帳代行業務',
        description: '請求書・領収書などに基づき会計データを作成します。',
        template_name: 'デフォルト記帳代行',
        category: { id: 2, name: '記帳代行', color: '#F59E0B' },
        estimated_hours: 3,
        child_tasks_count: 0
      }
    ];
  }
};

/**
 * テンプレート詳細を取得
 * @param {number} templateId - テンプレートID
 * @returns {Promise<Object>} テンプレート詳細
 */
export const getTemplate = async (templateId) => {
  try {
    console.log('Fetching template details for ID:', templateId);
    const response = await apiClient.get(`/api/tasks/templates/${templateId}/`);
    console.log('Template details response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in getTemplate:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * テンプレートからタスクを作成
 * @param {number} templateId - テンプレートID
 * @param {Object} taskData - 追加のタスクデータ
 * @returns {Promise<Object>} 作成されたタスク
 */
export const createFromTemplate = async (templateId, taskData = {}) => {
  try {
    const response = await apiClient.post(`/api/tasks/templates/${templateId}/apply/`, taskData);
    return response.data;
  } catch (error) {
    console.error('Error creating task from template:', error);
    throw error;
  }
};

/**
 * テンプレートタスクの一覧を取得
 * @param {number} templateId - テンプレートID
 * @returns {Promise<Array>} テンプレートタスク一覧
 */
export const getTemplateTasks = async (templateId) => {
  try {
    const response = await apiClient.get(`/api/tasks/templates/${templateId}/tasks/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching template tasks:', error);
    throw error;
  }
};

/**
 * 新規テンプレートを作成
 * @param {Object} templateData - テンプレートデータ
 * @returns {Promise<Object>} 作成されたテンプレート
 */
export const createTemplate = async (templateData) => {
  // テンプレートフラグを追加
  const data = {
    ...templateData,
    is_template: true
  };
  
  // 通常のタスク作成APIを使用
  return await createTask(data);
};

/**
 * テンプレートを更新
 * @param {number} templateId - テンプレートID
 * @param {Object} templateData - 更新データ
 * @returns {Promise<Object>} 更新されたテンプレート
 */
export const updateTemplate = async (templateId, templateData) => {
  try {
    const response = await apiClient.patch(`/api/tasks/${templateId}/`, templateData);
    return response.data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

/**
 * テンプレートを削除
 * @param {number} templateId - テンプレートID
 * @returns {Promise<Object>} 削除結果
 */
export const deleteTemplate = async (templateId) => {
  try {
    const response = await apiClient.delete(`/api/tasks/${templateId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

/**
 * テンプレートスケジュール一覧を取得
 * @returns {Promise<Array>} スケジュール一覧
 */
export const getTemplateSchedules = async () => {
  try {
    console.log('Fetching template schedules from API...');
    const response = await apiClient.get('/api/tasks/schedules/');
    console.log('Template schedules response:', response.data);
    
    // DRFのページネーション形式（results配列を含むオブジェクト）に対応
    if (response.data && response.data.results && Array.isArray(response.data.results)) {
      console.log('Found results array in response:', response.data.results);
      return response.data.results;
    }
    
    // 直接配列の場合
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // 空配列を返す
    console.warn('API response is not in expected format, returning empty array');
    return [];
  } catch (error) {
    console.error('Error fetching template schedules:', error);
    console.error('Error details:', error.response?.data || error.message);
    return [];
  }
};

/**
 * 内包タスクを作成
 * @param {Object} taskData - タスクデータ
 * @returns {Promise<Object>} 作成された内包タスク
 */
export const createTemplateTask = async (taskData) => {
  try {
    console.log('Creating template child task with data:', taskData);
    const response = await apiClient.post('/api/tasks/template-tasks/', taskData);
    return response.data;
  } catch (error) {
    console.error('Error creating template child task:', error);
    throw error;
  }
};

/**
 * 内包タスクを更新
 * @param {number} taskId - 内包タスクID
 * @param {Object} taskData - 更新データ
 * @returns {Promise<Object>} 更新された内包タスク
 */
export const updateTemplateTask = async (taskId, taskData) => {
  try {
    console.log('Updating template child task:', taskId);
    const response = await apiClient.patch(`/api/tasks/template-tasks/${taskId}/`, taskData);
    return response.data;
  } catch (error) {
    console.error('Error updating template child task:', error);
    throw error;
  }
};

/**
 * 内包タスクを削除
 * @param {number} taskId - 内包タスクID
 * @returns {Promise<Object>} 削除結果
 */
export const deleteTemplateTask = async (taskId) => {
  try {
    console.log('Deleting template child task:', taskId);
    const response = await apiClient.delete(`/api/tasks/template-tasks/${taskId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting template child task:', error);
    throw error;
  }
};

export default {
  getTemplates,
  getTemplate,
  getTemplateTasks,
  createTemplate,
  createFromTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateSchedules,
  createTemplateTask,
  updateTemplateTask,
  deleteTemplateTask
}; 