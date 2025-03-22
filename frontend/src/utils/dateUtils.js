/**
 * 日付関連のユーティリティ関数
 */

/**
 * JavaScriptのDateオブジェクトからHTML input[type="date"]用の文字列にフォーマット
 * @param {Date} date - JavaScriptのDateオブジェクト
 * @returns {string} YYYY-MM-DD形式の文字列
 */
export const formatDateForInput = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    return '';
  }
  
  // タイムゾーンを考慮した値を取得
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 相対的な日付表示を取得（今日、昨日、明日、または日付形式）
 * @param {string|Date} dateStr - 日付文字列またはDateオブジェクト
 * @returns {string} 相対的な日付表示
 */
export const getRelativeDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '明日';
  if (diffDays === -1) return '昨日';
  
  return formatDateForDisplay(date);
};

/**
 * JavaScriptのDateオブジェクトを表示用に整形
 * @param {Date} date - JavaScriptのDateオブジェクト
 * @returns {string} YYYY年MM月DD日形式の文字列
 */
export const formatDateForDisplay = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}年${month}月${day}日`;
};

/**
 * 日付文字列をDateオブジェクトに変換
 * @param {string} dateStr - 日付文字列
 * @returns {Date|null} Dateオブジェクトまたはnull
 */
export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * 残り日数を計算
 * @param {string|Date} dateStr - 日付文字列またはDateオブジェクト
 * @returns {number} 残り日数（負の値は過去を示す）
 */
export const getDaysRemaining = (dateStr) => {
  if (!dateStr) return null;
  
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  return Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
}; 