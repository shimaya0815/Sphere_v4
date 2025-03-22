import apiClient from './client';
import { cachedApiCall, dedupApiCall, clearCache, clearCacheByPrefix } from '../utils/cache';

// APIのベースパス
const API_BASE_PATH = '/api/time-management';

// キャッシュキーのプレフィックス
const CACHE_PREFIX = 'time_management';

// キャッシュの有効期間（ミリ秒）
const CACHE_TTL = 60000; // 60秒に延長

/**
 * タスクIDと条件からキャッシュキーを生成
 * @param {number} taskId タスクID
 * @param {object} params その他のパラメータ
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
 * アクティブなタイムエントリを取得する
 * @param {number} taskId タスクID
 * @returns {Promise<object>} APIレスポンス
 */
export const getActiveTimeEntry = (taskId) => {
  if (!taskId) return Promise.resolve(null);
  
  const cacheKey = generateCacheKey('active', { task_id: taskId });
  const callKey = `active_time_entry:${taskId}`;
  
  // 重複呼び出し防止とキャッシュを組み合わせる
  return dedupApiCall(callKey, () => {
    return cachedApiCall(
      cacheKey,
      async () => {
        try {
          const response = await apiClient.get(`${API_BASE_PATH}/entries/`, {
            params: {
              task_id: taskId,
              active: true
            }
          });
          
          // 配列の最初の要素を返す
          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            return response.data[0];
          }
          return null;
        } catch (error) {
          // リソース不足エラーの場合は、キャッシュの結果を優先して返す
          if (error.message && error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
            console.warn('Resource limitation reached, using cached data');
            // キャッシュからデータを取得する試み
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
              try {
                const parsed = JSON.parse(cachedData);
                // キャッシュの有効期限をチェック
                if (parsed && parsed.expires > Date.now()) {
                  return parsed.data;
                }
              } catch (e) {
                // キャッシュの解析エラーは無視
              }
            }
          }
          console.error('Error fetching active time entry:', error);
          throw error;
        }
      },
      { ttl: CACHE_TTL }
    );
  });
};

/**
 * タスクのタイムエントリ一覧を取得
 * @param {object} params クエリパラメータ
 * @param {number} params.task_id タスクID
 * @param {boolean} params.active アクティブなエントリのみ取得するかどうか
 * @returns {Promise<Array>} タイムエントリ一覧
 */
export const getTimeEntries = async (params = {}) => {
  const { task_id } = params;
  const cacheKey = generateCacheKey('entries', params);
  const callKey = `time_entries:${JSON.stringify(params)}`;
  
  // 重複呼び出し防止とキャッシュを組み合わせる
  return dedupApiCall(callKey, () => {
    return cachedApiCall(
      cacheKey,
      async () => {
        try {
          const response = await apiClient.get(`${API_BASE_PATH}/entries/`, { params });
          return response.data || [];
        } catch (error) {
          // リソース不足エラーの場合は、キャッシュの結果を優先して返す
          if (error.message && error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
            console.warn('Resource limitation reached, using cached data');
            // キャッシュからデータを取得する試み
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
              try {
                const parsed = JSON.parse(cachedData);
                // キャッシュの有効期限をチェック
                if (parsed && parsed.expires > Date.now()) {
                  return parsed.data;
                }
              } catch (e) {
                // キャッシュの解析エラーは無視
              }
            }
            // キャッシュがない場合は空の配列を返す
            return [];
          }
          console.error('Error fetching time entries:', error);
          throw error;
        }
      },
      { ttl: CACHE_TTL }
    );
  });
};

/**
 * タイムエントリを作成する
 * @param {object} data タイムエントリデータ
 * @returns {Promise<object>} APIレスポンス
 */
