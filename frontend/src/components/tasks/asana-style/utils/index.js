export * from './dateUtils';
export * from './formUtils';

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