/**
 * タスクAPI関連の全インターフェース
 * 複数のモジュールに分割した機能を統合的に提供します
 */

import taskOperations from './taskOperations';
import templates from './templates';
import metadata from './metadata';
import comments from './comments';
import utils from './utils';

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
  getCategories,
  getStatuses,
  getPriorities,
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