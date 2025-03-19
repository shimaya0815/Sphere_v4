/**
 * タスクAPI
 * 
 * このファイルは後方互換性のために残されています。
 * 新しいコードでは `/api/tasks/index.js` からインポートすることを推奨します。
 * 
 * 例: import tasksApi from './tasks/index';
 * または特定の関数のみをインポート: import { getTask, createTask } from './tasks/index';
 */

// 分割したモジュールから全ての機能をインポート
import tasksApi from './tasks/index';

// 後方互換性のために全ての機能を再エクスポート
export default tasksApi;