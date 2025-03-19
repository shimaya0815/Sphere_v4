/**
 * 日付関連のユーティリティ関数
 */

/**
 * 日付をinput[type="date"]で使用可能なフォーマットに変換
 * @param {string} dateString - ISO形式の日付文字列
 * @returns {string} YYYY-MM-DD形式の日付文字列
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

/**
 * 相対的な日付表示を生成（例：今日、明日、x日後）
 * @param {string} dateString - ISO形式の日付文字列
 * @returns {string} 相対的な日付表示
 */
export const getRelativeDateDisplay = (dateString) => {
  if (!dateString) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  
  if (targetDate.getTime() === today.getTime()) {
    return '今日';
  } else if (targetDate.getTime() === tomorrow.getTime()) {
    return '明日';
  } else {
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `${diffDays}日後`;
    } else if (diffDays < 0) {
      return `${Math.abs(diffDays)}日前`;
    }
  }
  
  return dateString;
}; 