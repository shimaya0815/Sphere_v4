/**
 * API機能のインデックスファイル
 * 各種APIモジュールをエクスポートする
 */

// インポート
import apiClient from './client';
import * as authApi from './auth';
import * as tasksApi from './tasks';
import * as usersApi from './users';
import * as clientsApi from './clients';
import * as timeManagementApi from './timeManagement';
// 現在利用可能なAPIのみをインポート、残りは必要に応じて追加
// import * as projectsApi from './projects';
// import * as tagsApi from './tags';
// import * as statsApi from './stats';
// import * as dashboardApi from './dashboard';
// import * as notificationsApi from './notifications';
// import * as settingsApi from './settings';

// エクスポート
export {
  apiClient,
  authApi,
  tasksApi,
  usersApi,
  clientsApi,
  timeManagementApi
};

// clientsApiのスタブを作成して既存コードを壊さないようにする
export const clientsApi = {
  getClient: () => Promise.resolve({}),
  getClients: () => Promise.resolve([]),
  createClient: () => Promise.resolve({}),
  updateClient: () => Promise.resolve({}),
  deleteClient: () => Promise.resolve({}),
  getFiscalYears: () => Promise.resolve([]),
  createFiscalYear: () => Promise.resolve({}),
  updateFiscalYear: () => Promise.resolve({}),
  deleteFiscalYear: () => Promise.resolve({}),
  getTaxRules: () => Promise.resolve([]),
  createTaxRule: () => Promise.resolve({}),
  updateTaxRule: () => Promise.resolve({}),
  deleteTaxRule: () => Promise.resolve({}),
  getServiceChecks: () => Promise.resolve([]),
  createServiceCheck: () => Promise.resolve({}),
  updateServiceCheck: () => Promise.resolve({}),
  deleteServiceCheck: () => Promise.resolve({}),
  getTemplates: () => Promise.resolve([]),
  getTaskTemplates: () => Promise.resolve([]),
  createTemplate: () => Promise.resolve({}),
  updateTemplate: () => Promise.resolve({}),
  deleteTemplate: () => Promise.resolve({})
};

// businessApiのスタブを作成
export const businessApi = {
  getBusiness: () => Promise.resolve({}),
  updateBusiness: () => Promise.resolve({})
};

// デフォルトエクスポート
export default {
  tasksApi,
  timeManagementApi,
  authApi,
  usersApi,
  clientsApi,
  businessApi
};