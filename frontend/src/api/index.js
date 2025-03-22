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