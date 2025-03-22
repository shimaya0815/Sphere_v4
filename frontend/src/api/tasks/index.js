/**
 * タスクAPI関連の全インターフェース
 * 複数のモジュールに分割した機能を統合的に提供します
 */

import taskOperations from './taskOperations';
import templates from './templates';
import metadata from './metadata';
import comments from './comments';
import utils from './utils';
import apiClient from '../client';

// タスク操作 API
export const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  changeStatus,
  markComplete
} = taskOperations;

// テンプレート関連 API
export const {
  getTemplates,
  getTemplate,
  getTemplateTasks,
  createTemplate,
  createFromTemplate,
  updateTemplate,
  deleteTemplate
} = templates;

// メタデータ関連 API
export const {
  getCategories,
  getStatuses,
  getPriorities,
  createCategory,
  createStatus,
  createPriority
} = metadata;

// コメント関連 API
export const {
  getTaskComments,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment
} = comments;

// 全機能を単一オブジェクトとしてエクスポート
export default {
  // タスク操作
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  changeStatus,
  markComplete,
  
  // テンプレート関連
  getTemplates,
  getTemplate,
  getTemplateTasks,
  createTemplate,
  createFromTemplate,
  updateTemplate,
  deleteTemplate,
  
  // メタデータ関連
  getCategories: async () => {
    try {
      console.log('Getting categories from API');
      const response = await apiClient.get('/api/tasks/categories/');
      console.log('Categories API response:', response);
      
      // APIレスポンスデータを直接返すのではなく、データ部分だけ返す
      if (response && response.data) {
        return { data: response.data };
      } else {
        return { data: [] };
      }
    } catch (error) {
      console.error('Error in getCategories:', error);
      return { data: [] };
    }
  },
  getStatuses: async () => {
    try {
      console.log('Getting statuses from API');
      const response = await apiClient.get('/api/tasks/statuses/');
      console.log('Statuses API response:', response);
      
      // APIレスポンスデータを直接返すのではなく、データ部分だけ返す
      if (response && response.data) {
        return { data: response.data };
      } else {
        return { data: [] };
      }
    } catch (error) {
      console.error('Error in getStatuses:', error);
      return { data: [] };
    }
  },
  getPriorities: async () => {
    try {
      console.log('Getting priorities from API');
      const response = await apiClient.get('/api/tasks/priorities/');
      console.log('Priorities API response:', response);
      
      // APIレスポンスデータを直接返すのではなく、データ部分だけ返す
      if (response && response.data) {
        return { data: response.data };
      } else {
        return { data: [] };
      }
    } catch (error) {
      console.error('Error in getPriorities:', error);
      return { data: [] };
    }
  },
  createCategory,
  createStatus,
  createPriority,
  
  // コメント関連
  getTaskComments,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment,
  
  // ユーティリティ
  utils
}; 