export const createTimeEntry = async (data) => {
  try {
    const response = await apiClient.post(`${API_BASE_PATH}/entries/`, data);
    
    // キャッシュをクリア - タスク関連のエントリーキャッシュすべて
    if (data.task) {
      const activeKey = generateCacheKey('active', { task_id: data.task });
      const entriesKey = generateCacheKey('entries', { task_id: data.task });
      
      clearCache(activeKey);
      clearCache(entriesKey);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating time entry:', error);
    throw error;
  }
};

/**
 * タイムエントリを更新する
 * @param {number} id タイムエントリID
 * @param {object} data 更新データ
 * @returns {Promise<object>} APIレスポンス
 */
export const updateTimeEntry = async (id, data) => {
  if (!id) {
    throw new Error('Time entry ID is required');
  }
  
  try {
    const response = await apiClient.put(`${API_BASE_PATH}/entries/${id}/`, data);
    
    // キャッシュをクリア - タスク関連のエントリーキャッシュすべて
    if (data.task) {
      const activeKey = generateCacheKey('active', { task_id: data.task });
      const entriesKey = generateCacheKey('entries', { task_id: data.task });
      
      clearCache(activeKey);
      clearCache(entriesKey);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error updating time entry ${id}:`, error);
    throw error;
  }
};

/**
 * タイムエントリを削除する
 * @param {number} id タイムエントリID
 * @returns {Promise<object>} APIレスポンス
 */
export const deleteTimeEntry = async (id) => {
  if (!id) {
    throw new Error('Time entry ID is required');
  }
  
  try {
    const response = await apiClient.delete(`${API_BASE_PATH}/entries/${id}/`);
    
    // エントリに関連するすべてのキャッシュをクリア
    // 注：削除時にはタスクIDがわからないためプレフィックス全体をクリア
    clearCacheByPrefix(CACHE_PREFIX);
    
    return response.data;
  } catch (error) {
    console.error(`Error deleting time entry ${id}:`, error);
    throw error;
  }
};

/**
 * ダッシュボードサマリーを取得する
 * @param {object} params クエリパラメータ
 * @returns {Promise<object>} ダッシュボードサマリー
 */
export const getDashboardSummary = async (params = {}) => {
  try {
    // APIが実装されるまでのスタブ
    return Promise.resolve({
      today: {
        total_time: 28800, // 8時間（秒）
        active_time: 25200, // 7時間（秒）
        break_time: 3600, // 1時間（秒）
        active_entry: null
      },
      week: {
        total_time: 144000, // 40時間（秒）
        average_daily: 28800 // 8時間（秒）
      },
      month: {
        total_time: 576000, // 160時間（秒）
        average_daily: 28800 // 8時間（秒）
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw error;
  }
};

/**
 * チャートデータを取得する
 * @param {object} params クエリパラメータ
 * @returns {Promise<object>} チャートデータ
 */
export const getChartData = async (params = {}) => {
  try {
    // APIが実装されるまでのスタブ
    return Promise.resolve({
      daily: [
        { date: '2023-05-01', total: 28800 },
        { date: '2023-05-02', total: 25200 },
        { date: '2023-05-03', total: 30600 },
        { date: '2023-05-04', total: 27000 },
        { date: '2023-05-05', total: 32400 }
      ],
      weekly: [
        { week: '2023-W18', total: 144000 },
        { week: '2023-W19', total: 151200 },
        { week: '2023-W20', total: 133200 },
        { week: '2023-W21', total: 140400 }
      ],
      monthly: [
        { month: '2023-04', total: 576000 },
        { month: '2023-05', total: 590400 }
      ]
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw error;
  }
};

/**
 * 休憩一覧を取得する
 * @param {object} params クエリパラメータ
 * @returns {Promise<Array>} 休憩一覧
 */
export const getBreaks = async (params = {}) => {
  try {
    // APIが実装されるまでのスタブ
    return Promise.resolve([
      {
        id: 1,
        start_time: new Date(Date.now() - 3600000).toISOString(),
        end_time: new Date(Date.now() - 3000000).toISOString(),
        duration: 600
      }
    ]);
  } catch (error) {
    console.error('Error fetching breaks:', error);
    throw error;
  }
};

/**
 * タイムエントリーを開始する
 * @param {object} data タイムエントリーデータ
 * @returns {Promise<object>} 作成されたタイムエントリー
 */
export const startTimeEntry = async (data) => {
  try {
    // createTimeEntryを使用
    return createTimeEntry({
      ...data,
      start_time: new Date().toISOString(),
      active: true
    });
  } catch (error) {
    console.error('Error starting time entry:', error);
    throw error;
  }
};

/**
 * タイムエントリーを停止する
 * @param {number} id タイムエントリーID
 * @returns {Promise<object>} 更新されたタイムエントリー
 */
export const stopTimeEntry = async (id) => {
  try {
    // updateTimeEntryを使用
    return updateTimeEntry(id, {
      end_time: new Date().toISOString(),
      active: false
    });
  } catch (error) {
    console.error('Error stopping time entry:', error);
    throw error;
  }
};

/**
 * 休憩を開始する
 * @param {object} data 休憩データ
 * @returns {Promise<object>} 作成された休憩
 */
export const startBreak = async (data) => {
  try {
    // スタブ実装
    return Promise.resolve({
      id: Math.floor(Math.random() * 1000),
      start_time: new Date().toISOString(),
      end_time: null,
      ...data
    });
  } catch (error) {
    console.error('Error starting break:', error);
    throw error;
  }
};

/**
 * 休憩を停止する
 * @param {number} id 休憩ID
 * @returns {Promise<object>} 更新された休憩
 */
export const stopBreak = async (id) => {
  try {
    // スタブ実装
    return Promise.resolve({
      id,
      end_time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error stopping break:', error);
    throw error;
  }
};

/**
 * レポートを生成する
 * @param {object} params レポートパラメータ
 * @returns {Promise<object>} 生成されたレポート
 */
export const generateReport = async (params = {}) => {
  try {
    // スタブ実装
    return Promise.resolve({
      entries: [
        {
          id: 1,
          start_time: '2023-05-01T09:00:00Z',
          end_time: '2023-05-01T17:00:00Z',
          duration: 28800,
          task: {
            id: 1,
            title: 'タスク1'
          }
        }
      ],
      total_duration: 28800,
      period: {
        start: params.start_date,
        end: params.end_date
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

/**
 * レポートをCSVにエクスポートする
 * @param {object} params エクスポートパラメータ
 * @returns {Promise<Blob>} CSVファイル
 */
export const exportReportToCsv = async (params = {}) => {
  try {
    // スタブ実装
    const csvContent = 'id,start_time,end_time,duration,task\n1,2023-05-01T09:00:00Z,2023-05-01T17:00:00Z,28800,タスク1';
    return Promise.resolve(new Blob([csvContent], { type: 'text/csv' }));
  } catch (error) {
    console.error('Error exporting report to CSV:', error);
    throw error;
  }
};

// APIモジュールのエクスポート更新
export default {
  getActiveTimeEntry,
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getDashboardSummary,
  getChartData,
  getBreaks,
  startTimeEntry,
  stopTimeEntry,
  startBreak,
  stopBreak,
  generateReport,
  exportReportToCsv
};