/**
 * キャッシュユーティリティ
 * APIリクエストの結果をキャッシュするためのユーティリティ関数
 */

// キャッシュを保存するオブジェクト
const cacheStorage = new Map();

// キャッシュの有効期間（ミリ秒）
const DEFAULT_TTL = 30000; // 30秒

/**
 * キャッシュを取得する
 * @param {string} key キャッシュキー
 * @returns {object|null} キャッシュされたデータまたはnull
 */
export const getCache = (key) => {
  if (!key || typeof key !== 'string') return null;
  
  const cachedItem = cacheStorage.get(key);
  if (!cachedItem) return null;
  
  const { timestamp, data, ttl } = cachedItem;
  const now = Date.now();
  
  // 有効期限切れのチェック
  if (now - timestamp > ttl) {
    // 期限切れの場合はキャッシュを削除
    cacheStorage.delete(key);
    return null;
  }
  
  return data;
};

/**
 * キャッシュを設定する
 * @param {string} key キャッシュキー
 * @param {any} data キャッシュするデータ
 * @param {number} [ttl=DEFAULT_TTL] キャッシュの有効期間（ミリ秒）
 */
export const setCache = (key, data, ttl = DEFAULT_TTL) => {
  if (!key || typeof key !== 'string') return;
  
  cacheStorage.set(key, {
    timestamp: Date.now(),
    data,
    ttl
  });
};

/**
 * 特定のキーのキャッシュを削除する
 * @param {string} key キャッシュキー
 */
export const clearCache = (key) => {
  if (!key || typeof key !== 'string') return;
  cacheStorage.delete(key);
};

/**
 * 指定したプレフィックスを持つすべてのキャッシュを削除する
 * @param {string} prefix キープレフィックス
 */
export const clearCacheByPrefix = (prefix) => {
  if (!prefix || typeof prefix !== 'string') return;
  
  Array.from(cacheStorage.keys()).forEach(key => {
    if (key.startsWith(prefix)) {
      cacheStorage.delete(key);
    }
  });
};

/**
 * すべてのキャッシュをクリアする
 */
export const clearAllCache = () => {
  cacheStorage.clear();
};

/**
 * APIリクエスト用のキャッシュラッパー
 * 同じリクエストに対するキャッシュがある場合はそれを返し、なければAPIを呼び出してキャッシュする
 * 
 * @param {string} cacheKey キャッシュキー
 * @param {Function} apiCall API呼び出し関数 - Promiseを返す必要がある
 * @param {Object} options オプション
 * @param {number} [options.ttl] キャッシュの有効期間（ミリ秒）
 * @param {boolean} [options.forceRefresh] 強制的に再取得する
 * @returns {Promise<any>} API呼び出しの結果
 */
export const cachedApiCall = async (cacheKey, apiCall, options = {}) => {
  const { ttl = DEFAULT_TTL, forceRefresh = false } = options;
  
  // 強制リフレッシュの場合、キャッシュを使用しない
  if (!forceRefresh) {
    const cachedData = getCache(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }
  }
  
  // APIを呼び出してデータを取得
  try {
    const data = await apiCall();
    // 結果をキャッシュに保存
    setCache(cacheKey, data, ttl);
    return data;
  } catch (error) {
    // エラーの場合は再スローしてコール元で処理させる
    throw error;
  }
};

/**
 * リクエストを追跡するための進行中呼び出しのマップ
 * 同じキーに対する重複呼び出しを防止するために使用
 */
const pendingCalls = new Map();

/**
 * 重複API呼び出しを防止するラッパー
 * 同じキーに対して進行中の呼び出しがある場合は、その結果を返す
 * 
 * @param {string} callKey 呼び出しを識別するキー
 * @param {Function} apiCall API呼び出し関数 - Promiseを返す必要がある
 * @returns {Promise<any>} API呼び出しの結果
 */
export const dedupApiCall = async (callKey, apiCall) => {
  // 既に同じキーに対する呼び出しが進行中の場合
  if (pendingCalls.has(callKey)) {
    return pendingCalls.get(callKey);
  }
  
  // 新しいPromiseを作成
  const promise = apiCall().finally(() => {
    // 完了または失敗したら、進行中リストから削除
    pendingCalls.delete(callKey);
  });
  
  // 進行中リストに登録
  pendingCalls.set(callKey, promise);
  
  return promise;
};

/**
 * エクスポートされたユーティリティをまとめたオブジェクト
 */
const cacheUtils = {
  getCache,
  setCache,
  clearCache,
  clearCacheByPrefix,
  clearAllCache,
  cachedApiCall,
  dedupApiCall
};

export default cacheUtils; 