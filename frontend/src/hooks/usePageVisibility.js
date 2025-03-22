import { useState, useEffect } from 'react';

/**
 * ページの可視性状態を監視するカスタムフック
 * document.visibilityStateの変更を監視し、ページがアクティブかどうかを返します
 * 
 * @returns {boolean} ページが現在表示されているかどうか
 */
export const usePageVisibility = () => {
  // 初期状態を設定
  const [isVisible, setIsVisible] = useState(!document.hidden);
  
  useEffect(() => {
    // visibilitychangeイベントのハンドラ
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    // マウント時にイベントリスナーを追加
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // アンマウント時にイベントリスナーを削除
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return isVisible;
};

export default usePageVisibility; 