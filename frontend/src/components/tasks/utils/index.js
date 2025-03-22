/**
 * タスク関連のユーティリティ関数
 */

/**
 * 秒数を「時間:分:秒」形式にフォーマット
 * @param {number} seconds 秒数
 * @returns {string} フォーマット済みの文字列
 */
export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return '00:00:00';
  }
  
  // 負の値を考慮
  const absSeconds = Math.abs(Math.floor(seconds));
  
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;
  
  // 2桁でパディング
  const pad = (num) => String(num).padStart(2, '0');
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
};

/**
 * 日付を入力フォーム用にフォーマット
 * @param {Date|string} date 日付
 * @returns {string} YYYY-MM-DD形式の文字列
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 相対日付表示の生成
 * @param {Date|string} date 日付
 * @param {Date} now 現在日時（省略可）
 * @returns {string} 相対日付表示
 */
export const getRelativeDateDisplay = (date, now = new Date()) => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const diffDays = Math.floor((d - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '明日';
  if (diffDays === -1) return '昨日';
  
  if (diffDays > 0 && diffDays < 7) return `${diffDays}日後`;
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)}日前`;
  
  // それ以外は日付を表示
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  return `${year}/${month}/${day}`;
};

/**
 * フォームデータを送信用に準備
 * @param {object} formData フォームデータ
 * @returns {object} 送信用データ
 */
export const prepareFormDataForSubmission = (formData) => {
  if (!formData) return {};
  
  // コピーを作成して変更
  const processed = { ...formData };
  
  // 空文字列をnullに変換
  Object.keys(processed).forEach(key => {
    if (processed[key] === '') {
      processed[key] = null;
    }
  });
  
  return processed;
};

/**
 * タスクデータをフォーム用に準備
 * @param {object} taskData タスクデータ
 * @returns {object} フォーム用データ
 */
export const prepareTaskDataForForm = (taskData) => {
  if (!taskData) return {};
  
  // コピーを作成して変更
  const processed = { ...taskData };
  
  // 日付フィールドを整形
  if (processed.due_date) {
    processed.due_date = formatDateForInput(processed.due_date);
  }
  
  return processed;
};

export default {
  formatDuration,
  formatDateForInput,
  getRelativeDateDisplay,
  prepareFormDataForSubmission,
  prepareTaskDataForForm
}; 